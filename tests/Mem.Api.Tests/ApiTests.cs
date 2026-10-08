using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Mem.Api.Tests;

/// <summary>Runs the API against a temporary data directory and SQLite database.</summary>
public class MemApiFactory : WebApplicationFactory<Program>
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

        // Norwegian names for 201–213 only; 214 and 215 stay untranslated to exercise the English fallback.
        Directory.CreateDirectory(Path.Combine(TempDir, "i18n"));
        var norwegian = Enumerable.Range(1, 13).ToDictionary(i => (200 + i).ToString(), i => $"Symbol nb {i}");
        File.WriteAllText(Path.Combine(TempDir, "i18n", "symbols.nb.json"), JsonSerializer.Serialize(norwegian));

        // 201–203 are "confusable": 11 ungrouped symbols + 1 group = exactly 12 slots, enough for the hardest level.
        File.WriteAllText(Path.Combine(TempDir, "confusable-groups.json"), JsonSerializer.Serialize(new[]
        {
            new { name = "Test group", ids = new[] { "201", "202", "203", "999" } },
        }));

        // 14 control description examples; 1 and 2 are confusable.
        var examples = Enumerable.Range(1, 14).Select(i => new
        {
            id = i,
            page = 18,
            text = $"Example {i}",
            feature = $"feature {i}",
            mapImage = $"control-descriptions/{i}/map.png",
            terrainImage = $"control-descriptions/{i}/terrain.png",
            descriptionImage = $"control-descriptions/{i}/description.png",
        });
        Directory.CreateDirectory(Path.Combine(TempDir, "control-descriptions"));
        File.WriteAllText(Path.Combine(TempDir, "control-descriptions.json"), JsonSerializer.Serialize(examples));
        File.WriteAllText(Path.Combine(TempDir, "control-descriptions-groups.json"), JsonSerializer.Serialize(new[]
        {
            new { name = "feature", ids = new[] { "1", "2" } },
        }));
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

    private record CardDto(string Id, string PairId, string Kind, string ImageUrl, string SymbolId, Dictionary<string, string> SymbolNames, DetailsDto? Details = null);
    private record DetailsDto(string MapImageUrl, string Text);
    private record SymbolDto(string Id, string Name, Dictionary<string, string> Names);
    private record HighScoreDto(int Id, string Name, int Pairs, int Moves, int TimeMs, string Mode);

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
    public async Task Game_cards_carry_symbol_names_per_language()
    {
        var cards = await _client.GetFromJsonAsync<List<CardDto>>("/api/game?pairs=12");

        Assert.NotNull(cards);
        Assert.All(cards, c =>
        {
            var n = int.Parse(c.SymbolId) - 200;
            Assert.Equal($"Symbol {n}", c.SymbolNames["en"]);
            if (n <= 13) Assert.Equal($"Symbol nb {n}", c.SymbolNames["nb"]);
            else Assert.False(c.SymbolNames.ContainsKey("nb"));
        });
    }

    [Fact]
    public async Task Symbols_without_translation_only_have_english_name()
    {
        var symbols = await _client.GetFromJsonAsync<List<SymbolDto>>("/api/symbols");

        Assert.NotNull(symbols);
        Assert.Equal("Symbol nb 1", symbols.Single(s => s.Id == "201").Names["nb"]);
        var untranslated = symbols.Single(s => s.Id == "214");
        Assert.Equal(["en"], untranslated.Names.Keys);
        Assert.Equal("Symbol 14", untranslated.Names["en"]);
    }

    [Fact]
    public async Task Game_never_contains_two_symbols_from_the_same_confusable_group()
    {
        for (var i = 0; i < 50; i++)
        {
            var cards = await _client.GetFromJsonAsync<List<CardDto>>("/api/game?pairs=12");

            Assert.NotNull(cards);
            Assert.Equal(12, cards.Select(c => c.PairId).Distinct().Count());
            Assert.True(cards.Select(c => c.SymbolId).Distinct().Count(id => id is "201" or "202" or "203") <= 1);
        }
    }

    [Fact]
    public async Task Description_game_pairs_description_strips_with_terrain_drawings()
    {
        for (var i = 0; i < 20; i++)
        {
            var cards = await _client.GetFromJsonAsync<List<CardDto>>("/api/game?pairs=12&mode=descriptions");

            Assert.NotNull(cards);
            Assert.Equal(24, cards.Count);
            Assert.All(cards.GroupBy(c => c.PairId), g =>
                Assert.Equal(["description", "terrain"], g.Select(c => c.Kind).Order()));
            Assert.All(cards, c =>
            {
                Assert.StartsWith("/images/control-descriptions/", c.ImageUrl);
                Assert.NotNull(c.Details);
                Assert.Equal($"/images/control-descriptions/{c.PairId}/map.png", c.Details.MapImageUrl);
                Assert.Equal($"Example {c.PairId}", c.Details.Text);
                Assert.Equal(c.Details.Text, c.SymbolNames["en"]);
            });
            Assert.False(cards.Any(c => c.PairId == "1") && cards.Any(c => c.PairId == "2"));
        }
    }

    [Fact]
    public async Task Game_with_unknown_mode_returns_400()
    {
        var response = await _client.GetAsync("/api/game?pairs=6&mode=sprint");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Highscores_are_kept_per_mode()
    {
        await _client.PostAsJsonAsync("/api/highscores", new { name = "Symboler", pairs = 8, moves = 12, timeMs = 50_000 });
        await _client.PostAsJsonAsync("/api/highscores", new { name = "Poster", pairs = 8, moves = 14, timeMs = 70_000, mode = "descriptions" });

        var symbols = await _client.GetFromJsonAsync<List<HighScoreDto>>("/api/highscores?pairs=8");
        var descriptions = await _client.GetFromJsonAsync<List<HighScoreDto>>("/api/highscores?pairs=8&mode=descriptions");

        Assert.NotNull(symbols);
        Assert.NotNull(descriptions);
        Assert.Contains(symbols, h => h.Name == "Symboler" && h.Mode == "symbols");
        Assert.DoesNotContain(symbols, h => h.Name == "Poster");
        Assert.Equal(["Poster"], descriptions.Select(h => h.Name));
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
    [InlineData("Ok", 6, 10, 1000, "sprint")]
    public async Task Invalid_highscore_is_rejected(string name, int pairs, int moves, int timeMs, string mode = "symbols")
    {
        var response = await _client.PostAsJsonAsync("/api/highscores", new { name, pairs, moves, timeMs, mode });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
