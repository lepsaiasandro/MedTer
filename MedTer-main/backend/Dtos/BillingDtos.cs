namespace backend.Dtos;

public record BillingStatusDto(
    string PlanId,
    string Status,
    DateTime? CurrentPeriodEnd,
    bool IsActive,
    bool StripeConfigured,
    bool FakeSubscribeAllowed,
    string? PublishableKey,
    decimal CenterProPriceGel,
    string CenterProInterval,
    decimal DoctorProPriceGel,
    string DoctorProInterval,
    string Audience);

public record BillingPlanDto(
    string PlanId,
    string Audience,
    decimal PriceGel,
    string Interval,
    bool StripeConfigured);

public record BillingPlansDto(
    IReadOnlyList<BillingPlanDto> Plans,
    bool FakeSubscribeAllowed);

public record CheckoutSessionDto(string Url);

public record CheckoutRequestDto(string? PlanId);

public record FakeActivateDto(int Days = 30, string? PlanId = null);
