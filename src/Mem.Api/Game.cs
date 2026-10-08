namespace Mem.Api;

public enum CardKind { Symbol, Photo }

/// <summary>One memory card. Two cards with the same <see cref="PairId"/> form a pair.</summary>
public record Card(
    string Id,
    string PairId,
    CardKind Kind,
    string ImageUrl,
    string SymbolId,
    IReadOnlyDictionary<string, string> SymbolNames,
    string? Alt);

public static class Game
{
    public static readonly int[] AllowedPairs = [6, 8, 12];

    /// <summary>
    /// Picks <paramref name="pairs"/> random symbols — at most one per confusable group — and one random photo
    /// per symbol. Cards are returned in pair order; shuffling is up to the client.
    /// </summary>
    /// <remarks>
    /// Every symbol is equally likely to be considered first, so a group with k symbols gets k "tickets":
    /// larger groups appear more often, while each individual symbol is picked about equally often.
    /// </remarks>
    public static List<Card> CreateDeck(
        IReadOnlyList<Symbol> symbols, IReadOnlyDictionary<string, int[]> groupsBySymbol, int pairs, Random random)
    {
        var shuffled = symbols.ToArray();
        random.Shuffle(shuffled);

        var chosen = PickNonConfusable(shuffled, groupsBySymbol, pairs);
        if (chosen.Count < pairs)
            throw new InvalidOperationException($"Need {pairs} non-confusable symbols, only {chosen.Count} available.");

        var cards = new List<Card>(pairs * 2);
        foreach (var symbol in chosen)
        {
            var photo = symbol.Photos[random.Next(symbol.Photos.Count)];
            // Symbol cards get their alt text from the client, in the chosen language.
            cards.Add(new Card($"{symbol.Id}-s", symbol.Id, CardKind.Symbol, ImageUrl(symbol.SymbolImage), symbol.Id, symbol.Names, null));
            cards.Add(new Card($"{symbol.Id}-p", symbol.Id, CardKind.Photo, ImageUrl(photo.File), symbol.Id, symbol.Names, photo.Alt));
        }
        return cards;
    }

    /// <summary>Takes symbols in order, skipping any whose confusable group is already represented.</summary>
    public static List<Symbol> PickNonConfusable(
        IEnumerable<Symbol> ordered, IReadOnlyDictionary<string, int[]> groupsBySymbol, int max)
    {
        var usedGroups = new HashSet<int>();
        var chosen = new List<Symbol>();
        foreach (var symbol in ordered)
        {
            if (chosen.Count == max) break;
            var groups = groupsBySymbol.GetValueOrDefault(symbol.Id, []);
            if (groups.Any(usedGroups.Contains)) continue;
            usedGroups.UnionWith(groups);
            chosen.Add(symbol);
        }
        return chosen;
    }

    public static string ImageUrl(string file) => "/images/" + file;
}
