using System.Text.RegularExpressions;
using LexBrain.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace LexBrain.Api.Functions;

public sealed partial class TranslateFunction(
    ITranslationProvider provider,
    IUserResolver users,
    RateLimiter limiter,
    ILogger<TranslateFunction> log)
{
    private const int MaxChars = 5000;

    // "en", "pt-BR", "zh-CN" ...
    [GeneratedRegex("^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$")]
    private static partial Regex LanguageCode();

    [Function("Translate")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "translate")] HttpRequest req,
        CancellationToken ct)
    {
        var user = users.Resolve(req);
        if (user is null) return new UnauthorizedResult();
        if (!limiter.TryAcquire($"translate:{user}")) return new StatusCodeResult(StatusCodes.Status429TooManyRequests);

        TranslateRequest? body;
        try
        {
            body = await req.ReadFromJsonAsync<TranslateRequest>(ct);
        }
        catch (System.Text.Json.JsonException)
        {
            return new BadRequestObjectResult(new { error = "The request body is not valid JSON." });
        }

        var text = body?.Text?.Trim();
        if (string.IsNullOrEmpty(text)) return new BadRequestObjectResult(new { error = "text is required." });
        if (text.Length > MaxChars) return new BadRequestObjectResult(new { error = $"text must be at most {MaxChars} characters." });
        if (body?.Target is not { } target || !LanguageCode().IsMatch(target)) return new BadRequestObjectResult(new { error = "target must be a language code such as 'es' or 'zh-CN'." });
        if (body.Source is { } source && !LanguageCode().IsMatch(source)) return new BadRequestObjectResult(new { error = "source must be a language code." });

        try
        {
            var result = await provider.TranslateAsync(text, target, body.Source, ct);
            return new OkObjectResult(new TranslateResponse(result.Text, result.DetectedLanguage));
        }
        catch (Exception e) when (e is HttpRequestException or InvalidOperationException)
        {
            log.LogError(e, "Translation provider failed");
            return new ObjectResult(new { error = "The translation service is unavailable. Try again shortly." })
            {
                StatusCode = StatusCodes.Status502BadGateway,
            };
        }
    }
}
