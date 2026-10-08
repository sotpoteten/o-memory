namespace OmapScraper;

/// <summary>Result of parsing a single symbol page on the wiki.</summary>
public record SymbolPage(
    string Id,
    string Name,
    string? Definition,
    string? SymbolImageUrl,
    IReadOnlyList<ExampleRef> CorrectExamples);

/// <summary>A "correct example" thumbnail on a symbol page, linking to its example page.</summary>
public record ExampleRef(string ExamplePageUrl, string ImageUrl, string? Alt);

/// <summary>Credit information from an example page.</summary>
public record ExampleDetails(string? Caption, string? Location);

/// <summary>Output format written to data/symbols.json.</summary>
public record SymbolData(
    string Id,
    string Name,
    int Category,
    string? Definition,
    string PageUrl,
    string SymbolImage,
    List<PhotoData> Photos);

public record PhotoData(
    string File,
    string? Alt,
    string? Caption,
    string? Location,
    string SourceUrl);
