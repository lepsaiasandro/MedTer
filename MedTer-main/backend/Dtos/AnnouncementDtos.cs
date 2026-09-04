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
    bool IsFavorite);

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
