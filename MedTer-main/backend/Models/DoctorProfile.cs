namespace backend.Models;

public class DoctorProfile
{
    public int Id { get; set; }

    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Specialty { get; set; }
    public string? City { get; set; }
    public string? Phone { get; set; }

    public string UserId { get; set; } = string.Empty;
    public ApplicationUser? User { get; set; }
}
