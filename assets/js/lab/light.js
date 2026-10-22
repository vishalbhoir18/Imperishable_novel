// Chapter 4: old light. Things in the sky sit along a path into the distance, placed by how long
// their light takes to reach you (log scale: each tick is ten times farther). Pick one and a pulse
// of light travels from it to you.
import * as THREE from 'three';
import { glowCanvas } from './sky.js';

const HOUR = 1 / 8766, MINUTE = HOUR / 60;
const OBJECTS = [
  { name: 'The Sun', years: 8.3 * MINUTE, color: 0xffc070, size: 2.2,
    note: 'Sunlight is about eight minutes old when it reaches you. If the Sun went dark, you would not know for eight minutes.' },
  { name: 'Neptune', years: 4.2 * HOUR, color: 0xe8ddd0, size: 1.0,
    note: 'Sunlight bouncing off Neptune is about four hours old by the time it reaches you.' },
  { name: 'Voyager 1', years: 23 * HOUR, color: 0xffe6cc, size: 0.8,
    note: 'Radio signals from Voyager 1, the most distant probe ever launched, take almost a day to arrive.' },
  { name: 'Proxima Centauri', years: 4.24, color: 0xff9a70, size: 1.3,
    note: 'The nearest star to the Sun. You see it as it was 4.2 years ago.' },
  { name: 'Sirius', years: 8.6, color: 0xfff4ea, size: 1.6,
    note: 'The brightest star in the night sky. You see it as it was 8.6 years ago.' },
  { name: 'Betelgeuse', years: 550, color: 0xff8a5a, size: 1.9,
    note: 'The red shoulder of Orion, about 550 light-years away. If it has already exploded, the news is still on its way.' },
  { name: 'The galactic centre', years: 26000, color: 0xffd8a8, size: 2.6,
    note: 'The heart of our own galaxy, hidden behind dust. Its light set out about 26,000 years ago.' },
  { name: 'Large Magellanic Cloud', years: 160000, color: 0xf6e6d6, size: 2.4,
    note: 'A small galaxy orbiting our own. Its light is about 160,000 years old.' },
  { name: 'Imperishable', years: 2.5e6, color: 0xef6a5e, size: 2.6, key: true,
    note: 'Two and a half million light-years: the distance at the heart of the novel.' },
  { name: 'The most distant galaxies', years: 1.34e10, color: 0xffd0a0, size: 2.2,
    note: 'Seen by the Webb telescope. Their light set out over 13 billion years ago, not long after the universe began.' },
];
const LOG_MIN = -5.2, LOG_MAX = 10.3, STEP = 5.5;
const Z = (years) => -(Math.log10(years) - LOG_MIN) * STEP;      // squeezed distance along the path
const TICKS = [
  { log: Math.log10(HOUR), text: '1 hour' }, { log: Math.log10(24 * HOUR), text: '1 day' }, { log: 0, text: '1 year' },
  { log: 3, text: '1,000 years' }, { log: 6, text: '1 million years' }, { log: 9, text: '1 billion years' },
];

export function fmtYears(y) {
  const n = (v, d = 1) => (v >= 10 || d === 0 ? Math.round(v).toLocaleString('en') : v.toFixed(d).replace(/\.0$/, ''));
  if (y < HOUR) return n(y / MINUTE) + ' minutes';
  if (y < 2 / 365) return n(y / HOUR) + (y / HOUR < 1.5 ? ' hour' : ' hours');
  if (y < 1) return n(y * 365) + ' days';
  if (y < 1000) return n(y) + (y < 1.5 ? ' year' : ' years');
  if (y < 1e6) return n(y / 1000) + ' thousand years';
  if (y < 1e9) return n(y / 1e6) + ' million years';
  return n(y / 1e9) + ' billion years';
}

