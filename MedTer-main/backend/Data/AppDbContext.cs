using backend.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<TrainingCenterProfile> TrainingCenterProfiles => Set<TrainingCenterProfile>();
    public DbSet<DoctorProfile> DoctorProfiles => Set<DoctorProfile>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<ChatGroup> ChatGroups => Set<ChatGroup>();
    public DbSet<ChatGroupMember> ChatGroupMembers => Set<ChatGroupMember>();
    public DbSet<GroupMessage> GroupMessages => Set<GroupMessage>();
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<Interest> Interests => Set<Interest>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Rating> Ratings => Set<Rating>();
    public DbSet<Certificate> Certificates => Set<Certificate>();
    public DbSet<Favorite> Favorites => Set<Favorite>();
    public DbSet<ProfileChangeRequest> ProfileChangeRequests => Set<ProfileChangeRequest>();
    public DbSet<AppSettings> AppSettings => Set<AppSettings>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<AppSettings>().HasData(new AppSettings
        {
            Id = 1,
            UserVerificationEnabled = true,
            AnnouncementVerificationEnabled = true
        });

        builder.Entity<TrainingCenterProfile>()
            .Property(p => p.AnnouncementVerificationEnabled)
            .HasDefaultValue(true);

        builder.Entity<ApplicationUser>()
            .HasOne(u => u.TrainingCenterProfile)
            .WithOne(p => p.User)
            .HasForeignKey<TrainingCenterProfile>(p => p.UserId);

        builder.Entity<ApplicationUser>()
            .HasOne(u => u.DoctorProfile)
            .WithOne(p => p.User)
            .HasForeignKey<DoctorProfile>(p => p.UserId);

        builder.Entity<ProfileChangeRequest>()
            .HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.Entity<ProfileChangeRequest>()
            .HasIndex(r => new { r.UserId, r.Status });

        builder.Entity<Message>().HasIndex(m => new { m.SenderId, m.ReceiverId });

        builder.Entity<ChatGroup>()
            .HasOne(g => g.Announcement)
            .WithMany()
            .HasForeignKey(g => g.AnnouncementId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.Entity<ChatGroup>()
            .HasOne(g => g.CreatedBy)
            .WithMany()
            .HasForeignKey(g => g.CreatedByUserId)
            .OnDelete(DeleteBehavior.NoAction);
        builder.Entity<ChatGroup>().HasIndex(g => g.AnnouncementId).IsUnique();

        builder.Entity<ChatGroupMember>()
            .HasOne(m => m.Group)
            .WithMany(g => g.Members)
            .HasForeignKey(m => m.GroupId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.Entity<ChatGroupMember>()
            .HasOne(m => m.User)
            .WithMany()
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.NoAction);
        builder.Entity<ChatGroupMember>().HasIndex(m => new { m.GroupId, m.UserId }).IsUnique();

        builder.Entity<GroupMessage>()
            .HasOne(m => m.Group)
            .WithMany(g => g.Messages)
            .HasForeignKey(m => m.GroupId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.Entity<GroupMessage>()
            .HasOne(m => m.Sender)
            .WithMany()
            .HasForeignKey(m => m.SenderId)
            .OnDelete(DeleteBehavior.NoAction);
        builder.Entity<GroupMessage>().HasIndex(m => new { m.GroupId, m.SentAt });

        builder.Entity<Announcement>()
            .HasOne(a => a.Center)
            .WithMany()
            .HasForeignKey(a => a.CenterUserId)
            .OnDelete(DeleteBehavior.Cascade);

        // New announcements default to Published; existing rows get it on migration.
        builder.Entity<Announcement>()
            .Property(a => a.Status)
            .HasDefaultValue("Published");

        builder.Entity<Interest>()
            .HasOne(i => i.Announcement)
            .WithMany(a => a.Interests)
            .HasForeignKey(i => i.AnnouncementId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Interest>()
            .HasOne(i => i.Doctor)
            .WithMany()
            .HasForeignKey(i => i.DoctorUserId)
            .OnDelete(DeleteBehavior.NoAction);

        // A doctor can mark interest in an announcement only once.
        builder.Entity<Interest>().HasIndex(i => new { i.AnnouncementId, i.DoctorUserId }).IsUnique();

        builder.Entity<Notification>().HasIndex(n => new { n.UserId, n.IsRead });

        // Ratings — one per (center, doctor). NoAction to avoid multiple cascade paths.
        builder.Entity<Rating>()
            .HasOne(r => r.Center).WithMany().HasForeignKey(r => r.CenterUserId).OnDelete(DeleteBehavior.NoAction);
        builder.Entity<Rating>()
            .HasOne(r => r.Doctor).WithMany().HasForeignKey(r => r.DoctorUserId).OnDelete(DeleteBehavior.NoAction);
        builder.Entity<Rating>().HasIndex(r => new { r.CenterUserId, r.DoctorUserId }).IsUnique();

        // Certificates — kept even if the announcement is later removed.
        builder.Entity<Certificate>()
            .HasOne(c => c.Doctor).WithMany().HasForeignKey(c => c.DoctorUserId).OnDelete(DeleteBehavior.NoAction);
        builder.Entity<Certificate>()
            .HasOne(c => c.Announcement).WithMany().HasForeignKey(c => c.AnnouncementId).OnDelete(DeleteBehavior.SetNull);

        // Favorites — one per (doctor, announcement).
        builder.Entity<Favorite>()
            .HasOne(f => f.Announcement).WithMany().HasForeignKey(f => f.AnnouncementId).OnDelete(DeleteBehavior.Cascade);
        builder.Entity<Favorite>()
            .HasOne(f => f.Doctor).WithMany().HasForeignKey(f => f.DoctorUserId).OnDelete(DeleteBehavior.NoAction);
        builder.Entity<Favorite>().HasIndex(f => new { f.AnnouncementId, f.DoctorUserId }).IsUnique();
    }
}
