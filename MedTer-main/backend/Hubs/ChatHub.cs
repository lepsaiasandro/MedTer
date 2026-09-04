using System.Security.Claims;
using backend.Data;
using backend.Dtos;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace backend.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly AppDbContext _db;

    public ChatHub(AppDbContext db) => _db = db;

    private string UserId => Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // Each user joins a group named by their own id so we can target them directly.
    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, UserId);
        await base.OnConnectedAsync();
    }

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

        // Deliver to receiver and echo back to sender (so all sender's tabs stay in sync).
        await Clients.Group(receiverId).SendAsync("ReceiveMessage", dto);
        await Clients.Group(UserId).SendAsync("ReceiveMessage", dto);
    }
}
