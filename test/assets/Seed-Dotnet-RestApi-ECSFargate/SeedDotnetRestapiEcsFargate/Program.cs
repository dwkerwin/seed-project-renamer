using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Mvc;
using SeedDotnetRestapiEcsFargate.Services;
using dotenv.net;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;
using SeedDotnetRestapiEcsFargate.Middleware;
using Serilog;
using Serilog.Events;
using Serilog.Core;
using System;

// Make the Program class and Main method public for testing
public class Program
{
    public static void Main(string[] args)
    {
        try
        {
            // Load environment variables from .env.dev and .env.dev.secrets files if they exist
            var envFilePaths = new List<string>();
            
            if (File.Exists(".env.dev"))
            {
                envFilePaths.Add(".env.dev");
            }
            
            if (File.Exists(".env.dev.secrets"))
            {
                envFilePaths.Add(".env.dev.secrets");
            }
            
            if (envFilePaths.Any())
            {
                DotEnv.Load(new DotEnvOptions(
                    envFilePaths: envFilePaths,
                    ignoreExceptions: true,
                    trimValues: true,
                    overwriteExistingVars: false // Don't override existing environment variables
                ));
            }

            // Determine log level from environment variable
            var logLevelString = Environment.GetEnvironmentVariable("LOG_LEVEL") ?? "Information";
            
            // Print raw environment variable value for debugging
            Console.WriteLine($"Raw LOG_LEVEL environment variable value: '{logLevelString}'");
            
            var normalizedLogLevel = logLevelString.ToLower().Trim();
            
            // Determine if the provided log level is valid
            var validLogLevels = new[] { "verbose", "debug", "information", "info", "warning", "warn", "error", "err", "fatal", "critical" };
            var isValidLogLevel = validLogLevels.Contains(normalizedLogLevel);
            
            var logLevel = normalizedLogLevel switch
            {
                "verbose" => LogEventLevel.Verbose,
                "debug" => LogEventLevel.Debug,
                "information" or "info" => LogEventLevel.Information,
                "warning" or "warn" => LogEventLevel.Warning,
                "error" or "err" => LogEventLevel.Error,
                "fatal" or "critical" => LogEventLevel.Fatal,
                _ => LogEventLevel.Information // Default to Information if invalid or missing
            };

            // Configure Serilog
            Log.Logger = new LoggerConfiguration()
                .MinimumLevel.Is(logLevel) // Use the environment variable log level
                .MinimumLevel.Override("Microsoft", logLevel)
                .MinimumLevel.Override("Microsoft.AspNetCore", logLevel)
                // Filter out health endpoint logging to reduce log noise
                // Health endpoints are called frequently by AWS ALB (2+ times per minute)
                // which would otherwise flood CloudWatch logs and make troubleshooting difficult
                .Filter.ByExcluding(e => 
                    (e.Properties.ContainsKey("RequestPath") && 
                     e.Properties["RequestPath"].ToString().ToLower().Contains("/api/health")) ||
                    (e.Properties.ContainsKey("SourceContext") && 
                     e.Properties["SourceContext"].ToString().Contains("HealthController")))
                .Enrich.FromLogContext()
                .WriteTo.Console()
                .CreateLogger();

            // Show a warning if the provided log level was invalid
            if (!isValidLogLevel && !string.IsNullOrWhiteSpace(logLevelString))
            {
                Log.Warning("Invalid LOG_LEVEL value provided: '{ProvidedLogLevel}'. Using default level: Information. Valid values are: Verbose, Debug, Information, Warning, Error, Fatal", logLevelString);
            }

            var builder = WebApplication.CreateBuilder(args);
            
            // Use Serilog
            builder.Host.UseSerilog();

            // Add services to the container.
            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();

            // Configure CORS
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("CustomCorsPolicy", policy =>
                {
                    policy
                        .SetIsOriginAllowed(origin => 
                        {
                            // Allow any subdomain under aws-dev.yourorg.com, aws-qa.yourorg.com, or aws-prod.yourorg.com
                            return origin != null && (
                                origin.EndsWith(".aws-dev.yourorg.com") || 
                                origin.EndsWith(".aws-qa.yourorg.com") || 
                                origin.EndsWith(".aws-prod.yourorg.com") ||
                                // Also allow the apex domains
                                origin == "https://aws-dev.yourorg.com" ||
                                origin == "https://aws-qa.yourorg.com" ||
                                origin == "https://aws-prod.yourorg.com"
                            );
                        })
                        .AllowAnyMethod() // Equivalent to 'GET, POST, PUT, DELETE, OPTIONS'
                        .AllowAnyHeader() // Allow all headers
                        .AllowCredentials() // Equivalent to 'Access-Control-Allow-Credentials: true'
                        .WithExposedHeaders("Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With", "x-user-id", "x-email");
                });
            });

            // Configure Swagger
            builder.Services.AddSwaggerGen(options =>
            {
                options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
                {
                    Title = "SeedDotnetRestapiEcsFargate API",
                    Version = "v1",
                    Description = "A .NET Core REST API"
                });
            });

            // Register application services
            builder.Services.AddScoped<HealthService>();

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            // Configure Swagger middleware with custom path
            app.UseSwagger();
            app.UseSwaggerUI(options =>
            {
                options.SwaggerEndpoint("/swagger/v1/swagger.json", "SeedDotnetRestapiEcsFargate API V1");
                options.RoutePrefix = "api/docs";
            });

            app.UseHttpsRedirection();
            app.UseRouting();

            // Use CORS before authorization
            app.UseCors("CustomCorsPolicy");

            // Add health endpoint logging middleware
            // This suppresses excessive logs from ALB health checks (api/health, api/health/up)
            // that would otherwise flood CloudWatch logs, making troubleshooting difficult
            app.UseHealthEndpointLogging();

            app.UseAuthorization();

            app.MapControllers();

            // Add a custom message to indicate the application is fully initialized
            app.Lifetime.ApplicationStarted.Register(() => 
            {
                Log.Information("Application fully initialized and ready to receive requests");
            });

            // Log when application is shutting down
            app.Lifetime.ApplicationStopping.Register(() => 
            {
                Log.Information("Application shutdown initiated");
            });

            app.Run();
        }
        catch (Exception ex)
        {
            // Log any startup exceptions
            Log.Fatal(ex, "Application terminated unexpectedly");
        }
        finally
        {
            // Ensure all logs are flushed before application exit
            Log.CloseAndFlush();
        }
    }
}
