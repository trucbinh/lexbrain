using System.Net;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Configuration;

namespace LexBrain.Api.Services;

/// <summary>Cards container partitioned by /userId, so every query stays inside one partition.</summary>
public sealed class CosmosCardStore : ICardStore
{
    private readonly Lazy<Task<Container>> container;

    public CosmosCardStore(CosmosClient client, IConfiguration config)
    {
        var databaseName = config["COSMOS_DATABASE"] ?? "lexbrain";
        var containerName = config["COSMOS_CONTAINER"] ?? "cards";
        container = new Lazy<Task<Container>>(async () =>
        {
            var db = (await client.CreateDatabaseIfNotExistsAsync(databaseName)).Database;
            var response = await db.CreateContainerIfNotExistsAsync(new ContainerProperties(containerName, "/userId"));
            return response.Container;
        });
    }

    public async Task<IReadOnlyList<CardDto>> GetChangedSinceAsync(string userId, string since, CancellationToken ct)
    {
        var c = await container.Value;
        var query = new QueryDefinition("SELECT * FROM c WHERE c.userId = @userId AND c.serverUpdatedAt > @since")
            .WithParameter("@userId", userId)
            .WithParameter("@since", since);
        var options = new QueryRequestOptions { PartitionKey = new PartitionKey(userId) };

        var result = new List<CardDto>();
        using var iterator = c.GetItemQueryIterator<CardDto>(query, requestOptions: options);
        while (iterator.HasMoreResults)
        {
            result.AddRange(await iterator.ReadNextAsync(ct));
        }

        return result;
    }

    public async Task<int> UpsertAsync(string userId, IEnumerable<CardDto> incoming, CancellationToken ct)
    {
        var c = await container.Value;
        var pk = new PartitionKey(userId);
        var accepted = 0;

        foreach (var card in incoming)
        {
            card.UserId = userId;
            card.ServerUpdatedAt = Clock.NowIso();
            try
            {
                var existing = await c.ReadItemAsync<CardDto>(card.Id, pk, cancellationToken: ct);
                if (string.CompareOrdinal(card.UpdatedAt, existing.Resource.UpdatedAt) <= 0)
                {
                    continue; // the stored version is newer or identical
                }

                await c.ReplaceItemAsync(card, card.Id, pk, new ItemRequestOptions { IfMatchEtag = existing.ETag }, ct);
                accepted++;
            }
            catch (CosmosException e) when (e.StatusCode == HttpStatusCode.NotFound)
            {
                await c.CreateItemAsync(card, pk, cancellationToken: ct);
                accepted++;
            }
            catch (CosmosException e) when (e.StatusCode is HttpStatusCode.PreconditionFailed or HttpStatusCode.Conflict)
            {
                // Another device wrote this card at the same moment; the next sync reconciles it.
            }
        }

        return accepted;
    }
}
