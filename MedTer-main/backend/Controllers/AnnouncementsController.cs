using System.Security.Claims;
using backend.Data;
using backend.Dtos;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/announcements")]
[Authorize]
public class AnnouncementsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEmailSender _email;

    public AnnouncementsController(AppDbContext db, IEmailSender email)
    {
        _db = db;
        _email = email;
    }

    private string MyId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private bool IsCenter => User.FindFirstValue(ClaimTypes.Role) == UserRole.TrainingCenter.ToString();
    private bool IsAdmin => User.FindFirstValue(ClaimTypes.Role) == UserRole.Admin.ToString();
    private string MyName => User.FindFirstValue(ClaimTypes.Name) ?? "";

    // All announcements (browse) — only published ones are public
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var myId = MyId;
        var list = await _db.Announcements
            .Where(a => a.Status == "Published")
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new AnnouncementDto(
                a.Id, a.Title, a.Type, a.Category, a.Format, a.ShortDescription, a.Description,
                a.City, a.Duration, a.Language, a.Points, a.Price, a.Seats, a.ImageUrl,
                a.StartDate, a.RegistrationDeadline, a.Status, a.RejectionReason,
                a.CenterUserId, a.Center!.DisplayName,
                a.Interests.Count,
                a.Interests.Any(i => i.DoctorUserId == myId),
                _db.Favorites.Any(f => f.AnnouncementId == a.Id && f.DoctorUserId == myId),
                a.CreatedAt))
            .ToListAsync();

        return Ok(list);
    }

    // The current center's own announcements (published + drafts)
    [HttpGet("mine")]
    public async Task<IActionResult> GetMine()
    {
        if (!IsCenter) return Forbid();
        var myId = MyId;

        var list = await _db.Announcements
            .Where(a => a.CenterUserId == myId)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new AnnouncementDto(
                a.Id, a.Title, a.Type, a.Category, a.Format, a.ShortDescription, a.Description,
                a.City, a.Duration, a.Language, a.Points, a.Price, a.Seats, a.ImageUrl,
                a.StartDate, a.RegistrationDeadline, a.Status, a.RejectionReason,
                a.CenterUserId, a.Center!.DisplayName,
                a.Interests.Count, false, false, a.CreatedAt,
                _db.ChatGroups.Any(g => g.AnnouncementId == a.Id)))
            .ToListAsync();

        return Ok(list);
    }

    // Admin: announcements waiting for approval
    [HttpGet("pending")]
    public async Task<IActionResult> GetPending()
    {
        if (!IsAdmin) return Forbid();

        var list = await _db.Announcements
            .Where(a => a.Status == "Pending")
            .OrderBy(a => a.CreatedAt)
            .Select(a => new AnnouncementDto(
                a.Id, a.Title, a.Type, a.Category, a.Format, a.ShortDescription, a.Description,
                a.City, a.Duration, a.Language, a.Points, a.Price, a.Seats, a.ImageUrl,
                a.StartDate, a.RegistrationDeadline, a.Status, a.RejectionReason,
                a.CenterUserId, a.Center!.DisplayName,
                a.Interests.Count, false, false, a.CreatedAt))
            .ToListAsync();

        return Ok(list);
    }

    // Admin: approve → visible to everyone
    [HttpPost("{id}/approve")]
    public async Task<IActionResult> Approve(int id)
    {
        if (!IsAdmin) return Forbid();
        var a = await _db.Announcements.FindAsync(id);
        if (a is null) return NotFound();

        a.Status = "Published";
        a.RejectionReason = null;
        _db.Notifications.Add(new Notification
        {
            UserId = a.CenterUserId,
            Text = $"თქვენი განცხადება „{a.Title}“ დამტკიცდა და გამოქვეყნდა ✓"
        });
        await _db.SaveChangesAsync();
        return Ok();
    }

    // Admin: reject with a reason
    [HttpPost("{id}/reject")]
    public async Task<IActionResult> Reject(int id, RejectDto dto)
    {
        if (!IsAdmin) return Forbid();
        var a = await _db.Announcements.FindAsync(id);
        if (a is null) return NotFound();

        a.Status = "Rejected";
        a.RejectionReason = dto.Reason;
        _db.Notifications.Add(new Notification
        {
            UserId = a.CenterUserId,
            Text = $"თქვენი განცხადება „{a.Title}“ უარყოფილია: {dto.Reason}"
        });
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateAnnouncementDto dto)
    {
        if (!IsCenter) return Forbid();

        var a = new Announcement { CenterUserId = MyId };
        await ApplyAsync(a, dto);
        _db.Announcements.Add(a);
        await _db.SaveChangesAsync();
        return Ok(new { a.Id });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, CreateAnnouncementDto dto)
    {
        var a = await _db.Announcements.FindAsync(id);
        if (a is null) return NotFound();
        if (a.CenterUserId != MyId) return Forbid();

        await ApplyAsync(a, dto);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // Copy incoming fields onto the entity (shared by Create + Update)
    private async Task ApplyAsync(Announcement a, CreateAnnouncementDto dto)
    {
        a.Title = dto.Title;
        a.Type = dto.Type;
        a.Category = dto.Category;
        a.Format = dto.Format;
        a.ShortDescription = dto.ShortDescription;
        a.Description = dto.Description;
        a.City = dto.City;
        a.Duration = dto.Duration;
        a.Language = dto.Language;
        a.Points = dto.Points;
        a.Price = dto.Price;
        a.Seats = dto.Seats;
        a.ImageUrl = dto.ImageUrl;
        a.StartDate = dto.StartDate;
        a.RegistrationDeadline = dto.RegistrationDeadline;
        a.RejectionReason = null;

        if (dto.Status == "Draft")
        {
            a.Status = "Draft";
            return;
        }

        // Draft stays a draft; publish goes to admin review unless verification is disabled.
        var needsReview = await VerificationSettings.RequiresAnnouncementReviewAsync(_db, a.CenterUserId);
        a.Status = needsReview ? "Pending" : "Published";
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var a = await _db.Announcements.FindAsync(id);
        if (a is null) return NotFound();
        if (a.CenterUserId != MyId) return Forbid();

        _db.Announcements.Remove(a);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // Doctor marks interest (idempotent) — also auto-joins training group chat if it exists
    [HttpPost("{id}/interest")]
    public async Task<IActionResult> AddInterest(int id)
    {
        if (IsCenter) return Forbid();

        var a = await _db.Announcements.FindAsync(id);
        if (a is null) return NotFound();

        var exists = await _db.Interests.AnyAsync(i => i.AnnouncementId == id && i.DoctorUserId == MyId);
        if (!exists)
        {
            _db.Interests.Add(new Interest { AnnouncementId = id, DoctorUserId = MyId });
            _db.Notifications.Add(new Notification
            {
                UserId = a.CenterUserId,
                Text = $"{MyName} დაინტერესდა თქვენი განცხადებით: „{a.Title}“"
            });
        }

        var group = await _db.ChatGroups.FirstOrDefaultAsync(g => g.AnnouncementId == id);
        if (group is not null)
        {
            var member = await _db.ChatGroupMembers.AnyAsync(m => m.GroupId == group.Id && m.UserId == MyId);
            if (!member)
            {
                _db.ChatGroupMembers.Add(new ChatGroupMember { GroupId = group.Id, UserId = MyId });
                _db.Notifications.Add(new Notification
                {
                    UserId = MyId,
                    Text = $"თქვენ დაემატეთ ტრენინგის ჯგუფს: „{group.Name}“"
                });
            }
        }

        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("{id}/interest")]
    public async Task<IActionResult> RemoveInterest(int id)
    {
        var interest = await _db.Interests
            .FirstOrDefaultAsync(i => i.AnnouncementId == id && i.DoctorUserId == MyId);
        if (interest is not null)
            _db.Interests.Remove(interest);

        var group = await _db.ChatGroups.FirstOrDefaultAsync(g => g.AnnouncementId == id);
        if (group is not null)
        {
            var member = await _db.ChatGroupMembers
                .FirstOrDefaultAsync(m => m.GroupId == group.Id && m.UserId == MyId);
            if (member is not null)
                _db.ChatGroupMembers.Remove(member);
        }

        await _db.SaveChangesAsync();
        return Ok();
    }

    // Doctor bookmarks / un-bookmarks an announcement
    [HttpPost("{id}/favorite")]
    public async Task<IActionResult> AddFavorite(int id)
    {
        if (IsCenter || IsAdmin) return Forbid();
        var exists = await _db.Favorites.AnyAsync(f => f.AnnouncementId == id && f.DoctorUserId == MyId);
        if (!exists)
        {
            _db.Favorites.Add(new Favorite { AnnouncementId = id, DoctorUserId = MyId });
            await _db.SaveChangesAsync();
        }
        return Ok();
    }

    [HttpDelete("{id}/favorite")]
    public async Task<IActionResult> RemoveFavorite(int id)
    {
        var fav = await _db.Favorites.FirstOrDefaultAsync(f => f.AnnouncementId == id && f.DoctorUserId == MyId);
        if (fav is not null)
        {
            _db.Favorites.Remove(fav);
            await _db.SaveChangesAsync();
        }
        return Ok();
    }

    // Owner center sees which doctors are interested
    [HttpGet("{id}/interested")]
    public async Task<IActionResult> GetInterested(int id)
    {
        var a = await _db.Announcements.FindAsync(id);
        if (a is null) return NotFound();
        if (a.CenterUserId != MyId) return Forbid();

        var doctors = await _db.Interests
            .Where(i => i.AnnouncementId == id)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new InterestedDoctorDto(
                i.DoctorUserId,
                i.Doctor!.DisplayName,
                i.Doctor.DoctorProfile!.Specialty,
                i.Doctor.DoctorProfile.City,
                i.Doctor.Email!,
                i.CreatedAt,
                _db.Certificates.Any(c => c.AnnouncementId == id && c.DoctorUserId == i.DoctorUserId)))
            .ToListAsync();

        return Ok(doctors);
    }

    // Owner center issues a certificate to a doctor for this announcement
    [HttpPost("{id}/certificate")]
    public async Task<IActionResult> IssueCertificate(int id, IssueCertificateDto dto)
    {
        var a = await _db.Announcements.FindAsync(id);
        if (a is null) return NotFound();
        if (a.CenterUserId != MyId) return Forbid();

        var existing = await _db.Certificates.FirstOrDefaultAsync(c => c.AnnouncementId == id && c.DoctorUserId == dto.DoctorUserId);
        if (existing is null)
        {
            _db.Certificates.Add(new Certificate
            {
                DoctorUserId = dto.DoctorUserId,
                AnnouncementId = id,
                Title = a.Title,
                Points = a.Points,
                CenterName = MyName,
                FileUrl = dto.FileUrl,
                FileName = dto.FileName
            });
            _db.Notifications.Add(new Notification
            {
                UserId = dto.DoctorUserId,
                Text = $"მიიღეთ სერტიფიკატი: „{a.Title}“ (+{a.Points} ქულა) 🎓"
            });
        }
        else
        {
            // Re-issue → replace the uploaded document.
            existing.FileUrl = dto.FileUrl;
            existing.FileName = dto.FileName;
        }
        await _db.SaveChangesAsync();
        return Ok();
    }

    // Owner center emails all interested doctors + creates in-app notifications
    [HttpPost("{id}/notify")]
    public async Task<IActionResult> Notify(int id, NotifyDto dto)
    {
        var a = await _db.Announcements.FindAsync(id);
        if (a is null) return NotFound();
        if (a.CenterUserId != MyId) return Forbid();

        var recipients = await _db.Interests
            .Where(i => i.AnnouncementId == id)
            .Select(i => new { i.DoctorUserId, i.Doctor!.Email })
            .ToListAsync();

        foreach (var r in recipients)
        {
            if (!string.IsNullOrWhiteSpace(r.Email))
                await _email.SendAsync(r.Email, dto.Subject, dto.Message);

            _db.Notifications.Add(new Notification
            {
                UserId = r.DoctorUserId,
                Text = $"„{a.Title}“ — {dto.Subject}"
            });
        }
        await _db.SaveChangesAsync();

        return Ok(new { sent = recipients.Count });
    }
}
