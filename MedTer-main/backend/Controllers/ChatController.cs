using System.Security.Claims;
using backend.Data;
using backend.Dtos;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/chat")]
[Authorize]
public class ChatController : ControllerBase
{
    private readonly AppDbContext _db;

    public ChatController(AppDbContext db) => _db = db;

    private string MyId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private bool IsCenter => User.FindFirstValue(ClaimTypes.Role) == UserRole.TrainingCenter.ToString();

    // Groups the current user belongs to
    [HttpGet("groups")]
    public async Task<IActionResult> GetGroups()
    {
        var myId = MyId;

        var memberships = await _db.ChatGroupMembers
            .AsNoTracking()
            .Where(m => m.UserId == myId)
            .Select(m => new { m.GroupId, m.LastReadAt })
            .ToListAsync();

        if (memberships.Count == 0) return Ok(Array.Empty<ChatGroupDto>());

        var groupIds = memberships.Select(m => m.GroupId).ToList();
        var lastRead = memberships.ToDictionary(m => m.GroupId, m => m.LastReadAt);

        var groups = await _db.ChatGroups
            .AsNoTracking()
            .Where(g => groupIds.Contains(g.Id))
            .Select(g => new
            {
                g.Id,
                g.AnnouncementId,
                g.Name,
                AnnouncementType = g.Announcement!.Type,
                City = g.Announcement.City,
                MemberCount = g.Members.Count,
                g.CreatedByUserId,
                LastMessage = g.Messages
                    .OrderByDescending(x => x.SentAt)
                    .Select(x => new { x.Text, x.SentAt })
                    .FirstOrDefault()
            })
            .ToListAsync();

        var unreadCounts = await _db.GroupMessages
            .AsNoTracking()
            .Where(m => groupIds.Contains(m.GroupId) && m.SenderId != myId)
            .Select(m => new { m.GroupId, m.SentAt })
            .ToListAsync();

        var result = groups
            .Select(g =>
            {
                lastRead.TryGetValue(g.Id, out var lr);
                var unread = unreadCounts.Count(u =>
                    u.GroupId == g.Id && (lr is null || u.SentAt > lr));
                return new ChatGroupDto(
                    g.Id,
                    g.AnnouncementId,
                    g.Name,
                    g.AnnouncementType,
                    g.City,
                    g.MemberCount,
                    g.LastMessage?.SentAt,
                    g.LastMessage?.Text,
                    unread,
                    g.CreatedByUserId == myId);
            })
            .OrderByDescending(g => g.LastMessageAt ?? DateTime.MinValue)
            .ThenBy(g => g.Name)
            .ToList();

        return Ok(result);
    }

    // Published announcements owned by the center that don't have a group yet
    [HttpGet("groups/creatable")]
    public async Task<IActionResult> GetCreatable()
    {
        if (!IsCenter) return Forbid();

        var list = await _db.Announcements
            .AsNoTracking()
            .Where(a => a.CenterUserId == MyId && a.Status == "Published")
            .Where(a => !_db.ChatGroups.Any(g => g.AnnouncementId == a.Id))
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new CreatableAnnouncementDto(a.Id, a.Title, a.Type, a.Interests.Count))
            .ToListAsync();

