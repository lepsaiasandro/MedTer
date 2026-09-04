namespace backend.Models;

// A doctor marking interest in an announcement.
public class Interest
{
    public int Id { get; set; }

    public int AnnouncementId { get; set; }
    public Announcement? Announcement { get; set; }

    public string DoctorUserId { get; set; } = string.Empty;
    public ApplicationUser? Doctor { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
