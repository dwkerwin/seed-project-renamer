using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SeedDotnetRestapiEcsFargate.Controllers;
using SeedDotnetRestapiEcsFargate.Services;

namespace SeedDotnetRestapiEcsFargate.Tests.Controllers;

public class HealthControllerTests
{
    private readonly HealthController _controller;
    private readonly HealthService _healthService;
    private readonly ILogger<HealthController> _logger;

    public HealthControllerTests()
    {
        _healthService = new HealthService();
        _logger = LoggerFactory.Create(builder => builder.AddConsole()).CreateLogger<HealthController>();
        _controller = new HealthController(_healthService, _logger);
    }

    [Fact]
    public void GetHealth_ReturnsHealthyStatus()
    {
        // Act
        var result = _controller.GetHealth();
        
        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var returnValue = okResult.Value;
        var status = returnValue?.GetType().GetProperty("status")?.GetValue(returnValue) as string;
        Assert.Equal("Healthy", status);
    }
    
    [Fact]
    public void GetUp_ReturnsUpStatus()
    {
        // Act
        var result = _controller.GetUp();
        
        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var returnValue = okResult.Value;
        var status = returnValue?.GetType().GetProperty("status")?.GetValue(returnValue) as string;
        Assert.Equal("Up", status);
    }
} 