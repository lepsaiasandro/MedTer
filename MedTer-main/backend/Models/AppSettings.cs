namespace backend.Models;

/// <summary>Singleton platform settings (always Id = 1).</summary>
public class AppSettings
{
    public int Id { get; set; } = 1;

    /// <summary>When true, new doctor/center registrations need admin approval.</summary>
    public bool UserVerificationEnabled { get; set; } = true;

    /// <summary>When true, training posts need admin approval before publish (unless the center opted out).</summary>
    public bool AnnouncementVerificationEnabled { get; set; } = true;
}
