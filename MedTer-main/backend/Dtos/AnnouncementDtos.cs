namespace backend.Dtos;

public record CreateAnnouncementDto(
    string Title,
    string? Type,
    string? Category,
    string? Format,
    string? ShortDescription,
    string? Description,
    string? City,
    string? Duration,
    string? Language,
    int Points,
    int Price,
    int? Seats,
    string? ImageUrl,
    DateTime? StartDate,
    DateTime? RegistrationDeadline,
    string? Status);

public record AnnouncementDto(
    int Id,
    string Title,
    string? Type,
    string? Category,
    string? Format,
    string? ShortDescription,
    string? Description,
    string? City,
    string? Duration,
    string? Language,
    int Points,
    int Price,
    int? Seats,
    string? ImageUrl,
    DateTime? StartDate,
    DateTime? RegistrationDeadline,
    string Status,
    string? RejectionReason,
    string CenterUserId,
    string CenterName,
    int InterestedCount,
    bool IsInterested,
    bool IsFavorite,
    DateTime CreatedAt = default,
    bool HasGroupChat = false);

// A doctor who marked interest (shown to the owning center).
public record InterestedDoctorDto(
    string UserId,
    string DisplayName,
    string? Specialty,
    string? City,
    string Email,
    DateTime InterestedAt,
    bool HasCertificate);

public record NotifyDto(string Subject, string Message);

public record AdminNotifyDto(
    string Message,
    /// <summary>If set, notify only this user. Otherwise use Audience.</summary>
    string? UserId = null,
    /// <summary>all | doctors | centers — used when UserId is empty.</summary>
    string Audience = "all");

public record NotificationDto(int Id, string Text, bool IsRead, DateTime CreatedAt);

public record RejectDto(string Reason);

public record IssueCertificateDto(string DoctorUserId, string? FileUrl, string? FileName);

public record CertificateDto(
    int Id,
    string Title,
    int Points,
    string CenterName,
    DateTime IssuedAt,
    int? AnnouncementId,
    string? FileUrl,
    string? FileName);

public record LeaderboardEntryDto(string DoctorUserId, string DisplayName, int TotalPoints, int Certificates);

public record ProfileCertificateDto(
    int Id,
    string Title,
    int Points,
    string CenterName,
    DateTime IssuedAt,
    string? FileUrl,
    string? FileName);

public record PendingProfileChangeDto(
    int Id,
    string? FirstName,
    string? LastName,
    string? Specialty,
    string? CenterName,
    string? Description,
    string? City,
    string? Phone,
    DateTime SubmittedAt);

public record UpdateProfileDto(
    string? FirstName,
    string? LastName,
    string? Specialty,
    string? CenterName,
    string? Description,
    string? City,
    string? Phone);

public record ProfileChangeRequestDto(
    int Id,
    string UserId,
    string Email,
    string DisplayName,
    string Role,
    string? CurrentFirstName,
    string? CurrentLastName,
    string? CurrentSpecialty,
    string? CurrentCenterName,
    string? CurrentDescription,
    string? CurrentCity,
    string? CurrentPhone,
    string? ProposedFirstName,
    string? ProposedLastName,
    string? ProposedSpecialty,
    string? ProposedCenterName,
    string? ProposedDescription,
    string? ProposedCity,
    string? ProposedPhone,
    DateTime SubmittedAt);

public record MeProfileDto(
    string UserId,
    string Email,
    string DisplayName,
    string Role,
    bool IsApproved,
    DateTime CreatedAt,
    // Doctor fields
    string? FirstName,
    string? LastName,
    string? Specialty,
    // Center fields
    string? CenterName,
    string? Description,
    // Shared contact
    string? City,
    string? Phone,
    // Stats
    int TotalPoints,
    int CertificateCount,
    int? LeaderboardRank,
    int InterestsCount,
    int AnnouncementsPublished,
    int AnnouncementsPending,
    double AverageRating,
    int RatingCount,
    IReadOnlyList<ProfileCertificateDto> Certificates,
    PendingProfileChangeDto? PendingChange = null,
    string VerificationStatus = "Pending",
    string? ProfilePhotoUrl = null,
    string? RejectionReason = null,
    /// <summary>Center-only: whether this center requires admin review of trainings.</summary>
    bool? AnnouncementVerificationEnabled = null,
    /// <summary>Platform-wide: whether announcement verification is enabled by admin.</summary>
    bool GlobalAnnouncementVerificationEnabled = true,
    /// <summary>Platform-wide: whether user registration verification is enabled.</summary>
    bool UserVerificationEnabled = true);
