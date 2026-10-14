using System.Security.Claims;
using backend.Dtos;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Checkout;

namespace backend.Controllers;

[ApiController]
[Route("api/billing")]
public class BillingController : ControllerBase
{
    public const string CenterProPlanId = "center_pro";
    private const decimal CenterProPriceGel = 29m;

    private readonly UserManager<ApplicationUser> _users;
    private readonly StripeOptions _stripe;
    private readonly IHostEnvironment _env;
    private readonly ILogger<BillingController> _log;

    public BillingController(
        UserManager<ApplicationUser> users,
        IOptions<StripeOptions> stripe,
        IHostEnvironment env,
        ILogger<BillingController> log)
    {
        _users = users;
        _stripe = stripe.Value;
        _env = env;
        _log = log;
    }

    private string? MyId => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private bool FakeAllowed => _stripe.AllowFakeSubscribe || _env.IsDevelopment();

    [HttpGet("status")]
    [Authorize]
    public async Task<ActionResult<BillingStatusDto>> Status()
    {
        var user = await _users.FindByIdAsync(MyId!);
        if (user is null) return Unauthorized();

        return Ok(ToStatus(user));
    }

    /// <summary>Create a Stripe Checkout Session (subscription). Requires Stripe config.</summary>
    [HttpPost("checkout")]
    [Authorize]
    public async Task<ActionResult<CheckoutSessionDto>> Checkout()
    {
        var user = await _users.FindByIdAsync(MyId!);
        if (user is null) return Unauthorized();
        if (user.Role != UserRole.TrainingCenter)
            return BadRequest(new { message = "Only training centers can subscribe to Center Pro." });

        if (!_stripe.IsConfigured)
            return BadRequest(new
            {
                message = "Stripe is not configured. Set Stripe:SecretKey and Stripe:CenterProPriceId, or use fake-activate in Development."
            });

        StripeConfiguration.ApiKey = _stripe.SecretKey;

        if (string.IsNullOrWhiteSpace(user.StripeCustomerId))
        {
            var customer = await new CustomerService().CreateAsync(new CustomerCreateOptions
            {
                Email = user.Email,
                Name = user.DisplayName,
                Metadata = new Dictionary<string, string> { ["userId"] = user.Id }
            });
            user.StripeCustomerId = customer.Id;
            await _users.UpdateAsync(user);
        }

        var baseUrl = (_stripe.PublicAppUrl ?? "").TrimEnd('/');
        var options = new SessionCreateOptions
        {
            Mode = "subscription",
            Customer = user.StripeCustomerId,
            SuccessUrl = $"{baseUrl}/pricing?success=1&session_id={{CHECKOUT_SESSION_ID}}",
            CancelUrl = $"{baseUrl}/pricing?canceled=1",
            LineItems =
            [
                new SessionLineItemOptions
                {
                    Price = _stripe.CenterProPriceId,
                    Quantity = 1
                }
            ],
            Metadata = new Dictionary<string, string>
            {
                ["userId"] = user.Id,
                ["planId"] = CenterProPlanId
            },
            SubscriptionData = new SessionSubscriptionDataOptions
            {
                Metadata = new Dictionary<string, string>
                {
                    ["userId"] = user.Id,
                    ["planId"] = CenterProPlanId
                }
            }
        };

        var session = await new SessionService().CreateAsync(options);
        if (string.IsNullOrWhiteSpace(session.Url))
            return StatusCode(500, new { message = "Stripe did not return a checkout URL." });

        return Ok(new CheckoutSessionDto(session.Url));
    }

    /// <summary>Dev / test helper: activate Center Pro without Stripe.</summary>
    [HttpPost("fake-activate")]
    [Authorize]
    public async Task<ActionResult<BillingStatusDto>> FakeActivate([FromBody] FakeActivateDto? dto)
    {
        if (!FakeAllowed)
            return NotFound();

        var user = await _users.FindByIdAsync(MyId!);
        if (user is null) return Unauthorized();
        if (user.Role != UserRole.TrainingCenter)
            return BadRequest(new { message = "Only training centers can subscribe to Center Pro." });

        var days = dto?.Days is > 0 and <= 365 ? dto.Days : 30;
        user.SubscriptionStatus = "active";
        user.SubscriptionPlanId = CenterProPlanId;
        user.SubscriptionCurrentPeriodEnd = DateTime.UtcNow.AddDays(days);
        user.StripeSubscriptionId ??= $"fake_sub_{user.Id}";
        await _users.UpdateAsync(user);

        _log.LogInformation("Fake subscription activated for {UserId} until {End}", user.Id, user.SubscriptionCurrentPeriodEnd);
        return Ok(ToStatus(user));
    }

    /// <summary>Cancel local subscription (and Stripe subscription if configured).</summary>
    [HttpPost("cancel")]
    [Authorize]
    public async Task<ActionResult<BillingStatusDto>> Cancel()
    {
        var user = await _users.FindByIdAsync(MyId!);
        if (user is null) return Unauthorized();
        if (user.Role != UserRole.TrainingCenter)
            return BadRequest(new { message = "Only training centers have Center Pro." });

        if (_stripe.IsConfigured
            && !string.IsNullOrWhiteSpace(user.StripeSubscriptionId)
            && !user.StripeSubscriptionId.StartsWith("fake_", StringComparison.OrdinalIgnoreCase))
        {
            StripeConfiguration.ApiKey = _stripe.SecretKey;
            try
            {
                await new SubscriptionService().CancelAsync(user.StripeSubscriptionId);
            }
            catch (StripeException ex)
            {
                _log.LogWarning(ex, "Stripe cancel failed for {Sub}", user.StripeSubscriptionId);
            }
        }

        user.SubscriptionStatus = "canceled";
        user.SubscriptionPlanId = null;
        user.SubscriptionCurrentPeriodEnd = null;
        user.StripeSubscriptionId = null;
        await _users.UpdateAsync(user);
        return Ok(ToStatus(user));
    }

