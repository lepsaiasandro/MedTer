using Microsoft.AspNetCore.Identity;

namespace backend.Models;

public enum UserRole
{
    TrainingCenter = 0,
    Doctor = 1,
    Admin = 2
}

/// <summary>
/// Account verification lifecycle after registration.
/// </summary>
public enum VerificationStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Suspended = 3
}

public class ApplicationUser : IdentityUser
{
    public UserRole Role { get; set; }

    // Display name used across the app (center name or doctor full name)
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// Kept in sync with <see cref="VerificationStatus"/> (== Approved).
    /// Used by existing queries that filter active members.
    /// </summary>
    public bool IsApproved { get; set; }

    public VerificationStatus VerificationStatus { get; set; } = VerificationStatus.Pending;

    /// <summary>Optional profile photo as a data URL or absolute URL.</summary>
    public string? ProfilePhotoUrl { get; set; }

    /// <summary>Set when status is Rejected or Suspended.</summary>
    public string? RejectionReason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public TrainingCenterProfile? TrainingCenterProfile { get; set; }
    public DoctorProfile? DoctorProfile { get; set; }

    public void SetVerification(VerificationStatus status, string? reason = null)
    {
        VerificationStatus = status;
        IsApproved = status == VerificationStatus.Approved;
        RejectionReason = status is VerificationStatus.Rejected or VerificationStatus.Suspended
            ? (string.IsNullOrWhiteSpace(reason) ? null : reason.Trim())
            : null;
    }
}
