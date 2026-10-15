namespace LexBrain.Api.Services;

public sealed record TranslationResult(string Text, string? DetectedLanguage);

/// <summary>Swap Azure Translator for DeepL, Google, etc. by implementing this interface.</summary>
public interface ITranslationProvider
{
    Task<TranslationResult> TranslateAsync(string text, string target, string? source, CancellationToken ct);
}
