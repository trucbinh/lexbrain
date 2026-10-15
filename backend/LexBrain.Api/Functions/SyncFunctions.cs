using LexBrain.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace LexBrain.Api.Functions;

public sealed class SyncFunctions(ICardStore store, IUserResolver users, RateLimiter limiter)
{
    private const int MaxCardsPerPush = 500;
    private static readonly HashSet<string> Kinds = ["word", "sentence", "paragraph"];
    private static readonly HashSet<string> Statuses = ["learning", "mastered"];

    [Function("SyncPull")]
    public async Task<IActionResult> Pull(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "sync/pull")] HttpRequest req,
        CancellationToken ct)
    {
        var user = users.Resolve(req);
        if (user is null) return new UnauthorizedResult();
        if (!limiter.TryAcquire($"sync:{user}", 30)) return new StatusCodeResult(StatusCodes.Status429TooManyRequests);

        // Read the clock BEFORE querying so a write that lands mid-query is returned again next time, never missed.
        var serverTime = Clock.NowIso();
        var since = req.Query["since"].ToString();
        var cards = await store.GetChangedSinceAsync(user, since, ct);
        return new OkObjectResult(new PullResponse(cards, serverTime));
    }

    [Function("SyncPush")]
    public async Task<IActionResult> Push(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "sync/push")] HttpRequest req,
        CancellationToken ct)
    {
        var user = users.Resolve(req);
        if (user is null) return new UnauthorizedResult();
        if (!limiter.TryAcquire($"sync:{user}", 30)) return new StatusCodeResult(StatusCodes.Status429TooManyRequests);

        PushRequest? body;
        try
        {
            body = await req.ReadFromJsonAsync<PushRequest>(ct);
        }
        catch (System.Text.Json.JsonException)
        {
            return new BadRequestObjectResult(new { error = "The request body is not valid JSON." });
        }

        var cards = body?.Cards;
        if (cards is null || cards.Count == 0) return new BadRequestObjectResult(new { error = "cards is required." });
        if (cards.Count > MaxCardsPerPush) return new BadRequestObjectResult(new { error = $"At most {MaxCardsPerPush} cards per push." });

        foreach (var c in cards)
        {
            if (string.IsNullOrWhiteSpace(c.Id) || c.Id.Length > 100) return new BadRequestObjectResult(new { error = "Every card needs an id of at most 100 characters." });
            if (!Kinds.Contains(c.Kind) || !Statuses.Contains(c.Status)) return new BadRequestObjectResult(new { error = $"Card {c.Id} has an invalid kind or status." });
            if (c.SourceText.Length > 6000 || c.TranslatedText.Length > 12000) return new BadRequestObjectResult(new { error = $"Card {c.Id} is too long." });
            if (string.IsNullOrWhiteSpace(c.UpdatedAt)) return new BadRequestObjectResult(new { error = $"Card {c.Id} needs updatedAt." });
        }

        var accepted = await store.UpsertAsync(user, cards, ct);
        return new OkObjectResult(new { accepted });
    }
}
