using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JobDashboard.Data;
using JobDashboard.Models;
using System.Text.Json;
using System.Xml.Linq;

namespace JobDashboard.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ApplicationsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;

        // Regional Whitelist for Middle East Filtering
        private static readonly string[] MiddleEastCountries = new[]
        {
            "Bahrain", "Saudi Arabia", "UAE", "United Arab Emirates", "Dubai", "Abu Dhabi",
            "Riyadh", "Jeddah", "Qatar", "Doha", "Kuwait", "Oman", "Muscat", "Jordan",
            "Amman", "Egypt", "Cairo", "Lebanon", "Beirut", "MENA", "GCC", "Middle East"
        };

        public ApplicationsController(AppDbContext context, IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
        }

        // GET: api/applications
        [HttpGet]
        public async Task<ActionResult<IEnumerable<JobDashboard.Models.Application>>> GetApplications()
        {
            return await _context.Applications.ToListAsync();
        }

        // POST: api/applications
        [HttpPost]
        public async Task<ActionResult<JobDashboard.Models.Application>> PostApplication(JobDashboard.Models.Application application)
        {
            if (string.IsNullOrWhiteSpace(application.Company) || string.IsNullOrWhiteSpace(application.Role))
            {
                return BadRequest("Company and Role are required.");
            }

            if (application.AppliedAt == default)
            {
                application.AppliedAt = DateTime.UtcNow;
            }

            _context.Applications.Add(application);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetApplications), new { id = application.Id }, application);
        }

        // PUT: api/applications/{id}/status
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] StatusUpdateModel model)
        {
            var application = await _context.Applications.FindAsync(id);
            if (application == null)
            {
                return NotFound();
            }

            application.Status = model.Status;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/applications/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteApplication(int id)
        {
            var application = await _context.Applications.FindAsync(id);
            if (application == null)
            {
                return NotFound();
            }

            _context.Applications.Remove(application);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/applications/scraped-jobs (STRICT MIDDLE EAST ONLY)
        [HttpGet("scraped-jobs")]
        public async Task<IActionResult> GetScrapedJobs()
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(8);
            client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

            var meJobs = new List<object>();

            // 1. Fetch from Middle East RSS Feed (Bayt / Gulf Job Feeds)
            try
            {
                var response = await client.GetAsync("https://www.bayt.com/en/rss/jobs/");
                if (response.IsSuccessStatusCode)
                {
                    var xmlString = await response.Content.ReadAsStringAsync();
                    var xdoc = XDocument.Parse(xmlString);

                    var items = xdoc.Descendants("item");
                    foreach (var item in items)
                    {
                        string title = item.Element("title")?.Value ?? "";
                        string link = item.Element("link")?.Value ?? "#";

                        var parts = title.Split('-');
                        string role = parts.Length > 0 ? parts[0].Trim() : title;
                        string company = parts.Length > 1 ? parts[1].Trim() : "Bayt Employer";
                        string location = parts.Length > 2 ? parts[2].Trim() : "Middle East";

                        meJobs.Add(new
                        {
                            id = Guid.NewGuid().ToString(),
                            company = company,
                            role = role,
                            location = location,
                            url = link
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"RSS Feed Error: {ex.Message}");
            }

            // 2. Fallback API filter with strict Middle East location matching
            if (meJobs.Count == 0)
            {
                try
                {
                    var response = await client.GetAsync("https://remoteok.com/api");
                    if (response.IsSuccessStatusCode)
                    {
                        var content = await response.Content.ReadAsStringAsync();
                        using JsonDocument doc = JsonDocument.Parse(content);

                        if (doc.RootElement.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var element in doc.RootElement.EnumerateArray())
                            {
                                if (!element.TryGetProperty("position", out _)) continue;

                                string location = element.TryGetProperty("location", out var locProp) ? locProp.GetString() ?? "" : "";
                                string position = element.TryGetProperty("position", out var posProp) ? posProp.GetString() ?? "" : "";

                                bool matchesLocation = MiddleEastCountries.Any(c => 
                                    location.Contains(c, StringComparison.OrdinalIgnoreCase)
                                );

                                if (matchesLocation)
                                {
                                    string jobId = element.TryGetProperty("id", out var idProp) ? idProp.ToString() : Guid.NewGuid().ToString();
                                    string companyName = element.TryGetProperty("company", out var compProp) ? compProp.GetString() ?? "Unknown" : "Unknown";
                                    string jobUrl = element.TryGetProperty("url", out var urlProp) ? urlProp.GetString() ?? "#" : "#";

                                    meJobs.Add(new
                                    {
                                        id = jobId,
                                        company = companyName,
                                        role = position,
                                        location = string.IsNullOrWhiteSpace(location) ? "Middle East" : location,
                                        url = jobUrl
                                    });
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"API Fallback Error: {ex.Message}");
                }
            }

            // 3. Fallback mock MENA tech roles if upstream services return empty results
            if (meJobs.Count == 0)
            {
                meJobs.AddRange(new[]
                {
                    new { id = "1", company = "Aramco Digital", role = "Full Stack Engineer", location = "Dhahran, Saudi Arabia", url = "https://www.bayt.com" },
                    new { id = "2", company = "Talabat", role = "Senior Backend Developer (.NET)", location = "Dubai, UAE", url = "https://www.bayt.com" },
                    new { id = "3", company = "Fawry", role = "DevOps Engineer", location = "Cairo, Egypt", url = "https://wuzzuf.net" },
                    new { id = "4", company = "Benefit Bahrain", role = "Cloud Solutions Architect", location = "Manama, Bahrain", url = "https://www.bayt.com" },
                    new { id = "5", company = "Zain Group", role = "Data Analyst", location = "Kuwait City, Kuwait", url = "https://www.bayt.com" }
                });
            }

            return Ok(meJobs);
        }
    }

    public class StatusUpdateModel
    {
        public string Status { get; set; } = "Applied";
    }
}