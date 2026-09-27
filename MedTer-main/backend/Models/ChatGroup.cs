namespace backend.Models;

// Group chat tied to one training/announcement.
public class ChatGroup
{
    public int Id { get; set; }

    public int AnnouncementId { get; set; }
    public Announcement? Announcement { get; set; }

    public string Name { get; set; } = string.Empty;

    public string CreatedByUserId { get; set; } = string.Empty;
    public ApplicationUser? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<ChatGroupMember> Members { get; set; } = new();
    public List<GroupMessage> Messages { get; set; } = new();
}
