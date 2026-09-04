using System.Text;
using backend.Data;
using backend.Hubs;
using backend.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
// Swashbuckle 7.x → Microsoft.OpenApi 1.6.x (Microsoft.OpenApi.Models namespace)

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// Swagger / OpenAPI with JWT bearer support
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "MedTer API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "შეიყვანე მხოლოდ JWT ტოკენი (login-ის შემდეგ დაბრუნებული)."
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// Database
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

// Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(opt =>
    {
        opt.Password.RequireNonAlphanumeric = false;
        opt.Password.RequireUppercase = false;
        opt.Password.RequiredLength = 6;
        opt.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// JWT auth
var jwt = builder.Configuration.GetSection("Jwt");
builder.Services.AddAuthentication(options =>
    {
        // AddIdentity above sets cookie schemes as default; force JWT for the API.
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!))
        };

        // Allow SignalR to pass the token via the query string on the websocket handshake.
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/chat"))
                    context.Token = accessToken;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddSignalR();
builder.Services.AddScoped<backend.Services.TokenService>();

// Email: real SMTP if configured (Email:Smtp:Host), otherwise a dev logger.
if (!string.IsNullOrWhiteSpace(builder.Configuration["Email:Smtp:Host"]))
    builder.Services.AddScoped<backend.Services.IEmailSender, backend.Services.SmtpEmailSender>();
else
    builder.Services.AddScoped<backend.Services.IEmailSender, backend.Services.DevEmailSender>();

// CORS for the React dev server
builder.Services.AddCors(opt =>
    opt.AddPolicy("frontend", p => p
        .WithOrigins("http://localhost:5173", "http://localhost:5174")
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()));

var app = builder.Build();

// Apply migrations + seed test data automatically on startup (simple for MVP)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    await backend.Data.DbSeeder.SeedAsync(scope.ServiceProvider);
}

// Swagger UI at /swagger
app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "MedTer API v1"));

// Serve the built React SPA from wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");

// SPA fallback: any non-API/non-file route returns index.html (React Router handles it)
app.MapFallbackToFile("index.html");

app.Run();
