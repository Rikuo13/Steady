// Configuration & State
const CONFIG = {
    daysInMonth: 31, // Simplified for demo
    currentDay: new Date().getDate(),
    currentMonth: new Date().toLocaleString('default', { month: 'long' }),
    currentYear: new Date().getFullYear()
};

// Data Management
const STORAGE_KEY = 'steady_habits_data';
const THEME_KEY = 'steady_theme';

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        return JSON.parse(saved);
    }
    // Default Mock Data
    return [
        { id: 1, name: 'Morning Workout', category: 'Health', goal: 20, streak: 12, history: generateRandomHistory() },
        { id: 2, name: 'Reading (30 mins)', category: 'Growth', goal: 15, streak: 5, history: generateRandomHistory() },
        { id: 3, name: 'Drink 2L Water', category: 'Health', goal: 30, streak: 8, history: generateRandomHistory() },
        { id: 4, name: 'Code Project', category: 'Work', goal: 25, streak: 3, history: generateRandomHistory() },
        { id: 5, name: 'Meditation', category: 'Mind', goal: 28, streak: 0, history: generateRandomHistory() }
    ];
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

let habits = loadData();

// Helper: Generate random boolean array for history
function generateRandomHistory() {
    return Array.from({ length: 31 }, (_, i) => {
        return Math.random() > 0.4 ? true : false;
    });
}

function getDailyProgress(dayIndex) {
    if (habits.length === 0) return 0;
    const completed = habits.filter(h => h.history[dayIndex]).length;
    return (completed / habits.length) * 100;
}

// DOM Elements
const tableHead = document.querySelector('#habitTable thead');
const tableBody = document.querySelector('#habitTable tbody');
const globalProgressEl = document.getElementById('globalProgress');
const completedCountEl = document.getElementById('completedCount');
const streakCountEl = document.getElementById('streakCount');
const currentDateEl = document.getElementById('currentDate');
const themeToggleBtn = document.getElementById('themeToggle');

// Modal Elements
const addHabitBtn = document.getElementById('addHabitBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const saveHabitBtn = document.getElementById('saveHabitBtn');
const modalOverlay = document.getElementById('addHabitModal');
const inputs = {
    name: document.getElementById('habitNameInput'),
    category: document.getElementById('habitCategoryInput'),
    goal: document.getElementById('habitGoalInput')
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateDateDisplay();
    renderTable();
    updateStats();
    initCharts();
    setupEventListeners();
});

// Theme Logic
function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem(THEME_KEY, 'light');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem(THEME_KEY, 'dark');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
    // Update chart colors by re-initializing or updating
    if (lineChartInstance) lineChartInstance.destroy();
    if (doughnutChartInstance) doughnutChartInstance.destroy();
    initCharts();
}

function updateDateDisplay() {
    const today = new Date();
    currentDateEl.textContent = `${today.toLocaleDateString('en-US', { weekday: 'long' })}, ${CONFIG.currentMonth} ${today.getDate()}, ${CONFIG.currentYear}`;
}

// Render Table
function renderTable() {
    // Headers
    let headerHTML = `<tr>
        <th style="min-width: 200px; z-index: 30;">Habit</th>
        <th style="min-width: 100px;">Progress</th>`;

    for (let i = 1; i <= CONFIG.daysInMonth; i++) {
        const isToday = i === CONFIG.currentDay;
        const classNames = isToday ? 'class="active-day"' : '';
        headerHTML += `<th ${classNames} style="min-width: 40px; text-align: center;">${i}</th>`;
    }
    headerHTML += `</tr>`;
    tableHead.innerHTML = headerHTML;

    // Rows
    tableBody.innerHTML = '';

    habits.forEach(habit => {
        const tr = document.createElement('tr');

        const completedDays = habit.history.filter(Boolean).length;
        const goalPercent = Math.min(100, Math.round((completedDays / habit.goal) * 100));

        let rowHTML = `
            <td>
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <div>
                        <div class="habit-name">${habit.name}</div>
                        <div class="habit-meta">${habit.category} • Target: ${habit.goal} days</div>
                    </div>
                    <button class="btn-danger-icon" onclick="deleteHabit(${habit.id})" title="Delete Habit">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
            <td>
                <div style="font-weight:bold; font-size: 0.9rem; margin-bottom: 2px;">${completedDays}/${habit.goal}</div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${goalPercent}%"></div>
                </div>
            </td>
        `;

        habit.history.forEach((isDone, index) => {
            const dayNum = index + 1;
            const isToday = dayNum === CONFIG.currentDay;
            const activeClass = isToday ? 'active-day' : '';
            const completedClass = isDone ? 'completed' : '';

            rowHTML += `
                <td class="check-cell ${activeClass} ${completedClass}" onclick="toggleHabit(${habit.id}, ${index})">
                    <div class="status-check">
                        <i class="fa-solid fa-check"></i>
                    </div>
                </td>
            `;
        });

        tr.innerHTML = rowHTML;
        tableBody.appendChild(tr);
    });
}

