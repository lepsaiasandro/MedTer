namespace backend.Models;

public class MessageReaction
{
    public int Id { get; set; }

    public int MessageId { get; set; }
    public GroupMessage? Message { get; set; }

    public string UserId { get; set; } = string.Empty;
    public ApplicationUser? User { get; set; }

    public string Emoji { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
