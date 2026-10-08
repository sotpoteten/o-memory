namespace Mem.Api.Tests;

public class GameTests
{
    private static Symbol MakeSymbol(string id) =>
        new(id, $"Symbol {id}", 2, null, "https://example.org", $"{id}/symbol.svg", [new Photo($"{id}/photo-1.jpg", null, null, null, "https://example.org")]);

    private static readonly List<Symbol> Symbols = Enumerable.Range(1, 20).Select(i => MakeSymbol(i.ToString())).ToList();

    [Fact]
    public void CreateDeck_never_picks_two_symbols_from_the_same_group()
    {
        var groups = new Dictionary<string, int[]>
        {
            ["1"] = [0], ["2"] = [0], ["3"] = [0], ["4"] = [0],
            ["5"] = [1], ["6"] = [1], ["7"] = [1],
        };

        for (var seed = 0; seed < 500; seed++)
        {
            var ids = Game.CreateDeck(Symbols, groups, 12, new Random(seed)).Select(c => c.SymbolId).Distinct().ToList();

            Assert.Equal(12, ids.Count);
            Assert.True(ids.Count(id => id is "1" or "2" or "3" or "4") <= 1);
            Assert.True(ids.Count(id => id is "5" or "6" or "7") <= 1);
        }
    }

    [Fact]
    public void PickNonConfusable_lets_a_symbol_in_two_groups_block_both()
    {
        // "2" belongs to both group 0 {1, 2} and group 1 {2, 3}.
        var groups = new Dictionary<string, int[]> { ["1"] = [0], ["2"] = [0, 1], ["3"] = [1] };
        var ordered = new[] { "2", "1", "3", "4" }.Select(MakeSymbol);

        var picked = Game.PickNonConfusable(ordered, groups, 10).Select(s => s.Id);

        Assert.Equal(["2", "4"], picked);
    }

    [Fact]
    public void CreateDeck_throws_when_groups_leave_too_few_symbols()
    {
        var oneBigGroup = Symbols.Skip(3).ToDictionary(s => s.Id, _ => new[] { 0 });

        Assert.Throws<InvalidOperationException>(() => Game.CreateDeck(Symbols, oneBigGroup, 6, new Random(1)));
    }
}
