// Lens Lab: starts each experiment when it comes near the screen, and runs one animation loop
// that only draws the experiments currently in view.
const RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const LOADERS = {
  hero: () => import('./lens.js?v=1').then((m) => m.mountHero),
  bend: () => import('./lens.js?v=1').then((m) => m.mountBend),
  ring: () => import('./lens.js?v=1').then((m) => m.mountRing),
  sun: () => import('./sun.js?v=1').then((m) => m.mountSun),
  old: () => import('./light.js?v=1').then((m) => m.mountOld),
};

function hasWebGL() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; }
}

if (!hasWebGL()) {
  document.documentElement.classList.add('no-gl');
} else {
  const stages = [];
  document.querySelectorAll('[data-lab]').forEach((el) => stages.push({ el, kind: el.getAttribute('data-lab'), api: null, loading: false, visible: false }));

  let running = false, last = 0;
  function loop(now) {
    const dt = last ? Math.min(now - last, 64) : 16;
    last = now;
    let any = false;
    for (const s of stages) {
      if (!s.visible || !s.api) continue;
      s.api.update(dt, now);
      s.api.render();
      any = true;
    }
    if (any) requestAnimationFrame(loop);
    else { running = false; last = 0; }
  }
  const kick = () => { if (!running) { running = true; requestAnimationFrame(loop); } };

  function start(s) {
    if (s.api || s.loading) return;
    s.loading = true;
    LOADERS[s.kind]().then((mount) => {
      s.api = mount(s.el, RM);
      s.api.resize();
      kick();
    }).catch((err) => {
      console.error('Lens Lab: could not start', s.kind, err);
      s.el.classList.add('failed');
    });
  }

  // which experiments are on (or about to come on) screen; five rectangles, so a scroll check is cheap
  function check() {
    const h = window.innerHeight;
    for (const s of stages) {
      const r = s.el.getBoundingClientRect();
      s.visible = r.bottom > -250 && r.top < h + 250;
      if (s.visible) start(s);
    }
    kick();
  }
  window.addEventListener('scroll', check, { passive: true });
  check();

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { stages.forEach((s) => s.api && s.api.resize()); check(); }, 120);
  });
}
