using System.Security.Claims;
using backend.Data;
using backend.Dtos;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api")]
public class AdsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdsController(AppDbContext db) => _db = db;

    private bool IsAdmin => User.FindFirstValue(ClaimTypes.Role) == UserRole.Admin.ToString();

    private static AdBannerDto ToDto(AdBanner a) => new(
        a.Id, a.Brand, a.Href,
        a.TitleKa, a.TitleEn, a.TextKa, a.TextEn, a.CtaKa, a.CtaEn,
        a.Accent, a.Accent2, a.SortOrder, a.IsActive, a.CreatedAt);

    private static string Clip(string? value, int max, string fallback = "")
    {
        var v = (value ?? "").Trim();
        if (string.IsNullOrEmpty(v)) return fallback;
        return v.Length <= max ? v : v[..max];
    }

    private static string HexOr(string? value, string fallback)
    {
        var v = (value ?? "").Trim();
        if (v.Length is >= 4 and <= 9 && v.StartsWith('#')) return v;
        return fallback;
    }

    /// <summary>Public: active banners for the site carousel.</summary>
    [HttpGet("ads")]
    [AllowAnonymous]
    public async Task<ActionResult<List<AdBannerDto>>> GetActive()
    {
        var list = await _db.AdBanners.AsNoTracking()
            .Where(a => a.IsActive)
            .OrderBy(a => a.SortOrder)
            .ThenBy(a => a.Id)
            .ToListAsync();
        return Ok(list.Select(ToDto).ToList());
    }

    [HttpGet("admin/ads")]
    [Authorize]
    public async Task<ActionResult<List<AdBannerDto>>> GetAll()
    {
        if (!IsAdmin) return Forbid();
        var list = await _db.AdBanners.AsNoTracking()
            .OrderBy(a => a.SortOrder)
            .ThenBy(a => a.Id)
            .ToListAsync();
        return Ok(list.Select(ToDto).ToList());
    }

    [HttpPost("admin/ads")]
    [Authorize]
    public async Task<ActionResult<AdBannerDto>> Create(UpsertAdBannerDto dto)
    {
        if (!IsAdmin) return Forbid();

        var brand = Clip(dto.Brand, 40);
        var href = Clip(dto.Href, 500);
        if (string.IsNullOrWhiteSpace(brand) || string.IsNullOrWhiteSpace(href))
            return BadRequest(new { message = "Brand and link are required." });

        var maxOrder = await _db.AdBanners.Select(a => (int?)a.SortOrder).MaxAsync() ?? -1;
        var entity = new AdBanner
        {
            Brand = brand,
            Href = href,
            TitleKa = Clip(dto.TitleKa, 120, brand),
            TitleEn = Clip(dto.TitleEn, 120, brand),
            TextKa = Clip(dto.TextKa, 240),
            TextEn = Clip(dto.TextEn, 240),
            CtaKa = Clip(dto.CtaKa, 40, "ნახვა"),
            CtaEn = Clip(dto.CtaEn, 40, "Learn more"),
            Accent = HexOr(dto.Accent, "#2563eb"),
            Accent2 = HexOr(dto.Accent2, "#1e40af"),
            SortOrder = dto.SortOrder ?? (maxOrder + 1),
            IsActive = dto.IsActive ?? true,
            CreatedAt = DateTime.UtcNow
        };

        _db.AdBanners.Add(entity);
        await _db.SaveChangesAsync();
        return Ok(ToDto(entity));
    }

    [HttpPut("admin/ads/{id:int}")]
    [Authorize]
    public async Task<ActionResult<AdBannerDto>> Update(int id, UpsertAdBannerDto dto)
    {
        if (!IsAdmin) return Forbid();

        var entity = await _db.AdBanners.FindAsync(id);
        if (entity is null) return NotFound();

        var brand = Clip(dto.Brand, 40);
        var href = Clip(dto.Href, 500);
        if (string.IsNullOrWhiteSpace(brand) || string.IsNullOrWhiteSpace(href))
            return BadRequest(new { message = "Brand and link are required." });

        entity.Brand = brand;
        entity.Href = href;
        entity.TitleKa = Clip(dto.TitleKa, 120, brand);
        entity.TitleEn = Clip(dto.TitleEn, 120, brand);
        entity.TextKa = Clip(dto.TextKa, 240);
        entity.TextEn = Clip(dto.TextEn, 240);
        entity.CtaKa = Clip(dto.CtaKa, 40, "ნახვა");
        entity.CtaEn = Clip(dto.CtaEn, 40, "Learn more");
        entity.Accent = HexOr(dto.Accent, entity.Accent);
        entity.Accent2 = HexOr(dto.Accent2, entity.Accent2);
        if (dto.SortOrder.HasValue) entity.SortOrder = dto.SortOrder.Value;
        if (dto.IsActive.HasValue) entity.IsActive = dto.IsActive.Value;

        await _db.SaveChangesAsync();
        return Ok(ToDto(entity));
    }

    [HttpDelete("admin/ads/{id:int}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        if (!IsAdmin) return Forbid();
        var entity = await _db.AdBanners.FindAsync(id);
        if (entity is null) return NotFound();
        _db.AdBanners.Remove(entity);
        await _db.SaveChangesAsync();
        return Ok();
    }
}
