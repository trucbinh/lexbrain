using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Caching.Memory;

namespace LexBrain.Api.Services;

/// <summary>Caches by hash of (source, target, text) so repeated lookups cost nothing. The cache is size-limited in Program.cs.</summary>
public sealed class CachingTranslationProvider(ITranslationProvider inner, IMemoryCache cache) : ITranslationProvider
{
    public async Task<TranslationResult> TranslateAsync(string text, string target, string? source, CancellationToken ct)
    {
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(text)));
        var key = $"tr|{source ?? "auto"}|{target}|{hash}";

        if (cache.TryGetValue(key, out TranslationResult? hit) && hit is not null)
        {
            return hit;
        }

        var result = await inner.TranslateAsync(text, target, source, ct);
        cache.Set(key, result, new MemoryCacheEntryOptions
        {
            Size = 1,
            AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(12),
        });
        return result;
    }
}
