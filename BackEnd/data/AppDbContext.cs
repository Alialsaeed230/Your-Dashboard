using Microsoft.EntityFrameworkCore;
using JobDashboard.Models;

namespace JobDashboard.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Application> Applications { get; set; } = null!;
    }
}