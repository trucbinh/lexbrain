using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace LexBrain.Api.Services;

public interface IUserResolver
{
    /// <summary>Returns the caller's user id, or null when the request is not authenticated.</summary>
    string? Resolve(HttpRequest request);
}

/// <summary>
/// PRODUCTION: turn on App Service Authentication ("Easy Auth") with Microsoft Entra External ID. It validates the
/// token and injects X-MS-CLIENT-PRINCIPAL-ID. That header is only trusted when Easy Auth is enabled
/// (WEBSITE_AUTH_ENABLED=True), otherwise a client could simply send it.
/// DEVELOPMENT: set LEXBRAIN_DEV_AUTH=1 to accept an X-User-Id header (or "dev-user"). Never set this in Azure.
/// </summary>
public sealed class UserResolver(IConfiguration config) : IUserResolver
{
    public string? Resolve(HttpRequest request)
    {
        var easyAuthOn = string.Equals(config["WEBSITE_AUTH_ENABLED"], "True", StringComparison.OrdinalIgnoreCase);
        if (easyAuthOn)
        {
            var principal = request.Headers["X-MS-CLIENT-PRINCIPAL-ID"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(principal))
            {
                return principal;
            }
        }

        if (config["LEXBRAIN_DEV_AUTH"] == "1")
        {
            var dev = request.Headers["X-User-Id"].FirstOrDefault();
            return string.IsNullOrWhiteSpace(dev) ? "dev-user" : dev;
        }

        return null;
    }
}
