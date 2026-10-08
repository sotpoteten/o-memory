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
    List<Photo> Photos);

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
        return new SymbolRepository(symbols.Where(s => s.Photos.Count > 0).ToList());
    }
}
