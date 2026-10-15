using LexBrain.Api.Services;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = FunctionsApplication.CreateBuilder(args);
builder.ConfigureFunctionsWebApplication();

// Translation: Azure Translator behind a cache, so repeated lookups are free.
builder.Services.AddMemoryCache(o => o.SizeLimit = 10_000);
builder.Services.AddHttpClient();
builder.Services.AddSingleton<AzureTranslatorProvider>();
builder.Services.AddSingleton<ITranslationProvider>(sp => new CachingTranslationProvider(
    sp.GetRequiredService<AzureTranslatorProvider>(),
    sp.GetRequiredService<IMemoryCache>()));

builder.Services.AddSingleton<RateLimiter>();
builder.Services.AddSingleton<IUserResolver, UserResolver>();

// Storage: Cosmos DB when configured, otherwise an in-memory store for local development.
var cosmosConnection = builder.Configuration["COSMOS_CONNECTION"];
if (!string.IsNullOrWhiteSpace(cosmosConnection))
{
    builder.Services.AddSingleton(new CosmosClient(cosmosConnection, new CosmosClientOptions
    {
        SerializerOptions = new CosmosSerializationOptions { PropertyNamingPolicy = CosmosPropertyNamingPolicy.CamelCase },
    }));
    builder.Services.AddSingleton<ICardStore, CosmosCardStore>();
}
else
{
    builder.Services.AddSingleton<ICardStore, InMemoryCardStore>();
}

builder.Build().Run();
