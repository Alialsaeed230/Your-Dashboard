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
        const totalStat = document.getElementById("stat-total");
        
        if (totalStat) totalStat.textContent = data.length;

        if (list) {
            if (data.length === 0) {
                list.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b;">No applications recorded yet.</td></tr>`;
                return;
            }

            list.innerHTML = data.map(app => `
                <tr>
                    <td style="font-weight: 600; color: #f8fafc;">${escapeHtml(app.company)}</td>
                    <td>${escapeHtml(app.role)}</td>
                    <td>
                        <select class="status-select" data-status="${escapeHtml(app.status)}" onchange="handleStatusChange(${app.id}, this)">
                            <option value="Applied" ${app.status === 'Applied' ? 'selected' : ''}>Applied</option>
                            <option value="Interviewing" ${app.status === 'Interviewing' ? 'selected' : ''}>Interviewing</option>
                            <option value="Offer" ${app.status === 'Offer' || app.status === 'Offered' ? 'selected' : ''}>Offer</option>
                            <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                    </td>
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
    const list = document.getElementById("skills-list");
    if (!list) return;

    list.innerHTML = "<li style='color: #64748b;'>Loading feed...</li>";

    try {
        const res = await fetch(`${API_URL}/scraped-jobs`);
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        const jobs = await res.json();

        if (!jobs || jobs.length === 0) {
            list.innerHTML = "<li>No active roles available.</li>";
            return;
        }

        list.innerHTML = jobs.map(j => `
            <li>
                <div>
                    <strong style="color: #f8fafc;">${escapeHtml(j.company)}</strong>
                    <div style="font-size: 0.75rem; color: #94a3b8;">${escapeHtml(j.role)} (${escapeHtml(j.location)})</div>
                </div>
                <a href="${j.url}" target="_blank" class="skill-link">Apply &rarr;</a>
            </li>
        `).join('');
    } catch (err) {
        console.error("Load Scraped Jobs Error:", err);
        list.innerHTML = "<li>Unable to load feed at this time.</li>";
    }
}

async function saveApplication(company, role, status) {
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ company, role, status })
        });
        if (!res.ok) throw new Error(`Server ${res.status}`);
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
            body: JSON.stringify({ status: newStatus })
        });
        if (!res.ok) throw new Error(`Server returned status ${res.status}`);
    } catch (err) {
        alert(`Failed to update status: ${err.message}`);
        loadApplications();
    }
}

async function deleteApplication(id) {
    if (!confirm("Are you sure you want to remove this record?")) return;

    try {
        const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
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
