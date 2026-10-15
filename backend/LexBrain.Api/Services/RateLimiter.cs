using System.Collections.Concurrent;

namespace LexBrain.Api.Services;

/// <summary>
/// Simple fixed-window limiter per key, in memory. Good enough for one instance; use Azure API Management
/// or a distributed counter once the function scales out.
/// </summary>
public sealed class RateLimiter
{
    private readonly ConcurrentDictionary<string, (DateTimeOffset Start, int Count)> windows = new();

    public bool TryAcquire(string key, int limit = 60, TimeSpan? window = null)
    {
        var span = window ?? TimeSpan.FromMinutes(1);
        var now = DateTimeOffset.UtcNow;
        var allowed = true;

        windows.AddOrUpdate(
            key,
            _ => (now, 1),
            (_, current) =>
            {
                if (now - current.Start >= span)
                {
                    return (now, 1);
                }

                if (current.Count >= limit)
                {
                    allowed = false;
                    return current;
                }

                return (current.Start, current.Count + 1);
            });

        return allowed;
    }
}
