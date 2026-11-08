using System.Security.Cryptography;
using System.Text;
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
    private const int CodeLifetimeMinutes = 15;
    private const int ResendCooldownSeconds = 60;
    private const int MaxCodeAttempts = 5;

    private readonly UserManager<ApplicationUser> _users;
    private readonly TokenService _tokens;
    private readonly IConfiguration _config;
    private readonly AppDbContext _db;
    private readonly IEmailSender _email;
    private readonly IHostEnvironment _env;

    public AuthController(
        UserManager<ApplicationUser> users,
        TokenService tokens,
        IConfiguration config,
        AppDbContext db,
        IEmailSender email,
        IHostEnvironment env)
    {
        _users = users;
        _tokens = tokens;
        _config = config;
        _db = db;
        _email = email;
        _env = env;
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

        return await SendCodeResponse(user);
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

        return await SendCodeResponse(user);
    }

    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail(VerifyEmailDto dto)
    {
        var user = await _users.FindByEmailAsync(dto.Email.Trim());
        if (user is null || user.EmailConfirmed)
            return BadRequest(new { message = "Invalid or expired code." });

        if (user.EmailVerificationAttempts >= MaxCodeAttempts
            || user.EmailVerificationCodeHash is null
            || user.EmailVerificationCodeExpiresUtc is null
            || user.EmailVerificationCodeExpiresUtc < DateTime.UtcNow)
        {
            return BadRequest(new { message = "Invalid or expired code. Request a new one." });
        }

        var code = new string((dto.Code ?? "").Where(char.IsDigit).ToArray());
        var hash = HashCode(user.Id, code);
        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(hash),
                Encoding.UTF8.GetBytes(user.EmailVerificationCodeHash)))
        {
            user.EmailVerificationAttempts++;
            await _users.UpdateAsync(user);
            return BadRequest(new { message = "Invalid or expired code." });
        }

        user.EmailConfirmed = true;
        user.EmailVerificationCodeHash = null;
        user.EmailVerificationCodeExpiresUtc = null;
        user.EmailVerificationAttempts = 0;
        await _users.UpdateAsync(user);

        if (!user.IsApproved && user.Role != UserRole.Admin)
        {
            return Ok(new EmailVerifiedPendingDto(
                "Email confirmed. An administrator still has to approve your account before you can sign in."));
        }

        return Ok(Respond(user));
    }

    [HttpPost("resend-email-code")]
    public async Task<IActionResult> ResendEmailCode(ResendEmailCodeDto dto)
    {
        var user = await _users.FindByEmailAsync(dto.Email.Trim());
        if (user is null || user.EmailConfirmed)
            return Ok(new { message = "If this account still needs a code, a new one was sent." });

        if (user.EmailVerificationSentUtc is not null
            && user.EmailVerificationSentUtc.Value.AddSeconds(ResendCooldownSeconds) > DateTime.UtcNow)
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new
            {
                message = "Wait a minute before requesting another code."
            });
        }

        var code = await IssueCodeAsync(user);
        return Ok(new
        {
            message = "A new code was sent.",
            devCode = _env.IsDevelopment() ? code : null
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var user = await _users.FindByEmailAsync(dto.Email);
        if (user is null || !await _users.CheckPasswordAsync(user, dto.Password))
            return Unauthorized(new { message = "Invalid email or password" });

        if (user.Role == UserRole.Admin)
            return Ok(Respond(user));

        if (!user.EmailConfirmed)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new LoginBlockedDto(
                "Confirm your email with the 6-digit code we sent.",
                "EmailUnconfirmed",
                null,
                AppealEmail));
        }

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

    private async Task<IActionResult> SendCodeResponse(ApplicationUser user)
    {
        var code = await IssueCodeAsync(user);
        return Ok(new RegisterPendingDto(
            "We sent a 6-digit code to your email. Enter it to verify the address.",
            user.Email!,
            user.Role.ToString(),
            RequiresEmailCode: true,
            DevCode: _env.IsDevelopment() ? code : null));
    }

    private async Task<string> IssueCodeAsync(ApplicationUser user)
    {
        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        user.EmailConfirmed = false;
        user.EmailVerificationCodeHash = HashCode(user.Id, code);
        user.EmailVerificationCodeExpiresUtc = DateTime.UtcNow.AddMinutes(CodeLifetimeMinutes);
        user.EmailVerificationSentUtc = DateTime.UtcNow;
        user.EmailVerificationAttempts = 0;
        await _users.UpdateAsync(user);

        await _email.SendAsync(
            user.Email!,
            "MedTer verification code",
            $"Your MedTer verification code is {code}. It expires in {CodeLifetimeMinutes} minutes.");
        return code;
    }

    private static string HashCode(string userId, string code) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{userId}:{code}")));

    private AuthResponseDto Respond(ApplicationUser user) =>
        new(_tokens.CreateToken(user), user.Id, user.DisplayName, user.Role.ToString(), user.ProfilePhotoUrl);
}
