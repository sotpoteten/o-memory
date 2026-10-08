using Microsoft.EntityFrameworkCore;

namespace Mem.Api;

public class HighScore
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public int Pairs { get; set; }
    public int Moves { get; set; }
    public int TimeMs { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class MemDbContext(DbContextOptions<MemDbContext> options) : DbContext(options)
{
    public DbSet<HighScore> HighScores => Set<HighScore>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<HighScore>(e =>
        {
            e.Property(h => h.Name).HasMaxLength(20);
            e.HasIndex(h => new { h.Pairs, h.Moves, h.TimeMs });
        });
    }
}

public record NewHighScore(string Name, int Pairs, int Moves, int TimeMs)
{
    public const int MaxNameLength = 20;

    public Dictionary<string, string[]> Validate()
    {
        var errors = new Dictionary<string, string[]>();
        var name = Name?.Trim() ?? "";
        if (name.Length is 0 or > MaxNameLength)
            errors[nameof(Name)] = [$"Navn må være 1–{MaxNameLength} tegn."];
        if (!Game.AllowedPairs.Contains(Pairs))
            errors[nameof(Pairs)] = [$"Antall par må være {string.Join(", ", Game.AllowedPairs)}."];
        // Every pair needs at least one move; cap the rest at sane limits.
        if (Moves < Pairs || Moves > 1000)
            errors[nameof(Moves)] = ["Ugyldig antall trekk."];
        if (TimeMs <= 0 || TimeMs > 60 * 60 * 1000)
            errors[nameof(TimeMs)] = ["Ugyldig tid."];
        return errors;
    }
}
