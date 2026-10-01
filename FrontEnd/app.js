// Automatically detect if running via file:// or http://
const BASE_URL = window.location.protocol === "file:" 
    ? "http://localhost:5150" 
    : "";

const API_URL = `${BASE_URL}/api/applications`;

document.addEventListener("DOMContentLoaded", () => {
    loadApplications();
    loadScrapedJobs();
    setupFormListener();
});

// XSS Sanitization Helper
function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ----------------------------------------------------
// 1. ACTIVE APPLICATIONS (CRUD Operations)
// ----------------------------------------------------

// Fetch & Render Applications Table
async function loadApplications() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            const errDetails = await response.text();
            throw new Error(`Server returned ${response.status}: ${errDetails}`);
        }

        const applications = await response.json();
        renderTable(applications);
        updateKPIs(applications);
    } catch (err) {
        console.error("Fetch Error:", err.message);
    }
}

// Render Table Rows with Editable Status Dropdown & Delete Action
function renderTable(apps) {
    const tbody = document.getElementById("app-list");
    if (!tbody) return;
    
    tbody.innerHTML = "";

    if (apps.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#64748b;">No applications recorded yet.</td></tr>`;
        return;
    }

    const statusOptions = ["Applied", "Interviewing", "Offer", "Rejected"];

    apps.forEach(app => {
        const tr = document.createElement("tr");

        const optionsHtml = statusOptions.map(opt => `
            <option value="${opt}" ${app.status === opt ? 'selected' : ''} style="background-color: #ffffff; color: #0f172a;">${opt}</option>
        `).join("");

        const statusClass = `status-${app.status.toLowerCase().replace(/\s+/g, '-')}`;

        tr.innerHTML = `
            <td><strong>${escapeHtml(app.company)}</strong></td>
            <td>${escapeHtml(app.role)}</td>
            <td>
                <select class="badge-status ${statusClass}" 
                        style="cursor: pointer; border: none; outline: none; padding: 4px 10px; font-weight: 600; border-radius: 6px;">
                    ${optionsHtml}
                </select>
            </td>
            <td>
                <button class="btn-delete" title="Delete Record">✕</button>
            </td>
        `;

        // Clean event listeners instead of inline HTML handlers
        const selectEl = tr.querySelector("select");
        selectEl.addEventListener("change", (e) => updateStatus(app.id, e.target.value));

        const deleteBtn = tr.querySelector(".btn-delete");
        deleteBtn.addEventListener("click", () => deleteApp(app.id));

        tbody.appendChild(tr);
    });
}

// Update Application Status via API
async function updateStatus(id, newStatus) {
    try {
        const response = await fetch(`${API_URL}/${id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) throw new Error("Failed to update status.");

        loadApplications();
    } catch (err) {
        console.error("Status Update Error:", err);
        alert("Failed to update application status.");
    }
}

// Update Dashboard KPI Counters
function updateKPIs(apps) {
    const totalCount = apps.length;
    const interviewCount = apps.filter(a => a.status === "Interviewing").length;

    const totalEl = document.getElementById("stat-total");
    const interviewEl = document.getElementById("stat-interviews");

    if (totalEl) totalEl.textContent = totalCount;
    if (interviewEl) interviewEl.textContent = interviewCount;
}

// Handle Form Submission for New Applications
function setupFormListener() {
    const form = document.getElementById("app-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const payload = {
            company: document.getElementById("company").value.trim(),
            role: document.getElementById("role").value.trim(),
            status: document.getElementById("status").value || "Applied"
        };

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Server ${response.status}: ${errText}`);
            }

            form.reset();
            loadApplications();
        } catch (err) {
            console.error("Post Error Details:", err);
            alert(`Error posting record: ${err.message}`);
        }
    });
}

// Delete Application
async function deleteApp(id) {
    if (!confirm("Are you sure you want to delete this job application?")) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) throw new Error("Failed to delete application.");

        loadApplications();
    } catch (err) {
        console.error("Delete Error:", err);
        alert("Failed to delete record.");
    }
}

// ----------------------------------------------------
// 2. SCRAPED TECH JOB LEADS (Sidebar Panel)
// ----------------------------------------------------

// Fetch & Render Scraped Job Applications
async function loadScrapedJobs() {
    try {
        const response = await fetch(`${API_URL}/scraped-jobs`);
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Server ${response.status}: ${errText}`);
        }

        const jobs = await response.json();
        const container = document.getElementById("skills-list");
        if (!container) return;
        
        container.innerHTML = "";

        // Strip non-job metadata standard on Remote OK style endpoints
        const validJobs = Array.isArray(jobs) ? jobs.filter(j => j.company || j.position || j.role) : [];

        if (validJobs.length === 0) {
            container.innerHTML = "<li style='padding: 8px; color: #64748b;'>No job leads found.</li>";
            return;
        }

        validJobs.slice(0, 10).forEach(job => {
            const company = job.company || "Unknown";
            const role = job.position || job.role || "Unknown Role";
            const location = job.location || "Remote";
            const url = job.url && job.url !== "#" ? job.url : null;

            const li = document.createElement("li");
            li.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 8px; border-bottom: 1px solid #e2e8f0;";

            const titleHtml = url 
                ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: #2563eb; font-weight: 600; font-size: 0.95rem;">
                    ${escapeHtml(role)} ↗
                   </a>`
                : `<strong style="font-size: 0.95rem;">${escapeHtml(role)}</strong>`;

            li.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    ${titleHtml}
                    <span style="font-size: 0.8rem; color: #64748b;">${escapeHtml(company)} • ${escapeHtml(location)}</span>
                </div>
                <button class="btn-delete btn-add-lead" style="border-color: #10b981; color: #10b981;" title="Add to My Applications">+</button>
            `;

            // Clean event listener eliminates single quote issues
            const addBtn = li.querySelector(".btn-add-lead");
            addBtn.addEventListener("click", () => addScrapedJob(company, role));

            container.appendChild(li);
        });
    } catch (err) {
        console.warn("Scraped jobs error:", err.message);
    }
}

// Quickly Add a Scraped Job Lead to Active Tracker
async function addScrapedJob(company, role) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                company: company || "Unknown",
                role: role || "Unknown",
                status: "Applied"
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Server ${response.status}: ${errText}`);
        }

        loadApplications();
    } catch (err) {
        console.error("Auto-add error:", err);
        alert(`Could not add scraped job: ${err.message}`);
    }
}