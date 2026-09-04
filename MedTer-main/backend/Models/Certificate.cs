namespace backend.Models;

// A certificate a training center issues to a doctor for an announcement.
public class Certificate
{
    public int Id { get; set; }

    public string DoctorUserId { get; set; } = string.Empty;
    public ApplicationUser? Doctor { get; set; }

    public int? AnnouncementId { get; set; }
    public Announcement? Announcement { get; set; }

    public string Title { get; set; } = string.Empty;
    public int Points { get; set; }
    public string CenterName { get; set; } = string.Empty;
    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;

    // Uploaded certificate document (PDF), stored as a base64 data URL.
    public string? FileUrl { get; set; }
    public string? FileName { get; set; }
}
