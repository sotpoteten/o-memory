using System.Text.Json;
using System.Text.Json.Serialization;
using Mem.Api;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// Configuration is read lazily (inside factories / after Build) so tests can override it.
builder.Services.AddSingleton(sp => SymbolRepository.LoadFrom(
    DataDirectory(sp.GetRequiredService<IConfiguration>(), builder.Environment),
    sp.GetRequiredService<ILogger<SymbolRepository>>()));
builder.Services.AddSingleton(sp => ControlDescriptionRepository.LoadFrom(
    DataDirectory(sp.GetRequiredService<IConfiguration>(), builder.Environment),
    sp.GetRequiredService<ILogger<ControlDescriptionRepository>>()));
builder.Services.AddDbContext<MemDbContext>((sp, options) =>
    options.UseSqlite(sp.GetRequiredService<IConfiguration>().GetConnectionString("Mem")));
builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));
builder.Services.AddProblemDetails();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MemDbContext>();
    db.Database.EnsureCreated();
    DatabaseUpgrade.AddModeColumnIfMissing(db);

    // Load both data sets at startup so a broken data file fails fast instead of on the first request.
    scope.ServiceProvider.GetRequiredService<SymbolRepository>();
    scope.ServiceProvider.GetRequiredService<ControlDescriptionRepository>();
}

var dataDirectory = DataDirectory(app.Configuration, app.Environment);
// The more specific path first: control description images live outside data/images.
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(Path.Combine(dataDirectory, "control-descriptions")),
    RequestPath = "/images/control-descriptions",
});
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(Path.Combine(dataDirectory, "images")),
    RequestPath = "/images",
});

// The built React app (web/dist) is copied to wwwroot for production.
app.UseDefaultFiles();
app.UseStaticFiles();

var api = app.MapGroup("/api");

api.MapGet("/symbols", (SymbolRepository repo) => repo.All.Select(s => new
{
    s.Id,
    s.Name,
    s.Names,
    s.Category,
    s.Definition,
    s.PageUrl,
    SymbolImageUrl = Game.ImageUrl(s.SymbolImage),
    Photos = s.Photos.Select(p => new { ImageUrl = Game.ImageUrl(p.File), p.Alt, p.Caption, p.Location, p.SourceUrl }),
}));

api.MapGet("/game", (int pairs, string? mode, SymbolRepository symbols, ControlDescriptionRepository descriptions) =>
{
    mode ??= GameModes.Symbols;
    var errors = new Dictionary<string, string[]>();
    if (!Game.AllowedPairs.Contains(pairs))
        errors["pairs"] = [$"Antall par må være {string.Join(", ", Game.AllowedPairs)}."];
    if (!GameModes.All.Contains(mode))
        errors["mode"] = [$"Modus må være {string.Join(", ", GameModes.All)}."];
    if (errors.Count > 0) return Results.ValidationProblem(errors);

    return Results.Ok(mode == GameModes.Descriptions
        ? Game.CreateDescriptionDeck(descriptions.All, descriptions.GroupsByExample, pairs, Random.Shared)
        : Game.CreateDeck(symbols.All, symbols.GroupsBySymbol, pairs, Random.Shared));
});

api.MapGet("/highscores", async (int pairs, string? mode, MemDbContext db) =>
{
    mode ??= GameModes.Symbols;
    return await db.HighScores
        .Where(h => h.Pairs == pairs && h.Mode == mode)
        .OrderBy(h => h.Moves).ThenBy(h => h.TimeMs).ThenBy(h => h.CreatedAt)
        .Take(10)
        .ToListAsync();
});

api.MapPost("/highscores", async (NewHighScore input, MemDbContext db) =>
{
    var errors = input.Validate();
    if (errors.Count > 0) return Results.ValidationProblem(errors);

    var score = new HighScore
    {
        Name = input.Name.Trim(),
        Mode = input.ModeOrDefault,
        Pairs = input.Pairs,
        Moves = input.Moves,
        TimeMs = input.TimeMs,
        CreatedAt = DateTime.UtcNow,
    };
    db.HighScores.Add(score);
    await db.SaveChangesAsync();
    return Results.Created($"/api/highscores/{score.Id}", score);
});

app.MapFallbackToFile("index.html");

app.Run();

static string DataDirectory(IConfiguration config, IHostEnvironment env) =>
    Path.GetFullPath(Path.Combine(env.ContentRootPath, config["DataDirectory"] ?? "data"));

public partial class Program;
