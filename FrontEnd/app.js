const RENDER_SERVICE_URL = "https://your-dashboard3.onrender.com";

const BASE_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:5150"
    : RENDER_SERVICE_URL;

const API_URL = `${BASE_URL}/api/applications`;

document.addEventListener("DOMContentLoaded", () => {
    loadApplications();
    loadScrapedJobs();

    const form = document.getElementById("app-form");
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const company = document.getElementById("company").value;
            const role = document.getElementById("role").value;
            const status = document.getElementById("status").value;

            await saveApplication(company, role, status);
            e.target.reset();
        });
    }
});

async function loadApplications() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        const data = await res.json();
        const list = document.getElementById("app-list");
        if (list) {
            list.innerHTML = data.map(app => `
                <tr>
                    <td>${app.company}</td>
                    <td>${app.role}</td>
                    <td>${app.status}</td>
                    <td>${new Date(app.appliedAt).toLocaleDateString()}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error("Load Apps Error:", err);
    }
}

async function loadScrapedJobs() {
    try {
        const res = await fetch(`${API_URL}/scraped-jobs`);
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        const jobs = await res.json();
        const list = document.getElementById("scraped-list");
        if (list) {
            list.innerHTML = jobs.map(j => `
                <li><strong>${j.company}</strong> - ${j.role} (${j.location})</li>
            `).join('');
        }
    } catch (err) {
        console.error("Load Scraped Jobs Error:", err);
    }
}

async function saveApplication(company, role, status) {
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ company, role, status })
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Server ${res.status}: ${errText}`);
        }
        loadApplications();
    } catch (err) {
        alert(`Error saving record: ${err.message}`);
    }
}
