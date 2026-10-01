using System;
using System.ComponentModel.DataAnnotations;

namespace JobDashboard.Models
{
    public class JobApplication
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Company { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Role { get; set; } = string.Empty;

        [Required]
        public string Status { get; set; } = "Applied"; // "Applied", "Interviewing", "Offer", "Rejected"

        public string TechStack { get; set; } = string.Empty; // e.g. "C#, Python, SQLite"

        public string Location { get; set; } = "Remote";

        public DateTime AppliedDate { get; set; } = DateTime.UtcNow;
    }
}