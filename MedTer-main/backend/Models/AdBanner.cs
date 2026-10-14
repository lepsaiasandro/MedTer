namespace backend.Models;

/// <summary>Site-wide partner / promo banner shown under the top bar.</summary>
public class AdBanner
{
    public int Id { get; set; }

    /// <summary>Short brand mark shown in the colored tile (e.g. PSP, Aversi).</summary>
    public string Brand { get; set; } = "";

    /// <summary>Destination URL (external or internal).</summary>
    public string Href { get; set; } = "";

    public string TitleKa { get; set; } = "";
    public string TitleEn { get; set; } = "";
    public string TextKa { get; set; } = "";
    public string TextEn { get; set; } = "";
    public string CtaKa { get; set; } = "";
    public string CtaEn { get; set; } = "";

    /// <summary>Primary gradient color (hex), e.g. #0d9488.</summary>
    public string Accent { get; set; } = "#2563eb";

    /// <summary>Secondary gradient color (hex).</summary>
    public string Accent2 { get; set; } = "#1e40af";

    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
