namespace backend.Models;

public class Announcement
{
    public int Id { get; set; }

    // Basic info
    public string Title { get; set; } = string.Empty;
    public string? Type { get; set; }            // "კონფერენცია" | "ტრენინგი"
    public string? Category { get; set; }        // specialty, e.g. "კარდიოლოგია"
    public string? Format { get; set; }          // "ონლაინ" | "დასწრებით"

    // Details & schedule
    public string? ShortDescription { get; set; }
    public string? Description { get; set; }
    public string? City { get; set; }            // public city / region label
    /// <summary>
    /// Zoom/Meet link or exact venue address — shown only to registered doctors (and the owning center).
    /// </summary>
    public string? MeetingAccess { get; set; }
    public string? Duration { get; set; }        // e.g. "6 საათი / 2 დღე"
    public string? Language { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? RegistrationDeadline { get; set; }

    // Registration & points
    public int Points { get; set; }
    public int Price { get; set; }               // 0 = free
    public int? Seats { get; set; }

    // Media & status
    public string? ImageUrl { get; set; }
    public string Status { get; set; } = "Published";   // Draft | Pending | Published | Rejected
    public string? RejectionReason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Owner training center
    public string CenterUserId { get; set; } = string.Empty;
    public ApplicationUser? Center { get; set; }

    public List<Interest> Interests { get; set; } = new();
    public List<AnnouncementLike> Likes { get; set; } = new();
}
