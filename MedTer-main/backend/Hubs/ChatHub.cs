using System.Security.Claims;
using backend.Data;
using backend.Dtos;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace backend.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly AppDbContext _db;

    public ChatHub(AppDbContext db) => _db = db;

    private string UserId => Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public static string GroupRoom(int groupId) => $"group-{groupId}";

    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, UserId);

        var groupIds = await _db.ChatGroupMembers
            .AsNoTracking()
            .Where(m => m.UserId == UserId)
            .Select(m => m.GroupId)
            .ToListAsync();

        foreach (var id in groupIds)
            await Groups.AddToGroupAsync(Context.ConnectionId, GroupRoom(id));

        await base.OnConnectedAsync();
    }

    public async Task JoinGroup(int groupId)
    {
        var isMember = await _db.ChatGroupMembers
            .AnyAsync(m => m.GroupId == groupId && m.UserId == UserId);
        if (!isMember) return;
        await Groups.AddToGroupAsync(Context.ConnectionId, GroupRoom(groupId));
    }

    // Legacy 1:1 DM (kept for compatibility)
    public async Task SendMessage(string receiverId, string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return;

        var message = new Message
        {
            SenderId = UserId,
            ReceiverId = receiverId,
            Text = text.Trim(),
            SentAt = DateTime.UtcNow
        };
        _db.Messages.Add(message);
        await _db.SaveChangesAsync();

        var dto = new MessageDto(message.Id, message.SenderId, message.ReceiverId, message.Text, message.SentAt);
        await Clients.Group(receiverId).SendAsync("ReceiveMessage", dto);
        await Clients.Group(UserId).SendAsync("ReceiveMessage", dto);
    }

    public async Task SendGroupMessage(int groupId, string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return;

        var isMember = await _db.ChatGroupMembers
            .AnyAsync(m => m.GroupId == groupId && m.UserId == UserId);
        if (!isMember) return;

        var sender = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == UserId);
        var message = new GroupMessage
        {
            GroupId = groupId,
            SenderId = UserId,
            Text = text.Trim(),
            SentAt = DateTime.UtcNow
        };
        _db.GroupMessages.Add(message);
        await _db.SaveChangesAsync();

        var dto = new GroupMessageDto(
            message.Id,
            message.GroupId,
            message.SenderId,
            sender?.DisplayName ?? "",
            message.Text,
            message.SentAt,
            false,
            Array.Empty<MessageReactionDto>());

        await Clients.Group(GroupRoom(groupId)).SendAsync("ReceiveGroupMessage", dto);
    }

    public async Task ToggleReaction(int groupId, int messageId, string emoji)
    {
        if (!GroupChatMapper.AllowedEmoji(emoji)) return;

        var isMember = await _db.ChatGroupMembers
            .AnyAsync(m => m.GroupId == groupId && m.UserId == UserId);
        if (!isMember) return;

        var message = await _db.GroupMessages
            .Include(m => m.Reactions)
            .FirstOrDefaultAsync(m => m.Id == messageId && m.GroupId == groupId);
        if (message is null || message.Unsent) return;

        var existing = message.Reactions.FirstOrDefault(r => r.UserId == UserId);
        if (existing is null)
        {
            message.Reactions.Add(new MessageReaction
            {
                UserId = UserId,
                Emoji = emoji,
                CreatedAt = DateTime.UtcNow
            });
        }
        else if (existing.Emoji == emoji)
        {
            _db.MessageReactions.Remove(existing);
        }
        else
        {
            existing.Emoji = emoji;
            existing.CreatedAt = DateTime.UtcNow;
        }

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return;
        }

        var reactions = await _db.MessageReactions
            .AsNoTracking()
            .Where(r => r.MessageId == messageId)
            .Include(r => r.User)
            .ToListAsync();

        await Clients.Group(GroupRoom(groupId)).SendAsync(
            "MessageReactionsUpdated",
            new MessageReactionsUpdatedDto(messageId, groupId, GroupChatMapper.ToReactionDtos(reactions)));
    }

    public async Task UnsendGroupMessage(int groupId, int messageId)
    {
        var isMember = await _db.ChatGroupMembers
            .AnyAsync(m => m.GroupId == groupId && m.UserId == UserId);
        if (!isMember) return;

        var message = await _db.GroupMessages
            .Include(m => m.Reactions)
            .FirstOrDefaultAsync(m => m.Id == messageId && m.GroupId == groupId);
        if (message is null || message.Unsent || message.SenderId != UserId) return;

        message.Unsent = true;
        message.UnsentAt = DateTime.UtcNow;
        message.Text = "";
        _db.MessageReactions.RemoveRange(message.Reactions);
        await _db.SaveChangesAsync();

        var last = await _db.GroupMessages
            .AsNoTracking()
            .Where(m => m.GroupId == groupId)
            .OrderByDescending(m => m.SentAt)
            .Select(m => new { m.Text, m.SentAt, m.Unsent })
            .FirstOrDefaultAsync();

        await Clients.Group(GroupRoom(groupId)).SendAsync(
            "GroupMessageUnsent",
            new GroupMessageUnsentDto(
                message.Id,
                groupId,
                message.UnsentAt.Value,
                last is null || last.Unsent ? null : last.Text,
                last?.SentAt,
                last?.Unsent == true));
    }
}
