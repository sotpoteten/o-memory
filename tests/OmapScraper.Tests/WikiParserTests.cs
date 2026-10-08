using OmapScraper;

namespace OmapScraper.Tests;

public class WikiParserTests
{
    private static string Fixture(string name) =>
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", name));

    [Fact]
    public void ParseSymbolLinks_finds_all_isom_symbol_pages()
    {
        var links = WikiParser.ParseSymbolLinks(Fixture("isom-index.html"));

        Assert.Equal(113, links.Count);
        Assert.Contains("https://omapwiki.orienteering.sport/symbols/204-boulder/", links);
    }

    [Theory]
    [InlineData("https://omapwiki.orienteering.sport/symbols/204-boulder/", 2)]
    [InlineData("https://omapwiki.orienteering.sport/symbols/105-2-retaining-earth-wall/", 1)]
    [InlineData("https://omapwiki.orienteering.sport/symbols/701-start/", 7)]
    [InlineData("https://omapwiki.orienteering.sport/glossary/", null)]
    public void CategoryFromSymbolUrl_reads_first_digit_of_symbol_number(string url, int? expected)
    {
        Assert.Equal(expected, WikiParser.CategoryFromSymbolUrl(url));
    }

    [Fact]
    public void ParseSymbolPage_reads_id_name_and_symbol_image()
    {
        var page = WikiParser.ParseSymbolPage(Fixture("symbol-204-boulder.html"));

        Assert.Equal("204", page.Id);
        Assert.Equal("Boulder", page.Name);
        Assert.EndsWith("ISOM-204-Boulder.svg", page.SymbolImageUrl);
        Assert.StartsWith("A distinct boulder", page.Definition);
    }

    [Fact]
    public void ParseSymbolPage_only_includes_correct_examples()
    {
        var page = WikiParser.ParseSymbolPage(Fixture("symbol-204-boulder.html"));

        Assert.Equal(9, page.CorrectExamples.Count);
        Assert.Equal("https://omapwiki.orienteering.sport/examples/example-899/", page.CorrectExamples[0].ExamplePageUrl);
        Assert.Equal("Distinct boulder", page.CorrectExamples[0].Alt);
        Assert.DoesNotContain(page.CorrectExamples, e => e.Alt == "Not boulder");
    }

    [Fact]
    public void ParseExamplePage_reads_caption_with_credit_and_location()
    {
        var details = WikiParser.ParseExamplePage(Fixture("example-2251.html"));

        Assert.Equal("Oslo, Norway", details.Location);
        Assert.Contains("Photo by: Zdeněk Lenhart (CC BY-SA 4.0)", details.Caption);
    }
}
