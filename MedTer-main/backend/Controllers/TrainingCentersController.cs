using System.Security.Claims;
using backend.Data;
using backend.Dtos;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/training-centers")]
public class TrainingCentersController : ControllerBase
{
    private readonly AppDbContext _db;

    public TrainingCentersController(AppDbContext db) => _db = db;

    private string? MyId => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private bool IsDoctor => User.FindFirstValue(ClaimTypes.Role) == UserRole.Doctor.ToString();

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var now = DateTime.UtcNow;
        var centers = await _db.TrainingCenterProfiles
            .AsNoTracking()
            .Where(c => c.User!.IsApproved)
            .OrderBy(c => c.Name)
            .Select(c => new
            {
                c.UserId,
                c.Name,
                c.Description,
                c.City,
                c.Phone,
                AverageRating = _db.Ratings.Where(r => r.CenterUserId == c.UserId).Average(r => (double?)r.Stars) ?? 0,
                RatingCount = _db.Ratings.Count(r => r.CenterUserId == c.UserId),
                AnnouncementCount = _db.Announcements.Count(a => a.CenterUserId == c.UserId && a.Status == "Published"),
                UpcomingCount = _db.Announcements.Count(a =>
                    a.CenterUserId == c.UserId
                    && a.Status == "Published"
                    && a.StartDate != null
                    && a.StartDate >= now),
            })
            .ToListAsync();

        Dictionary<string, int>? myRatings = null;
        var myId = MyId;
        if (!string.IsNullOrEmpty(myId))
        {
            myRatings = await _db.Ratings
                .AsNoTracking()
                .Where(r => r.DoctorUserId == myId)
                .ToDictionaryAsync(r => r.CenterUserId, r => r.Stars);
        }

        var categoryRows = await _db.Announcements
            .AsNoTracking()
            .Where(a => a.Status == "Published" && a.Category != null && a.Category != "")
            .GroupBy(a => new { a.CenterUserId, a.Category })
            .Select(g => new { g.Key.CenterUserId, Category = g.Key.Category!, Count = g.Count() })
            .ToListAsync();

        var categoriesByCenter = categoryRows
            .GroupBy(r => r.CenterUserId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<string>)g.OrderByDescending(x => x.Count)
                    .ThenBy(x => x.Category)
                    .Select(x => x.Category)
                    .Take(3)
                    .ToList());

        var result = centers.Select(c => new TrainingCenterDto(
            c.UserId,
            c.Name,
            c.Description,
            c.City,
            c.Phone,
            c.AverageRating,
            c.RatingCount,
            myRatings != null && myRatings.TryGetValue(c.UserId, out var stars) ? stars : null,
            c.AnnouncementCount,
            c.UpcomingCount,
            categoriesByCenter.TryGetValue(c.UserId, out var cats) ? cats : Array.Empty<string>()
        ));

        return Ok(result);
    }

    [Authorize]
    [HttpPost("{id}/rating")]
    public async Task<IActionResult> Rate(string id, RateDto dto)
    {
        if (!IsDoctor || MyId is null) return Forbid();
        if (dto.Stars < 1 || dto.Stars > 5) return BadRequest("Stars must be 1–5");

        var existing = await _db.Ratings.FirstOrDefaultAsync(r => r.CenterUserId == id && r.DoctorUserId == MyId);
        if (existing is null)
            _db.Ratings.Add(new Rating { CenterUserId = id, DoctorUserId = MyId, Stars = dto.Stars });
        else
            existing.Stars = dto.Stars;

        await _db.SaveChangesAsync();
        return Ok();
    }
}
