const overlay   = document.getElementById('timerOverlay');
const timeEl    = document.getElementById('timerTime');
const ringFg    = document.getElementById('timerRingFg');
const labelEl   = document.getElementById('timerLabel');
const pauseBtn  = document.getElementById('timerPause');
const skipBtn   = document.getElementById('timerSkip');
const plusBtn   = document.getElementById('timerPlus');
const minusBtn  = document.getElementById('timerMinus');

const CIRCUMFERENCE = 301.6; // 2 * π * 48

const state = {
  total: 180,
  remaining: 180,
  paused: false,
  interval: null,
  onComplete: null,
};

function fmt(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function updateDisplay() {
  timeEl.textContent = fmt(state.remaining);
  const pct = state.remaining / state.total;
  ringFg.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct);
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    [0, 0.15, 0.3].forEach(delay => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.35, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.12);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.12);
    });
  } catch (_) {}
}

function tick() {
  if (state.paused) return;
  state.remaining = Math.max(0, state.remaining - 1);
  updateDisplay();
  if (state.remaining === 0) {
    ringFg.classList.add('done');
    clearInterval(state.interval);
    playBeep();
    const cb = state.onComplete;
    setTimeout(() => { hide(); cb?.(); }, 1200);
  }
}

export function show(seconds, label = 'Rest', onComplete = null) {
  clearInterval(state.interval);
  state.total      = seconds;
  state.remaining  = seconds;
  state.paused     = false;
  state.onComplete = onComplete;
  labelEl.textContent   = label;
  pauseBtn.textContent  = 'Pause';
  ringFg.classList.remove('done');
  updateDisplay();
  overlay.classList.remove('hidden');
  state.interval = setInterval(tick, 1000);
}

export function hide() {
  clearInterval(state.interval);
  overlay.classList.add('hidden');
}

plusBtn.addEventListener('click', () => {
  state.remaining = Math.min(state.remaining + 30, 900);
  state.total     = Math.max(state.total, state.remaining);
  updateDisplay();
});

minusBtn.addEventListener('click', () => {
  state.remaining = Math.max(state.remaining - 30, 5);
  updateDisplay();
});

pauseBtn.addEventListener('click', () => {
  state.paused         = !state.paused;
  pauseBtn.textContent = state.paused ? 'Resume' : 'Pause';
});

skipBtn.addEventListener('click', () => {
  const cb = state.onComplete;
  hide();
  cb?.();
});