        return Ok(list);
    }

    // Training center creates a group for a training; all registered doctors are added
    [HttpPost("groups")]
    public async Task<IActionResult> CreateGroup(CreateGroupDto dto)
    {
        if (!IsCenter) return Forbid();

        var announcement = await _db.Announcements
            .Include(a => a.Interests)
            .FirstOrDefaultAsync(a => a.Id == dto.AnnouncementId);

        if (announcement is null) return NotFound();
        if (announcement.CenterUserId != MyId) return Forbid();
        if (announcement.Status != "Published")
            return BadRequest(new { message = "ჯგუფის შექმნა შესაძლებელია მხოლოდ გამოქვეყნებული ტრენინგისთვის." });

        var exists = await _db.ChatGroups.AnyAsync(g => g.AnnouncementId == announcement.Id);
        if (exists)
            return Conflict(new { message = "ამ ტრენინგისთვის ჯგუფი უკვე არსებობს." });

        var group = new ChatGroup
        {
            AnnouncementId = announcement.Id,
            Name = announcement.Title,
            CreatedByUserId = MyId,
            CreatedAt = DateTime.UtcNow
        };

        // Owner + every registered (interested) doctor
        group.Members.Add(new ChatGroupMember { UserId = MyId, JoinedAt = DateTime.UtcNow });
        foreach (var interest in announcement.Interests)
        {
            if (interest.DoctorUserId == MyId) continue;
            group.Members.Add(new ChatGroupMember
            {
                UserId = interest.DoctorUserId,
                JoinedAt = DateTime.UtcNow
            });
        }

        _db.ChatGroups.Add(group);

        foreach (var interest in announcement.Interests)
        {
            _db.Notifications.Add(new Notification
            {
                UserId = interest.DoctorUserId,
                Text = $"შეიქმნა ტრენინგის ჯგუფი: „{announcement.Title}“ — თქვენ ავტომატურად დაემატეთ."
            });
        }

        await _db.SaveChangesAsync();

        return Ok(new ChatGroupDto(
            group.Id,
            group.AnnouncementId,
            group.Name,
            announcement.Type,
            announcement.City,
            group.Members.Count,
            null,
            null,
            0,
            true));
    }

    [HttpGet("groups/{groupId:int}/messages")]
    public async Task<IActionResult> GetGroupMessages(int groupId)
    {
        var member = await _db.ChatGroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == groupId && m.UserId == MyId);
        if (member is null) return Forbid();

        var messages = await _db.GroupMessages
            .AsNoTracking()
            .Where(m => m.GroupId == groupId)
            .OrderBy(m => m.SentAt)
            .Select(m => new GroupMessageDto(
                m.Id,
                m.GroupId,
                m.SenderId,
                m.Sender!.DisplayName,
                m.Text,
                m.SentAt))
            .ToListAsync();

        member.LastReadAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(messages);
    }

    [HttpPost("groups/{groupId:int}/read")]
    public async Task<IActionResult> MarkGroupRead(int groupId)
    {
        var member = await _db.ChatGroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == groupId && m.UserId == MyId);
        if (member is null) return Forbid();

        member.LastReadAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpGet("groups/{groupId:int}/members")]
    public async Task<IActionResult> GetMembers(int groupId)
    {
        var isMember = await _db.ChatGroupMembers
            .AnyAsync(m => m.GroupId == groupId && m.UserId == MyId);
        if (!isMember) return Forbid();

        var members = await _db.ChatGroupMembers
            .AsNoTracking()
            .Where(m => m.GroupId == groupId)
            .OrderBy(m => m.JoinedAt)
            .Select(m => new GroupMemberDto(
                m.UserId,
                m.User!.DisplayName,
                m.User.Role.ToString(),
                m.User.Role == UserRole.Doctor
                    ? m.User.DoctorProfile!.City
                    : m.User.TrainingCenterProfile!.City))
            .ToListAsync();

        return Ok(members);
    }

    // Total unread group messages for the header badge
    [HttpGet("unread/count")]
    public async Task<IActionResult> UnreadCount()
    {
        var myId = MyId;
        var memberships = await _db.ChatGroupMembers
            .AsNoTracking()
            .Where(m => m.UserId == myId)
            .Select(m => new { m.GroupId, m.LastReadAt })
            .ToListAsync();

        if (memberships.Count == 0) return Ok(new { count = 0 });

        var groupIds = memberships.Select(m => m.GroupId).ToList();
        var lastRead = memberships.ToDictionary(m => m.GroupId, m => m.LastReadAt);

        var messages = await _db.GroupMessages
            .AsNoTracking()
            .Where(m => groupIds.Contains(m.GroupId) && m.SenderId != myId)
            .Select(m => new { m.GroupId, m.SentAt })
            .ToListAsync();

        var count = messages.Count(m =>
        {
            lastRead.TryGetValue(m.GroupId, out var lr);
            return lr is null || m.SentAt > lr;
        });

        return Ok(new { count });
    }
}
