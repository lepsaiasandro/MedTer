using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public static class VerificationSettings
{
    public static async Task<AppSettings> GetAsync(AppDbContext db)
    {
        var settings = await db.AppSettings.FirstOrDefaultAsync(s => s.Id == 1);
        if (settings is not null) return settings;

        settings = new AppSettings
        {
            Id = 1,
            UserVerificationEnabled = true,
            AnnouncementVerificationEnabled = true
        };
        db.AppSettings.Add(settings);
        await db.SaveChangesAsync();
        return settings;
    }

    /// <summary>
    /// Announcement needs admin review when both the global setting and the center setting are on.
    /// </summary>
    public static async Task<bool> RequiresAnnouncementReviewAsync(AppDbContext db, string centerUserId)
    {
        var settings = await GetAsync(db);
        if (!settings.AnnouncementVerificationEnabled) return false;

        var centerFlag = await db.TrainingCenterProfiles
            .AsNoTracking()
            .Where(p => p.UserId == centerUserId)
            .Select(p => (bool?)p.AnnouncementVerificationEnabled)
            .FirstOrDefaultAsync();

        return centerFlag != false;
    }
}
