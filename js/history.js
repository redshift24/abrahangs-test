let logs = [];
let selectedLogs = new Set();

// Cache DOM elements
let elements = {};

function cacheElements() {
    elements = {
        logsList: document.getElementById('logs-list'),
        emptyState: document.getElementById('empty-state'),
        deleteBar: document.getElementById('delete-bar')
    };
}

function loadLogs() {
    try {
        const stored = localStorage.getItem('abrahangs_logs');
        if (stored) {
            logs = JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Failed to load logs:', e);
        logs = [];
    }
    renderLogs();
}

function saveLogs() {
    try {
        localStorage.setItem('abrahangs_logs', JSON.stringify(logs));
    } catch (e) {
        console.warn('Failed to save logs:', e);
    }
}

function renderLogs() {
    const { logsList, emptyState, deleteBar } = elements;

    if (logs.length === 0) {
        emptyState.style.display = 'flex';
        logsList.style.display = 'none';
        deleteBar.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    logsList.style.display = 'block';

    const fragment = document.createDocumentFragment();
    logs.forEach((log, index) => {
        const item = document.createElement('div');
        item.className = 'log-item' + (selectedLogs.has(index) ? ' selected' : '');
        item.onclick = () => toggleLog(index);

        const date = new Date(log.completedAt);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const checkboxIcon = selectedLogs.has(index)
            ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
            : '';

        item.innerHTML = `
            <div class="log-checkbox">${checkboxIcon}</div>
            <div class="log-info">
                <div class="log-name">${log.hangName}</div>
                <div class="log-date">${dateStr}</div>
            </div>
            <div class="log-stats">
                <div class="log-reps">${log.completedReps}/${log.totalReps}</div>
                <div class="log-label">reps</div>
            </div>
        `;

        fragment.appendChild(item);
    });

    logsList.innerHTML = '';
    logsList.appendChild(fragment);

    // Show/hide delete bar
    deleteBar.style.display = selectedLogs.size > 0 ? 'block' : 'none';
}

function toggleLog(index) {
    if (selectedLogs.has(index)) {
        selectedLogs.delete(index);
    } else {
        selectedLogs.add(index);
    }
    renderLogs();
}

function confirmDelete() {
    if (selectedLogs.size === 0) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <h3>Delete Selected Logs?</h3>
            <p>Are you sure you want to delete ${selectedLogs.size} log(s)? This action cannot be undone.</p>
            <div class="modal-buttons">
                <button class="modal-btn cancel" onclick="cancelDelete()">Cancel</button>
                <button class="modal-btn confirm" onclick="deleteSelected()">Delete</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function cancelDelete() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

function deleteSelected() {
    // Sort in reverse order to delete from end first
    const indices = Array.from(selectedLogs).sort((a, b) => b - a);
    indices.forEach(index => {
        logs.splice(index, 1);
    });
    selectedLogs.clear();
    saveLogs();
    renderLogs();
    cancelDelete();
}

function goHome() {
    window.location.href = 'hang-workout.html';
}

// Load logs on page load
document.addEventListener('DOMContentLoaded', function () {
    cacheElements();
    loadLogs();
});

// Warn before leaving with selected logs
window.addEventListener('beforeunload', function (e) {
    if (selectedLogs.size > 0) {
        e.preventDefault();
        e.returnValue = 'You have selected logs for deletion. Are you sure you want to leave?';
        return e.returnValue;
    }
});
