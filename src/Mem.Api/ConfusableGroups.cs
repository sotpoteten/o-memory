using System.Text.Json;

namespace Mem.Api;

/// <summary>A set of easily confused items; a game contains at most one of them. Read from *groups.json files.</summary>
public record ConfusableGroup(string Name, List<string> Ids);

public static class ConfusableGroups
{
    /// <summary>
    /// Reads a group file and returns, per item id, the indices of the groups it belongs to.
    /// A missing file means no groups; ids not in <paramref name="knownIds"/> are logged and ignored.
    /// </summary>
    public static Dictionary<string, int[]> Load(string path, IReadOnlySet<string> knownIds, ILogger? logger)
    {
        if (!File.Exists(path)) return [];

        var groups = JsonSerializer.Deserialize<List<ConfusableGroup>>(File.ReadAllText(path), JsonSerializerOptions.Web) ?? [];

        var result = new Dictionary<string, List<int>>();
        for (var i = 0; i < groups.Count; i++)
        {
            foreach (var id in groups[i].Ids)
            {
                if (!knownIds.Contains(id))
                {
                    logger?.LogWarning("Confusable group {Group} in {File} refers to unknown id {Id}; ignored",
                        groups[i].Name, Path.GetFileName(path), id);
                    continue;
                }
                if (!result.TryGetValue(id, out var list)) result[id] = list = [];
                list.Add(i);
            }
        }
        return result.ToDictionary(kv => kv.Key, kv => kv.Value.ToArray());
    }

    /// <summary>
    /// Fails at startup rather than on the first "hard" game if the groups leave too few distinct items.
    /// </summary>
    public static void EnsureCapacity<T>(IReadOnlyList<T> items, Func<T, string> idOf, IReadOnlyDictionary<string, int[]> groups, string what)
    {
        var maxPairs = Game.AllowedPairs.Max();
        var capacity = Game.PickNonConfusable(items, idOf, groups, int.MaxValue).Count;
        if (capacity < maxPairs)
            throw new InvalidOperationException($"Confusable groups leave only {capacity} non-confusable {what}; {maxPairs} are needed.");
    }
}
