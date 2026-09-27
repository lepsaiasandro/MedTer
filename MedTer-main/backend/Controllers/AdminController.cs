using System.Security.Claims;
using backend.Data;
using backend.Dtos;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _users;

    public AdminController(AppDbContext db, UserManager<ApplicationUser> users)
    {
        _db = db;
        _users = users;
    }

    private bool IsAdmin => User.FindFirstValue(ClaimTypes.Role) == UserRole.Admin.ToString();
    private string MyId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet("users/pending")]
    public async Task<IActionResult> GetPendingUsers()
    {
        if (!IsAdmin) return Forbid();

        var list = await _db.Users
            .AsNoTracking()
            .Where(u => u.VerificationStatus == VerificationStatus.Pending && u.Role != UserRole.Admin)
            .OrderBy(u => u.CreatedAt)
            .Select(u => new PendingUserDto(
                u.Id,
                u.Email!,
                u.DisplayName,
                u.Role.ToString(),
                u.Role == UserRole.Doctor ? u.DoctorProfile!.City : u.TrainingCenterProfile!.City,
                u.Role == UserRole.Doctor ? u.DoctorProfile!.Phone : u.TrainingCenterProfile!.Phone,
                u.Role == UserRole.Doctor ? u.DoctorProfile!.Specialty : null,
                u.CreatedAt,
                u.IsApproved,
                u.VerificationStatus.ToString(),
                u.ProfilePhotoUrl,
                u.RejectionReason))
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        if (!IsAdmin) return Forbid();

        var list = await _db.Users
            .AsNoTracking()
            .Where(u => u.Role != UserRole.Admin)
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new AdminUserDto(
                u.Id,
                u.Email!,
                u.DisplayName,
                u.Role.ToString(),
                u.Role == UserRole.Doctor ? u.DoctorProfile!.City : u.TrainingCenterProfile!.City,
                u.Role == UserRole.Doctor ? u.DoctorProfile!.Phone : u.TrainingCenterProfile!.Phone,
                u.Role == UserRole.Doctor ? u.DoctorProfile!.Specialty : null,
                u.IsApproved,
                u.CreatedAt,
                u.VerificationStatus.ToString(),
                u.ProfilePhotoUrl,
                u.RejectionReason))
            .ToListAsync();

        return Ok(list);
    }

    [HttpPost("users/{id}/approve")]
    public async Task<IActionResult> ApproveUser(string id)
    {
        if (!IsAdmin) return Forbid();

        var user = await _users.FindByIdAsync(id);
        if (user is null) return NotFound();
        if (user.Role == UserRole.Admin) return BadRequest("Cannot change admin approval.");

        user.SetVerification(VerificationStatus.Approved);
        _db.Notifications.Add(new Notification
        {
            UserId = user.Id,
            Text = "თქვენი ანგარიში დამტკიცდა. შეგიძლიათ შეხვიდეთ სისტემაში ✓"
        });
        await _db.SaveChangesAsync();
        return Ok();
    }

    /// <summary>Reject registration — account is kept so the user sees a rejection popup and can appeal by email.</summary>
    [HttpPost("users/{id}/reject")]
    public async Task<IActionResult> RejectUser(string id, RejectDto? dto)
    {
        if (!IsAdmin) return Forbid();

        var user = await _users.FindByIdAsync(id);
        if (user is null) return NotFound();
        if (user.Role == UserRole.Admin) return BadRequest("Cannot reject admin.");

        var reason = (dto?.Reason ?? "").Trim();
        user.SetVerification(VerificationStatus.Rejected, reason);

        var text = string.IsNullOrWhiteSpace(reason)
            ? "თქვენი რეგისტრაცია უარყოფილია. შეგიძლიათ გაასაჩივროთ ელფოსტით."
            : $"თქვენი რეგისტრაცია უარყოფილია: {reason}. შეგიძლიათ გაასაჩივროთ ელფოსტით.";

        _db.Notifications.Add(new Notification
        {
            UserId = user.Id,
            Text = text
        });
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("users/{id}/suspend")]
    public async Task<IActionResult> SuspendUser(string id, RejectDto? dto)
    {
        if (!IsAdmin) return Forbid();

        var user = await _users.FindByIdAsync(id);
        if (user is null) return NotFound();
        if (user.Role == UserRole.Admin) return BadRequest("Cannot suspend admin.");

        var reason = (dto?.Reason ?? "").Trim();
        user.SetVerification(VerificationStatus.Suspended, reason);

        var text = string.IsNullOrWhiteSpace(reason)
            ? "თქვენი ანგარიში შეჩერებულია. შეგიძლიათ გაასაჩივროთ ელფოსტით."
            : $"თქვენი ანგარიში შეჩერებულია: {reason}. შეგიძლიათ გაასაჩივროთ ელფოსტით.";

        _db.Notifications.Add(new Notification
        {
            UserId = user.Id,
            Text = text
        });
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(string id) => await DeleteUserCore(id);

    private async Task<IActionResult> DeleteUserCore(string id)
    {
        if (!IsAdmin) return Forbid();
        if (id == MyId) return BadRequest("Cannot delete your own admin account.");

        var user = await _users.Users
            .Include(u => u.DoctorProfile)
            .Include(u => u.TrainingCenterProfile)
            .FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();
        if (user.Role == UserRole.Admin) return BadRequest("Cannot delete admin.");

        // Clear NoAction FK rows before deleting the user.
        var certs = await _db.Certificates.Where(c => c.DoctorUserId == id).ToListAsync();
        _db.Certificates.RemoveRange(certs);

        var ratings = await _db.Ratings
            .Where(r => r.DoctorUserId == id || r.CenterUserId == id).ToListAsync();
        _db.Ratings.RemoveRange(ratings);

        var interests = await _db.Interests.Where(i => i.DoctorUserId == id).ToListAsync();
        _db.Interests.RemoveRange(interests);

        var favorites = await _db.Favorites.Where(f => f.DoctorUserId == id).ToListAsync();
        _db.Favorites.RemoveRange(favorites);

        var messages = await _db.Messages
            .Where(m => m.SenderId == id || m.ReceiverId == id).ToListAsync();
        _db.Messages.RemoveRange(messages);

        var notifs = await _db.Notifications.Where(n => n.UserId == id).ToListAsync();
        _db.Notifications.RemoveRange(notifs);

        var profileChanges = await _db.ProfileChangeRequests.Where(r => r.UserId == id).ToListAsync();
        _db.ProfileChangeRequests.RemoveRange(profileChanges);

        // Center announcements cascade from CenterUserId; remove explicitly for clarity.
        if (user.Role == UserRole.TrainingCenter)
        {
            var announcements = await _db.Announcements.Where(a => a.CenterUserId == id).ToListAsync();
            _db.Announcements.RemoveRange(announcements);
        }

        if (user.DoctorProfile is not null)
            _db.DoctorProfiles.Remove(user.DoctorProfile);
        if (user.TrainingCenterProfile is not null)
            _db.TrainingCenterProfiles.Remove(user.TrainingCenterProfile);

        await _db.SaveChangesAsync();

        var result = await _users.DeleteAsync(user);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        return Ok();
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        if (!IsAdmin) return Forbid();
        var s = await VerificationSettings.GetAsync(_db);
        return Ok(new AppSettingsDto(s.UserVerificationEnabled, s.AnnouncementVerificationEnabled));
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings(UpdateAppSettingsDto dto)
    {
        if (!IsAdmin) return Forbid();

        var s = await VerificationSettings.GetAsync(_db);
        var prevAnnouncement = s.AnnouncementVerificationEnabled;
        var prevUser = s.UserVerificationEnabled;

        if (dto.UserVerificationEnabled.HasValue)
            s.UserVerificationEnabled = dto.UserVerificationEnabled.Value;
        if (dto.AnnouncementVerificationEnabled.HasValue)
            s.AnnouncementVerificationEnabled = dto.AnnouncementVerificationEnabled.Value;

        // Turning off announcement verification → publish everything waiting in the queue.
        if (prevAnnouncement && !s.AnnouncementVerificationEnabled)
        {
            var pending = await _db.Announcements.Where(a => a.Status == "Pending").ToListAsync();
            foreach (var a in pending)
            {
                a.Status = "Published";
                a.RejectionReason = null;
                _db.Notifications.Add(new Notification
                {
                    UserId = a.CenterUserId,
                    Text = $"თქვენი განცხადება „{a.Title}“ ავტომატურად გამოქვეყნდა (ვერიფიკაცია გამორთულია) ✓"
                });
            }
        }

        // Turning off user verification → approve everyone still pending.
        if (prevUser && !s.UserVerificationEnabled)
        {
            var pendingUsers = await _db.Users
                .Where(u => u.Role != UserRole.Admin && u.VerificationStatus == VerificationStatus.Pending)
                .ToListAsync();
            foreach (var u in pendingUsers)
            {
                u.SetVerification(VerificationStatus.Approved);
                _db.Notifications.Add(new Notification
                {
                    UserId = u.Id,
                    Text = "თქვენი ანგარიში დამტკიცდა (ვერიფიკაცია გამორთულია) ✓"
                });
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new AppSettingsDto(s.UserVerificationEnabled, s.AnnouncementVerificationEnabled));
    }

    [HttpGet("announcements")]
    public async Task<IActionResult> GetAllAnnouncements()
    {
        if (!IsAdmin) return Forbid();

        var list = await _db.Announcements
            .AsNoTracking()
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new AnnouncementDto(
                a.Id, a.Title, a.Type, a.Category, a.Format, a.ShortDescription, a.Description,
                a.City, a.Duration, a.Language, a.Points, a.Price, a.Seats, a.ImageUrl,
                a.StartDate, a.RegistrationDeadline, a.Status, a.RejectionReason,
                a.CenterUserId, a.Center!.DisplayName,
                a.Interests.Count, false, false, a.CreatedAt))
            .ToListAsync();

        return Ok(list);
    }

    [HttpDelete("announcements/{id}")]
    public async Task<IActionResult> DeleteAnnouncement(int id)
    {
        if (!IsAdmin) return Forbid();

        var a = await _db.Announcements.FindAsync(id);
        if (a is null) return NotFound();

        _db.Announcements.Remove(a);
        await _db.SaveChangesAsync();
        return Ok();
    }

    /// <summary>
    /// Send an in-app notification to one user, or to all / doctors / centers.
    /// </summary>
    [HttpPost("notifications")]
    public async Task<IActionResult> SendNotification(AdminNotifyDto dto)
    {
        if (!IsAdmin) return Forbid();

        var text = (dto.Message ?? "").Trim();
        if (string.IsNullOrWhiteSpace(text))
            return BadRequest("Message is required.");
        if (text.Length > 1000)
            return BadRequest("Message is too long (max 1000).");

        List<string> recipientIds;

        if (!string.IsNullOrWhiteSpace(dto.UserId))
        {
            var target = await _db.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == dto.UserId && u.Role != UserRole.Admin);
            if (target is null) return NotFound("User not found.");
            recipientIds = [target.Id];
        }
        else
        {
            var q = _db.Users.AsNoTracking().Where(u => u.Role != UserRole.Admin && u.IsApproved);
            var audience = (dto.Audience ?? "all").Trim().ToLowerInvariant();
            q = audience switch
            {
                "doctors" or "doctor" => q.Where(u => u.Role == UserRole.Doctor),
                "centers" or "trainingcenter" or "training-center" => q.Where(u => u.Role == UserRole.TrainingCenter),
                _ => q
            };
            recipientIds = await q.Select(u => u.Id).ToListAsync();
        }

        if (recipientIds.Count == 0)
            return Ok(new { sent = 0 });

        var now = DateTime.UtcNow;
        _db.Notifications.AddRange(recipientIds.Select(id => new Notification
        {
            UserId = id,
            Text = text,
            CreatedAt = now,
            IsRead = false
        }));
        await _db.SaveChangesAsync();

        return Ok(new { sent = recipientIds.Count });
    }

    [HttpGet("profile-changes")]
    public async Task<IActionResult> GetPendingProfileChanges()
    {
        if (!IsAdmin) return Forbid();

        var list = await _db.ProfileChangeRequests
            .AsNoTracking()
            .Where(r => r.Status == "Pending")
            .OrderBy(r => r.SubmittedAt)
            .Select(r => new ProfileChangeRequestDto(
                r.Id,
                r.UserId,
                r.User!.Email!,
                r.User.DisplayName,
                r.User.Role.ToString(),
                r.User.DoctorProfile != null ? r.User.DoctorProfile.FirstName : null,
                r.User.DoctorProfile != null ? r.User.DoctorProfile.LastName : null,
                r.User.DoctorProfile != null ? r.User.DoctorProfile.Specialty : null,
                r.User.TrainingCenterProfile != null ? r.User.TrainingCenterProfile.Name : null,
                r.User.TrainingCenterProfile != null ? r.User.TrainingCenterProfile.Description : null,
                r.User.Role == UserRole.Doctor
                    ? (r.User.DoctorProfile != null ? r.User.DoctorProfile.City : null)
                    : (r.User.TrainingCenterProfile != null ? r.User.TrainingCenterProfile.City : null),
                r.User.Role == UserRole.Doctor
                    ? (r.User.DoctorProfile != null ? r.User.DoctorProfile.Phone : null)
                    : (r.User.TrainingCenterProfile != null ? r.User.TrainingCenterProfile.Phone : null),
                r.FirstName,
                r.LastName,
                r.Specialty,
                r.CenterName,
                r.Description,
                r.City,
                r.Phone,
                r.SubmittedAt))
            .ToListAsync();

        return Ok(list);
    }

    [HttpPost("profile-changes/{id:int}/approve")]
    public async Task<IActionResult> ApproveProfileChange(int id)
    {
        if (!IsAdmin) return Forbid();

        var req = await _db.ProfileChangeRequests
            .Include(r => r.User!).ThenInclude(u => u.DoctorProfile)
            .Include(r => r.User!).ThenInclude(u => u.TrainingCenterProfile)
            .FirstOrDefaultAsync(r => r.Id == id && r.Status == "Pending");

        if (req is null) return NotFound();
        var user = req.User;
        if (user is null) return NotFound();

        if (user.Role == UserRole.Doctor)
        {
            if (user.DoctorProfile is null) return BadRequest("Doctor profile missing.");
            user.DoctorProfile.FirstName = (req.FirstName ?? "").Trim();
            user.DoctorProfile.LastName = (req.LastName ?? "").Trim();
            user.DoctorProfile.Specialty = string.IsNullOrWhiteSpace(req.Specialty) ? null : req.Specialty.Trim();
            user.DoctorProfile.City = string.IsNullOrWhiteSpace(req.City) ? null : req.City.Trim();
            user.DoctorProfile.Phone = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim();
            user.DisplayName = $"{user.DoctorProfile.FirstName} {user.DoctorProfile.LastName}".Trim();
        }
        else if (user.Role == UserRole.TrainingCenter)
        {
            if (user.TrainingCenterProfile is null) return BadRequest("Center profile missing.");
            user.TrainingCenterProfile.Name = (req.CenterName ?? "").Trim();
            user.TrainingCenterProfile.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
            user.TrainingCenterProfile.City = string.IsNullOrWhiteSpace(req.City) ? null : req.City.Trim();
            user.TrainingCenterProfile.Phone = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim();
            user.DisplayName = user.TrainingCenterProfile.Name;
        }
        else
        {
            return BadRequest("Unsupported role.");
        }

        req.Status = "Approved";
        req.ResolvedAt = DateTime.UtcNow;

        _db.Notifications.Add(new Notification
        {
            UserId = user.Id,
            Text = "პროფილის ცვლილება დამტკიცდა ✓"
        });

        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("profile-changes/{id:int}/reject")]
    public async Task<IActionResult> RejectProfileChange(int id, RejectDto? dto)
    {
        if (!IsAdmin) return Forbid();

        var req = await _db.ProfileChangeRequests
            .FirstOrDefaultAsync(r => r.Id == id && r.Status == "Pending");
        if (req is null) return NotFound();

        var reason = (dto?.Reason ?? "").Trim();
        req.Status = "Rejected";
        req.RejectionReason = string.IsNullOrWhiteSpace(reason) ? null : reason;
        req.ResolvedAt = DateTime.UtcNow;

        var text = string.IsNullOrWhiteSpace(reason)
            ? "პროფილის ცვლილება უარყოფილია."
            : $"პროფილის ცვლილება უარყოფილია: {reason}";

        _db.Notifications.Add(new Notification
        {
            UserId = req.UserId,
            Text = text
        });

        await _db.SaveChangesAsync();
        return Ok();
    }
}
