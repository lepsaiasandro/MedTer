namespace backend.Models;

// A doctor's 1–5 star rating of a training center (one per doctor per center).
public class Rating
{
    public int Id { get; set; }

    public string CenterUserId { get; set; } = string.Empty;
    public ApplicationUser? Center { get; set; }

    public string DoctorUserId { get; set; } = string.Empty;
    public ApplicationUser? Doctor { get; set; }

    public int Stars { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
