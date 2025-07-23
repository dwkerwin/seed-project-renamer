namespace SeedDotnetRestapiEcsFargate.Services
{
    public class HealthService
    {
        public object GetHealthStatus()
        {
            // In a real application, this would perform actual health checks
            return new { status = "Healthy" };
        }

        public object GetUpStatus()
        {
            // This endpoint always returns a simple "up" status
            return new { status = "Up" };
        }
    }
} 