import json
import os
import urllib.request

def run_scraper():
    url = "https://remotive.com/api/remote-jobs?category=software-dev&limit=10"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    job_listings = []

    try:
        print("[Scraper] Fetching live tech job opportunities...")
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                raw_jobs = data.get('jobs', [])

                for job in raw_jobs[:10]:
                    job_listings.append({
                        "company": job.get("company_name", "Unknown"),
                        "role": job.get("title", "Software Developer"),
                        "location": job.get("candidate_required_location", "Remote"),
                        "url": job.get("url", "#"),
                        "status": "Discovered"
                    })
    except Exception as e:
        print(f"[Scraper] Fallback to local leads: {e}")
        job_listings = [
            {"company": "Microsoft", "role": ".NET Software Engineer", "location": "Remote / USA", "url": "https://careers.microsoft.com", "status": "Discovered"},
            {"company": "Amazon", "role": "Backend C# Developer", "location": "Hybrid", "url": "https://amazon.jobs", "status": "Discovered"},
            {"company": "Shopify", "role": "Full Stack Developer (C# / JS)", "location": "Remote", "url": "https://shopify.com/careers", "status": "Discovered"}
        ]

    # Target: C:\Users\aalsa\Desktop\Projects\Analytics & Job Application Dashboard\Scraper\jobs.json
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, "jobs.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(job_listings, f, indent=4)

    print(f"[Scraper] Successfully saved to: {output_path}")

if __name__ == "__main__":
    run_scraper()