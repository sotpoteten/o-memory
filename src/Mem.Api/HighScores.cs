using Microsoft.EntityFrameworkCore;

namespace Mem.Api;

public class HighScore
{
    public int Id { get; set; }
    public required string Name { get; set; }
    /// <summary>Game mode (see <see cref="GameModes"/>); each mode has its own list.</summary>
    public string Mode { get; set; } = GameModes.Symbols;
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
            e.HasIndex(h => new { h.Mode, h.Pairs, h.Moves, h.TimeMs });
        });
    }
}

public record NewHighScore(string Name, int Pairs, int Moves, int TimeMs, string? Mode = null)
{
    /// <summary>Older clients do not send a mode; they only know the symbol game.</summary>
    public string ModeOrDefault => Mode ?? GameModes.Symbols;

    public const int MaxNameLength = 20;

    public Dictionary<string, string[]> Validate()
    {
        var errors = new Dictionary<string, string[]>();
        var name = Name?.Trim() ?? "";
        if (name.Length is 0 or > MaxNameLength)
            errors[nameof(Name)] = [$"Navn må være 1–{MaxNameLength} tegn."];
        if (!GameModes.All.Contains(ModeOrDefault))
            errors[nameof(Mode)] = [$"Modus må være {string.Join(", ", GameModes.All)}."];
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

public static class DatabaseUpgrade
{
    /// <summary>
    /// The database is created with EnsureCreated, which never alters an existing schema. Databases from before
    /// game modes existed get the Mode column here; their scores all belong to the symbol game.
    /// </summary>
    private const string AddModeColumn =
        "ALTER TABLE HighScores ADD COLUMN Mode TEXT NOT NULL DEFAULT '" + GameModes.Symbols + "'";

    public static void AddModeColumnIfMissing(MemDbContext db)
    {
        var connection = db.Database.GetDbConnection();
        db.Database.OpenConnection();
        try
        {
            using var command = connection.CreateCommand();
            command.CommandText = "SELECT COUNT(*) FROM pragma_table_info('HighScores') WHERE name = 'Mode'";
            if (Convert.ToInt32(command.ExecuteScalar()) > 0) return;

            db.Database.ExecuteSqlRaw(AddModeColumn);
        }
        finally
        {
            db.Database.CloseConnection();
        }
    }
}
