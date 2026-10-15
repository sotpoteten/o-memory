using System.Net;
using System.Runtime.Versioning;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using ControlDescriptionExtractor;
using PDFtoImage;
using SkiaSharp;
using UglyToad.PdfPig;

// Extracts the example table (pages 18–29) of "International Specification for Control Descriptions 2024"
// into data/control-descriptions/{id}/{map,terrain,description}.png and data/control-descriptions.json.
// The document is CC BY-ND 4.0: cells are cut out and trimmed of white margin, otherwise left unchanged.
//
// Usage: dotnet run --project tools/ControlDescriptionExtractor -- <pdf> [--contact-sheet <html>]

[assembly: SupportedOSPlatform("windows")]

const int FirstPage = 18;
const int LastPage = 29;
// High enough that the drawings stay sharp when a card is enlarged to full screen width.
const int Dpi = 600;
const byte DarkLuminance = 150;
const byte WhiteLuminance = 235;
// Pixel margins are given at 200 dpi and scaled with the resolution.
const int TrimPadding = 4 * Dpi / 200;
const int GridLineMargin = 2 * Dpi / 200;
// A row or column needs this many non-white pixels to count as content, so lone specks do not widen the crop.
const int MinContentPixels = Dpi / 100;

if (args.Length < 1) { Console.Error.WriteLine("Usage: <pdf> [--contact-sheet <html>]"); return 1; }
var pdfPath = args[0];
var contactSheetIndex = Array.IndexOf(args, "--contact-sheet");
var contactSheetPath = contactSheetIndex >= 0 && contactSheetIndex + 1 < args.Length ? args[contactSheetIndex + 1] : null;

var repoRoot = FindRepoRoot();
var dataDir = Path.Combine(repoRoot, "data");
var imagesDir = Path.Combine(dataDir, "control-descriptions");
Directory.CreateDirectory(imagesDir);

var pdfBytes = File.ReadAllBytes(pdfPath);
var scale = Dpi / 72.0;
var examples = new List<ControlExample>();

using (var document = PdfDocument.Open(pdfBytes))
{
    for (var pageNumber = FirstPage; pageNumber <= LastPage; pageNumber++)
    {
        var page = document.GetPage(pageNumber);
        var words = page.GetWords()
            .Select(w => new PdfWord(w.Text, w.BoundingBox.Left, w.BoundingBox.Bottom, w.BoundingBox.Right, w.BoundingBox.Top))
            .ToList();

        using var bitmap = Conversion.ToImage(pdfBytes, page: (Index)(pageNumber - 1), options: new RenderOptions(Dpi: Dpi));
        var luminance = Luminance(bitmap);

        var columnCounts = Enumerable.Range(0, bitmap.Width)
            .Select(x => Enumerable.Range(0, bitmap.Height).Count(y => luminance[y, x] < DarkLuminance)).ToArray();
        var columns = TableParser.FindLines(columnCounts, columnCounts.Max() / 2);

        var tableLeft = columns[0].Start;
        var tableRight = columns[^1].End;
        var rowCounts = Enumerable.Range(0, bitmap.Height)
            .Select(y => Enumerable.Range(tableLeft, tableRight - tableLeft + 1).Count(x => luminance[y, x] < DarkLuminance)).ToArray();
        var rows = TableParser.FindLines(rowCounts, (int)((tableRight - tableLeft) * 0.8));

        var pageRows = TableParser.BuildRows(words, page.Height, scale, columns, rows);
        Console.WriteLine($"Page {pageNumber}: {pageRows.Count} rows ({string.Join(", ", pageRows.Select(r => r.Id))})");

        foreach (var row in pageRows)
        {
            var folder = Path.Combine(imagesDir, row.Id.ToString());
            Directory.CreateDirectory(folder);
            SaveCell(bitmap, luminance, row.Map, Path.Combine(folder, "map.png"));
            SaveCell(bitmap, luminance, row.Terrain, Path.Combine(folder, "terrain.png"));
            SaveCell(bitmap, luminance, row.Description, Path.Combine(folder, "description.png"));

            examples.Add(new ControlExample(
                row.Id, pageNumber, row.Text, TableParser.FeatureOf(row.Text),
                $"control-descriptions/{row.Id}/map.png",
                $"control-descriptions/{row.Id}/terrain.png",
                $"control-descriptions/{row.Id}/description.png"));
        }
    }
}

examples = examples.OrderBy(e => e.Id).ToList();
var expectedIds = Enumerable.Range(1, examples.Max(e => e.Id));
var missing = expectedIds.Except(examples.Select(e => e.Id)).ToList();
if (missing.Count > 0) Console.WriteLine($"WARNING: missing rows {string.Join(", ", missing)}");
foreach (var duplicate in examples.GroupBy(e => e.Id).Where(g => g.Count() > 1))
    Console.WriteLine($"WARNING: row {duplicate.Key} found {duplicate.Count()} times");

