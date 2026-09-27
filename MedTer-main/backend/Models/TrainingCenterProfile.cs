namespace backend.Models;

public class TrainingCenterProfile
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? City { get; set; }
    public string? Phone { get; set; }

    /// <summary>
    /// When false, this center's trainings publish immediately (skip admin review),
    /// even if the global announcement verification setting is on.
    /// </summary>
    public bool AnnouncementVerificationEnabled { get; set; } = true;

    public string UserId { get; set; } = string.Empty;
    public ApplicationUser? User { get; set; }
}
