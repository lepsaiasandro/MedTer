using System.Net;
using System.Net.Mail;

namespace backend.Services;

public interface IEmailSender
{
    Task SendAsync(string to, string subject, string body);
}

// Dev sender: does NOT send real email — just logs. No credentials needed.
public class DevEmailSender : IEmailSender
{
    private readonly ILogger<DevEmailSender> _logger;

    public DevEmailSender(ILogger<DevEmailSender> logger) => _logger = logger;

    public Task SendAsync(string to, string subject, string body)
    {
        _logger.LogInformation("📧 [DEV EMAIL] To: {To} | Subject: {Subject}\n{Body}", to, subject, body);
        return Task.CompletedTask;
    }
}

// Real SMTP sender. Enabled when Email:Smtp:Host is configured in appsettings.
public class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _config;

    public SmtpEmailSender(IConfiguration config) => _config = config;

    public async Task SendAsync(string to, string subject, string body)
    {
        var smtp = _config.GetSection("Email:Smtp");
        var host = smtp["Host"];
        var username = smtp["Username"];
        var password = (smtp["Password"] ?? "").Replace(" ", "");
        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            throw new InvalidOperationException("Email SMTP is not configured.");

        using var client = new SmtpClient(host, int.Parse(smtp["Port"] ?? "587"))
        {
            DeliveryMethod = SmtpDeliveryMethod.Network,
            UseDefaultCredentials = false,
            EnableSsl = true,
            Credentials = new NetworkCredential(username, password),
            Timeout = 20_000
        };

        using var message = new MailMessage(smtp["From"] ?? username, to, subject, body);
        await client.SendMailAsync(message);
    }
}
