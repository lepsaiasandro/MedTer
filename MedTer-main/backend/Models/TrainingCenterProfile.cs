namespace backend.Models;

public class TrainingCenterProfile
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? City { get; set; }
    public string? Phone { get; set; }

    public string UserId { get; set; } = string.Empty;
    public ApplicationUser? User { get; set; }
}
