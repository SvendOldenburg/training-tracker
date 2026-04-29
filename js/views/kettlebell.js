import { db, KB_EXERCISES } from '../db.js';

function today() {
  return new Date().toISOString().slice(0, 10);
}

let setIdx = 1;

export async function renderKettlebell(container) {
  const sessions = await db.kettlebell_sessions.orderBy('id').reverse().limit(15).toArray();

  setIdx = 1;

  container.innerHTML = `
    <div class="view">
      <div class="view-title">Kettlebell</div>

      <div class="card">
        <form id="kbForm" autocomplete="off">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Date</label>
              <input class="form-input" type="date" name="date" value="${today()}">
            </div>
            <div class="form-group">
              <label class="form-label">Exercise</label>
              <select class="form-select" name="exercise">
                ${KB_EXERCISES.map(e => `<option value="${e}">${e}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-label">Sets</div>
          <div id="kbSets" class="set-builder">
            ${makeSetRow(0)}
          </div>
          <button type="button" class="add-set-btn" id="addSetBtn">+ Add set</button>

          <button class="btn btn-primary mt-4" type="submit">Save Session</button>
        </form>
      </div>

      <div class="section-label">Recent sessions</div>
      ${sessions.length === 0
        ? `<div class="empty-state">No kettlebell sessions yet.</div>`
        : `<div class="card mb-0">
            ${sessions.map(s => {
              const setsStr = s.sets.map(st => `${st.weight_kg}kg×${st.reps}`).join(', ');
              return `
                <div class="history-item">
                  <div>
                    <div class="history-main">${s.exercise}</div>
                    <div class="history-sub">${setsStr}</div>
                  </div>
                  <div class="history-date">${s.date}</div>
                </div>
              `;
            }).join('')}
          </div>`
      }
    </div>
  `;

  const setsEl = document.getElementById('kbSets');

  // Remove first set row button
  setsEl.querySelector('.remove-set-btn').addEventListener('click', e => {
    if (setsEl.querySelectorAll('.set-row').length > 1) {
      e.target.closest('.set-row').remove();
    }
  });

  document.getElementById('addSetBtn').addEventListener('click', () => {
    const row = document.createElement('div');
    row.innerHTML = makeSetRow(setIdx++);
    const el = row.firstElementChild;
    setsEl.appendChild(el);
    el.querySelector('.remove-set-btn').addEventListener('click', ev => {
      if (setsEl.querySelectorAll('.set-row').length > 1) {
        ev.target.closest('.set-row').remove();
      }
    });
  });

  document.getElementById('kbForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form     = e.target;
    const exercise = form.querySelector('[name="exercise"]').value;
    const date     = form.querySelector('[name="date"]').value;

    const sets = [];
    setsEl.querySelectorAll('.set-row').forEach(row => {
      const wInput = row.querySelector('[data-field="weight"]');
      const rInput = row.querySelector('[data-field="reps"]');
      const w = parseFloat(wInput?.value);
      const r = parseInt(rInput?.value, 10);
      if (w > 0 && r > 0) sets.push({ weight_kg: w, reps: r });
    });

    if (sets.length === 0) return;

    await db.kettlebell_sessions.add({ date, exercise, sets });
    renderKettlebell(container);
  });
}

function makeSetRow(idx) {
  return `
    <div class="set-row">
      <span class="set-row-num">Set ${idx + 1}</span>
      <input class="form-input" type="number" step="0.5" min="0"
        placeholder="kg" data-field="weight">
      <input class="form-input" type="number" min="1"
        placeholder="reps" data-field="reps">
      <button type="button" class="remove-set-btn" title="Remove">&times;</button>
    </div>
  `;
}
