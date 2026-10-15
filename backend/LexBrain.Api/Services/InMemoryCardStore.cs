using System.Collections.Concurrent;

namespace LexBrain.Api.Services;

/// <summary>Used when COSMOS_CONNECTION is not set. Data is lost on restart - for local development only.</summary>
public sealed class InMemoryCardStore : ICardStore
{
    private readonly ConcurrentDictionary<(string User, string Id), CardDto> cards = new();

    public Task<IReadOnlyList<CardDto>> GetChangedSinceAsync(string userId, string since, CancellationToken ct)
    {
        IReadOnlyList<CardDto> result = cards
            .Where(kv => kv.Key.User == userId && string.CompareOrdinal(kv.Value.ServerUpdatedAt, since) > 0)
            .Select(kv => kv.Value)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<int> UpsertAsync(string userId, IEnumerable<CardDto> incoming, CancellationToken ct)
    {
        var accepted = 0;
        foreach (var card in incoming)
        {
            card.UserId = userId;
            card.ServerUpdatedAt = Clock.NowIso();
            var key = (userId, card.Id);
            var won = false;
            cards.AddOrUpdate(
                key,
                _ => { won = true; return card; },
                (_, existing) =>
                {
                    won = string.CompareOrdinal(card.UpdatedAt, existing.UpdatedAt) > 0;
                    return won ? card : existing;
                });
            if (won) accepted++;
        }

        return Task.FromResult(accepted);
    }
}
