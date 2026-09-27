namespace backend.Models;

public class ChatGroupMember
{
    public int Id { get; set; }

    public int GroupId { get; set; }
    public ChatGroup? Group { get; set; }

    public string UserId { get; set; } = string.Empty;
    public ApplicationUser? User { get; set; }

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastReadAt { get; set; }
}
