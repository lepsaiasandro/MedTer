using backend.Data;
using backend.Dtos;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace backend.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly TokenService _tokens;
    private readonly IConfiguration _config;
    private readonly AppDbContext _db;

    public AuthController(
        UserManager<ApplicationUser> users,
        TokenService tokens,
        IConfiguration config,
        AppDbContext db)
    {
        _users = users;
        _tokens = tokens;
        _config = config;
        _db = db;
    }

    private string AppealEmail =>
        _config["Email:AppealTo"]
        ?? _config["Email:From"]
        ?? "admin@medter.ge";

    private static string? NormalizePhoto(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return null;
        var trimmed = url.Trim();
        if (trimmed.Length > 2_500_000)
            throw new InvalidOperationException("Profile photo is too large (max ~1.8MB).");
        return trimmed;
    }

    private async Task ApplyRegistrationVerification(ApplicationUser user)
    {
        var settings = await VerificationSettings.GetAsync(_db);
        user.SetVerification(settings.UserVerificationEnabled
            ? VerificationStatus.Pending
            : VerificationStatus.Approved);
    }

    [HttpPost("register/training-center")]
    public async Task<IActionResult> RegisterTrainingCenter(RegisterTrainingCenterDto dto)
    {
        string? photo;
        try { photo = NormalizePhoto(dto.ProfilePhotoUrl); }
        catch (InvalidOperationException ex) { return BadRequest(new[] { ex.Message }); }

        var user = new ApplicationUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            Role = UserRole.TrainingCenter,
            DisplayName = dto.Name,
            ProfilePhotoUrl = photo,
            CreatedAt = DateTime.UtcNow,
            TrainingCenterProfile = new TrainingCenterProfile
            {
                Name = dto.Name,
                Description = dto.Description,
                City = dto.City,
                Phone = dto.Phone,
                AnnouncementVerificationEnabled = true
            }
        };
        await ApplyRegistrationVerification(user);

        var result = await _users.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        if (user.IsApproved)
            return Ok(Respond(user));

        return Ok(new RegisterPendingDto(
            "Registration received. An administrator will approve your account before you can sign in.",
            user.Email!,
            user.Role.ToString()));
    }

    [HttpPost("register/doctor")]
    public async Task<IActionResult> RegisterDoctor(RegisterDoctorDto dto)
    {
        string? photo;
        try { photo = NormalizePhoto(dto.ProfilePhotoUrl); }
        catch (InvalidOperationException ex) { return BadRequest(new[] { ex.Message }); }

        var user = new ApplicationUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            Role = UserRole.Doctor,
            DisplayName = $"{dto.FirstName} {dto.LastName}".Trim(),
            ProfilePhotoUrl = photo,
            CreatedAt = DateTime.UtcNow,
            DoctorProfile = new DoctorProfile
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Specialty = dto.Specialty,
                City = dto.City,
                Phone = dto.Phone
            }
        };
        await ApplyRegistrationVerification(user);

        var result = await _users.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        if (user.IsApproved)
            return Ok(Respond(user));

        return Ok(new RegisterPendingDto(
            "Registration received. An administrator will approve your account before you can sign in.",
            user.Email!,
            user.Role.ToString()));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var user = await _users.FindByEmailAsync(dto.Email);
        if (user is null || !await _users.CheckPasswordAsync(user, dto.Password))
            return Unauthorized(new { message = "Invalid email or password" });

        if (user.Role == UserRole.Admin)
            return Ok(Respond(user));

        // Migrate legacy rows that only have IsApproved.
        if (user.VerificationStatus == VerificationStatus.Pending && user.IsApproved)
            user.SetVerification(VerificationStatus.Approved);

        if (user.VerificationStatus != VerificationStatus.Approved)
        {
            var (message, status) = user.VerificationStatus switch
            {
                VerificationStatus.Rejected => (
                    "Your registration was rejected. You can appeal by email.",
                    "Rejected"),
                VerificationStatus.Suspended => (
                    "Your account has been suspended. Contact support by email to appeal.",
                    "Suspended"),
                _ => (
                    "Your account is pending administrator approval.",
                    "Pending")
            };

            return StatusCode(StatusCodes.Status403Forbidden, new LoginBlockedDto(
                message,
                status,
                user.RejectionReason,
                AppealEmail));
        }

        return Ok(Respond(user));
    }

    private AuthResponseDto Respond(ApplicationUser user) =>
        new(_tokens.CreateToken(user), user.Id, user.DisplayName, user.Role.ToString(), user.ProfilePhotoUrl);
}
