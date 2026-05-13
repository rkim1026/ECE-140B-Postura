document.addEventListener('DOMContentLoaded', () => {
    // 1. Update live metadata (Date and Greeting)
    updateDashboardMetadata();

    // 2. Initialize Charts with dynamic data from window.DASHBOARD_DATA
    initCharts();

    // 3. Setup UI interactions
    setupTabListeners();
});

/**
 * Handles Date and Time-based Greeting
 */
function updateDashboardMetadata() {
    const dateEl = document.getElementById('current-date');
    const greetingEl = document.getElementById('time-greeting');
    
    if (!dateEl) return;

    const now = new Date();

    // 1. Format the Date (e.g., "May 13")
    const dateOptions = { month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('en-US', dateOptions);
    
    // 2. Update text while preserving the SVG calendar icon
    const icon = dateEl.querySelector('svg');
    dateEl.innerHTML = ''; 
    if (icon) dateEl.appendChild(icon);
    dateEl.append(` ${dateString}`);

    // 3. Dynamic Greeting
    if (greetingEl) {
        const hours = now.getHours();
        if (hours < 12) greetingEl.textContent = "Good morning!";
        else if (hours < 18) greetingEl.textContent = "Good afternoon!";
        else greetingEl.textContent = "Good evening!";
    }
}

/**
 * Creates and updates the Charts
 */
function initCharts() {
    // Access the data sent from the backend via Jinja2
    const stats = window.DASHBOARD_DATA || { 
        donut: [0, 0, 0], 
        line: [], 
        labels: [] 
    };

    // --- DONUT CHART (Today's Score) ---
    const donutCtx = document.getElementById('donutChart')?.getContext('2d');
    if (donutCtx) {
        // Destroy existing instance to prevent flickering
        const existingDonut = Chart.getChart("donutChart");
        if (existingDonut) existingDonut.destroy();

        new Chart(donutCtx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    // Order: [Good, Leaning, Severe]
                    data: stats.donut, 
                    backgroundColor: ['#22c55e', '#eab308', '#ef4444'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                cutout: '75%',
                plugins: { 
                    legend: { display: false }, 
                    tooltip: { enabled: true } 
                },
                animation: { animateRotate: true, duration: 1000 }
            }
        });
    }

    // --- LINE CHART (Posture Quality Over Time) ---
    const lineCtx = document.getElementById('lineChart')?.getContext('2d');
    if (lineCtx) {
        const existingLine = Chart.getChart("lineChart");
        if (existingLine) existingLine.destroy();

        new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: stats.labels,
                datasets: [{
                    label: 'Posture Score',
                    data: stats.line,
                    borderColor: '#3B6EF8',
                    borderWidth: 3,
                    pointRadius: 2,
                    tension: 0.4, // Smooth curves
                    fill: true,
                    // Create the blue gradient fill
                    backgroundColor: (ctx) => {
                        const canvas = ctx.chart.ctx;
                        const gradient = canvas.createLinearGradient(0, 0, 0, 300);
                        gradient.addColorStop(0, 'rgba(59,110,248,0.2)');
                        gradient.addColorStop(1, 'rgba(59,110,248,0)');
                        return gradient;
                    }
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#fff',
                        titleColor: '#1a2035',
                        bodyColor: '#6b7a99',
                        borderColor: '#e4e8f0',
                        borderWidth: 1,
                        callbacks: {
                            label: ctx => ` Score: ${ctx.parsed.y}%`
                        }
                    }
                },
                scales: {
                    x: { 
                        grid: { display: false },
                        ticks: { color: '#9aa3b8', font: { size: 11, family: 'DM Sans' } }
                    },
                    y: { 
                        min: 0, 
                        max: 100, 
                        ticks: { 
                            stepSize: 25, 
                            color: '#9aa3b8', 
                            font: { size: 11, family: 'DM Sans' } 
                        },
                        grid: { color: '#f0f2f7' }
                    }
                }
            }
        });
    }
}

/**
 * Handles Tab Switching for charts (Today vs Week)
 */
function setupTabListeners() {
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            // Logic for switching data ranges can be added here
        });
    });
}