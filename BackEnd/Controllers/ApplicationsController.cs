using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JobDashboard.Data;
using JobDashboard.Models;
using System.Xml.Linq;

namespace JobDashboard.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ApplicationsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ApplicationsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Application>>> GetApplications()
        {
            return await _context.Applications
                .OrderByDescending(a => a.AppliedAt)
                .ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<Application>> PostApplication([FromBody] Application application)
        {
            if (application == null || string.IsNullOrWhiteSpace(application.Company) || string.IsNullOrWhiteSpace(application.Role))
            {
                return BadRequest("Company and Role are required.");
            }

            if (string.IsNullOrWhiteSpace(application.Status))
            {
                application.Status = "Applied";
            }

            application.AppliedAt = DateTime.UtcNow;
            _context.Applications.Add(application);
            await _context.SaveChangesAsync();

            return Ok(application);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteApplication(int id)
        {
            var application = await _context.Applications.FindAsync(id);
            if (application == null) return NotFound();

            _context.Applications.Remove(application);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("scraped-jobs")]
        public async Task<IActionResult> GetScrapedJobs()
        {
            var handler = new HttpClientHandler { AllowAutoRedirect = true, MaxAutomaticRedirections = 5 };
            using var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(8) };
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

            var meJobs = new List<object>();

            try
            {
                var response = await client.GetAsync("https://www.bayt.com/en/rss/jobs/");
                if (response.IsSuccessStatusCode)
                {
                    var xmlString = await response.Content.ReadAsStringAsync();
                    var xdoc = XDocument.Parse(xmlString);

                    foreach (var item in xdoc.Descendants("item"))
                    {
                        string title = item.Element("title")?.Value ?? "";
                        string link = item.Element("link")?.Value ?? "#";

                        var parts = title.Split('-');
                        string role = parts.Length > 0 ? parts[0].Trim() : title;
                        string company = parts.Length > 1 ? parts[1].Trim() : "Bayt Employer";
                        string location = parts.Length > 2 ? parts[2].Trim() : "Middle East";

                        meJobs.Add(new { id = Guid.NewGuid().ToString(), company, role, location, url = link });
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Scraper Note] Live feed bypass: {ex.Message}");
            }

            if (meJobs.Count == 0)
            {
                meJobs.AddRange(new[]
                {
                    new { id = "1", company = "Aramco Digital", role = "Full Stack Engineer (.NET)", location = "Dhahran, Saudi Arabia", url = "https://www.bayt.com" },
                    new { id = "2", company = "Talabat", role = "Senior Backend Developer", location = "Dubai, UAE", url = "https://www.bayt.com" },
                    new { id = "3", company = "Fawry", role = "DevOps Specialist", location = "Cairo, Egypt", url = "https://wuzzuf.net" }
                });
            }

            return Ok(meJobs);
        }
    }
}
