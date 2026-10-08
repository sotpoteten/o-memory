namespace Mem.Api;

public enum CardKind { Symbol, Photo }

/// <summary>One memory card. Two cards with the same <see cref="PairId"/> form a pair.</summary>
public record Card(
    string Id,
    string PairId,
    CardKind Kind,
    string ImageUrl,
    string SymbolId,
    string SymbolName,
    string? Alt);

public static class Game
{
    public static readonly int[] AllowedPairs = [6, 8, 12];

    /// <summary>
    /// Picks <paramref name="pairs"/> random symbols and one random photo per symbol.
    /// Cards are returned in pair order; shuffling is up to the client.
    /// </summary>
    public static List<Card> CreateDeck(IReadOnlyList<Symbol> symbols, int pairs, Random random)
    {
        if (symbols.Count < pairs)
            throw new InvalidOperationException($"Need {pairs} symbols with photos, only {symbols.Count} available.");

        var shuffled = symbols.ToArray();
        random.Shuffle(shuffled);

        var cards = new List<Card>(pairs * 2);
        foreach (var symbol in shuffled.Take(pairs))
        {
            var photo = symbol.Photos[random.Next(symbol.Photos.Count)];
            cards.Add(new Card($"{symbol.Id}-s", symbol.Id, CardKind.Symbol, ImageUrl(symbol.SymbolImage), symbol.Id, symbol.Name, $"Karttegn {symbol.Id}"));
            cards.Add(new Card($"{symbol.Id}-p", symbol.Id, CardKind.Photo, ImageUrl(photo.File), symbol.Id, symbol.Name, photo.Alt));
        }
        return cards;
    }

    public static string ImageUrl(string file) => "/images/" + file;
}
