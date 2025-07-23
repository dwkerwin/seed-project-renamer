using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;

namespace SeedDotnetRestapiEcsFargate.Middleware
{
    /// <summary>
    /// Custom logger provider that filters health endpoint requests from logs.
    /// 
    /// AWS ALB health checks frequently poll health endpoints (typically multiple times per minute),
    /// which would generate excessive log entries and make CloudWatch logs difficult to parse.
    /// This filter prevents health endpoint logs from being generated at all for requests
    /// to /api/health and /api/health/up paths.
    /// </summary>
    public class HealthEndpointLoggingFilter : ILoggerProvider
    {
        private readonly LogLevel _filterLevel;

        public HealthEndpointLoggingFilter(LogLevel filterLevel)
        {
            _filterLevel = filterLevel;
        }

        public ILogger CreateLogger(string categoryName)
        {
            return new HealthEndpointLogger(categoryName, _filterLevel);
        }

        public void Dispose() { }

        private class HealthEndpointLogger : ILogger
        {
            private readonly string _categoryName;
            private readonly LogLevel _filterLevel;

            public HealthEndpointLogger(string categoryName, LogLevel filterLevel)
            {
                _categoryName = categoryName;
                _filterLevel = filterLevel;
            }

            IDisposable? ILogger.BeginScope<TState>(TState state) => NullScope.Instance;

            public bool IsEnabled(LogLevel logLevel)
            {
                // Only filter for health controller or health-related categories
                if (_categoryName.Contains("HealthController") || 
                    _categoryName.Contains("api/health") ||
                    _categoryName.Contains("api/Health"))
                {
                    return logLevel >= _filterLevel;
                }
                return true;
            }

            void ILogger.Log<TState>(
                LogLevel logLevel,
                EventId eventId,
                TState state,
                Exception? exception,
                Func<TState, Exception?, string> formatter)
            {
                if (!IsEnabled(logLevel))
                {
                    return;
                }

                // Check if we're in a health endpoint scope
                if (state is IEnumerable<KeyValuePair<string, object>> scopeItems)
                {
                    foreach (var item in scopeItems)
                    {
                        if (item.Key == "SuppressHealthLogging" && (bool)item.Value)
                        {
                            // Skip logging for health endpoints
                            return;
                        }
                    }
                }

                // Let the logging happen for non-health endpoint requests
            }

            private class NullScope : IDisposable
            {
                public static readonly NullScope Instance = new NullScope();
                public void Dispose() { }
            }
        }
    }
} 