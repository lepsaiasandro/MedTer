using backend.Models;
using Microsoft.AspNetCore.Identity;

namespace backend.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var users = services.GetRequiredService<UserManager<ApplicationUser>>();

        // Ensure the platform admin exists (idempotent — also fixes already-seeded DBs).
        if (await users.FindByEmailAsync("admin@medter.ge") is null)
        {
            await users.CreateAsync(new ApplicationUser
            {
                UserName = "admin@medter.ge",
                Email = "admin@medter.ge",
                EmailConfirmed = true,
                Role = UserRole.Admin,
                DisplayName = "ადმინისტრატორი"
            }, "pass123");
        }

        // Demo certificates for sample doctors (runs even when users already exist).
        await SeedDemoCertificatesAsync(services);

        // Only seed the demo data once — skip if centers/doctors already exist.
        if (users.Users.Any(u => u.Role != UserRole.Admin)) return;

        var centers = new[]
        {
            new { Email = "promed@medter.ge", Name = "ProMed აკადემია", City = "თბილისი", Desc = "კარდიოლოგია და შინაგანი მედიცინა" },
            new { Email = "medlearn@medter.ge", Name = "MedLearn ცენტრი", City = "ბათუმი", Desc = "გადაუდებელი მედიცინა და რეანიმაცია" },
            new { Email = "vitamed@medter.ge", Name = "VitaMed სასწავლო", City = "ქუთაისი", Desc = "პედიატრია და ნეონატოლოგია" },
            new { Email = "neuroedu@medter.ge", Name = "NeuroEdu ინსტიტუტი", City = "თბილისი", Desc = "ნევროლოგია და ნეიროქირურგია" },
        };

        foreach (var c in centers)
        {
            var user = new ApplicationUser
            {
                UserName = c.Email,
                Email = c.Email,
                EmailConfirmed = true,
                Role = UserRole.TrainingCenter,
                DisplayName = c.Name,
                TrainingCenterProfile = new TrainingCenterProfile
                {
                    Name = c.Name,
                    Description = c.Desc,
                    City = c.City,
                    Phone = "555000000"
                }
            };
            await users.CreateAsync(user, "pass123");
        }

        var doctors = new[]
        {
            new { Email = "nino@medter.ge", First = "ნინო", Last = "ბერიძე", Spec = "კარდიოლოგი", City = "თბილისი" },
            new { Email = "giorgi@medter.ge", First = "გიორგი", Last = "ხარაძე", Spec = "პედიატრი", City = "ბათუმი" },
            new { Email = "mariam@medter.ge", First = "მარიამ", Last = "კვარაცხელია", Spec = "ნევროლოგი", City = "ქუთაისი" },
        };

        foreach (var d in doctors)
        {
            var user = new ApplicationUser
            {
                UserName = d.Email,
                Email = d.Email,
                EmailConfirmed = true,
                Role = UserRole.Doctor,
                DisplayName = $"{d.First} {d.Last}",
                DoctorProfile = new DoctorProfile
                {
                    FirstName = d.First,
                    LastName = d.Last,
                    Specialty = d.Spec,
                    City = d.City,
                    Phone = "555111111"
                }
            };
            await users.CreateAsync(user, "pass123");
        }

        // Sample announcements from a couple of centers
        var db = services.GetRequiredService<AppDbContext>();
        var promed = await users.FindByEmailAsync("promed@medter.ge");
        var medlearn = await users.FindByEmailAsync("medlearn@medter.ge");

        if (promed is not null)
        {
            db.Announcements.Add(new Announcement
            {
                Title = "Cardio Update 2026 — გულის უკმარისობის მართვა",
                Type = "კონფერენცია", Category = "კარდიოლოგია", Format = "დასწრებით",
                ShortDescription = "ინტენსიური კურსი ECG ინტერპრეტაციასა და გადაუდებელ კარდიოლოგიაზე.",
                Description = "ინტენსიური კურსი ECG ინტერპრეტაციასა და გადაუდებელ კარდიოლოგიაზე.",
                City = "თბილისი", Duration = "2 დღე", Language = "ქართული",
                Points = 20, Price = 0, Seats = 50, Status = "Published",
                CenterUserId = promed.Id, StartDate = new DateTime(2026, 10, 15)
            });
            db.Announcements.Add(new Announcement
            {
                Title = "შინაგანი მედიცინის განახლება",
                Type = "ტრენინგი", Category = "ზოგადი პრაქტიკა", Format = "ონლაინ",
                ShortDescription = "თანამედროვე მიდგომები დიაგნოსტიკასა და მკურნალობაში.",
                Description = "თანამედროვე მიდგომები დიაგნოსტიკასა და მკურნალობაში.",
                Duration = "6 საათი", Language = "ქართული",
                Points = 8, Price = 0, Seats = 100, Status = "Published",
                CenterUserId = promed.Id, StartDate = new DateTime(2026, 10, 5)
            });
        }
        if (medlearn is not null)
        {
            db.Announcements.Add(new Announcement
            {
                Title = "Emergency Medicine — რეანიმაციის პრაქტიკული ტრენინგი",
                Type = "ტრენინგი", Category = "გადაუდებელი მედიცინა", Format = "დასწრებით",
                ShortDescription = "პრაქტიკული ტრენინგი BLS/ACLS პროტოკოლებზე.",
                Description = "პრაქტიკული ტრენინგი BLS/ACLS პროტოკოლებზე.",
                City = "ბათუმი", Duration = "1 დღე", Language = "ქართული",
                Points = 16, Price = 0, Seats = 40, Status = "Published",
                CenterUserId = medlearn.Id, StartDate = new DateTime(2026, 9, 28)
            });
        }
        await db.SaveChangesAsync();

        // Fresh DB: users were just created, so seed certs now (earlier call was a no-op).
        await SeedDemoCertificatesAsync(services);
    }

    /// <summary>
    /// Idempotent demo certificates for sample doctors (also runs on already-seeded DBs).
    /// </summary>
    public static async Task SeedDemoCertificatesAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<AppDbContext>();
        if (db.Certificates.Any()) return;

        var users = services.GetRequiredService<UserManager<ApplicationUser>>();
        var nino = await users.FindByEmailAsync("nino@medter.ge");
        var giorgi = await users.FindByEmailAsync("giorgi@medter.ge");
        var mariam = await users.FindByEmailAsync("mariam@medter.ge");

        var samples = new (ApplicationUser? User, string Title, int Points, string Center, DateTime Issued)[]
        {
            (nino, "Cardio Update 2026 — გულის უკმარისობის მართვა", 20, "ProMed აკადემია", new DateTime(2026, 3, 12, 10, 0, 0, DateTimeKind.Utc)),
            (nino, "ECG ინტერპრეტაციის პრაქტიკული კურსი", 12, "ProMed აკადემია", new DateTime(2025, 11, 8, 14, 30, 0, DateTimeKind.Utc)),
            (nino, "შინაგანი მედიცინის განახლება", 8, "VitaMed სასწავლო", new DateTime(2025, 9, 22, 9, 0, 0, DateTimeKind.Utc)),
            (giorgi, "პედიატრიული რეანიმაციის ტრენინგი", 16, "MedLearn ცენტრი", new DateTime(2026, 2, 18, 11, 0, 0, DateTimeKind.Utc)),
            (giorgi, "ვაქცინაციის თანამედროვე მიდგომები", 10, "VitaMed სასწავლო", new DateTime(2025, 12, 5, 16, 0, 0, DateTimeKind.Utc)),
            (giorgi, "ნეონატოლოგიის ბაზისური მოდული", 14, "VitaMed სასწავლო", new DateTime(2025, 8, 14, 10, 0, 0, DateTimeKind.Utc)),
            (mariam, "ინსულტის მართვის ალგორითმები", 18, "NeuroEdu ინსტიტუტი", new DateTime(2026, 1, 20, 13, 0, 0, DateTimeKind.Utc)),
            (mariam, "ნევროლოგიური გადაუდებელი მდგომარეობები", 15, "NeuroEdu ინსტიტუტი", new DateTime(2025, 10, 3, 9, 30, 0, DateTimeKind.Utc)),
            (mariam, "Emergency Medicine — რეანიმაციის პრაქტიკული ტრენინგი", 16, "MedLearn ცენტრი", new DateTime(2025, 7, 11, 12, 0, 0, DateTimeKind.Utc)),
        };

        foreach (var s in samples)
        {
            if (s.User is null) continue;
            db.Certificates.Add(new Certificate
            {
                DoctorUserId = s.User.Id,
                Title = s.Title,
                Points = s.Points,
                CenterName = s.Center,
                IssuedAt = s.Issued,
            });
        }

        await db.SaveChangesAsync();
    }
}
