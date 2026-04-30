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
              <label class="form-label">Time (m : ss)</label>
              <div class="time-pair">
                <input class="form-input time-part" type="number" name="time_m"
                  min="0" max="99" placeholder="20" id="timeMins">
                <span class="time-colon">:</span>
                <input class="form-input time-part" type="number" name="time_s"
                  min="0" max="59" placeholder="00" id="timeSecs">
              </div>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Split /500m (m : ss)</label>
              <div class="time-pair">
                <input class="form-input time-part" type="number" name="split_m"
                  min="0" max="9" placeholder="2" id="splitMins">
                <span class="time-colon">:</span>
                <input class="form-input time-part" type="number" name="split_s"
                  min="0" max="59" placeholder="00" id="splitSecs">
              </div>
            </div>
          </div>
          <div class="form-hint">Split auto-calculates from distance + time, or enter manually</div>

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

  const form      = document.getElementById('rowerForm');
  const distInput = document.getElementById('distInput');
  const timeMins  = document.getElementById('timeMins');
  const timeSecs  = document.getElementById('timeSecs');
  const splitMins = document.getElementById('splitMins');
  const splitSecs = document.getElementById('splitSecs');

  function getTimeSecs() {
    const m = parseInt(timeMins.value, 10);
    const s = parseInt(timeSecs.value, 10);
    if (isNaN(m) && isNaN(s)) return null;
    return (isNaN(m) ? 0 : m) * 60 + (isNaN(s) ? 0 : s);
  }

  function getSplitSecs() {
    const m = parseInt(splitMins.value, 10);
    const s = parseInt(splitSecs.value, 10);
    if (isNaN(m) && isNaN(s)) return null;
    return (isNaN(m) ? 0 : m) * 60 + (isNaN(s) ? 0 : s);
  }

  function setSplitFields(totalSecs) {
    const m = Math.floor(totalSecs / 60);
    const s = Math.round(totalSecs % 60);
    splitMins.value = m;
    splitSecs.value = String(s).padStart(2, '0');
  }

  function calcSplit() {
    const dist  = parseFloat(distInput.value);
    const total = getTimeSecs();
    if (dist > 0 && total > 0) {
      setSplitFields((total / dist) * 500);
    }
  }

  distInput.addEventListener('input', calcSplit);
  timeMins.addEventListener('input', calcSplit);
  timeSecs.addEventListener('input', calcSplit);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);

    const durationS = getTimeSecs();
    const splitS    = getSplitSecs();

    await db.rower_sessions.add({
      date:        fd.get('date'),
      stroke_rate: parseFloat(fd.get('stroke_rate')) || null,
      distance_m:  parseFloat(fd.get('distance')) || null,
      duration_s:  durationS,
      split_s:     splitS,
    });

    renderRower(container);
  });
}
