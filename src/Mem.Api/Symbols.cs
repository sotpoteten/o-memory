using System.Text.Json;

namespace Mem.Api;

// Mirrors the data/symbols.json format produced by tools/OmapScraper.
public record Symbol(
    string Id,
    string Name,
    int Category,
    string? Definition,
    string PageUrl,
    string SymbolImage,
    List<Photo> Photos)
{
    /// <summary>Symbol name per language code ("en" always present), e.g. { "en": "Boulder", "nb": "Stein" }.</summary>
    public Dictionary<string, string> Names { get; init; } = new() { ["en"] = Name };
}

public record Photo(string File, string? Alt, string? Caption, string? Location, string SourceUrl);

public class SymbolRepository(IReadOnlyList<Symbol> symbols)
{
    public IReadOnlyList<Symbol> All { get; } = symbols;

    public static SymbolRepository LoadFrom(string dataDirectory)
    {
        var path = Path.Combine(dataDirectory, "symbols.json");
        if (!File.Exists(path))
            throw new FileNotFoundException($"Missing {path}. Run tools/OmapScraper first.", path);

        var symbols = JsonSerializer.Deserialize<List<Symbol>>(File.ReadAllText(path), JsonSerializerOptions.Web) ?? [];
        var translations = LoadTranslations(Path.Combine(dataDirectory, "i18n"));

        return new SymbolRepository(symbols
            .Where(s => s.Photos.Count > 0)
            .Select(s => s with { Names = NamesFor(s, translations) })
            .ToList());
    }

    /// <summary>Reads i18n/symbols.{lang}.json files: { "204": "Stein", ... } per language.</summary>
    private static Dictionary<string, Dictionary<string, string>> LoadTranslations(string directory)
    {
        var result = new Dictionary<string, Dictionary<string, string>>();
        if (!Directory.Exists(directory)) return result;

        foreach (var file in Directory.GetFiles(directory, "symbols.*.json"))
        {
            var lang = Path.GetFileNameWithoutExtension(file)["symbols.".Length..];
            result[lang] = JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(file)) ?? [];
        }
        return result;
    }

    private static Dictionary<string, string> NamesFor(Symbol symbol, Dictionary<string, Dictionary<string, string>> translations)
    {
        var names = new Dictionary<string, string> { ["en"] = symbol.Name };
        foreach (var (lang, byId) in translations)
        {
            if (byId.TryGetValue(symbol.Id, out var name) && !string.IsNullOrWhiteSpace(name))
                names[lang] = name;
        }
        return names;
    }
}
