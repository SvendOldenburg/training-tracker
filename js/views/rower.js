import { db } from '../db.js';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmtTime(secs) {
  if (!secs && secs !== 0) return '--';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtSplit(secs) {
  if (!secs && secs !== 0) return '--';
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function parseTime(str) {
  if (!str || !str.includes(':')) return null;
  const parts = str.split(':');
  if (parts.length !== 2) return null;
  const m = parseInt(parts[0], 10);
  const s = parseInt(parts[1], 10);
  if (isNaN(m) || isNaN(s) || s >= 60) return null;
  return m * 60 + s;
}

export async function renderRower(container) {
  const sessions = await db.rower_sessions.orderBy('id').reverse().limit(10).toArray();

  container.innerHTML = `
    <div class="view">
      <div class="view-title">Rower</div>

      <div class="card">
        <form id="rowerForm" autocomplete="off">
          <div class="form-group">
            <label class="form-label">Date</label>
            <input class="form-input" type="date" name="date" value="${today()}" required>
          </div>

          <div class="form-row">
            <div class="form-group mb-0">
              <label class="form-label">Stroke rate (s/m)</label>
              <input class="form-input" type="number" name="stroke_rate"
                min="1" max="60" placeholder="24">
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Distance (m)</label>
              <input class="form-input" type="number" name="distance"
                min="1" placeholder="5000" id="distInput">
            </div>
          </div>

          <div class="form-row mt-3">
            <div class="form-group mb-0">
              <label class="form-label">Time (m:ss)</label>
              <input class="form-input" type="text" name="time"
                placeholder="20:00" id="timeInput" inputmode="numeric">
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Split /500m</label>
              <input class="form-input" type="text" name="split"
                placeholder="2:00" id="splitDisplay" readonly>
            </div>
          </div>
          <div class="form-hint">Split auto-calculates from distance + time</div>

          <button class="btn btn-primary mt-4" type="submit">Save Session</button>
        </form>
      </div>

      <div class="section-label">Recent sessions</div>
      ${sessions.length === 0
        ? `<div class="empty-state">No rower sessions yet.</div>`
        : `<div class="card mb-0">
            ${sessions.map(s => `
              <div class="history-item">
                <div>
                  <div class="history-main mono">${s.distance_m ?? '--'}m</div>
                  <div class="history-sub">
                    ${fmtTime(s.duration_s)}&nbsp;&nbsp;·&nbsp;&nbsp;${fmtSplit(s.split_s)}/500m
                    ${s.stroke_rate ? `&nbsp;&nbsp;·&nbsp;&nbsp;${s.stroke_rate} s/m` : ''}
                  </div>
                </div>
                <div class="history-date">${s.date}</div>
              </div>
            `).join('')}
          </div>`
      }
    </div>
  `;

  const form       = document.getElementById('rowerForm');
  const distInput  = document.getElementById('distInput');
  const timeInput  = document.getElementById('timeInput');
  const splitDisp  = document.getElementById('splitDisplay');

  let splitSecs = null;

  function calcSplit() {
    const dist  = parseFloat(distInput.value);
    const total = parseTime(timeInput.value);
    if (dist > 0 && total > 0) {
      splitSecs           = (total / dist) * 500;
      splitDisp.value     = fmtSplit(splitSecs);
    } else {
      splitSecs       = null;
      splitDisp.value = '';
    }
  }

  distInput.addEventListener('input', calcSplit);
  timeInput.addEventListener('input', calcSplit);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);

    await db.rower_sessions.add({
      date:        fd.get('date'),
      stroke_rate: parseFloat(fd.get('stroke_rate')) || null,
      distance_m:  parseFloat(fd.get('distance')) || null,
      duration_s:  parseTime(fd.get('time')),
      split_s:     splitSecs,
    });

    renderRower(container);
  });
}
