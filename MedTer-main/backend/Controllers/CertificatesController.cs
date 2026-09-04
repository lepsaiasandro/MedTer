using System.Security.Claims;
using backend.Data;
using backend.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/certificates")]
[Authorize]
public class CertificatesController : ControllerBase
{
    private readonly AppDbContext _db;
    public CertificatesController(AppDbContext db) => _db = db;

    private string MyId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // The current doctor's certificates
    [HttpGet("mine")]
    public async Task<IActionResult> GetMine()
    {
        var myId = MyId;
        var list = await _db.Certificates
            .Where(c => c.DoctorUserId == myId)
            .OrderByDescending(c => c.IssuedAt)
            .Select(c => new CertificateDto(c.Id, c.Title, c.Points, c.CenterName, c.IssuedAt, c.AnnouncementId, c.FileUrl, c.FileName))
            .ToListAsync();

        return Ok(list);
    }

    // Top doctors by total certificate points
    [HttpGet("leaderboard")]
    public async Task<IActionResult> Leaderboard()
    {
        var top = await _db.Certificates
            .GroupBy(c => c.DoctorUserId)
            .Select(g => new { UserId = g.Key, Points = g.Sum(x => x.Points), Count = g.Count() })
            .OrderByDescending(x => x.Points)
            .Take(10)
            .ToListAsync();

        var ids = top.Select(t => t.UserId).ToList();
        var names = await _db.Users.Where(u => ids.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.DisplayName);

        var list = top.Select(t => new LeaderboardEntryDto(
            t.UserId, names.TryGetValue(t.UserId, out var n) ? n : "", t.Points, t.Count)).ToList();

        return Ok(list);
    }
}

