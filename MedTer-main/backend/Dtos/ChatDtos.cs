namespace backend.Dtos;

public record UserListItemDto(string Id, string DisplayName, string Role, string? City);

public record ConversationDto(
    string Id,
    string DisplayName,
    string Role,
    string? City,
    DateTime? LastMessageAt,
    int UnreadCount);

public record MessageDto(int Id, string SenderId, string ReceiverId, string Text, DateTime SentAt);

public record TrainingCenterDto(
    string UserId,
    string Name,
    string? Description,
    string? City,
    string? Phone,
    double AverageRating,
    int RatingCount,
    int? MyRating);

public record RateDto(int Stars);
