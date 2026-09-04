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
        using var client = new SmtpClient(smtp["Host"], int.Parse(smtp["Port"] ?? "587"))
        {
            Credentials = new NetworkCredential(smtp["Username"], smtp["Password"]),
            EnableSsl = true
        };

        var message = new MailMessage(smtp["From"] ?? smtp["Username"]!, to, subject, body);
        await client.SendMailAsync(message);
    }
}
