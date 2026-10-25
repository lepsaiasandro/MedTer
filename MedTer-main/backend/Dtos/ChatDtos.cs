namespace backend.Dtos;

public record UserListItemDto(string Id, string DisplayName, string Role, string? City, string? ProfilePhotoUrl = null);

public record ConversationDto(
    string Id,
    string DisplayName,
    string Role,
    string? City,
    DateTime? LastMessageAt,
    int UnreadCount);

public record MessageDto(int Id, string SenderId, string ReceiverId, string Text, DateTime SentAt);

public record CreateGroupDto(int AnnouncementId);

public record ChatGroupDto(
    int Id,
    int AnnouncementId,
    string Name,
    string? AnnouncementType,
    string? City,
    int MemberCount,
    DateTime? LastMessageAt,
    string? LastMessagePreview,
    int UnreadCount,
    bool IsOwner,
    bool LastMessageUnsent = false);

public record ReactionUserDto(string UserId, string DisplayName);

public record MessageReactionDto(string Emoji, int Count, IReadOnlyList<ReactionUserDto> Users);

public record GroupMessageDto(
    int Id,
    int GroupId,
    string SenderId,
    string SenderName,
    string Text,
    DateTime SentAt,
    bool Unsent,
    IReadOnlyList<MessageReactionDto> Reactions);

public record GroupMessageUnsentDto(
    int MessageId,
    int GroupId,
    DateTime UnsentAt,
    string? LastMessagePreview,
    DateTime? LastMessageAt,
    bool LastMessageUnsent);

public record MessageReactionsUpdatedDto(
    int MessageId,
    int GroupId,
    IReadOnlyList<MessageReactionDto> Reactions);

public record GroupMemberDto(
    string UserId,
    string DisplayName,
    string Role,
    string? City);

public record CreatableAnnouncementDto(
    int Id,
    string Title,
    string? Type,
    int InterestedCount);

public record TrainingCenterDto(
    string UserId,
    string Name,
    string? Description,
    string? City,
    string? Phone,
    double AverageRating,
    int RatingCount,
    int? MyRating,
    int AnnouncementCount = 0,
    int UpcomingCount = 0,
    IReadOnlyList<string>? Categories = null,
    IReadOnlyList<string>? Formats = null);

public record RateDto(int Stars);
