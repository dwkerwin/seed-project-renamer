using Microsoft.AspNetCore.Mvc;
using SeedDotnetRestapiEcsFargate.Services;
using Microsoft.Extensions.Logging;

namespace SeedDotnetRestapiEcsFargate.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        private readonly HealthService _healthService;
        private readonly ILogger<HealthController> _logger;

        public HealthController(HealthService healthService, ILogger<HealthController> logger)
        {
            _healthService = healthService;
            _logger = logger;
        }

        [HttpGet]
        public IActionResult GetHealth()
        {
            if (_logger.IsEnabled(LogLevel.Trace))
            {
                _logger.LogTrace("Health check endpoint called");
            }
            
            return Ok(_healthService.GetHealthStatus());
        }

        [HttpGet("up")]
        public IActionResult GetUp()
        {
            if (_logger.IsEnabled(LogLevel.Trace))
            {
                _logger.LogTrace("Health up endpoint called");
            }
            
            return Ok(_healthService.GetUpStatus());
        }
    }
}
