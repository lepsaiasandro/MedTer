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
    string CenterProInterval);

public record CheckoutSessionDto(string Url);

public record FakeActivateDto(int Days = 30);
