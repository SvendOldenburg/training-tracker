import { api } from '../api.js';

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

function secsToMins(secs) {
  if (!secs && secs !== 0) return { m: '', s: '' };
  return { m: Math.floor(secs / 60), s: secs % 60 };
}

export async function renderRower(container) {
  const sessions = await api.rower_sessions.list(10);

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
              <input class="form-input" type="number" name="stroke_rate" min="1" max="60" placeholder="24">
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Distance (m)</label>
              <input class="form-input" type="number" name="distance" min="1" placeholder="5000" id="distInput">
            </div>
          </div>

          <div class="form-row mt-3">
            <div class="form-group mb-0">
              <label class="form-label">Time (m : ss)</label>
              <div class="time-pair">
                <input class="form-input time-part" type="number" name="time_m" min="0" max="99" placeholder="20" id="timeMins">
                <span class="time-colon">:</span>
                <input class="form-input time-part" type="number" name="time_s" min="0" max="59" placeholder="00" id="timeSecs">
              </div>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Split /500m (m : ss)</label>
              <div class="time-pair">
                <input class="form-input time-part" type="number" name="split_m" min="0" max="9" placeholder="2" id="splitMins">
                <span class="time-colon">:</span>
                <input class="form-input time-part" type="number" name="split_s" min="0" max="59" placeholder="00" id="splitSecs">
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
        : `<div class="card mb-0" id="rowerHistory">
            ${sessions.map(s => renderSessionRow(s)).join('')}
          </div>`
      }
    </div>
  `;

  wireForm(container);
  wireHistory(container, sessions);
}

function renderSessionRow(s) {
  return `
    <div class="history-item" data-id="${s.id}">
      <div style="flex:1">
        <div class="history-main mono">${s.distance_m ?? '--'}m</div>
        <div class="history-sub">
          ${fmtTime(s.duration_s)}&nbsp;&nbsp;·&nbsp;&nbsp;${fmtSplit(s.split_s)}/500m
          ${s.stroke_rate ? `&nbsp;&nbsp;·&nbsp;&nbsp;${s.stroke_rate} s/m` : ''}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <span class="history-date">${s.date}</span>
        <button class="icon-btn edit-btn" data-id="${s.id}" title="Edit">✏️</button>
        <button class="icon-btn delete-btn" data-id="${s.id}" title="Delete">🗑️</button>
      </div>
    </div>
  `;
}

function renderEditRow(s) {
  const dur = secsToMins(s.duration_s);
  const spl = secsToMins(s.split_s);
  return `
    <div class="history-item edit-row" data-id="${s.id}">
      <div style="flex:1">
        <div class="form-row" style="margin-bottom:8px">
          <div>
            <label class="form-label">Distance (m)</label>
            <input class="form-input edit-dist" type="number" value="${s.distance_m ?? ''}" placeholder="5000">
          </div>
          <div>
            <label class="form-label">Stroke rate</label>
            <input class="form-input edit-stroke" type="number" value="${s.stroke_rate ?? ''}" placeholder="24">
          </div>
        </div>
        <div class="form-row" style="margin-bottom:8px">
          <div>
            <label class="form-label">Time (m:ss)</label>
            <div class="time-pair">
              <input class="form-input time-part edit-tm" type="number" value="${dur.m}" placeholder="20">
              <span class="time-colon">:</span>
              <input class="form-input time-part edit-ts" type="number" value="${dur.s}" placeholder="00">
            </div>
          </div>
          <div>
            <label class="form-label">Split (m:ss)</label>
            <div class="time-pair">
              <input class="form-input time-part edit-sm" type="number" value="${spl.m}" placeholder="2">
              <span class="time-colon">:</span>
              <input class="form-input time-part edit-ss" type="number" value="${spl.s}" placeholder="00">
            </div>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary btn-sm save-edit-btn" data-id="${s.id}" style="width:auto;flex:1">Save</button>
          <button class="btn btn-outline btn-sm cancel-edit-btn" style="width:auto;flex:1">Cancel</button>
        </div>
      </div>
    </div>
  `;
}

function wireHistory(container, sessions) {
  const hist = container.querySelector('#rowerHistory');
  if (!hist) return;

  hist.addEventListener('click', async e => {
    const id = e.target.dataset.id;

    if (e.target.classList.contains('delete-btn')) {
      if (!confirm('Delete this session?')) return;
      await api.rower_sessions.delete(id);
      renderRower(container);
      return;
    }

    if (e.target.classList.contains('edit-btn')) {
      const s = sessions.find(x => x.id === id);
      if (!s) return;
      const row = hist.querySelector(`.history-item[data-id="${id}"]`);
      if (row) row.outerHTML = renderEditRow(s);
      return;
    }

    if (e.target.classList.contains('cancel-edit-btn')) {
      const row = e.target.closest('.edit-row');
      const rid = row.dataset.id;
      const s = sessions.find(x => x.id === rid);
      if (s) row.outerHTML = renderSessionRow(s);
      return;
    }

    if (e.target.classList.contains('save-edit-btn')) {
      const row = e.target.closest('.edit-row');
      const rid = e.target.dataset.id;
      const dist   = parseFloat(row.querySelector('.edit-dist').value) || null;
      const stroke = parseFloat(row.querySelector('.edit-stroke').value) || null;
      const tm = parseInt(row.querySelector('.edit-tm').value, 10);
      const ts = parseInt(row.querySelector('.edit-ts').value, 10);
      const sm = parseInt(row.querySelector('.edit-sm').value, 10);
      const ss = parseInt(row.querySelector('.edit-ss').value, 10);
      const durS = (!isNaN(tm) || !isNaN(ts)) ? (isNaN(tm)?0:tm)*60 + (isNaN(ts)?0:ts) : null;
      const splS = (!isNaN(sm) || !isNaN(ss)) ? (isNaN(sm)?0:sm)*60 + (isNaN(ss)?0:ss) : null;
      await api.rower_sessions.update(rid, { distance_m: dist, stroke_rate: stroke, duration_s: durS, split_s: splS });
      renderRower(container);
    }
  });
}

function wireForm(container) {
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
    return (isNaN(m)?0:m)*60 + (isNaN(s)?0:s);
  }

  function getSplitSecs() {
    const m = parseInt(splitMins.value, 10);
    const s = parseInt(splitSecs.value, 10);
    if (isNaN(m) && isNaN(s)) return null;
    return (isNaN(m)?0:m)*60 + (isNaN(s)?0:s);
  }

  function setSplitFields(totalSecs) {
    splitMins.value = Math.floor(totalSecs / 60);
    splitSecs.value = String(Math.round(totalSecs % 60)).padStart(2, '0');
  }

  function calcSplit() {
    const dist  = parseFloat(distInput.value);
    const total = getTimeSecs();
    if (dist > 0 && total > 0) setSplitFields((total / dist) * 500);
  }

  distInput.addEventListener('input', calcSplit);
  timeMins.addEventListener('input', calcSplit);
  timeSecs.addEventListener('input', calcSplit);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);
    await api.rower_sessions.add({
      date:        fd.get('date'),
      stroke_rate: parseFloat(fd.get('stroke_rate')) || null,
      distance_m:  parseFloat(fd.get('distance')) || null,
      duration_s:  getTimeSecs(),
      split_s:     getSplitSecs(),
    });
    renderRower(container);
  });
}
