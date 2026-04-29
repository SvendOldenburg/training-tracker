import { db } from '../db.js';

function fmtSplit(secs) {
  if (!secs) return '--';
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function renderHome(container) {
  const [lastSession, lastBW, lastRower, recentSessions] = await Promise.all([
    db.strength_sessions.orderBy('id').last(),
    db.bodyweight.orderBy('id').last(),
    db.rower_sessions.orderBy('id').last(),
    db.strength_sessions.orderBy('id').reverse().limit(5).toArray(),
  ]);

  const nextType = lastSession ? (lastSession.type === 'A' ? 'B' : 'A') : 'A';

  const bwVal = lastBW ? `${lastBW.weight_kg} kg` : '--';
  const bwSub = lastBW ? (lastBW.date === today() ? 'Logged today' : lastBW.date) : 'Not logged';

  let rowerVal = '--';
  let rowerSub = '';
  if (lastRower) {
    rowerVal = `${lastRower.distance_m ?? '--'}m`;
    rowerSub = `${fmtSplit(lastRower.split_s)}/500m  ·  ${lastRower.date}`;
  }

  container.innerHTML = `
    <div class="view">
      <div class="view-title">Train</div>

      <div class="stats-row">
        <div class="card">
          <div class="card-title">Next workout</div>
          <div class="card-value text-accent">${nextType}</div>
          <div class="card-sub">StrongLifts 5x5</div>
        </div>
        <div class="card">
          <div class="card-title">Body weight</div>
          <div class="card-value" style="font-size:22px">${bwVal}</div>
          <div class="card-sub">${bwSub}</div>
        </div>
      </div>

      <div class="card" style="margin-bottom:20px">
        <div class="card-title">Last row</div>
        <div class="card-value" style="font-size:20px">${rowerVal}</div>
        ${rowerSub ? `<div class="card-sub">${rowerSub}</div>` : ''}
      </div>

      <div class="section-label">Quick start</div>
      <div class="quick-actions">
        <a class="quick-action accent" href="#workout">
          <span class="qa-icon">🏋️</span>
          <span>Workout ${nextType}</span>
        </a>
        <a class="quick-action" href="#rower">
          <span class="qa-icon">🚣</span>
          <span>Log Row</span>
        </a>
        <a class="quick-action" href="#kettlebell">
          <span class="qa-icon">🔔</span>
          <span>Kettlebell</span>
        </a>
        <a class="quick-action" href="#bodyweight">
          <span class="qa-icon">⚖️</span>
          <span>Log Weight</span>
        </a>
      </div>

      <div class="section-label">Recent sessions</div>
      ${recentSessions.length === 0
        ? `<div class="empty-state">No sessions yet. Hit the gym.</div>`
        : `<div class="card mb-0">
            ${recentSessions.map(s => {
              const done  = s.exercises.reduce((n, ex) => n + ex.sets.filter(st => st.completed).length, 0);
              const total = s.exercises.reduce((n, ex) => n + ex.sets.length, 0);
              const pct   = total ? Math.round((done / total) * 100) : 0;
              return `
                <div class="history-item">
                  <div>
                    <div class="history-main">Workout ${s.type}</div>
                    <div class="history-sub">${done}/${total} sets&nbsp;&nbsp;${pct}%</div>
                  </div>
                  <div class="history-date">${s.date}</div>
                </div>
              `;
            }).join('')}
          </div>`
      }
    </div>
  `;
}
