using System.Security.Claims;
using backend.Data;
using backend.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public NotificationsController(AppDbContext db) => _db = db;

    private string MyId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await _db.Notifications
            .Where(n => n.UserId == MyId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .Select(n => new NotificationDto(n.Id, n.Text, n.IsRead, n.CreatedAt))
            .ToListAsync();
        return Ok(list);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount()
    {
        var count = await _db.Notifications.CountAsync(n => n.UserId == MyId && !n.IsRead);
        return Ok(new { count });
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        await _db.Notifications
            .Where(n => n.UserId == MyId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        return Ok();
    }
}
