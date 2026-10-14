namespace backend.Dtos;

public record AdBannerDto(
    int Id,
    string Brand,
    string Href,
    string TitleKa,
    string TitleEn,
    string TextKa,
    string TextEn,
    string CtaKa,
    string CtaEn,
    string Accent,
    string Accent2,
    int SortOrder,
    bool IsActive,
    DateTime CreatedAt);

public record UpsertAdBannerDto(
    string Brand,
    string Href,
    string TitleKa,
    string TitleEn,
    string TextKa,
    string TextEn,
    string CtaKa,
    string CtaEn,
    string? Accent,
    string? Accent2,
    int? SortOrder,
    bool? IsActive);
