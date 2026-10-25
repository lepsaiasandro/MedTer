namespace backend.Services;

public class StripeOptions
{
    public const string SectionName = "Stripe";

    /// <summary>sk_test_… — empty = Stripe Checkout disabled; use fake activate in Development.</summary>
    public string SecretKey { get; set; } = string.Empty;

    /// <summary>pk_test_… (optional; frontend may not need it if using Checkout redirect).</summary>
    public string PublishableKey { get; set; } = string.Empty;

    /// <summary>whsec_… for webhook signature verification.</summary>
    public string WebhookSecret { get; set; } = string.Empty;

    /// <summary>Stripe Price ID for Center Pro monthly (price_…).</summary>
    public string CenterProPriceId { get; set; } = string.Empty;

    /// <summary>Stripe Price ID for Doctor Pro monthly (price_…).</summary>
    public string DoctorProPriceId { get; set; } = string.Empty;

    /// <summary>Public site origin for success/cancel URLs, e.g. http://localhost:5173</summary>
    public string PublicAppUrl { get; set; } = "http://localhost:5173";

    /// <summary>When true (default in Development), POST /api/billing/fake-activate works without Stripe.</summary>
    public bool AllowFakeSubscribe { get; set; }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(SecretKey) && !string.IsNullOrWhiteSpace(CenterProPriceId);

    public bool IsDoctorConfigured =>
        !string.IsNullOrWhiteSpace(SecretKey) && !string.IsNullOrWhiteSpace(DoctorProPriceId);
}
