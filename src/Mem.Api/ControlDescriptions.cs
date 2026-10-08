using System.Text.Json;

namespace Mem.Api;

/// <summary>
/// One example row from IOF "International Specification for Control Descriptions 2024" (CC BY-ND 4.0),
/// as written to data/control-descriptions.json by tools/ControlDescriptionExtractor. Image paths are
/// relative to the data directory.
/// </summary>
public record ControlExample(
    int Id,
    int Page,
    string Text,
    string Feature,
    string MapImage,
    string TerrainImage,
    string DescriptionImage)
{
    public string Key => Id.ToString();
}

public class ControlDescriptionRepository(IReadOnlyList<ControlExample> examples, IReadOnlyDictionary<string, int[]>? groupsByExample = null)
{
    public IReadOnlyList<ControlExample> All { get; } = examples;

    /// <summary>Indices of the confusable groups each example id belongs to (absent = in no group).</summary>
    public IReadOnlyDictionary<string, int[]> GroupsByExample { get; } = groupsByExample ?? new Dictionary<string, int[]>();

    public static ControlDescriptionRepository LoadFrom(string dataDirectory, ILogger? logger = null)
    {
        var path = Path.Combine(dataDirectory, "control-descriptions.json");
        if (!File.Exists(path))
            throw new FileNotFoundException($"Missing {path}. Run tools/ControlDescriptionExtractor first.", path);

        var examples = JsonSerializer.Deserialize<List<ControlExample>>(File.ReadAllText(path), JsonSerializerOptions.Web) ?? [];
        var groups = ConfusableGroups.Load(
            Path.Combine(dataDirectory, "control-descriptions-groups.json"),
            examples.Select(e => e.Key).ToHashSet(),
            logger);
        ConfusableGroups.EnsureCapacity(examples, e => e.Key, groups, "control descriptions");

        return new ControlDescriptionRepository(examples, groups);
    }
}
