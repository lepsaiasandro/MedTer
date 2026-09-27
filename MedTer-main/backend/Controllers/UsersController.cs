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
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public UsersController(AppDbContext db) => _db = db;

    // Returns users of the opposite role (who you can chat with)
    [HttpGet]
    public async Task<IActionResult> GetContacts()
    {
        var myId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var myRole = Enum.Parse<UserRole>(User.FindFirstValue(ClaimTypes.Role)!);
        var otherRole = myRole == UserRole.Doctor ? UserRole.TrainingCenter : UserRole.Doctor;

        var users = await _db.Users
            .Where(u => u.Role == otherRole && u.Id != myId && u.IsApproved)
            .Select(u => new UserListItemDto(
                u.Id,
                u.DisplayName,
                u.Role.ToString(),
                u.Role == UserRole.Doctor ? u.DoctorProfile!.City : u.TrainingCenterProfile!.City,
                u.ProfilePhotoUrl))
            .ToListAsync();

        return Ok(users);
    }

    // Current user's profile — details, CPD score, certificates, center stats
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var myId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var user = await _db.Users
            .AsNoTracking()
            .Include(u => u.DoctorProfile)
            .Include(u => u.TrainingCenterProfile)
            .FirstOrDefaultAsync(u => u.Id == myId);

        if (user is null) return NotFound();

        var certs = await _db.Certificates
            .AsNoTracking()
            .Where(c => c.DoctorUserId == myId)
            .OrderByDescending(c => c.IssuedAt)
            .Select(c => new ProfileCertificateDto(
                c.Id, c.Title, c.Points, c.CenterName, c.IssuedAt, c.FileUrl, c.FileName))
            .ToListAsync();

        var totalPoints = certs.Sum(c => c.Points);
        int? rank = null;
        if (user.Role == UserRole.Doctor)
        {
            var totals = await _db.Certificates
                .AsNoTracking()
                .GroupBy(c => c.DoctorUserId)
                .Select(g => new { UserId = g.Key, Points = g.Sum(x => x.Points) })
                .OrderByDescending(x => x.Points)
                .ToListAsync();
            var idx = totals.FindIndex(t => t.UserId == myId);
            if (idx >= 0) rank = idx + 1;
            else if (certs.Count == 0) rank = null;
        }

        var interestsCount = user.Role == UserRole.Doctor
            ? await _db.Interests.CountAsync(i => i.DoctorUserId == myId)
            : 0;

        var published = 0;
        var pending = 0;
        double avgRating = 0;
        var ratingCount = 0;
        if (user.Role == UserRole.TrainingCenter)
        {
            published = await _db.Announcements.CountAsync(a => a.CenterUserId == myId && a.Status == "Published");
            pending = await _db.Announcements.CountAsync(a => a.CenterUserId == myId && a.Status == "Pending");
            ratingCount = await _db.Ratings.CountAsync(r => r.CenterUserId == myId);
            avgRating = ratingCount == 0
                ? 0
                : await _db.Ratings.Where(r => r.CenterUserId == myId).AverageAsync(r => (double)r.Stars);
        }

        var pendingChange = await _db.ProfileChangeRequests
            .AsNoTracking()
            .Where(r => r.UserId == myId && r.Status == "Pending")
            .OrderByDescending(r => r.SubmittedAt)
            .Select(r => new PendingProfileChangeDto(
                r.Id, r.FirstName, r.LastName, r.Specialty,
                r.CenterName, r.Description, r.City, r.Phone, r.SubmittedAt))
            .FirstOrDefaultAsync();

        var appSettings = await VerificationSettings.GetAsync(_db);

        return Ok(new MeProfileDto(
            user.Id,
            user.Email ?? "",
            user.DisplayName,
            user.Role.ToString(),
            user.IsApproved,
            user.CreatedAt,
            user.DoctorProfile?.FirstName,
            user.DoctorProfile?.LastName,
            user.DoctorProfile?.Specialty,
            user.TrainingCenterProfile?.Name,
            user.TrainingCenterProfile?.Description,
            user.Role == UserRole.Doctor ? user.DoctorProfile?.City : user.TrainingCenterProfile?.City,
            user.Role == UserRole.Doctor ? user.DoctorProfile?.Phone : user.TrainingCenterProfile?.Phone,
            totalPoints,
            certs.Count,
            rank,
            interestsCount,
            published,
            pending,
            Math.Round(avgRating, 1),
            ratingCount,
            certs,
            pendingChange,
            user.VerificationStatus.ToString(),
            user.ProfilePhotoUrl,
            user.RejectionReason,
            user.Role == UserRole.TrainingCenter
                ? user.TrainingCenterProfile?.AnnouncementVerificationEnabled ?? true
                : null,
            appSettings.AnnouncementVerificationEnabled,
            appSettings.UserVerificationEnabled));
    }

    /// <summary>Training center: toggle whether own trainings need admin verification.</summary>
    [HttpGet("me/verification-settings")]
    public async Task<IActionResult> GetVerificationSettings()
    {
        var myId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var role = User.FindFirstValue(ClaimTypes.Role);

        var global = await VerificationSettings.GetAsync(_db);

        if (role == UserRole.Admin.ToString())
            return Ok(new AppSettingsDto(global.UserVerificationEnabled, global.AnnouncementVerificationEnabled));

        if (role != UserRole.TrainingCenter.ToString())
            return Forbid();

        var profile = await _db.TrainingCenterProfiles.AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == myId);
        if (profile is null) return NotFound();

        return Ok(new CenterVerificationSettingsDto(
            profile.AnnouncementVerificationEnabled,
            global.AnnouncementVerificationEnabled));
    }

    [HttpPut("me/verification-settings")]
    public async Task<IActionResult> UpdateVerificationSettings(UpdateCenterVerificationDto dto)
    {
        var myId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var role = User.FindFirstValue(ClaimTypes.Role);
        if (role != UserRole.TrainingCenter.ToString()) return Forbid();

        var profile = await _db.TrainingCenterProfiles
            .FirstOrDefaultAsync(p => p.UserId == myId);
        if (profile is null) return NotFound();

        var wasOn = profile.AnnouncementVerificationEnabled;
        profile.AnnouncementVerificationEnabled = dto.AnnouncementVerificationEnabled;

        // Center turned verification off → publish their pending trainings immediately.
        if (wasOn && !dto.AnnouncementVerificationEnabled)
        {
            var pending = await _db.Announcements
                .Where(a => a.CenterUserId == myId && a.Status == "Pending")
                .ToListAsync();
            foreach (var a in pending)
            {
                a.Status = "Published";
                a.RejectionReason = null;
            }
        }

        await _db.SaveChangesAsync();

        var global = await VerificationSettings.GetAsync(_db);
        return Ok(new CenterVerificationSettingsDto(
            profile.AnnouncementVerificationEnabled,
            global.AnnouncementVerificationEnabled));
    }

    /// <summary>Update profile photo immediately (no admin approval required).</summary>
    [HttpPut("me/photo")]
    public async Task<IActionResult> UpdatePhoto(UpdatePhotoDto dto)
    {
        var myId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == myId);
        if (user is null) return NotFound();

        var photo = dto.ProfilePhotoUrl?.Trim();
        if (string.IsNullOrWhiteSpace(photo))
        {
            user.ProfilePhotoUrl = null;
        }
        else
        {
            if (photo.Length > 2_500_000)
                return BadRequest("Profile photo is too large (max ~1.8MB).");
            user.ProfilePhotoUrl = photo;
        }

        await _db.SaveChangesAsync();
        return Ok(new { profilePhotoUrl = user.ProfilePhotoUrl });
    }

    /// <summary>
    /// Submit profile edits. Changes stay pending until an admin approves them.
    /// </summary>
    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe(UpdateProfileDto dto)
    {
        var myId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var user = await _db.Users
            .Include(u => u.DoctorProfile)
            .Include(u => u.TrainingCenterProfile)
            .FirstOrDefaultAsync(u => u.Id == myId);

        if (user is null) return NotFound();
        if (user.Role == UserRole.Admin)
            return BadRequest("Admin profile cannot be edited this way.");
        if (!user.IsApproved)
            return BadRequest("Account must be approved before editing profile.");

        string? firstName = null, lastName = null, specialty = null;
        string? centerName = null, description = null;
        string? city, phone;

        if (user.Role == UserRole.Doctor)
        {
            if (user.DoctorProfile is null) return BadRequest("Doctor profile missing.");
            firstName = (dto.FirstName ?? "").Trim();
            lastName = (dto.LastName ?? "").Trim();
            specialty = string.IsNullOrWhiteSpace(dto.Specialty) ? null : dto.Specialty.Trim();
            city = string.IsNullOrWhiteSpace(dto.City) ? null : dto.City.Trim();
            phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim();

            if (string.IsNullOrWhiteSpace(firstName) || string.IsNullOrWhiteSpace(lastName))
                return BadRequest("First name and last name are required.");

            var unchanged =
                firstName == user.DoctorProfile.FirstName
                && lastName == user.DoctorProfile.LastName
                && specialty == user.DoctorProfile.Specialty
                && city == user.DoctorProfile.City
                && phone == user.DoctorProfile.Phone;
            if (unchanged)
                return BadRequest("No changes detected.");
        }
        else if (user.Role == UserRole.TrainingCenter)
        {
            if (user.TrainingCenterProfile is null) return BadRequest("Center profile missing.");
            centerName = (dto.CenterName ?? "").Trim();
            description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
            city = string.IsNullOrWhiteSpace(dto.City) ? null : dto.City.Trim();
            phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim();

            if (string.IsNullOrWhiteSpace(centerName))
                return BadRequest("Center name is required.");

            var unchanged =
                centerName == user.TrainingCenterProfile.Name
                && description == user.TrainingCenterProfile.Description
                && city == user.TrainingCenterProfile.City
                && phone == user.TrainingCenterProfile.Phone;
            if (unchanged)
                return BadRequest("No changes detected.");
        }
        else
        {
            return BadRequest("Unsupported role.");
        }

        // Replace any existing pending request for this user.
        var existing = await _db.ProfileChangeRequests
            .Where(r => r.UserId == myId && r.Status == "Pending")
            .ToListAsync();
        if (existing.Count > 0)
            _db.ProfileChangeRequests.RemoveRange(existing);

        var req = new ProfileChangeRequest
        {
            UserId = myId,
            Status = "Pending",
            FirstName = firstName,
            LastName = lastName,
            Specialty = specialty,
            CenterName = centerName,
            Description = description,
            City = city,
            Phone = phone,
            SubmittedAt = DateTime.UtcNow
        };
        _db.ProfileChangeRequests.Add(req);

        _db.Notifications.Add(new Notification
        {
            UserId = myId,
            Text = "პროფილის ცვლილება გაგზავნილია ადმინისტრატორთან დასამტკიცებლად."
        });

        await _db.SaveChangesAsync();

        return Ok(new PendingProfileChangeDto(
            req.Id, req.FirstName, req.LastName, req.Specialty,
            req.CenterName, req.Description, req.City, req.Phone, req.SubmittedAt));
    }

    [HttpDelete("me/pending-change")]
    public async Task<IActionResult> CancelPendingChange()
    {
        var myId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var pending = await _db.ProfileChangeRequests
            .Where(r => r.UserId == myId && r.Status == "Pending")
            .ToListAsync();
        if (pending.Count == 0) return NotFound();

        _db.ProfileChangeRequests.RemoveRange(pending);
        await _db.SaveChangesAsync();
        return Ok();
    }
}
