namespace JobDashboard.Models
{
    public class Application
    {
        public int Id { get; set; }
        public string Company { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Status { get; set; } = "Applied";
        
        // This property must be present to fix CS1061
        public DateTime AppliedAt { get; set; } = DateTime.UtcNow;
    }
}