namespace ControlDescriptionExtractor;

/// <summary>A word on a PDF page, in page coordinates (points, origin bottom-left).</summary>
public record PdfWord(string Text, double Left, double Bottom, double Right, double Top)
{
    public double CenterX => (Left + Right) / 2;
    public double CenterY => (Bottom + Top) / 2;
}

/// <summary>A detected grid line, as an inclusive pixel range (lines are a few pixels thick).</summary>
public record Line(int Start, int End);

/// <summary>A pixel rectangle inside a rendered page.</summary>
public record Box(int Left, int Top, int Right, int Bottom)
{
    public int Width => Right - Left;
    public int Height => Bottom - Top;
}

/// <summary>One example row of the table: its number, text and the pixel boxes of its three image cells.</summary>
public record ExampleRow(int Id, string Text, Box Map, Box Terrain, Box Description);

/// <summary>Output format written to data/control-descriptions.json.</summary>
public record ControlExample(
    int Id,
    int Page,
    string Text,
    string Feature,
    string MapImage,
    string TerrainImage,
    string DescriptionImage);

/// <summary>Output format of data/control-descriptions-groups.json (same shape as confusable-groups.json).</summary>
public record ConfusableGroup(string Name, List<string> Ids);
