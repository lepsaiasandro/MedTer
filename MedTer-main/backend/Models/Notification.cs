namespace backend.Models;

// Simple in-app notification (bell).
public class Notification
{
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty; // recipient
    public string Text { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
