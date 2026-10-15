using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace LexBrain.Api.Services;

/// <summary>Azure AI Translator (v3). The subscription key never leaves the server.</summary>
public sealed class AzureTranslatorProvider(IHttpClientFactory httpFactory, IConfiguration config) : ITranslationProvider
{
    // The app uses zh-CN / zh-TW; Azure Translator uses script codes.
    private static string MapLanguage(string code) => code.ToLowerInvariant() switch
    {
        "zh-cn" => "zh-Hans",
        "zh-tw" => "zh-Hant",
        _ => code,
    };

    public async Task<TranslationResult> TranslateAsync(string text, string target, string? source, CancellationToken ct)
    {
        var key = config["TRANSLATOR_KEY"] ?? throw new InvalidOperationException("TRANSLATOR_KEY is not configured.");
        var region = config["TRANSLATOR_REGION"];
        var endpoint = (config["TRANSLATOR_ENDPOINT"] ?? "https://api.cognitive.microsofttranslator.com").TrimEnd('/');

        var url = $"{endpoint}/translate?api-version=3.0&to={Uri.EscapeDataString(MapLanguage(target))}";
        if (!string.IsNullOrWhiteSpace(source) && !source.Equals("auto", StringComparison.OrdinalIgnoreCase))
        {
            url += $"&from={Uri.EscapeDataString(MapLanguage(source))}";
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(new[] { new { Text = text } }),
        };
        request.Headers.Add("Ocp-Apim-Subscription-Key", key);
        if (!string.IsNullOrWhiteSpace(region))
        {
            request.Headers.Add("Ocp-Apim-Subscription-Region", region);
        }

        var http = httpFactory.CreateClient();
        using var response = await http.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
        var first = doc.RootElement[0];
        var translated = first.GetProperty("translations")[0].GetProperty("text").GetString() ?? "";
        string? detected = null;
        if (first.TryGetProperty("detectedLanguage", out var d) && d.TryGetProperty("language", out var lang))
        {
            detected = lang.GetString();
        }

        return new TranslationResult(translated, detected);
    }
}
