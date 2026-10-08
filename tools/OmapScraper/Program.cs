using System.Text.Encodings.Web;
using System.Text.Json;
using OmapScraper;

// Builds data/symbols.json and data/images/ from the IOF O-Map Wiki (ISOM 2017-2).
// Content is CC BY-SA 4.0 — attribution is kept per photo and shown in the game's credits page.
//
// Usage: dotnet run --project tools/OmapScraper [-- --max-photos 4] [--limit N]

const string IsomIndexUrl = "https://omapwiki.orienteering.sport/specifications/isom/";

// Only terrain features (1xx–5xx). Technical symbols (6xx) and course planning symbols (7xx)
// have no real-world counterpart to photograph, so they are left out of the game.
int[] includedCategories = [1, 2, 3, 4, 5];

var maxPhotos = GetIntArg("--max-photos") ?? 4;
var limit = GetIntArg("--limit");

var repoRoot = FindRepoRoot();
var dataDir = Path.Combine(repoRoot, "data");
var imagesDir = Path.Combine(dataDir, "images");
var cacheDir = Path.Combine(repoRoot, "tools", "OmapScraper", ".cache");

var fetcher = new PoliteFetcher(cacheDir, TimeSpan.FromSeconds(1));

var symbolLinks = WikiParser.ParseSymbolLinks(await fetcher.GetHtmlAsync(IsomIndexUrl))
    .Where(url => WikiParser.CategoryFromSymbolUrl(url) is { } category && includedCategories.Contains(category))
    .ToList();
if (limit is not null) symbolLinks = symbolLinks.Take(limit.Value).ToList();
Console.WriteLine($"Found {symbolLinks.Count} symbol pages");

var symbols = new List<SymbolData>();
foreach (var pageUrl in symbolLinks)
{
    SymbolPage page;
    try
    {
        page = WikiParser.ParseSymbolPage(await fetcher.GetHtmlAsync(pageUrl));
    }
    catch (Exception ex)
    {
        Console.WriteLine($"  ! {pageUrl}: {ex.Message}");
        continue;
    }

    if (page.SymbolImageUrl is null || page.CorrectExamples.Count == 0)
    {
        Console.WriteLine($"  - {page.Id} {page.Name}: skipped (no symbol image or no photos)");
        continue;
    }

    var folder = page.Id.Replace('.', '-');
    var symbolFile = $"{folder}/symbol{Path.GetExtension(new Uri(page.SymbolImageUrl).AbsolutePath)}";
    await fetcher.DownloadAsync(page.SymbolImageUrl, Path.Combine(imagesDir, symbolFile));

    var photos = new List<PhotoData>();
    foreach (var example in page.CorrectExamples.Take(maxPhotos))
    {
        try
        {
            var details = WikiParser.ParseExamplePage(await fetcher.GetHtmlAsync(example.ExamplePageUrl));
            var photoFile = $"{folder}/photo-{photos.Count + 1}{Path.GetExtension(new Uri(example.ImageUrl).AbsolutePath)}";
            await fetcher.DownloadAsync(example.ImageUrl, Path.Combine(imagesDir, photoFile));
            photos.Add(new PhotoData(photoFile, example.Alt, details.Caption, details.Location, example.ExamplePageUrl));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  ! {example.ExamplePageUrl}: {ex.Message}");
        }
    }

    if (photos.Count == 0) continue;

    var category = int.TryParse(page.Id[..1], out var c) ? c : 0;
    symbols.Add(new SymbolData(page.Id, page.Name, category, page.Definition, pageUrl, symbolFile, photos));
    Console.WriteLine($"  + {page.Id} {page.Name}: {photos.Count} photo(s)");
}

Directory.CreateDirectory(dataDir);
var json = JsonSerializer.Serialize(symbols, new JsonSerializerOptions
{
    WriteIndented = true,
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
});
await File.WriteAllTextAsync(Path.Combine(dataDir, "symbols.json"), json);
Console.WriteLine($"Wrote {symbols.Count} symbols with photos to {Path.Combine(dataDir, "symbols.json")}");

int? GetIntArg(string name)
{
    var i = Array.IndexOf(args, name);
    return i >= 0 && i + 1 < args.Length && int.TryParse(args[i + 1], out var v) ? v : null;
}

static string FindRepoRoot()
{
    for (var dir = new DirectoryInfo(Directory.GetCurrentDirectory()); dir is not null; dir = dir.Parent)
    {
        if (File.Exists(Path.Combine(dir.FullName, "Mem.sln"))) return dir.FullName;
    }
    throw new InvalidOperationException("Could not find Mem.sln — run from inside the repository.");
}
