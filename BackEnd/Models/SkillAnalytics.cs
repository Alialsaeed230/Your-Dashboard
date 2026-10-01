using System.ComponentModel.DataAnnotations;

namespace JobDashboard.Models
{
    public class SkillAnalytics
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Skill { get; set; } = string.Empty;

        public int Frequency { get; set; }

        public string Category { get; set; } = "Language"; // "Language", "Framework", "Database"
    }
}