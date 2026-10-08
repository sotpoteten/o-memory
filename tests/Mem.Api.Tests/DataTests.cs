using System.Text.Json;

namespace Mem.Api.Tests;

/// <summary>Sanity checks on the real files in data/, so a bad manual edit is caught by the test run.</summary>
public class DataTests
{
    private static readonly string DataDirectory = Path.Combine(FindRepoRoot(), "data");

    [Fact]
    public void Real_data_loads_with_room_for_the_hardest_level()
    {
        var repo = SymbolRepository.LoadFrom(DataDirectory);

        Assert.True(Game.PickNonConfusable(repo.All, repo.GroupsBySymbol, int.MaxValue).Count >= Game.AllowedPairs.Max());
    }

    [Fact]
    public void Confusable_groups_only_refer_to_known_symbols()
    {
        var known = SymbolRepository.LoadFrom(DataDirectory).All.Select(s => s.Id).ToHashSet();
        var groups = JsonSerializer.Deserialize<List<ConfusableGroup>>(
            File.ReadAllText(Path.Combine(DataDirectory, "confusable-groups.json")), JsonSerializerOptions.Web)!;

        Assert.All(groups.SelectMany(g => g.Ids.Select(id => (g.Name, id))), x =>
            Assert.True(known.Contains(x.id), $"Group '{x.Name}' refers to unknown symbol {x.id}"));
    }

    [Fact]
    public void Every_symbol_has_a_norwegian_name()
    {
        var repo = SymbolRepository.LoadFrom(DataDirectory);

        Assert.All(repo.All, s => Assert.True(s.Names.ContainsKey("nb"), $"{s.Id} {s.Name} has no Norwegian name"));
    }

    private static string FindRepoRoot()
    {
        for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir is not null; dir = dir.Parent)
        {
            if (File.Exists(Path.Combine(dir.FullName, "Mem.sln"))) return dir.FullName;
        }
        throw new InvalidOperationException("Could not find Mem.sln");
    }
}
