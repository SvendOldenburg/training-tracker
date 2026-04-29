import { renderHome }       from './views/home.js';
import { renderWorkout }    from './views/workout.js';
import { renderRower }      from './views/rower.js';
import { renderKettlebell } from './views/kettlebell.js';
import { renderBodyweight } from './views/bodyweight.js';
import { renderHistory }    from './views/history.js';

const container = document.getElementById('view');

const routes = {
  '#home':        renderHome,
  '#workout':     renderWorkout,
  '#rower':       renderRower,
  '#kettlebell':  renderKettlebell,
  '#bodyweight':  renderBodyweight,
  '#history':     renderHistory,
};

function navigate() {
  const hash   = location.hash || '#home';
  const render = routes[hash] || renderHome;

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.hash === hash);
  });

  render(container);
}

window.addEventListener('hashchange', navigate);
navigate();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
