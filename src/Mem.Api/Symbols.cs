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

/// <summary>A set of easily confused symbols; a game contains at most one of them. Read from confusable-groups.json.</summary>
public record ConfusableGroup(string Name, List<string> Ids);

public class SymbolRepository(IReadOnlyList<Symbol> symbols, IReadOnlyDictionary<string, int[]>? groupsBySymbol = null)
{
    public IReadOnlyList<Symbol> All { get; } = symbols;

    /// <summary>Indices of the confusable groups each symbol id belongs to (absent = in no group).</summary>
    public IReadOnlyDictionary<string, int[]> GroupsBySymbol { get; } = groupsBySymbol ?? new Dictionary<string, int[]>();

    public static SymbolRepository LoadFrom(string dataDirectory, ILogger? logger = null)
    {
        var path = Path.Combine(dataDirectory, "symbols.json");
        if (!File.Exists(path))
            throw new FileNotFoundException($"Missing {path}. Run tools/OmapScraper first.", path);

        var symbols = JsonSerializer.Deserialize<List<Symbol>>(File.ReadAllText(path), JsonSerializerOptions.Web) ?? [];
        var translations = LoadTranslations(Path.Combine(dataDirectory, "i18n"));

        var playable = symbols
            .Where(s => s.Photos.Count > 0)
            .Select(s => s with { Names = NamesFor(s, translations) })
            .ToList();
        var groupsBySymbol = LoadConfusableGroups(Path.Combine(dataDirectory, "confusable-groups.json"), playable, logger);

        // Fail at startup rather than on the first "hard" game if the groups leave too few distinct symbols.
        var maxPairs = Game.AllowedPairs.Max();
        var capacity = Game.PickNonConfusable(playable, groupsBySymbol, int.MaxValue).Count;
        if (capacity < maxPairs)
            throw new InvalidOperationException(
                $"Confusable groups leave only {capacity} non-confusable symbols; {maxPairs} are needed.");

        return new SymbolRepository(playable, groupsBySymbol);
    }

    private static Dictionary<string, int[]> LoadConfusableGroups(string path, IReadOnlyList<Symbol> symbols, ILogger? logger)
    {
        if (!File.Exists(path)) return [];

        var groups = JsonSerializer.Deserialize<List<ConfusableGroup>>(File.ReadAllText(path), JsonSerializerOptions.Web) ?? [];
        var known = symbols.Select(s => s.Id).ToHashSet();

        var result = new Dictionary<string, List<int>>();
        for (var i = 0; i < groups.Count; i++)
        {
            foreach (var id in groups[i].Ids)
            {
                if (!known.Contains(id))
                {
                    logger?.LogWarning("Confusable group {Group} refers to unknown symbol {Id}; ignored", groups[i].Name, id);
                    continue;
                }
                if (!result.TryGetValue(id, out var list)) result[id] = list = [];
                list.Add(i);
            }
        }
        return result.ToDictionary(kv => kv.Key, kv => kv.Value.ToArray());
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
