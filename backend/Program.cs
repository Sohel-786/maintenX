// DATABASE ARCHITECTURE RULE:
// - Schema changes handled ONLY via EF Core migrations.
// - Data seeding handled ONLY via DbInitializer.

using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using net_backend.Data;
using net_backend.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "MaintenX API",
        Version = "v1",
        Description = "Facility maintenance portal API (complaints, users, company/location scope)."
    });
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IExcelService, ExcelService>();

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key is not configured.");
if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("Jwt:Key must be at least 32 bytes (UTF-8) for HS256.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                context.Token = context.Request.Cookies["access_token"];
                return Task.CompletedTask;
            }
        };
    });

var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
if (corsOrigins == null || corsOrigins.Length == 0)
{
    corsOrigins = new[] { "http://localhost:3000", "http://localhost:3001" };
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("MaintenX",
        policy =>
        {
            policy.WithOrigins(corsOrigins)
                   .AllowAnyMethod()
                   .AllowAnyHeader()
                   .AllowCredentials()
                   .WithExposedHeaders("Content-Disposition");
        });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

var storagePath = Path.Combine(builder.Environment.ContentRootPath, "wwwroot", "storage");
if (!Directory.Exists(storagePath))
{
    Directory.CreateDirectory(storagePath);
}

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors("MaintenX");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("index.html");

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    var env = services.GetRequiredService<IWebHostEnvironment>();
    var aesKey = builder.Configuration["PasswordEncryption:Key"]
        ?? throw new InvalidOperationException("PasswordEncryption:Key is not configured.");

    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        context.Database.Migrate();
        DbInitializer.Initialize(context, aesKey);
        logger.LogInformation("Database initialized successfully (migrations and seeding).");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while initializing the database.");
        if (env.IsProduction())
            throw;
    }
}

app.Run();