// Logic: Add / Delete / Toggle
function toggleHabit(habitId, dayIndex) {
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
        habit.history[dayIndex] = !habit.history[dayIndex];
        // Recalculate streak simple logic: count backwards from today
        calculateStreak(habit);
        saveData();
        renderTable();
        updateStats();
        updateCharts();
    }
}

function calculateStreak(habit) {
    let streak = 0;
    // Check from yesterday backwards (or today backwards if today is done)
    // For simplicity, let's just count consecutive days ending at today or yesterday
    // Use a simple loop from today backwards
    const todayIdx = CONFIG.currentDay - 1;
    for (let i = todayIdx; i >= 0; i--) {
        if (habit.history[i]) streak++;
        else break;
    }
    habit.streak = streak;
}

function addNewHabit() {
    const name = inputs.name.value.trim();
    if (!name) return alert('Please enter a habit name');

    const newHabit = {
        id: Date.now(),
        name: name,
        category: inputs.category.value,
        goal: parseInt(inputs.goal.value) || 20,
        streak: 0,
        history: new Array(CONFIG.daysInMonth).fill(false)
    };

    habits.push(newHabit);
    saveData();
    renderTable();
    updateStats();
    updateCharts();
    closeModal();
    inputs.name.value = ''; // Reset
}

// Make globally available for onclick
window.deleteHabit = function (id) {
    if (confirm('Are you sure you want to delete this habit?')) {
        habits = habits.filter(h => h.id !== id);
        saveData();
        renderTable();
        updateStats();
        updateCharts();
    }
}
window.toggleHabit = toggleHabit;

// Modal Logic
function openModal() { modalOverlay.classList.add('open'); }
function closeModal() { modalOverlay.classList.remove('open'); }

function setupEventListeners() {
    addHabitBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    saveHabitBtn.addEventListener('click', addNewHabit);
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Close modal on outside click
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
}

// Stats & Charts
function updateStats() {
    const todayIndex = CONFIG.currentDay - 1;
    const totalHabits = habits.length;

    if (totalHabits === 0) {
        globalProgressEl.textContent = '0%';
        completedCountEl.textContent = '0/0';
        streakCountEl.textContent = '0';
        return;
    }

    const completedToday = habits.filter(h => h.history[todayIndex]).length;

    // Global Progress: Average % of all habits against their monthly goals
    // Or just simple total checks / total possible checks so far
    let totalChecks = 0;
    habits.forEach(h => totalChecks += h.history.filter(Boolean).length);
    const totalPossible = totalHabits * CONFIG.daysInMonth;
    const globalRate = totalPossible > 0 ? Math.round((totalChecks / totalPossible) * 100) : 0;

    globalProgressEl.textContent = `${globalRate}%`;
    completedCountEl.textContent = `${completedToday}/${totalHabits}`;

    const bestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0;
    streakCountEl.textContent = bestStreak;
}

let lineChartInstance = null;
let doughnutChartInstance = null;

function initCharts() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.1)' : '#e2e8f0';

    const ctxLine = document.getElementById('lineChart').getContext('2d');
    const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');

    // Re-create gradient based on theme
    const gradient = ctxLine.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, isDark ? 'rgba(99, 102, 241, 0.5)' : 'rgba(59, 130, 246, 0.5)');
    gradient.addColorStop(1, isDark ? 'rgba(99, 102, 241, 0.0)' : 'rgba(59, 130, 246, 0.0)');

    const primaryColor = isDark ? '#6366f1' : '#3b82f6';

    const commonOptions = {
        responsive: true,
        plugins: {
            legend: { labels: { color: textColor } }
        }
    };

    lineChartInstance = new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: Array.from({ length: CONFIG.daysInMonth }, (_, i) => i + 1),
            datasets: [{
                label: 'Daily Completion %',
                data: getLineChartData(),
                borderColor: primaryColor,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 2
            }]
        },
        options: {
            ...commonOptions,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor }
                }
            }
        }
    });

    doughnutChartInstance = new Chart(ctxDoughnut, {
        type: 'doughnut',
        data: {
            labels: ['Health', 'Work', 'Growth', 'Mind', 'Other'],
            datasets: [{
                data: getCategoryData(),
                backgroundColor: [
                    '#10b981', // Emerald
                    '#6366f1', // Indigo
                    '#f59e0b', // Amber
                    '#ec4899', // Pink
                    '#64748b'  // Gray
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: textColor, padding: 20 } }
            },
            cutout: '70%'
        }
    });
}

function getLineChartData() {
    return Array.from({ length: CONFIG.daysInMonth }, (_, i) => getDailyProgress(i));
}

function getCategoryData() {
    const categories = { 'Health': 0, 'Work': 0, 'Growth': 0, 'Mind': 0, 'Other': 0 };
    habits.forEach(h => {
        const checks = h.history.filter(Boolean).length;
        // Simple fallback
        if (categories[h.category] !== undefined) {
            categories[h.category] += checks;
        } else {
            categories['Other'] += checks;
        }
    });
    return Object.values(categories);
}

function updateCharts() {
    if (!lineChartInstance || !doughnutChartInstance) return;

    lineChartInstance.data.datasets[0].data = getLineChartData();
    lineChartInstance.update();

    doughnutChartInstance.data.datasets[0].data = getCategoryData();
    doughnutChartInstance.update();
}
