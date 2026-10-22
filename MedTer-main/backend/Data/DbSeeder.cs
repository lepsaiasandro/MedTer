using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public static class DbSeeder
{
    private const string DemoPassword = "pass123";

    /// <param name="seedDemo">
    /// When true, ensure demo users/content exist (and reset demo passwords to pass123).
    /// When false (Production without Seed:Demo), only ensure an admin account exists if missing.
    /// </param>
    public static async Task SeedAsync(IServiceProvider services, bool seedDemo = true)
    {
        var users = services.GetRequiredService<UserManager<ApplicationUser>>();
        var config = services.GetRequiredService<IConfiguration>();

        const string adminEmail = "admin@medter.ge";
        // Demo mode: all accounts (admin included) use pass123.
        // Production without demo: require Seed:AdminPassword for first admin create.
        var adminPassword = seedDemo
            ? DemoPassword
            : config["Seed:AdminPassword"];
        if (!seedDemo && string.IsNullOrWhiteSpace(adminPassword))
            adminPassword = null;

        var admin = await users.FindByEmailAsync(adminEmail);
        if (admin is null)
        {
            if (string.IsNullOrWhiteSpace(adminPassword))
                throw new InvalidOperationException(
                    "Seed:AdminPassword is required on first Production boot. Set Seed__AdminPassword in Azure App Settings.");

            var adminUser = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                EmailConfirmed = true,
                Role = UserRole.Admin,
                DisplayName = "ადმინისტრატორი",
                CreatedAt = DateTime.UtcNow
            };
            adminUser.SetVerification(VerificationStatus.Approved);
            var create = await users.CreateAsync(adminUser, adminPassword);
            if (!create.Succeeded)
                throw new InvalidOperationException(
                    "Failed to seed admin: " + string.Join("; ", create.Errors.Select(e => e.Description)));
        }
        else
        {
            admin.Role = UserRole.Admin;
            admin.SetVerification(VerificationStatus.Approved);
            admin.EmailConfirmed = true;
            admin.DisplayName = string.IsNullOrWhiteSpace(admin.DisplayName) ? "ადმინისტრატორი" : admin.DisplayName;
            await users.UpdateAsync(admin);
            if (seedDemo)
                await ResetPasswordAsync(users, admin, DemoPassword);
        }

        await SeedDefaultAdBannersAsync(services);

        if (!seedDemo) return;

        await EnsureDemoUsersAsync(users);
        await EnsureDemoAnnouncementsAsync(services);
        await SeedDemoCertificatesAsync(services);
        await SeedDemoGroupChatAsync(services);
    }

    /// <summary>Seed PSP / Aversi partner banners once if the table is empty; keep CTA domains in Latin.</summary>
    public static async Task SeedDefaultAdBannersAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<AppDbContext>();

        // Existing rows may still have Georgian-script CTAs from earlier seeds.
        var legacy = await db.AdBanners
            .Where(a => a.CtaKa == "პსპ.გე" || a.CtaEn == "პსპ.გე"
                     || a.CtaKa == "ავერსი.გე" || a.CtaEn == "ავერსი.გე"
                     || a.CtaEn == "Visit PSP" || a.CtaEn == "Visit Aversi")
            .ToListAsync();
        foreach (var a in legacy)
        {
            if (a.Brand.Equals("PSP", StringComparison.OrdinalIgnoreCase)
                || a.Href.Contains("psp.ge", StringComparison.OrdinalIgnoreCase))
            {
                a.CtaKa = "psp.ge";
                a.CtaEn = "psp.ge";
            }
            else if (a.Brand.Equals("Aversi", StringComparison.OrdinalIgnoreCase)
                     || a.Href.Contains("aversi.ge", StringComparison.OrdinalIgnoreCase))
            {
                a.CtaKa = "aversi.ge";
                a.CtaEn = "aversi.ge";
            }
        }
        if (legacy.Count > 0) await db.SaveChangesAsync();

        if (await db.AdBanners.AnyAsync()) return;

        db.AdBanners.AddRange(
            new AdBanner
            {
                Brand = "PSP",
                Href = "https://psp.ge/",
                TitleKa = "PSP — ონლაინ აფთიაქი",
                TitleEn = "PSP — online pharmacy",
                TextKa = "45,000+ პროდუქტი, სწრაფი მიწოდება და გარანტირებული ხარისხი.",
                TextEn = "45,000+ products, fast delivery and guaranteed quality.",
                CtaKa = "psp.ge",
                CtaEn = "psp.ge",
                Accent = "#1e4d8c",
                Accent2 = "#0f2d5c",
                SortOrder = 0,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new AdBanner
            {
                Brand = "Aversi",
                Href = "https://www.aversi.ge/",
                TitleKa = "ავერსი — აფთიაქები მთელ საქართველოში",
                TitleEn = "Aversi — pharmacies across Georgia",
                TextKa = "აფთიაქები, ონლაინ შეკვეთა და მტრედი ბარათის შეთავაზებები.",
                TextEn = "Pharmacies, online ordering and Mtredi card offers.",
                CtaKa = "aversi.ge",
                CtaEn = "aversi.ge",
                Accent = "#c8102e",
                Accent2 = "#8b0a1e",
                SortOrder = 1,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new AdBanner
            {
                Brand = "Aversi",
                Href = "https://shop.aversi.ge/",
                TitleKa = "ავერსი ონლაინ მაღაზია",
                TitleEn = "Aversi online shop",
                TextKa = "შეუკვეთე მედიკამენტები და პროდუქტები სახლიდან.",
                TextEn = "Order medicines and products from home.",
                CtaKa = "shop.aversi.ge",
                CtaEn = "shop.aversi.ge",
                Accent = "#c8102e",
                Accent2 = "#9f1239",
                SortOrder = 2,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });

        await db.SaveChangesAsync();
    }

    private static async Task EnsureDemoUsersAsync(UserManager<ApplicationUser> users)
    {
        var centers = new[]
        {
            new { Email = "promed@medter.ge", Name = "ProMed აკადემია", City = "თბილისი", Desc = "კარდიოლოგია და შინაგანი მედიცინა" },
            new { Email = "medlearn@medter.ge", Name = "MedLearn ცენტრი", City = "ბათუმი", Desc = "გადაუდებელი მედიცინა და რეანიმაცია" },
            new { Email = "vitamed@medter.ge", Name = "VitaMed სასწავლო", City = "ქუთაისი", Desc = "პედიატრია და ნეონატოლოგია" },
            new { Email = "neuroedu@medter.ge", Name = "NeuroEdu ინსტიტუტი", City = "თბილისი", Desc = "ნევროლოგია და ნეიროქირურგია" },
        };

        foreach (var c in centers)
        {
            var existing = await users.FindByEmailAsync(c.Email);
            if (existing is null)
            {
                var user = new ApplicationUser
                {
                    UserName = c.Email,
                    Email = c.Email,
                    EmailConfirmed = true,
                    Role = UserRole.TrainingCenter,
                    DisplayName = c.Name,
                    CreatedAt = DateTime.UtcNow,
                    TrainingCenterProfile = new TrainingCenterProfile
                    {
                        Name = c.Name,
                        Description = c.Desc,
                        City = c.City,
                        Phone = "555000000"
                    }
                };
                user.SetVerification(VerificationStatus.Approved);
                var create = await users.CreateAsync(user, DemoPassword);
                if (!create.Succeeded)
                    throw new InvalidOperationException(
                        $"Failed to seed {c.Email}: " + string.Join("; ", create.Errors.Select(e => e.Description)));
            }
            else
            {
                existing.Role = UserRole.TrainingCenter;
                existing.EmailConfirmed = true;
                existing.SetVerification(VerificationStatus.Approved);
                if (string.IsNullOrWhiteSpace(existing.DisplayName))
                    existing.DisplayName = c.Name;
                await users.UpdateAsync(existing);
                await ResetPasswordAsync(users, existing, DemoPassword);
            }
        }

        var doctors = new[]
        {
            new { Email = "nino@medter.ge", First = "ნინო", Last = "ბერიძე", Spec = "კარდიოლოგი", City = "თბილისი" },
            new { Email = "giorgi@medter.ge", First = "გიორგი", Last = "ხარაძე", Spec = "პედიატრი", City = "ბათუმი" },
            new { Email = "mariam@medter.ge", First = "მარიამ", Last = "კვარაცხელია", Spec = "ნევროლოგი", City = "ქუთაისი" },
        };

        foreach (var d in doctors)
        {
            var existing = await users.FindByEmailAsync(d.Email);
            if (existing is null)
            {
                var user = new ApplicationUser
                {
                    UserName = d.Email,
                    Email = d.Email,
                    EmailConfirmed = true,
                    Role = UserRole.Doctor,
                    DisplayName = $"{d.First} {d.Last}",
                    CreatedAt = DateTime.UtcNow,
                    DoctorProfile = new DoctorProfile
                    {
                        FirstName = d.First,
                        LastName = d.Last,
                        Specialty = d.Spec,
                        City = d.City,
                        Phone = "555111111"
                    }
                };
                user.SetVerification(VerificationStatus.Approved);
                var create = await users.CreateAsync(user, DemoPassword);
                if (!create.Succeeded)
                    throw new InvalidOperationException(
                        $"Failed to seed {d.Email}: " + string.Join("; ", create.Errors.Select(e => e.Description)));
            }
            else
            {
                existing.Role = UserRole.Doctor;
                existing.EmailConfirmed = true;
                existing.SetVerification(VerificationStatus.Approved);
                if (string.IsNullOrWhiteSpace(existing.DisplayName))
                    existing.DisplayName = $"{d.First} {d.Last}";
                await users.UpdateAsync(existing);
                await ResetPasswordAsync(users, existing, DemoPassword);
            }
        }
    }

    private static async Task EnsureDemoAnnouncementsAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var users = services.GetRequiredService<UserManager<ApplicationUser>>();
        var promed = await users.FindByEmailAsync("promed@medter.ge");
        var medlearn = await users.FindByEmailAsync("medlearn@medter.ge");
        var today = DateTime.UtcNow.Date;

        if (!await db.Announcements.AnyAsync())
        {
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
                    CenterUserId = promed.Id, StartDate = today.AddDays(14)
                });
                db.Announcements.Add(new Announcement
                {
                    Title = "შინაგანი მედიცინის განახლება",
                    Type = "ტრენინგი", Category = "ზოგადი პრაქტიკა", Format = "ონლაინ",
                    ShortDescription = "თანამედროვე მიდგომები დიაგნოსტიკასა და მკურნალობაში.",
                    Description = "თანამედროვე მიდგომები დიაგნოსტიკასა და მკურნალობაში.",
                    Duration = "6 საათი", Language = "ქართული",
                    Points = 8, Price = 0, Seats = 100, Status = "Published",
                    CenterUserId = promed.Id, StartDate = today.AddDays(28)
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
                    CenterUserId = medlearn.Id, StartDate = today.AddDays(45)
                });
            }
            await db.SaveChangesAsync();
            return;
        }

        // Keep demo feed usable: if every published demo training is in the past,
        // roll start dates forward relative to today (idempotent on each boot).
        var demoCenterIds = new[] { promed?.Id, medlearn?.Id }.Where(id => id != null).Cast<string>().ToList();
        if (demoCenterIds.Count == 0) return;

        var demo = await db.Announcements
            .Where(a => a.Status == "Published" && demoCenterIds.Contains(a.CenterUserId))
            .OrderBy(a => a.Id)
            .ToListAsync();
        if (demo.Count == 0) return;
        if (demo.Any(a => a.StartDate == null || a.StartDate.Value.Date >= today)) return;

        var offsets = new[] { 14, 28, 45 };
        for (var i = 0; i < demo.Count; i++)
            demo[i].StartDate = today.AddDays(offsets[Math.Min(i, offsets.Length - 1)]);

        await db.SaveChangesAsync();
    }

    private static async Task ResetPasswordAsync(UserManager<ApplicationUser> users, ApplicationUser user, string password)
    {
        var token = await users.GeneratePasswordResetTokenAsync(user);
        var reset = await users.ResetPasswordAsync(user, token, password);
        if (!reset.Succeeded)
            throw new InvalidOperationException(
                $"Failed to reset password for {user.Email}: " + string.Join("; ", reset.Errors.Select(e => e.Description)));
    }

    /// <summary>
    /// Idempotent demo certificates for sample doctors (also runs on already-seeded DBs).
    /// </summary>
    public static async Task SeedDemoCertificatesAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<AppDbContext>();
        if (await db.Certificates.AnyAsync()) return;

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

    /// <summary>
    /// Idempotent demo group chat for Cardio Update training + registered doctors.
    /// </summary>
    public static async Task SeedDemoGroupChatAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<AppDbContext>();
        if (await db.ChatGroups.AnyAsync()) return;

        var users = services.GetRequiredService<UserManager<ApplicationUser>>();
        var center = await users.FindByEmailAsync("promed@medter.ge");
        var nino = await users.FindByEmailAsync("nino@medter.ge");
        var giorgi = await users.FindByEmailAsync("giorgi@medter.ge");
        var mariam = await users.FindByEmailAsync("mariam@medter.ge");
        if (center is null) return;

        var announcement = await db.Announcements
            .FirstOrDefaultAsync(a => a.CenterUserId == center.Id && a.Status == "Published");
        if (announcement is null) return;

        foreach (var doctor in new[] { nino, giorgi, mariam })
        {
            if (doctor is null) continue;
            var interested = await db.Interests
                .AnyAsync(i => i.AnnouncementId == announcement.Id && i.DoctorUserId == doctor.Id);
            if (!interested)
                db.Interests.Add(new Interest { AnnouncementId = announcement.Id, DoctorUserId = doctor.Id });
        }
        await db.SaveChangesAsync();

        var group = new ChatGroup
        {
            AnnouncementId = announcement.Id,
            Name = announcement.Title,
            CreatedByUserId = center.Id,
            CreatedAt = DateTime.UtcNow
        };
        group.Members.Add(new ChatGroupMember { UserId = center.Id });
        foreach (var interest in await db.Interests.Where(i => i.AnnouncementId == announcement.Id).ToListAsync())
            group.Members.Add(new ChatGroupMember { UserId = interest.DoctorUserId });

        group.Messages.Add(new GroupMessage
        {
            SenderId = center.Id,
            Text = "გამარჯობა! ეს არის ტრენინგის ჯგუფური ჩატი. კითხვები აქ დაწერეთ.",
            SentAt = DateTime.UtcNow
        });

        db.ChatGroups.Add(group);
        await db.SaveChangesAsync();
    }
}
