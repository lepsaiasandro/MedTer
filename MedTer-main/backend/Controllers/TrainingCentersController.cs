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
[Authorize]
public class TrainingCentersController : ControllerBase
{
    private readonly AppDbContext _db;

    public TrainingCentersController(AppDbContext db) => _db = db;

    private string MyId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private bool IsDoctor => User.FindFirstValue(ClaimTypes.Role) == UserRole.Doctor.ToString();

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var myId = MyId;
        var centers = await _db.TrainingCenterProfiles
            .OrderBy(c => c.Name)
            .Select(c => new TrainingCenterDto(
                c.UserId, c.Name, c.Description, c.City, c.Phone,
                _db.Ratings.Where(r => r.CenterUserId == c.UserId).Average(r => (double?)r.Stars) ?? 0,
                _db.Ratings.Count(r => r.CenterUserId == c.UserId),
                _db.Ratings.Where(r => r.CenterUserId == c.UserId && r.DoctorUserId == myId)
                    .Select(r => (int?)r.Stars).FirstOrDefault()))
            .ToListAsync();

        return Ok(centers);
    }

    // Doctor rates a center 1–5 (one rating per doctor, updatable)
    [HttpPost("{id}/rating")]
    public async Task<IActionResult> Rate(string id, RateDto dto)
    {
        if (!IsDoctor) return Forbid();
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
