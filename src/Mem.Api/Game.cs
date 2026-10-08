namespace Mem.Api;

public enum CardKind { Symbol, Photo, Description, Terrain }

/// <summary>Extra information shown once a pair is found (control description mode).</summary>
public record CardDetails(string MapImageUrl, string Text);

/// <summary>One memory card. Two cards with the same <see cref="PairId"/> form a pair.</summary>
/// <param name="SymbolNames">Name per language code ("en" always present), shown under a found pair.</param>
public record Card(
    string Id,
    string PairId,
    CardKind Kind,
    string ImageUrl,
    string SymbolId,
    IReadOnlyDictionary<string, string> SymbolNames,
    string? Alt,
    CardDetails? Details = null);

/// <summary>The game modes; the value is used in the API and stored with each highscore.</summary>
public static class GameModes
{
    public const string Symbols = "symbols";
    public const string Descriptions = "descriptions";
    public static readonly string[] All = [Symbols, Descriptions];
}

public static class Game
{
    public static readonly int[] AllowedPairs = [6, 8, 12];

    /// <summary>
    /// Picks <paramref name="pairs"/> random symbols — at most one per confusable group — and one random photo
    /// per symbol. Cards are returned in pair order; shuffling is up to the client.
    /// </summary>
    public static List<Card> CreateDeck(
        IReadOnlyList<Symbol> symbols, IReadOnlyDictionary<string, int[]> groupsBySymbol, int pairs, Random random)
    {
        var cards = new List<Card>(pairs * 2);
        foreach (var symbol in PickRandom(symbols, s => s.Id, groupsBySymbol, pairs, random))
        {
            var photo = symbol.Photos[random.Next(symbol.Photos.Count)];
            // Symbol cards get their alt text from the client, in the chosen language.
            cards.Add(new Card($"{symbol.Id}-s", symbol.Id, CardKind.Symbol, ImageUrl(symbol.SymbolImage), symbol.Id, symbol.Names, null));
            cards.Add(new Card($"{symbol.Id}-p", symbol.Id, CardKind.Photo, ImageUrl(photo.File), symbol.Id, symbol.Names, photo.Alt));
        }
        return cards;
    }

    /// <summary>
    /// Picks <paramref name="pairs"/> random control description examples — at most one per confusable group —
    /// as pairs of description strip and terrain drawing. Both cards carry the map excerpt and text as details.
    /// </summary>
    public static List<Card> CreateDescriptionDeck(
        IReadOnlyList<ControlExample> examples, IReadOnlyDictionary<string, int[]> groupsByExample, int pairs, Random random)
    {
        var cards = new List<Card>(pairs * 2);
        foreach (var example in PickRandom(examples, e => e.Key, groupsByExample, pairs, random))
        {
            // The text is IOF's own (CC BY-ND), so it is shown untranslated in every language.
            var names = new Dictionary<string, string> { ["en"] = example.Text };
            var details = new CardDetails(ImageUrl(example.MapImage), example.Text);
            cards.Add(new Card($"{example.Id}-d", example.Key, CardKind.Description, ImageUrl(example.DescriptionImage), example.Key, names, null, details));
            cards.Add(new Card($"{example.Id}-t", example.Key, CardKind.Terrain, ImageUrl(example.TerrainImage), example.Key, names, null, details));
        }
        return cards;
    }

    /// <summary>
    /// Shuffles <paramref name="items"/> and takes <paramref name="count"/> of them, at most one per confusable group.
    /// </summary>
    /// <remarks>
    /// Every item is equally likely to be considered first, so a group with k items gets k "tickets":
    /// larger groups appear more often, while each individual item is picked about equally often.
    /// </remarks>
    private static List<T> PickRandom<T>(
        IReadOnlyList<T> items, Func<T, string> idOf, IReadOnlyDictionary<string, int[]> groups, int count, Random random)
    {
        var shuffled = items.ToArray();
        random.Shuffle(shuffled);

        var chosen = PickNonConfusable(shuffled, idOf, groups, count);
        if (chosen.Count < count)
            throw new InvalidOperationException($"Need {count} non-confusable items, only {chosen.Count} available.");
        return chosen;
    }

    /// <summary>Takes items in order, skipping any whose confusable group is already represented.</summary>
    public static List<T> PickNonConfusable<T>(
        IEnumerable<T> ordered, Func<T, string> idOf, IReadOnlyDictionary<string, int[]> groups, int max)
    {
        var usedGroups = new HashSet<int>();
        var chosen = new List<T>();
        foreach (var item in ordered)
        {
            if (chosen.Count == max) break;
            var itemGroups = groups.GetValueOrDefault(idOf(item), []);
            if (itemGroups.Any(usedGroups.Contains)) continue;
            usedGroups.UnionWith(itemGroups);
            chosen.Add(item);
        }
        return chosen;
    }

    public static string ImageUrl(string file) => "/images/" + file;
}
