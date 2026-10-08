namespace ControlDescriptionExtractor;

/// <summary>
/// Finds the example table on a rendered page and splits it into rows.
/// Everything here is pure (arrays and records in, records out) so it can be unit tested without a PDF.
/// </summary>
public static class TableParser
{
    /// <summary>
    /// Groups consecutive indices whose dark-pixel count reaches <paramref name="threshold"/> into lines.
    /// </summary>
    public static List<Line> FindLines(IReadOnlyList<int> darkCounts, int threshold)
    {
        var lines = new List<Line>();
        int? start = null;
        for (var i = 0; i <= darkCounts.Count; i++)
        {
            var isLine = i < darkCounts.Count && darkCounts[i] >= threshold;
            if (isLine && start is null) start = i;
            if (!isLine && start is not null)
            {
                lines.Add(new Line(start.Value, i - 1));
                start = null;
            }
        }
        return lines;
    }

    /// <summary>
    /// Builds the example rows of one page.
    /// </summary>
    /// <param name="words">Words on the page, in PDF points.</param>
    /// <param name="pageHeight">Page height in points (PDF y grows upwards, pixels grow downwards).</param>
    /// <param name="scale">Pixels per point of the rendered page.</param>
    /// <param name="columns">The 5 vertical table lines: left edge, Map|Terrain, Terrain|Descriptions, Descriptions|Text, right edge.</param>
    /// <param name="rows">The horizontal table lines, top to bottom (header top, header bottom, then one per row).</param>
    public static List<ExampleRow> BuildRows(
        IReadOnlyList<PdfWord> words, double pageHeight, double scale, IReadOnlyList<Line> columns, IReadOnlyList<Line> rows)
    {
        if (columns.Count != 5)
            throw new FormatException($"Expected 5 vertical table lines, found {columns.Count}.");

        double ToPixelX(double x) => x * scale;
        double ToPixelY(double y) => (pageHeight - y) * scale;

        var descriptionColumn = (Left: columns[2].End, Right: columns[3].Start);
        var textColumnLeft = columns[3].End;
        // Row numbers sit in the first box (column A) of the control description strip.
        var numberZoneRight = descriptionColumn.Left + (descriptionColumn.Right - descriptionColumn.Left) * 0.2;

        var result = new List<ExampleRow>();
        for (var i = 0; i + 1 < rows.Count; i++)
        {
            var top = rows[i].End;
            var bottom = rows[i + 1].Start;
            bool InBand(PdfWord w) => ToPixelY(w.CenterY) > top && ToPixelY(w.CenterY) < bottom;

            var number = words.FirstOrDefault(w =>
                InBand(w) && int.TryParse(w.Text, out _) &&
                ToPixelX(w.CenterX) > descriptionColumn.Left && ToPixelX(w.CenterX) < numberZoneRight);
            if (number is null) continue; // header row, or an empty band

            var text = string.Join(' ', ReadingOrder(words.Where(w => InBand(w) && ToPixelX(w.CenterX) > textColumnLeft)));

            Box Cell(int column) => new(columns[column].End + 1, top + 1, columns[column + 1].Start, bottom);
            result.Add(new ExampleRow(int.Parse(number.Text), JoinHyphenation(text), Cell(0), Cell(1), Cell(2)));
        }
        return result;
    }

    /// <summary>
    /// Words top-to-bottom, left-to-right. Words whose baselines are within <paramref name="tolerance"/> points
    /// are on the same line (glyph tops vary with letter height, so they cannot be used for this).
    /// </summary>
    public static IEnumerable<string> ReadingOrder(IEnumerable<PdfWord> words, double tolerance = 2)
    {
        var lines = new List<List<PdfWord>>();
        foreach (var word in words.OrderByDescending(w => w.Bottom))
        {
            var line = lines.LastOrDefault();
            if (line is not null && Math.Abs(line[0].Bottom - word.Bottom) <= tolerance) line.Add(word);
            else lines.Add([word]);
        }
        return lines.SelectMany(line => line.OrderBy(w => w.Left)).Select(w => w.Text);
    }

    /// <summary>
    /// Rejoins words hyphenated across lines: "cross- ing" becomes "crossing", while compass compounds keep
    /// their hyphen ("south- west" becomes "south-west").
    /// </summary>
    public static string JoinHyphenation(string text) =>
        System.Text.RegularExpressions.Regex.Replace(text, @"(\p{L}+)- (\p{Ll}+)", m =>
            m.Groups[1].Value.ToLowerInvariant() is "north" or "south"
                ? $"{m.Groups[1].Value}-{m.Groups[2].Value}"
                : m.Groups[1].Value + m.Groups[2].Value);

    private static readonly HashSet<string> PositionWords =
    [
        "north", "south", "east", "west", "northern", "southern", "eastern", "western",
        "north-east", "north-west", "south-east", "south-west",
        "north-eastern", "north-western", "south-eastern", "south-western",
        "middle", "upper", "lower", "between",
    ];

    /// <summary>
    /// The terrain feature a row is about: the text before the first comma, lower-cased, without leading
    /// position words ("Eastern re-entrant" and "Re-entrant, upper part" are both "re-entrant").
    /// </summary>
    public static string FeatureOf(string text)
    {
        var words = text.Split(',')[0].Trim().ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries).ToList();
        while (words.Count > 1 && PositionWords.Contains(words[0])) words.RemoveAt(0);
        return string.Join(' ', words);
    }
}
