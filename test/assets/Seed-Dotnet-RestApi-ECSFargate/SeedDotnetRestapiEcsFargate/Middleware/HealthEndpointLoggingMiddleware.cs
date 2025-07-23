using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;

namespace SeedDotnetRestapiEcsFargate.Middleware
{
    /// <summary>
    /// Middleware to suppress logging for health check endpoints.
    /// 
    /// AWS ALB health checks call the health endpoints frequently (multiple times per minute),
    /// which would generate excessive log entries and make CloudWatch logs difficult to read.
    /// This middleware adds a scope tag to health endpoint requests that can be used to filter
    /// them out of the logs.
    /// </summary>
    public class HealthEndpointLoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<HealthEndpointLoggingMiddleware> _logger;

        public HealthEndpointLoggingMiddleware(RequestDelegate next, ILogger<HealthEndpointLoggingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var originalLogLevel = _logger.IsEnabled(LogLevel.Information);
            
            // Check if the request path contains health endpoints
            bool isHealthEndpoint = 
                context.Request.Path.StartsWithSegments("/api/health", StringComparison.OrdinalIgnoreCase) ||
                context.Request.Path.StartsWithSegments("/api/Health", StringComparison.OrdinalIgnoreCase);
            
            // Temporarily adjust logging scope for health endpoints
            if (isHealthEndpoint)
            {
                using (var scope = _logger.BeginScope(new Dictionary<string, object>
                {
                    ["SuppressHealthLogging"] = true
                }))
                {
                    await _next(context);
                }
            }
            else
            {
                await _next(context);
            }
        }
    }

    // Extension method to make it easier to add this middleware
    public static class HealthEndpointLoggingMiddlewareExtensions
    {
        public static IApplicationBuilder UseHealthEndpointLogging(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<HealthEndpointLoggingMiddleware>();
        }
    }
} 