    /// <summary>Stripe webhook — raw body required for signature verification.</summary>
    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> Webhook()
    {
        if (string.IsNullOrWhiteSpace(_stripe.WebhookSecret) || string.IsNullOrWhiteSpace(_stripe.SecretKey))
        {
            _log.LogWarning("Stripe webhook hit but WebhookSecret/SecretKey not configured");
            return BadRequest();
        }

        var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
        Event stripeEvent;
        try
        {
            stripeEvent = EventUtility.ConstructEvent(
                json,
                Request.Headers["Stripe-Signature"],
                _stripe.WebhookSecret);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Invalid Stripe webhook signature");
            return BadRequest();
        }

        StripeConfiguration.ApiKey = _stripe.SecretKey;

        switch (stripeEvent.Type)
        {
            case EventTypes.CheckoutSessionCompleted:
            {
                if (stripeEvent.Data.Object is Session session)
                    await ApplyCheckoutSessionAsync(session);
                break;
            }
            case EventTypes.CustomerSubscriptionUpdated:
            case EventTypes.CustomerSubscriptionDeleted:
            {
                if (stripeEvent.Data.Object is Subscription sub)
                    await ApplyStripeSubscriptionAsync(sub);
                break;
            }
        }

        return Ok();
    }

    private async Task ApplyCheckoutSessionAsync(Session session)
    {
        var userId = session.Metadata?.GetValueOrDefault("userId");
        if (string.IsNullOrWhiteSpace(userId) && !string.IsNullOrWhiteSpace(session.ClientReferenceId))
            userId = session.ClientReferenceId;

        ApplicationUser? user = null;
        if (!string.IsNullOrWhiteSpace(userId))
            user = await _users.FindByIdAsync(userId);

        if (user is null && !string.IsNullOrWhiteSpace(session.CustomerId))
            user = _users.Users.FirstOrDefault(u => u.StripeCustomerId == session.CustomerId);

        if (user is null)
        {
            _log.LogWarning("Checkout completed but user not found (customer={Customer})", session.CustomerId);
            return;
        }

        if (!string.IsNullOrWhiteSpace(session.CustomerId))
            user.StripeCustomerId = session.CustomerId;

        if (!string.IsNullOrWhiteSpace(session.SubscriptionId))
        {
            user.StripeSubscriptionId = session.SubscriptionId;
            var sub = await new SubscriptionService().GetAsync(session.SubscriptionId);
            ApplySubscriptionFields(user, sub);
        }
        else
        {
            user.SubscriptionStatus = "active";
            user.SubscriptionPlanId = CenterProPlanId;
            user.SubscriptionCurrentPeriodEnd = DateTime.UtcNow.AddDays(30);
        }

        await _users.UpdateAsync(user);
    }

    private async Task ApplyStripeSubscriptionAsync(Subscription sub)
    {
        var userId = sub.Metadata?.GetValueOrDefault("userId");
        ApplicationUser? user = null;
        if (!string.IsNullOrWhiteSpace(userId))
            user = await _users.FindByIdAsync(userId);

        if (user is null && !string.IsNullOrWhiteSpace(sub.CustomerId))
            user = _users.Users.FirstOrDefault(u => u.StripeCustomerId == sub.CustomerId);

        if (user is null)
        {
            _log.LogWarning("Subscription event for unknown user (sub={Sub})", sub.Id);
            return;
        }

        ApplySubscriptionFields(user, sub);
        await _users.UpdateAsync(user);
    }

    private static void ApplySubscriptionFields(ApplicationUser user, Subscription sub)
    {
        user.StripeSubscriptionId = sub.Id;
        if (!string.IsNullOrWhiteSpace(sub.CustomerId))
            user.StripeCustomerId = sub.CustomerId;

        user.SubscriptionPlanId = CenterProPlanId;
        user.SubscriptionStatus = sub.Status switch
        {
            "active" or "trialing" => "active",
            "past_due" => "past_due",
            "canceled" or "unpaid" or "incomplete_expired" => "canceled",
            _ => sub.Status ?? "none"
        };

        // Prefer subscription period end when the SDK exposes it; otherwise keep ~30 days.
        var periodEndProp = sub.GetType().GetProperty("CurrentPeriodEnd");
        if (periodEndProp?.GetValue(sub) is DateTime periodEnd && periodEnd > DateTime.UnixEpoch)
            user.SubscriptionCurrentPeriodEnd = periodEnd.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(periodEnd, DateTimeKind.Utc)
                : periodEnd.ToUniversalTime();
        else if (user.SubscriptionStatus == "active")
            user.SubscriptionCurrentPeriodEnd ??= DateTime.UtcNow.AddDays(30);
    }

    private BillingStatusDto ToStatus(ApplicationUser user) =>
        new(
            user.SubscriptionPlanId ?? "none",
            user.HasActiveCenterSubscription ? "active" : (user.SubscriptionStatus ?? "none"),
            user.SubscriptionCurrentPeriodEnd,
            user.HasActiveCenterSubscription,
            _stripe.IsConfigured,
            FakeAllowed,
            string.IsNullOrWhiteSpace(_stripe.PublishableKey) ? null : _stripe.PublishableKey,
            CenterProPriceGel,
            "month");
}
