using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace backend.Data;

// Lets `dotnet ef` create the context at design time (migrations) without
// running the full web host.
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var config = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json")
            .Build();

        var connection = config.GetConnectionString("Default") ?? "";
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        if (connection.Contains("postgres", StringComparison.OrdinalIgnoreCase)
            || connection.Contains("Ssl Mode=", StringComparison.OrdinalIgnoreCase)
            || connection.Contains("SSL Mode=", StringComparison.OrdinalIgnoreCase))
            optionsBuilder.UseNpgsql(connection);
        else
            optionsBuilder.UseSqlServer(connection);

        var options = optionsBuilder.Options;

        return new AppDbContext(options);
    }
}
