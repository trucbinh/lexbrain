namespace LexBrain.Api.Services;

public interface ICardStore
{
    /// <summary>Cards (including tombstones) whose server timestamp is newer than <paramref name="since"/>.</summary>
    Task<IReadOnlyList<CardDto>> GetChangedSinceAsync(string userId, string since, CancellationToken ct);

    /// <summary>Last-write-wins upsert by <c>UpdatedAt</c>. Returns how many cards were accepted.</summary>
    Task<int> UpsertAsync(string userId, IEnumerable<CardDto> cards, CancellationToken ct);
}

public static class Clock
{
    /// <summary>Same shape as JavaScript's toISOString(), so string comparison matches chronological order.</summary>
    public static string NowIso() => DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'");
}
