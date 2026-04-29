import { db } from '../db.js';

let ChartJS = null;

async function getChart() {
  if (!ChartJS) {
    const { Chart, registerables } = await import('https://cdn.jsdelivr.net/npm/chart.js@4/+esm');
    Chart.register(...registerables);
    ChartJS = Chart;
  }
  return ChartJS;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function renderBodyweight(container) {
  const all     = await db.bodyweight.orderBy('date').toArray();
  const recent  = [...all].reverse().slice(0, 30);
  const chartPts = all.slice(-30);

  container.innerHTML = `
    <div class="view">
      <div class="view-title">Body Weight</div>

      <div class="card">
        <form id="bwForm" autocomplete="off">
          <div class="form-row">
            <div class="form-group mb-0">
              <label class="form-label">Date</label>
              <input class="form-input" type="date" name="date" value="${today()}">
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Weight (kg)</label>
              <input class="form-input" type="number" step="0.1" min="20" max="300"
                name="weight" placeholder="80.0">
            </div>
          </div>
          <button class="btn btn-primary mt-4" type="submit">Log Weight</button>
        </form>
      </div>

      ${chartPts.length > 1 ? `
        <div class="section-label">30-day trend</div>
        <div class="card">
          <div class="chart-wrap"><canvas id="bwChart"></canvas></div>
        </div>
      ` : ''}

      <div class="section-label">History</div>
      ${recent.length === 0
        ? `<div class="empty-state">No body weight logged yet.</div>`
        : `<div class="card mb-0">
            ${recent.map(e => `
              <div class="history-item">
                <div class="history-main mono bold">${e.weight_kg} kg</div>
                <div class="history-date">${e.date}</div>
              </div>
            `).join('')}
          </div>`
      }
    </div>
  `;

  if (chartPts.length > 1) {
    const Chart = await getChart();
    const ctx   = document.getElementById('bwChart')?.getContext('2d');
    if (ctx) {
      new Chart(ctx, {
        type: 'line',
        data: {
          labels:   chartPts.map(e => e.date.slice(5)),
          datasets: [{
            data:            chartPts.map(e => e.weight_kg),
            borderColor:     '#22c55e',
            backgroundColor: 'rgba(34,197,94,0.08)',
            tension:         0.35,
            pointRadius:     3,
            pointBackgroundColor: '#22c55e',
          }],
        },
        options: chartOptions(),
      });
    }
  }

  document.getElementById('bwForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form   = e.target;
    const date   = form.querySelector('[name="date"]').value;
    const weight = parseFloat(form.querySelector('[name="weight"]').value);
    if (!weight) return;

    const existing = await db.bodyweight.where('date').equals(date).first();
    if (existing) {
      await db.bodyweight.update(existing.id, { weight_kg: weight });
    } else {
      await db.bodyweight.add({ date, weight_kg: weight });
    }

    renderBodyweight(container);
  });
}

function chartOptions() {
  const gridColor = '#272727';
  const tickColor = '#888';
  return {
    responsive:          true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11 } } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor } },
    },
  };
}
