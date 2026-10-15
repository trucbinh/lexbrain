namespace LexBrain.Api;

public sealed record TranslateRequest(string? Text, string? Target, string? Source);

public sealed record TranslateResponse(string TranslatedText, string? DetectedLang);

/// <summary>Mirrors the TypeScript <c>Card</c> in packages/core. Dates are ISO-8601 strings so they sort lexicographically.</summary>
public sealed class CardDto
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string Kind { get; set; } = "word";
    public string SourceText { get; set; } = "";
    public string SourceLang { get; set; } = "auto";
    public string TranslatedText { get; set; } = "";
    public string TargetLang { get; set; } = "";
    public string? ContextSentence { get; set; }
    public string? SourceUrl { get; set; }
    public string? SourceTitle { get; set; }
    public string? Note { get; set; }
    public string Status { get; set; } = "learning";
    public string CreatedAt { get; set; } = "";
    public string UpdatedAt { get; set; } = "";
    public string? DeletedAt { get; set; }
    public string? DueAt { get; set; }
    public double? Interval { get; set; }
    public double? Ease { get; set; }
    public int? Reps { get; set; }

    /// <summary>Stamped by the server on every accepted write. Pull uses it, so client clock skew cannot hide changes.</summary>
    public string? ServerUpdatedAt { get; set; }
}

public sealed record PushRequest(List<CardDto>? Cards);

public sealed record PullResponse(IReadOnlyList<CardDto> Cards, string ServerTime);
