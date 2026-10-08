using ControlDescriptionExtractor;

namespace ControlDescriptionExtractor.Tests;

public class TableParserTests
{
    [Fact]
    public void FindLines_groups_consecutive_dark_indices()
    {
        int[] counts = [0, 9, 10, 0, 0, 3, 0, 10];

        var lines = TableParser.FindLines(counts, threshold: 9);

        Assert.Equal([new Line(1, 2), new Line(7, 7)], lines);
    }

    [Fact]
    public void BuildRows_assigns_number_text_and_cells_per_row()
    {
        // Page 100pt high rendered at 1 px/pt. Columns: 0 | 10 | 20 | 40 | 60 ; rows: header 0–10, row A 10–40, row B 40–70.
        var columns = new[] { new Line(0, 0), new Line(10, 10), new Line(20, 20), new Line(40, 40), new Line(60, 60) };
        var rows = new[] { new Line(0, 0), new Line(10, 10), new Line(40, 40), new Line(70, 70) };
        var words = new[]
        {
            Word("Map", 2, 95),               // header, no row number
            Word("1", 21, 75, width: 2),      // row A number (y 75pt = 25px from top)
            Word("Spur,", 41, 78), Word("upper", 50, 78), Word("part", 41, 70),
            Word("3", 30, 75),                // a number in the description strip but not in column A — ignored
            Word("2", 21, 45, width: 2),      // row B number (55px)
            Word("Hill", 41, 45),
        };

        var result = TableParser.BuildRows(words, pageHeight: 100, scale: 1, columns, rows);

        Assert.Equal(2, result.Count);
        Assert.Equal(1, result[0].Id);
        Assert.Equal("Spur, upper part", result[0].Text);
        Assert.Equal(new Box(1, 11, 10, 40), result[0].Map);
        Assert.Equal(new Box(11, 11, 20, 40), result[0].Terrain);
        Assert.Equal(new Box(21, 11, 40, 40), result[0].Description);
        Assert.Equal(2, result[1].Id);
        Assert.Equal("Hill", result[1].Text);
    }

    [Fact]
    public void BuildRows_requires_five_column_lines()
    {
        Assert.Throws<FormatException>(() =>
            TableParser.BuildRows([], 100, 1, [new Line(0, 0)], [new Line(0, 0), new Line(10, 10)]));
    }

    [Fact]
    public void ReadingOrder_uses_baselines_not_glyph_tops()
    {
        // "upper" has a lower top than "Spur," (no ascenders) but the same baseline.
        var words = new[]
        {
            new PdfWord("part", 30, 10, 40, 16),
            new PdfWord("upper", 15, 20, 28, 25),
            new PdfWord("Spur,", 0, 20, 12, 27),
        };

        Assert.Equal(["Spur,", "upper", "part"], TableParser.ReadingOrder(words));
    }

    [Theory]
    [InlineData("Re-entrant", "re-entrant")]
    [InlineData("Re-entrant, upper part", "re-entrant")]
    [InlineData("Eastern re-entrant", "re-entrant")]
    [InlineData("South-eastern boulder, 2m, east side", "boulder")]
    [InlineData("Middle small depression, east edge", "small depression")]
    [InlineData("West Hill, east side", "hill")]
    [InlineData("Between cliffs", "cliffs")]
    public void FeatureOf_strips_position_words_and_details(string text, string feature)
    {
        Assert.Equal(feature, TableParser.FeatureOf(text));
    }

    [Fact]
    public void JoinHyphenation_joins_words_split_across_lines()
    {
        Assert.Equal("Path/wall crossing", TableParser.JoinHyphenation("Path/wall cross- ing"));
        Assert.Equal("Canopy, south-west end", TableParser.JoinHyphenation("Canopy, south- west end"));
    }

    private static PdfWord Word(string text, double left, double bottom, double width = 8) =>
        new(text, left, bottom, left + width, bottom + 6);
}
