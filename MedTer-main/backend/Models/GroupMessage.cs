namespace backend.Models;

public class GroupMessage
{
    public int Id { get; set; }

    public int GroupId { get; set; }
    public ChatGroup? Group { get; set; }

    public string SenderId { get; set; } = string.Empty;
    public ApplicationUser? Sender { get; set; }

    public string Text { get; set; } = string.Empty;
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}
