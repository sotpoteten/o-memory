using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Data.Sqlite;

namespace Mem.Api.Tests;

/// <summary>Starts the API on a database created before game modes existed (no Mode column).</summary>
public sealed class LegacyDatabaseFactory : MemApiFactory
{
    public string DatabasePath => Path.Combine(TempDir, "legacy.db");

    public LegacyDatabaseFactory()
    {
        using var connection = new SqliteConnection($"Data Source={DatabasePath};Pooling=False");
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            CREATE TABLE HighScores (
                Id INTEGER NOT NULL CONSTRAINT PK_HighScores PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL, Pairs INTEGER NOT NULL, Moves INTEGER NOT NULL,
                TimeMs INTEGER NOT NULL, CreatedAt TEXT NOT NULL);
            INSERT INTO HighScores (Name, Pairs, Moves, TimeMs, CreatedAt) VALUES ('Gammel', 6, 9, 40000, '2026-10-01 12:00:00');
            """;
        command.ExecuteNonQuery();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("ConnectionStrings:Mem", $"Data Source={DatabasePath};Pooling=False");
    }
}

public class DatabaseUpgradeTests(LegacyDatabaseFactory factory) : IClassFixture<LegacyDatabaseFactory>
{
    private record HighScoreDto(string Name, string Mode);

    [Fact]
    public async Task Old_scores_survive_and_belong_to_the_symbol_game()
    {
        var client = factory.CreateClient();

        var symbols = await client.GetFromJsonAsync<List<HighScoreDto>>("/api/highscores?pairs=6");
        var descriptions = await client.GetFromJsonAsync<List<HighScoreDto>>("/api/highscores?pairs=6&mode=descriptions");

        Assert.Equal([new HighScoreDto("Gammel", "symbols")], symbols);
        Assert.Empty(descriptions!);
    }

    [Fact]
    public async Task New_scores_can_be_saved_with_a_mode_after_the_upgrade()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/highscores", new { name = "Ny", pairs = 8, moves = 10, timeMs = 30_000, mode = "descriptions" });

        response.EnsureSuccessStatusCode();
    }
}
