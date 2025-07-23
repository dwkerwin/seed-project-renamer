using SeedDotnetRestapiEcsFargate.Services;

namespace SeedDotnetRestapiEcsFargate.Tests.Services;

public class HealthServiceTests
{
    private readonly HealthService _healthService;

    public HealthServiceTests()
    {
        _healthService = new HealthService();
    }

    [Fact]
    public void GetHealthStatus_ReturnsHealthyStatus()
    {
        // Act
        var result = _healthService.GetHealthStatus();
        
        // Assert
        var status = result.GetType().GetProperty("status")?.GetValue(result) as string;
        Assert.Equal("Healthy", status);
    }
    
    [Fact]
    public void GetUpStatus_ReturnsUpStatus()
    {
        // Act
        var result = _healthService.GetUpStatus();
        
        // Assert
        var status = result.GetType().GetProperty("status")?.GetValue(result) as string;
        Assert.Equal("Up", status);
    }
} 