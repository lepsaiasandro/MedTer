using backend.Models;

namespace backend.Dtos;

public static class GroupChatMapper
{
    public static readonly string[] ReactionEmojis = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

    public static bool AllowedEmoji(string? emoji) =>
        !string.IsNullOrEmpty(emoji) && ReactionEmojis.Contains(emoji);

    public static List<MessageReactionDto> ToReactionDtos(IEnumerable<MessageReaction> reactions) =>
        reactions
            .GroupBy(r => r.Emoji)
            .OrderBy(g => g.Min(r => r.CreatedAt))
            .Select(g => new MessageReactionDto(
                g.Key,
                g.Count(),
                g.OrderBy(r => r.CreatedAt)
                    .Select(r => new ReactionUserDto(r.UserId, r.User?.DisplayName ?? ""))
                    .ToList()))
            .ToList();
}
