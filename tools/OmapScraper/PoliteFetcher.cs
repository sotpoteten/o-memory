using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;

namespace OmapScraper;

/// <summary>
/// Downloads pages and files with a pause between requests and caches HTML on disk,
/// so re-running the scraper does not hit the wiki again.
/// </summary>
/// <remarks>
/// The wiki sits behind Cloudflare, which rejects .NET's HttpClient (TLS fingerprint) but accepts curl,
/// so the transfer itself is delegated to curl (bundled with Windows 10+).
/// </remarks>
public sealed class PoliteFetcher
{
    private const string UserAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

    private readonly string _cacheDir;
    private readonly TimeSpan _delay;
    private DateTime _lastRequest = DateTime.MinValue;

    public PoliteFetcher(string cacheDir, TimeSpan delay)
    {
        _cacheDir = cacheDir;
        _delay = delay;
        Directory.CreateDirectory(cacheDir);
    }

    public async Task<string> GetHtmlAsync(string url)
    {
        var cacheFile = Path.Combine(_cacheDir, Hash(url) + ".html");
        if (!File.Exists(cacheFile))
            await CurlAsync(url, cacheFile);
        return await File.ReadAllTextAsync(cacheFile);
    }

    /// <summary>Downloads a file unless it already exists at <paramref name="target"/>.</summary>
    public async Task DownloadAsync(string url, string target)
    {
        if (File.Exists(target)) return;
        Directory.CreateDirectory(Path.GetDirectoryName(target)!);
        await CurlAsync(url, target);
    }

    private async Task CurlAsync(string url, string target)
    {
        var wait = _lastRequest + _delay - DateTime.UtcNow;
        if (wait > TimeSpan.Zero) await Task.Delay(wait);
        _lastRequest = DateTime.UtcNow;

        // Write to a temp file first so a failed download never leaves a partial file in the cache.
        var tempFile = target + ".part";
        var psi = new ProcessStartInfo("curl")
        {
            RedirectStandardError = true,
            UseShellExecute = false,
        };
        foreach (var arg in new[] { "--silent", "--show-error", "--fail", "--location", "--user-agent", UserAgent, "--output", tempFile, url })
            psi.ArgumentList.Add(arg);

        using var process = Process.Start(psi) ?? throw new InvalidOperationException("Could not start curl");
        var stderr = await process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        if (process.ExitCode != 0)
        {
            File.Delete(tempFile);
            throw new HttpRequestException($"curl failed ({process.ExitCode}) for {url}: {stderr.Trim()}");
        }
        File.Move(tempFile, target, overwrite: true);
    }

    private static string Hash(string url) =>
        Convert.ToHexString(SHA1.HashData(Encoding.UTF8.GetBytes(url)))[..16].ToLowerInvariant();
}
