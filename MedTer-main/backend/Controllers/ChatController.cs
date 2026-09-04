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

    // Contacts (opposite role) enriched with last-message time + unread count,
    // sorted so the most recently active conversation is first.
    [HttpGet("contacts")]
    public async Task<IActionResult> GetContacts()
    {
        var myId = MyId;
        var myRole = Enum.Parse<UserRole>(User.FindFirstValue(ClaimTypes.Role)!);
        var otherRole = myRole == UserRole.Doctor ? UserRole.TrainingCenter : UserRole.Doctor;

        var users = await _db.Users
            .Where(u => u.Role == otherRole && u.Id != myId)
            .Select(u => new
            {
                u.Id,
                u.DisplayName,
                Role = u.Role.ToString(),
                City = u.Role == UserRole.Doctor ? u.DoctorProfile!.City : u.TrainingCenterProfile!.City
            })
            .ToListAsync();

        // Aggregate my conversation messages in memory (fine for MVP scale).
        var msgs = await _db.Messages
            .Where(m => m.SenderId == myId || m.ReceiverId == myId)
            .Select(m => new { m.SenderId, m.ReceiverId, m.SentAt, m.IsRead })
            .ToListAsync();

        var result = users
            .Select(u =>
            {
                var conv = msgs.Where(m => m.SenderId == u.Id || m.ReceiverId == u.Id).ToList();
                DateTime? last = conv.Count > 0 ? conv.Max(m => m.SentAt) : null;
                var unread = conv.Count(m => m.SenderId == u.Id && !m.IsRead);
                return new ConversationDto(u.Id, u.DisplayName, u.Role, u.City, last, unread);
            })
            .OrderByDescending(c => c.LastMessageAt ?? DateTime.MinValue)
            .ThenBy(c => c.DisplayName)
            .ToList();

        return Ok(result);
    }

    // Mark messages from {otherUserId} as read (used when a live message arrives in an open chat).
    [HttpPost("{otherUserId}/read")]
    public async Task<IActionResult> MarkRead(string otherUserId)
    {
        await _db.Messages
            .Where(m => m.SenderId == otherUserId && m.ReceiverId == MyId && !m.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.IsRead, true));
        return Ok();
    }

    // Conversation history between the current user and {otherUserId}.
    // Opening the conversation marks messages from the other user as read.
    [HttpGet("{otherUserId}")]
    public async Task<IActionResult> GetHistory(string otherUserId)
    {
        var myId = MyId;

        var messages = await _db.Messages
            .Where(m => (m.SenderId == myId && m.ReceiverId == otherUserId) ||
                        (m.SenderId == otherUserId && m.ReceiverId == myId))
            .OrderBy(m => m.SentAt)
            .Select(m => new MessageDto(m.Id, m.SenderId, m.ReceiverId, m.Text, m.SentAt))
            .ToListAsync();

        await _db.Messages
            .Where(m => m.SenderId == otherUserId && m.ReceiverId == myId && !m.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.IsRead, true));

        return Ok(messages);
    }

    // Total unread messages for the current user (for the header badge).
    [HttpGet("unread/count")]
    public async Task<IActionResult> UnreadCount()
    {
        var count = await _db.Messages.CountAsync(m => m.ReceiverId == MyId && !m.IsRead);
        return Ok(new { count });
    }
}
