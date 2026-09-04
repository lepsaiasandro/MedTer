using Microsoft.AspNetCore.Identity;

namespace backend.Models;

public enum UserRole
{
    TrainingCenter = 0,
    Doctor = 1,
    Admin = 2
}

public class ApplicationUser : IdentityUser
{
    public UserRole Role { get; set; }

    // Display name used across the app (center name or doctor full name)
    public string DisplayName { get; set; } = string.Empty;

    public TrainingCenterProfile? TrainingCenterProfile { get; set; }
    public DoctorProfile? DoctorProfile { get; set; }
}
