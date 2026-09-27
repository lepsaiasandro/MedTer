namespace backend.Dtos;

public record RegisterTrainingCenterDto(
    string Email,
    string Password,
    string Name,
    string? Description,
    string? City,
    string? Phone,
    string? ProfilePhotoUrl = null);

public record RegisterDoctorDto(
    string Email,
    string Password,
    string FirstName,
    string LastName,
    string? Specialty,
    string? City,
    string? Phone,
    string? ProfilePhotoUrl = null);

public record LoginDto(string Email, string Password);

public record AuthResponseDto(
    string Token,
    string UserId,
    string DisplayName,
    string Role,
    string? ProfilePhotoUrl = null);

public record RegisterPendingDto(string Message, string Email, string Role);

/// <summary>Returned on login when the account cannot sign in yet.</summary>
public record LoginBlockedDto(
    string Message,
    string Status,
    string? RejectionReason = null,
    string AppealEmail = "admin@medter.ge");

public record PendingUserDto(
    string Id,
    string Email,
    string DisplayName,
    string Role,
    string? City,
    string? Phone,
    string? Specialty,
    DateTime CreatedAt,
    bool IsApproved = false,
    string VerificationStatus = "Pending",
    string? ProfilePhotoUrl = null,
    string? RejectionReason = null);

public record AdminUserDto(
    string Id,
    string Email,
    string DisplayName,
    string Role,
    string? City,
    string? Phone,
    string? Specialty,
    bool IsApproved,
    DateTime CreatedAt,
    string VerificationStatus = "Pending",
    string? ProfilePhotoUrl = null,
    string? RejectionReason = null);

public record UpdatePhotoDto(string? ProfilePhotoUrl);

public record AppSettingsDto(
    bool UserVerificationEnabled,
    bool AnnouncementVerificationEnabled);

public record UpdateAppSettingsDto(
    bool? UserVerificationEnabled = null,
    bool? AnnouncementVerificationEnabled = null);

public record CenterVerificationSettingsDto(
    bool AnnouncementVerificationEnabled,
    bool GlobalAnnouncementVerificationEnabled);

public record UpdateCenterVerificationDto(bool AnnouncementVerificationEnabled);
