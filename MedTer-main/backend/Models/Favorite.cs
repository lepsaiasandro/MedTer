namespace backend.Models;

// A doctor bookmarking an announcement.
public class Favorite
{
    public int Id { get; set; }

    public int AnnouncementId { get; set; }
    public Announcement? Announcement { get; set; }

    public string DoctorUserId { get; set; } = string.Empty;
    public ApplicationUser? Doctor { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
