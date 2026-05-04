import { api } from '../api.js';

let ChartJS     = null;
let chartInst   = null;
let activeTab   = 'Squat';
let activeRange = '3M';

const LIFTS = ['Squat', 'Bench Press', 'Barbell Row', 'Overhead Press', 'Deadlift'];

async function getChart() {
  if (!ChartJS) {
    const { Chart, registerables } = await import('https://cdn.jsdelivr.net/npm/chart.js@4/+esm');
    Chart.register(...registerables);
    ChartJS = Chart;
  }
  return ChartJS;
}

function getCutoff(range) {
  const d = new Date();
  if (range === '4W') { d.setDate(d.getDate() - 28);  return d.toISOString().slice(0, 10); }
  if (range === '3M') { d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10); }
  return null;
}

async function getChartData(tab, cutoff) {
  if (tab === 'bodyweight') {
    const entries = await api.bodyweight.listAsc(cutoff);
    return {
      labels: entries.map(e => e.date.slice(5)),
      values: entries.map(e => e.weight_kg),
      unit:   'kg',
    };
  }

  if (tab === 'rower') {
    const sessions = await api.rower_sessions.listAsc(cutoff);
    return {
      labels: sessions.map(s => s.date.slice(5)),
      values: sessions.map(s => s.split_s ? +s.split_s.toFixed(1) : null),
      unit:   's/500m',
      lower:  true,
    };
  }

  const sessions = await api.strength_sessions.listAsc(cutoff);
  const points = [];
  sessions.forEach(s => {
    const ex = s.exercises?.find(e => e.name === tab);
    if (ex) points.push({ date: s.date, weight: ex.weight_kg });
  });

  return {
    labels: points.map(p => p.date.slice(5)),
    values: points.map(p => p.weight),
    unit:   'kg',
  };
}

function chartOptions() {
  const gridColor = '#272727';
  const tickColor = '#888';
  return {
    responsive:          true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: c => `${c.raw} ${c.dataset.unit ?? ''}` },
      },
    },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11 }, maxTicksLimit: 8 } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor } },
    },
  };
}

async function renderChart(container) {
  const Chart  = await getChart();
  const cutoff = getCutoff(activeRange);
  const data   = await getChartData(activeTab, cutoff);

  if (chartInst) { chartInst.destroy(); chartInst = null; }

  const chartEl = document.getElementById('historyChart');
  if (!chartEl) return;

  const statsEl = container.querySelector('#historyStats');
  const nonNull = data.values.filter(v => v != null);
  if (statsEl && nonNull.length > 0) {
    const best = data.lower ? Math.min(...nonNull) : Math.max(...nonNull);
    const bestLabel = data.lower ? 'Best split' : 'PR';
    statsEl.innerHTML = `
      <div class="card pr-card" style="margin-bottom:20px">
        <span class="text-muted" style="font-size:13px">${bestLabel}</span>
        <span class="mono bold text-accent" style="font-size:20px">${best} ${data.unit}</span>
      </div>
    `;
  } else if (statsEl) {
    statsEl.innerHTML = '';
  }

  const emptyEl = document.getElementById('chartEmpty');
  if (data.labels.length === 0) {
    if (chartEl) chartEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = '';
    return;
  }
  if (chartEl) chartEl.style.display = '';
  if (emptyEl) emptyEl.style.display = 'none';

  const ctx = chartEl.getContext('2d');
  chartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels:   data.labels,
      datasets: [{
        data:            data.values,
        borderColor:     '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.08)',
        tension:         0.3,
        pointRadius:     4,
        pointBackgroundColor: '#22c55e',
        spanGaps:        true,
        unit:            data.unit,
      }],
    },
    options: chartOptions(),
  });
}

export async function renderHistory(container) {
  container.innerHTML = `
    <div class="view">
      <div class="view-title">Progress</div>

      <div class="chart-tabs" id="chartTabs">
        ${LIFTS.map(l => `
          <button class="chart-tab ${l === activeTab ? 'active' : ''}" data-lift="${l}">${l}</button>
        `).join('')}
        <button class="chart-tab ${activeTab === 'bodyweight' ? 'active' : ''}"
          data-lift="bodyweight">Body Weight</button>
        <button class="chart-tab ${activeTab === 'rower' ? 'active' : ''}"
          data-lift="rower">Row Split</button>
      </div>

      <div class="range-tabs" id="rangeTabs">
        ${['4W', '3M', 'All'].map(r => `
          <button class="range-tab ${r === activeRange ? 'active' : ''}" data-range="${r}">${r}</button>
        `).join('')}
      </div>

      <div id="historyStats"></div>

      <div class="card mb-0">
        <div class="chart-wrap"><canvas id="historyChart"></canvas></div>
        <div id="chartEmpty" class="chart-empty" style="display:none">No data yet</div>
      </div>
    </div>
  `;

  await renderChart(container);

  container.querySelector('#chartTabs').addEventListener('click', async e => {
    const btn = e.target.closest('.chart-tab');
    if (!btn) return;
    activeTab = btn.dataset.lift;
    container.querySelectorAll('.chart-tab').forEach(b =>
      b.classList.toggle('active', b.dataset.lift === activeTab));
    await renderChart(container);
  });

  container.querySelector('#rangeTabs').addEventListener('click', async e => {
    const btn = e.target.closest('.range-tab');
    if (!btn) return;
    activeRange = btn.dataset.range;
    container.querySelectorAll('.range-tab').forEach(b =>
      b.classList.toggle('active', b.dataset.range === activeRange));
    await renderChart(container);
  });
}
