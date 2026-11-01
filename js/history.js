let logs = [];
let selectedLogs = new Set();
let currentFilter = null;

let elements = {};

function applyDarkMode() {
    const darkModeEnabled = localStorage.getItem('abrahangs_dark_mode') === 'true';
    if (darkModeEnabled) {
        document.documentElement.classList.add('dark-mode');
    } else {
        document.documentElement.classList.remove('dark-mode');
    }
}

function cacheElements() {
    elements = {
        logsList: document.getElementById('logs-list'),
        emptyState: document.getElementById('empty-state'),
        deleteBar: document.getElementById('delete-bar'),
        filterSelect: document.getElementById('filter-select')
    };
}

function getPeriodKey(date) {
    return date.getFullYear() + '_' + String(date.getMonth() + 1).padStart(2, '0');
}

function getPeriodLabel(year, month) {
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

function populateFilter() {
    const periods = new Set();
    logs.forEach(log => {
        const date = new Date(log.completedAt);
        periods.add(getPeriodKey(date));
    });

    const sortedPeriods = Array.from(periods).sort((a, b) => {
        return b.localeCompare(a);
    });

    const select = elements.filterSelect;
    select.innerHTML = `<option value="all">All Time</option>` +
        sortedPeriods.map(key => {
            const [year, month] = key.split('_').map(Number);
            return `<option value="${key}" ${key === currentFilter ? 'selected' : ''}>${getPeriodLabel(year, month)}</option>`;
        }).join('');
}

function getFilteredLogs() {
    if (!currentFilter || currentFilter === 'all') return logs;
    return logs.filter(log => {
        const date = new Date(log.completedAt);
        return getPeriodKey(date) === currentFilter;
    });
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
    populateFilter();
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
    const filteredLogs = getFilteredLogs();

    if (filteredLogs.length === 0) {
        emptyState.style.display = 'flex';
        emptyState.querySelector('h2').textContent = logs.length === 0
            ? 'No workout history yet'
            : 'No workouts in this period';
        emptyState.querySelector('p').textContent = logs.length === 0
            ? 'Complete a workout to see it here'
            : 'Try selecting a different year or month';
        logsList.style.display = 'none';
        deleteBar.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    logsList.style.display = 'block';

    const groups = new Map();
    filteredLogs.forEach(log => {
        const date = new Date(log.completedAt);
        const key = getPeriodKey(date);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(log);
    });

    const originalIndices = new Map();
    filteredLogs.forEach(log => {
        const idx = logs.indexOf(log);
        originalIndices.set(log, idx);
    });

    const fragment = document.createDocumentFragment();

    const sortedKeys = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

    sortedKeys.forEach(key => {
        const groupLogs = groups.get(key);
        const [year, month] = key.split('_').map(Number);
        const label = getPeriodLabel(year, month);

        const header = document.createElement('div');
        header.className = 'month-header';
        header.innerHTML = `<span>${label}</span><span class="month-count">${groupLogs.length}</span>`;
        fragment.appendChild(header);

        groupLogs.forEach(log => {
            const item = document.createElement('div');
            const originalIdx = originalIndices.get(log);
            item.className = 'log-item' + (selectedLogs.has(originalIdx) ? ' selected' : '');
            item.onclick = () => toggleLog(originalIdx);

            const date = new Date(log.completedAt);
            const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const checkboxIcon = selectedLogs.has(originalIdx)
                ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
                : '';

            item.innerHTML = `
                <div class="log-checkbox">${checkboxIcon}</div>
                <div class="log-info">
                    <div class="log-name"></div>
                    <div class="log-date"></div>
                </div>
                <div class="log-stats">
                    <div class="log-reps"></div>
                    <div class="log-label">reps</div>
                </div>
            `;
            item.querySelector(".log-name").textContent = log.hangName;
            item.querySelector(".log-date").textContent = dateStr;
            item.querySelector(".log-reps").textContent = `${log.completedReps}/${log.totalReps}`;

            fragment.appendChild(item);
        });
    });

    logsList.innerHTML = '';
    logsList.appendChild(fragment);

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

    showModal(
        'Delete Selected Logs?',
        `Are you sure you want to delete ${selectedLogs.size} log(s)? This cannot be undone.`,
        [
            { label: 'Delete', primary: true, action: () => { deleteSelected(); closeModal(); } },
            { label: 'Cancel', cancel: true, action: () => closeModal() },
        ]
    );
}

function cancelDelete() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

function deleteSelected() {
    const indices = Array.from(selectedLogs).sort((a, b) => b - a);
    indices.forEach(index => {
        logs.splice(index, 1);
    });
    selectedLogs.clear();
    saveLogs();
    renderLogs();
}

function goHome() {
    window.location.href = 'hang-workout.html';
}

function downloadHistory() {
    if (logs.length === 0) {
        showModal(
            'No History',
            'There are no workouts to download yet.',
            [{ label: 'OK', action: () => closeModal() }]
        );
        return;
    }

    const csvContent = exportCSV();
    if (!csvContent) return;

    const filename = getHistoryFilename();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File(['test'], 'test.csv', { type: 'text/csv' })] })) {
        const file = new File([blob], filename, { type: 'text/csv' });
        navigator.share({
            title: 'Abrahangs Workout History',
            text: 'Here is my workout history from Abrahangs.',
            files: [file],
        }).catch(() => {
            saveCSVFile(blob, filename);
        });
    } else {
        saveCSVFile(blob, filename);
    }
}

function saveCSVFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportCSV() {
    let logsToExport = logs;
    if (selectedLogs.size > 0) {
        const indices = Array.from(selectedLogs).sort((a, b) => a - b);
        logsToExport = indices.map(i => logs[i]);
    }

    if (logsToExport.length === 0) return null;

    let csv = 'Hang Name,Date,Completed Reps,Total Reps\n';
    logsToExport.forEach(log => {
        const date = new Date(log.completedAt);
        const dateStr = date.toLocaleString();
        const reps = `${log.completedReps}/${log.totalReps}`;
        const escapedHangName = (log.hangName || '').replace(/"/g, '""');
        const escapedDateStr = dateStr.replace(/"/g, '""');
        const escapedReps = reps.replace(/"/g, '""');
        csv += `${escapedHangName},${escapedDateStr},${escapedReps}\n`;
    });
    return csv;
}

function getHistoryFilename() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '_');
    return `${dateStr}_Abrahangs_history.csv`;
}

function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

function showModal(title, message, actions) {
    closeModal();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const buttonsHTML = actions.map((a, i) => {
        const cls = a.primary ? 'modal-btn primary' : a.cancel ? 'modal-btn cancel' : 'modal-btn';
        return `<button class="${cls}" data-action="${i}">${a.label}</button>`;
    }).join('');

    overlay.innerHTML = `
        <div class="modal">
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="modal-buttons">
                ${buttonsHTML}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelectorAll('.modal-btn').forEach((btn, i) => {
        btn.addEventListener('click', () => {
            actions[i].action();
        });
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal();
        }
    });
}

function toggleSelectAll() {
    const selectAllBtn = document.getElementById('select-all-btn');

    if (selectedLogs.size === logs.length && logs.length > 0) {
        selectedLogs.clear();
    } else {
        selectedLogs.clear();
        logs.forEach((_, index) => selectedLogs.add(index));
    }
    renderLogs();
}

applyDarkMode();
cacheElements();
loadLogs();

const downloadBtn = document.getElementById('download-btn');
if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadHistory);
}

const selectAllBtn = document.getElementById('select-all-btn');
if (selectAllBtn) {
    selectAllBtn.addEventListener('click', toggleSelectAll);
}

const homeBtn = document.getElementById('home-btn');
if (homeBtn) {
    homeBtn.addEventListener('click', goHome);
}

const deleteBtn = document.querySelector('.delete-btn');
if (deleteBtn) {
    deleteBtn.addEventListener('click', confirmDelete);
}

const filterSelect = document.getElementById('filter-select');
if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
        currentFilter = e.target.value === 'all' ? null : e.target.value;
        renderLogs();
    });
}
