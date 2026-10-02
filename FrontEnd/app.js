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
            if (data.length === 0) {
                list.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No applications saved yet.</td></tr>`;
                return;
            }

            list.innerHTML = data.map(app => `
                <tr>
                    <td style="font-weight: 600;">${escapeHtml(app.company)}</td>
                    <td>${escapeHtml(app.role)}</td>
                    <td>
                        <select class="status-select" data-status="${escapeHtml(app.status)}" onchange="handleStatusChange(${app.id}, this)">
                            <option value="Applied" ${app.status === 'Applied' ? 'selected' : ''}>Applied</option>
                            <option value="Interviewing" ${app.status === 'Interviewing' ? 'selected' : ''}>Interviewing</option>
                            <option value="Offered" ${app.status === 'Offered' ? 'selected' : ''}>Offered</option>
                            <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                    </td>
                    <td style="color: var(--text-muted); font-size: 13px;">${new Date(app.appliedAt).toLocaleDateString()}</td>
                    <td style="text-align: center;">
                        <button class="btn-delete" title="Delete Record" onclick="deleteApplication(${app.id})">&times;</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error("Load Applications Error:", err);
    }
}

async function loadScrapedJobs() {
    const list = document.getElementById("scraped-list");
    if (!list) return;

    list.innerHTML = "<li style='color: var(--text-muted);'>Loading opportunities...</li>";

    try {
        const res = await fetch(`${API_URL}/scraped-jobs`);
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        const jobs = await res.json();

        if (!jobs || jobs.length === 0) {
            list.innerHTML = "<li>No active jobs found right now.</li>";
            return;
        }

        list.innerHTML = jobs.map(j => `
            <li>
                <div>
                    <strong>${escapeHtml(j.company)}</strong> — ${escapeHtml(j.role)} 
                    <span style="color: var(--text-muted); font-size: 13px;">(${escapeHtml(j.location)})</span>
                </div>
                <a href="${j.url}" target="_blank" class="job-link">View Position</a>
            </li>
        `).join('');
    } catch (err) {
        console.error("Load Scraped Jobs Error:", err);
        list.innerHTML = "<li>Unable to load live jobs feed at the moment.</li>";
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
        alert(`Error saving application: ${err.message}`);
    }
}

async function handleStatusChange(id, selectElement) {
    const newStatus = selectElement.value;
    selectElement.setAttribute("data-status", newStatus);
    await updateStatus(id, newStatus);
}

async function updateStatus(id, newStatus) {
    try {
        const res = await fetch(`${API_URL}/${id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newStatus)
        });
        if (!res.ok) throw new Error(`Server returned status ${res.status}`);
    } catch (err) {
        alert(`Failed to update status: ${err.message}`);
        loadApplications();
    }
}

async function deleteApplication(id) {
    if (!confirm("Are you sure you want to delete this application record?")) return;

    try {
        const res = await fetch(`${API_URL}/${id}`, {
            method: "DELETE"
        });
        if (!res.ok) throw new Error(`Server returned status ${res.status}`);
        loadApplications();
    } catch (err) {
        alert(`Failed to delete record: ${err.message}`);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
