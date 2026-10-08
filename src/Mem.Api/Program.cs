using System.Text.Json;
using System.Text.Json.Serialization;
using Mem.Api;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// Configuration is read lazily (inside factories / after Build) so tests can override it.
builder.Services.AddSingleton(sp => SymbolRepository.LoadFrom(DataDirectory(sp.GetRequiredService<IConfiguration>(), builder.Environment)));
builder.Services.AddDbContext<MemDbContext>((sp, options) =>
    options.UseSqlite(sp.GetRequiredService<IConfiguration>().GetConnectionString("Mem")));
builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));
builder.Services.AddProblemDetails();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<MemDbContext>().Database.EnsureCreated();
}

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(Path.Combine(DataDirectory(app.Configuration, app.Environment), "images")),
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
    s.Category,
    s.Definition,
    s.PageUrl,
    SymbolImageUrl = Game.ImageUrl(s.SymbolImage),
    Photos = s.Photos.Select(p => new { ImageUrl = Game.ImageUrl(p.File), p.Alt, p.Caption, p.Location, p.SourceUrl }),
}));

api.MapGet("/game", (int pairs, SymbolRepository repo) =>
{
    if (!Game.AllowedPairs.Contains(pairs))
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["pairs"] = [$"Antall par må være {string.Join(", ", Game.AllowedPairs)}."],
        });
    return Results.Ok(Game.CreateDeck(repo.All, pairs, Random.Shared));
});

api.MapGet("/highscores", async (int pairs, MemDbContext db) =>
    await db.HighScores
        .Where(h => h.Pairs == pairs)
        .OrderBy(h => h.Moves).ThenBy(h => h.TimeMs).ThenBy(h => h.CreatedAt)
        .Take(10)
        .ToListAsync());

api.MapPost("/highscores", async (NewHighScore input, MemDbContext db) =>
{
    var errors = input.Validate();
    if (errors.Count > 0) return Results.ValidationProblem(errors);

    var score = new HighScore
    {
        Name = input.Name.Trim(),
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
