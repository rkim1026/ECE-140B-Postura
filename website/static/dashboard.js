// Chart tab switching
document.querySelectorAll('.chart-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  });
});

// Donut chart
const donutCtx = document.getElementById('donutChart').getContext('2d');
new Chart(donutCtx, {
  type: 'doughnut',
  data: {
    datasets: [{
      data: [77, 18, 5],
      backgroundColor: ['#22c55e', '#eab308', '#ef4444'],
      borderWidth: 0,
      hoverOffset: 4,
    }]
  },
  options: {
    cutout: '72%',
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    animation: { animateRotate: true, duration: 900 }
  }
});

// Line chart
const lineCtx = document.getElementById('lineChart').getContext('2d');
const labels = ['9:00','9:15','9:30','9:45','10:00','10:15','10:30','10:45','11:00','11:15','11:30','11:45'];
const data   = [95, 90, 85, 80, 50, 65, 75, 80, 78, 82, 80, 95];

new Chart(lineCtx, {
  type: 'line',
  data: {
    labels,
    datasets: [{
      data,
      borderColor: '#3B6EF8',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.4,
      fill: true,
      backgroundColor: (ctx) => {
        const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 220);
        gradient.addColorStop(0, 'rgba(59,110,248,0.18)');
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
          label: ctx => ` Score: ${ctx.parsed.y}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9aa3b8', font: { size: 11, family: 'DM Sans' } }
      },
      y: {
        min: 0, max: 100,
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