// Rows with the same text (e.g. the two plain "Re-entrant" rows 6 and 8) have identical control descriptions
// and cannot be told apart, so they never appear in the same game. Rows that differ only in details such as
// "upper part" / "lower part" are distinguishable and may — that is the skill being practised.
var groups = examples
    .GroupBy(e => e.Text.ToLowerInvariant())
    .Where(g => g.Count() > 1)
    .Select(g => new ConfusableGroup(g.Key, g.Select(e => e.Id.ToString()).ToList()))
    .ToList();

var jsonOptions = new JsonSerializerOptions
{
    WriteIndented = true,
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
};
File.WriteAllText(Path.Combine(dataDir, "control-descriptions.json"), JsonSerializer.Serialize(examples, jsonOptions) + "\n");
File.WriteAllText(Path.Combine(dataDir, "control-descriptions-groups.json"), JsonSerializer.Serialize(groups, jsonOptions) + "\n");
Console.WriteLine($"Wrote {examples.Count} examples and {groups.Count} confusable groups to {dataDir}");

if (contactSheetPath is not null)
{
    WriteContactSheet(contactSheetPath, examples, dataDir);
    Console.WriteLine($"Contact sheet: {contactSheetPath}");
}
return 0;

static byte[,] Luminance(SKBitmap bitmap)
{
    var result = new byte[bitmap.Height, bitmap.Width];
    for (var y = 0; y < bitmap.Height; y++)
    for (var x = 0; x < bitmap.Width; x++)
    {
        var c = bitmap.GetPixel(x, y);
        // Transparent page background renders as white.
        result[y, x] = c.Alpha == 0 ? (byte)255 : (byte)(0.299 * c.Red + 0.587 * c.Green + 0.114 * c.Blue);
    }
    return result;
}

/// <summary>Crops the cell to its non-white content (plus a little padding) and saves it as PNG.</summary>
static void SaveCell(SKBitmap page, byte[,] luminance, Box cell, string path)
{
    // Stay a little inside the grid lines so anti-aliased line edges are not included.
    int left = cell.Left + GridLineMargin, top = cell.Top + GridLineMargin, right = cell.Right - GridLineMargin, bottom = cell.Bottom - GridLineMargin;
    var rowCounts = new int[bottom - top];
    var columnCounts = new int[right - left];
    for (var y = top; y < bottom; y++)
    for (var x = left; x < right; x++)
    {
        if (luminance[y, x] >= WhiteLuminance) continue;
        rowCounts[y - top]++;
        columnCounts[x - left]++;
    }
    var contentRows = Enumerable.Range(0, rowCounts.Length).Where(i => rowCounts[i] >= MinContentPixels).ToList();
    var contentColumns = Enumerable.Range(0, columnCounts.Length).Where(i => columnCounts[i] >= MinContentPixels).ToList();
    if (contentRows.Count == 0 || contentColumns.Count == 0) throw new InvalidOperationException($"Empty cell for {path}");
    int minX = left + contentColumns[0], maxX = left + contentColumns[^1];
    int minY = top + contentRows[0], maxY = top + contentRows[^1];

    var crop = SKRectI.Create(
        Math.Max(left, minX - TrimPadding), Math.Max(top, minY - TrimPadding),
        Math.Min(right, maxX + TrimPadding) - Math.Max(left, minX - TrimPadding),
        Math.Min(bottom, maxY + TrimPadding) - Math.Max(top, minY - TrimPadding));

    using var cropped = new SKBitmap();
    if (!page.ExtractSubset(cropped, crop)) throw new InvalidOperationException($"Could not crop {path}");
    using var file = File.Create(path);
    cropped.Encode(file, SKEncodedImageFormat.Png, 100);
}

static void WriteContactSheet(string path, IReadOnlyList<ControlExample> examples, string dataDir)
{
    string Img(string relative) =>
        $"<img src=\"{new Uri(Path.Combine(dataDir, relative)).AbsoluteUri}\" style=\"max-height:110px;max-width:260px\">";

    var html = new StringBuilder("<!doctype html><meta charset=utf-8><title>Control descriptions</title>")
        .Append("<style>body{font-family:sans-serif}td{border-bottom:1px solid #ccc;padding:4px;vertical-align:middle}</style><table>")
        .Append("<tr><th>#</th><th>Map</th><th>Terrain</th><th>Description</th><th>Text</th><th>Feature</th></tr>");
    foreach (var e in examples)
    {
        html.Append($"<tr><td>{e.Id}<br><small>p.{e.Page}</small></td><td>{Img(e.MapImage)}</td><td>{Img(e.TerrainImage)}</td>")
            .Append($"<td>{Img(e.DescriptionImage)}</td><td>{WebUtility.HtmlEncode(e.Text)}</td><td>{WebUtility.HtmlEncode(e.Feature)}</td></tr>");
    }
    File.WriteAllText(path, html.Append("</table>").ToString());
}

static string FindRepoRoot()
{
    for (var dir = new DirectoryInfo(Directory.GetCurrentDirectory()); dir is not null; dir = dir.Parent)
    {
        if (File.Exists(Path.Combine(dir.FullName, "Mem.sln"))) return dir.FullName;
    }
    throw new InvalidOperationException("Could not find Mem.sln — run from inside the repository.");
}
