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

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(config.GetConnectionString("Default"))
            .Options;

        return new AppDbContext(options);
    }
}
