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
    }
}
