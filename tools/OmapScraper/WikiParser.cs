using System.Text.RegularExpressions;
using AngleSharp.Dom;
using AngleSharp.Html.Parser;

namespace OmapScraper;

/// <summary>Pure HTML parsing for the O-Map Wiki pages (no network access).</summary>
public static partial class WikiParser
{
    private static readonly HtmlParser Parser = new();

    [GeneratedRegex(@"^(\d+(?:\.\d+)?)\s+(.+)$")]
    private static partial Regex TitleRegex();

    /// <summary>Returns the distinct symbol page URLs linked from the ISOM specification page.</summary>
    public static IReadOnlyList<string> ParseSymbolLinks(string html)
    {
        var doc = Parser.ParseDocument(html);
        return doc.QuerySelectorAll("a[href*='/symbols/']")
            .Select(a => a.GetAttribute("href")!)
            .Where(href => href.StartsWith("https://omapwiki.orienteering.sport/symbols/"))
            .Distinct()
            .ToList();
    }

    /// <summary>ISOM category (first digit of the symbol number) from a URL like <c>/symbols/204-boulder/</c>.</summary>
    public static int? CategoryFromSymbolUrl(string url)
    {
        var match = SymbolUrlRegex().Match(url);
        return match.Success ? match.Groups[1].Value[0] - '0' : null;
    }

    [GeneratedRegex(@"/symbols/(\d)\d\d")]
    private static partial Regex SymbolUrlRegex();

    public static SymbolPage ParseSymbolPage(string html)
    {
        var doc = Parser.ParseDocument(html);

        var title = Clean(doc.QuerySelector("h1.page-title")?.TextContent)
            ?? throw new FormatException("Symbol page has no title");
        var match = TitleRegex().Match(title);
        var (id, name) = match.Success
            ? (match.Groups[1].Value, match.Groups[2].Value)
            : (title, title);

        var symbolImage = doc.QuerySelector("img.symbol-img")?.GetAttribute("src");

        var examples = doc.QuerySelectorAll("ul.symbol-examples.are-correct > li")
            .Select(li =>
            {
                var link = li.QuerySelector("a")?.GetAttribute("href");
                var img = li.QuerySelector("img");
                var src = img?.GetAttribute("src");
                return link is null || src is null ? null : new ExampleRef(link, src, Clean(img!.GetAttribute("alt")));
            })
            .OfType<ExampleRef>()
            .ToList();

        return new SymbolPage(id, name, ParseDefinition(doc), symbolImage, examples);
    }

    public static ExampleDetails ParseExamplePage(string html)
    {
        var doc = Parser.ParseDocument(html);
        var caption = Clean(doc.QuerySelector("ul.example-gallery figcaption")?.TextContent);

        string? location = null;
        foreach (var dt in doc.QuerySelectorAll("dl.page-meta > dt"))
        {
            if (Clean(dt.TextContent) == "from")
                location = Clean(dt.NextElementSibling?.TextContent);
        }

        return new ExampleDetails(caption, location);
    }

    /// <summary>Concatenates the paragraphs between the "Definition" heading and the next heading.</summary>
    private static string? ParseDefinition(IDocument doc)
    {
        var heading = doc.QuerySelector("h2#definition");
        if (heading is null) return null;

        var paragraphs = new List<string>();
        for (var el = heading.NextElementSibling; el is not null && el.LocalName != "h2"; el = el.NextElementSibling)
        {
            if (el.LocalName == "p" && Clean(el.TextContent) is { } text)
                paragraphs.Add(text);
        }
        return paragraphs.Count > 0 ? string.Join("\n\n", paragraphs) : null;
    }

    private static string? Clean(string? text)
    {
        if (text is null) return null;
        var cleaned = Regex.Replace(text.Replace(' ', ' '), @"\s+", " ").Trim();
        return cleaned.Length > 0 ? cleaned : null;
    }
}