export function mountOld(frame, RM) {
  const canvas = frame.querySelector('canvas');
  const wrap = frame.parentElement;
  const out = (k) => wrap.querySelector(`[data-out="${k}"]`);
  const far = wrap.querySelector('[data-ctl="far"]');
  const labelBox = frame.querySelector('.labels');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050405, 30, 75);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  const glowTex = new THREE.CanvasTexture(glowCanvas());
  const sprite = (color, scale, opacity = 1) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    s.scale.setScalar(scale);
    return s;
  };

  // a field of faint stars around the path
  {
    const n = 2600, pos = new Float32Array(n * 3);
    let s = 12345;
    const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < n; i++) pos.set([(rnd() - 0.5) * 90, (rnd() - 0.5) * 50, 12 - rnd() * 110], i * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xf3e2cf, size: 0.12, transparent: true, opacity: 0.7, depthWrite: false })));
  }

  // the path and its decade ticks
  const zEnd = Z(Math.pow(10, LOG_MAX));
  const pathGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1, 6), new THREE.Vector3(0, -1, zEnd)]);
  scene.add(new THREE.Line(pathGeo, new THREE.LineBasicMaterial({ color: 0xd9483e, transparent: true, opacity: 0.6 })));
  const tickPts = [];
  for (let d = Math.ceil(LOG_MIN); d <= LOG_MAX; d++) { const z = -(d - LOG_MIN) * STEP; tickPts.push(new THREE.Vector3(-0.35, -1, z), new THREE.Vector3(0.35, -1, z)); }
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tickPts), new THREE.LineBasicMaterial({ color: 0x8f877c, transparent: true, opacity: 0.7 })));

  // the objects
  const objs = OBJECTS.map((o, i) => {
    const side = i % 2 ? 1 : -1;
    const pos = new THREE.Vector3(side * (1.2 + (i % 3) * 0.5), 0.4 + (i % 3) * 0.55, Z(o.years));
    const glow = sprite(o.color, o.size, 0.95);
    glow.position.copy(pos);
    scene.add(glow);
    const el = document.createElement('span');
    el.textContent = o.name;
    if (o.key) el.className = 'key';
    labelBox.appendChild(el);
    return { ...o, pos, glow, el };
  });
  const tickLabels = TICKS.map((tk) => {
    const el = document.createElement('span');
    el.className = 'tick';
    el.textContent = tk.text;
    labelBox.appendChild(el);
    return { el, pos: new THREE.Vector3(0.5, -1, -(tk.log - LOG_MIN) * STEP) };
  });

  // a pulse of light that travels from the chosen object to you
  const pulse = sprite(0xffe8cc, 0.9, 0);
  scene.add(pulse);
  let pulseT = 1;

  // chips for each object
  const chipBox = out('objs');
  objs.forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = o.name;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => choose(i, true));
    chipBox.appendChild(b);
    o.chip = b;
  });

  const logOf = (v) => LOG_MIN + (v / 1000) * (LOG_MAX - LOG_MIN);
  let current = -1, look = logOf(+far.value), lookShown = look;
  function choose(i, fromChip) {
    current = i;
    objs.forEach((o, k) => { o.chip.setAttribute('aria-pressed', String(k === i)); o.el.classList.toggle('on', k === i); });
    const o = objs[i];
    out('name').textContent = o.name;
    out('time').textContent = fmtYears(o.years);
    out('note').textContent = o.note;
    if (fromChip) {
      look = Math.log10(o.years);
      far.value = Math.round(((look - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 1000);
    }
    far.style.setProperty('--fill', far.value / 10 + '%');
    pulseT = RM ? 1 : 0;
  }
  far.addEventListener('input', () => {
    look = logOf(+far.value);
    far.style.setProperty('--fill', far.value / 10 + '%');
    // snap the readout to the nearest object when the slider is close to it
    let best = -1, bd = 1e9;
    objs.forEach((o, k) => { const d = Math.abs(Math.log10(o.years) - look); if (d < bd) { bd = d; best = k; } });
    if (bd < 0.35) { if (best !== current) choose(best, false); }
    else {
      current = -1;
      objs.forEach((o) => { o.chip.setAttribute('aria-pressed', 'false'); o.el.classList.remove('on'); });
      out('name').textContent = 'Looking out';
      out('time').textContent = fmtYears(Math.pow(10, look));
      out('note').textContent = 'Light from this far out set out ' + fmtYears(Math.pow(10, look)) + ' ago.';
    }
  });
  choose(3, true);

  const v = new THREE.Vector3();
  let w = 1, h = 1;
  return {
    resize() {
      w = canvas.clientWidth; h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    update(dt, t) {
      lookShown += (look - lookShown) * Math.min(1, dt / (RM ? 1 : 420));
      const zc = -(lookShown - LOG_MIN) * STEP;
      const portrait = h > w;
      camera.position.set(portrait ? 2.4 : 3.6, portrait ? 2.6 : 2.2, zc + (portrait ? 13 : 10));
      camera.lookAt(0, 0.2, zc - 5);
      const twinkle = RM ? 0 : 0.06;
      objs.forEach((o, k) => {
        const on = k === current;
        o.glow.scale.setScalar(o.size * (on ? 1.15 : 0.75) * (1 + twinkle * Math.sin(t / 400 + k)));
        o.glow.material.opacity = on ? 1 : 0.75;
      });
      if (current >= 0 && !RM) {
        pulseT += dt / 1600;
        if (pulseT > 1.6) pulseT = 0;
        const k = Math.min(pulseT, 1), e = 1 - Math.pow(1 - k, 2);
        pulse.position.lerpVectors(objs[current].pos, camera.position.clone().add(new THREE.Vector3(0, -1.2, -3)), e);
        pulse.material.opacity = k < 1 ? 0.95 * (1 - k * 0.6) : 0;
      } else pulse.material.opacity = 0;

      const place = (elm, pos, dy) => {
        v.copy(pos).project(camera);
        const on = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
        const fade = on ? Math.max(0, Math.min(1, (camera.position.z - pos.z) / 6)) * Math.max(0, Math.min(1, 1.5 - (camera.position.z - pos.z) / 28)) : 0;
        elm.style.opacity = fade.toFixed(2);
        if (fade > 0) elm.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, ${dy})`;
      };
      objs.forEach((o) => place(o.el, o.pos, 'calc(-100% - 12px)'));
      tickLabels.forEach((tk) => place(tk.el, tk.pos, '6px'));
    },
    render() { renderer.render(scene, camera); },
  };
}
