namespace backend.Models;

/// <summary>
/// Proposed profile edits. Live profile stays unchanged until an admin approves.
/// At most one Pending request per user (newer submissions replace it).
/// </summary>
public class ProfileChangeRequest
{
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty;
    public ApplicationUser? User { get; set; }

    public string Status { get; set; } = "Pending"; // Pending | Approved | Rejected

    // Doctor fields
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Specialty { get; set; }

    // Center fields
    public string? CenterName { get; set; }
    public string? Description { get; set; }

    // Shared
    public string? City { get; set; }
    public string? Phone { get; set; }

    public string? RejectionReason { get; set; }
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
}
