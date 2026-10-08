using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Mem.Api.Tests;

/// <summary>Runs the API against a temporary data directory and SQLite database.</summary>
public sealed class MemApiFactory : WebApplicationFactory<Program>
{
    public string TempDir { get; } = Path.Combine(Path.GetTempPath(), "mem-api-tests-" + Guid.NewGuid().ToString("N"));

    public MemApiFactory()
    {
        Directory.CreateDirectory(Path.Combine(TempDir, "images"));
        var symbols = Enumerable.Range(1, 14).Select(i => new
        {
            id = (200 + i).ToString(),
            name = $"Symbol {i}",
            category = 2,
            definition = "Test",
            pageUrl = $"https://example.org/{i}",
            symbolImage = $"{200 + i}/symbol.svg",
            photos = new[]
            {
                new { file = $"{200 + i}/photo-1.jpg", alt = "a", caption = "c", location = "l", sourceUrl = "https://example.org" },
                new { file = $"{200 + i}/photo-2.jpg", alt = "b", caption = "c", location = "l", sourceUrl = "https://example.org" },
            },
        });
        File.WriteAllText(Path.Combine(TempDir, "symbols.json"), JsonSerializer.Serialize(symbols));
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("DataDirectory", TempDir);
        builder.UseSetting("ConnectionStrings:Mem", $"Data Source={Path.Combine(TempDir, "test.db")};Pooling=False");
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        try { Directory.Delete(TempDir, recursive: true); } catch (IOException) { }
    }
}

public class ApiTests(MemApiFactory factory) : IClassFixture<MemApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    private record CardDto(string Id, string PairId, string Kind, string ImageUrl, string SymbolId, string SymbolName);
    private record HighScoreDto(int Id, string Name, int Pairs, int Moves, int TimeMs);

    [Fact]
    public async Task Game_returns_two_cards_per_pair_with_one_symbol_and_one_photo()
    {
        var cards = await _client.GetFromJsonAsync<List<CardDto>>("/api/game?pairs=8");

        Assert.NotNull(cards);
        Assert.Equal(16, cards.Count);
        Assert.Equal(8, cards.Select(c => c.PairId).Distinct().Count());
        Assert.All(cards.GroupBy(c => c.PairId), g =>
            Assert.Equal(["photo", "symbol"], g.Select(c => c.Kind).Order()));
        Assert.All(cards, c => Assert.StartsWith("/images/", c.ImageUrl));
    }

    [Fact]
    public async Task Game_with_unsupported_pair_count_returns_400()
    {
        var response = await _client.GetAsync("/api/game?pairs=7");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Posted_highscores_are_listed_best_first()
    {
        await _client.PostAsJsonAsync("/api/highscores", new { name = "Treg", pairs = 12, moves = 30, timeMs = 90_000 });
        var created = await _client.PostAsJsonAsync("/api/highscores", new { name = " Rask ", pairs = 12, moves = 20, timeMs = 60_000 });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);

        var list = await _client.GetFromJsonAsync<List<HighScoreDto>>("/api/highscores?pairs=12");

        Assert.NotNull(list);
        Assert.Equal(["Rask", "Treg"], list.Select(h => h.Name));
    }

    [Theory]
    [InlineData("", 6, 10, 1000)]
    [InlineData("Et altfor langt navn her", 6, 10, 1000)]
    [InlineData("Ok", 7, 10, 1000)]
    [InlineData("Ok", 6, 3, 1000)]
    [InlineData("Ok", 6, 10, 0)]
    public async Task Invalid_highscore_is_rejected(string name, int pairs, int moves, int timeMs)
    {
        var response = await _client.PostAsJsonAsync("/api/highscores", new { name, pairs, moves, timeMs });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
