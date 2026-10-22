// Chapter 3: the Sun as a telescope. Starlight passing the Sun at impact parameter b is bent by
// 4GM/(c^2 b) and crosses the axis at z = b^2 c^2 / (4GM): 547 AU for light grazing the Sun's edge,
// farther for light passing wider (z grows with b^2), so the focus is a line. Distances along the axis
// are squeezed on a log scale; the sideways bending is exaggerated so it can be seen at all.
import * as THREE from 'three';
import { glowCanvas } from './sky.js';

const FOCUS_AU = 547;
const X = (au) => 1 + 6.2 * Math.log10(1 + au / 3);   // squeezed distance along the axis, from the Sun's surface
const R_SUN = 1.0;                                     // the Sun, drawn very large so the bending shows
const RINGS = [1, 1.18, 1.36, 1.54];                   // impact parameters, in solar radii
const SPOKES = 12;
const START_X = -8, END_X = 21;
const MARKERS = [
  { au: 30, text: 'Neptune · 30 AU' },
  { au: 170, text: 'Voyager 1 · about 170 AU' },
  { au: FOCUS_AU, text: 'Focus begins · 547 AU', key: true },
  { au: 650, text: 'Missions aim · about 650 AU' },
];
const probeAU = (v) => Math.pow(10, (v / 1000) * Math.log10(2000));   // slider 0..1000 -> 1..2000 AU

const RAY_VERT = /* glsl */`
attribute float dist;
varying float vD;
void main() { vD = dist; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const RAY_FRAG = /* glsl */`
uniform float uTime, uPulse;
uniform vec3 uColor;
varying float vD;
void main() {
  float p = pow(0.5 + 0.5 * sin((vD - uTime * 4.0) * 0.9), 10.0) * uPulse;
  gl_FragColor = vec4(uColor * (0.32 + 1.4 * p), 1.0);
}`;

function lightTime(au) {
  const s = au * 499.005;   // light takes about 499 seconds per AU
  if (s < 3600) return Math.round(s / 60) + ' minutes';
  if (s < 86400 * 2) return (s / 3600).toFixed(s < 36000 ? 1 : 0) + ' hours';
  return (s / 86400).toFixed(1) + ' days';
}
function fmtAU(au) { return (au < 10 ? au.toFixed(1) : Math.round(au).toLocaleString('en')) + ' AU'; }

export function mountSun(frame, RM) {
  const canvas = frame.querySelector('canvas');
  const wrap = frame.parentElement;
  const out = (k) => wrap.querySelector(`[data-out="${k}"]`);
  const probe = wrap.querySelector('[data-ctl="probe"]');
  const sunBtn = wrap.querySelector('[data-ctl="sunmode"]');
  const holeBtn = wrap.querySelector('[data-ctl="holemode"]');
  const hint = frame.querySelector('.lab-hint');
  const labelBox = frame.querySelector('.labels');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 300);
  const glowTex = new THREE.CanvasTexture(glowCanvas());
  const glow = (color, scale, opacity = 1) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(scale);
    return s;
  };

  // background stars, far away
  {
    const n = 1400, pos = new Float32Array(n * 3), r = (a) => (Math.sin(a * 12.9898) * 43758.5453) % 1;
    for (let i = 0; i < n; i++) {
      const u = Math.abs(r(i + 1)), v = Math.abs(r(i + 7.3)), th = u * Math.PI * 2, ph = Math.acos(2 * v - 1), R = 120;
      pos.set([R * Math.sin(ph) * Math.cos(th), R * Math.cos(ph), R * Math.sin(ph) * Math.sin(th)], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffe6cc, size: 0.35, transparent: true, opacity: 0.55, depthWrite: false })));
  }

  // the Sun, and the black hole that replaces it in the second view
  const sun = new THREE.Group();
  sun.add(new THREE.Mesh(new THREE.SphereGeometry(R_SUN, 48, 32), new THREE.MeshBasicMaterial({ color: 0xffd8a0 })));
  const sunGlow = glow(0xffa860, 7.5, 0.9);
  sun.add(sunGlow);
  scene.add(sun);
  const hole = new THREE.Group();
  hole.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 48, 32), new THREE.MeshBasicMaterial({ color: 0x000000 })));
  const holeGlow = glow(0xffd2a8, 1.6, 0.9);
  hole.add(holeGlow);
  scene.add(hole);

  // the axis, and the stretch of it where the bent light comes to a focus
  const axisGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(R_SUN, 0, 0), new THREE.Vector3(END_X, 0, 0)]);
  scene.add(new THREE.Line(axisGeo, new THREE.LineBasicMaterial({ color: 0x8f877c, transparent: true, opacity: 0.45 })));
  const focusStart = glow(0xffe0b8, 1.4, 0.0);
  scene.add(focusStart);

  // rays: straight in from a distant star, bent at the lens, crossing the axis, spreading out again
  const nRays = RINGS.length * SPOKES;
  const rayPos = new Float32Array(nRays * 4 * 3), rayDist = new Float32Array(nRays * 4);
  const rayGeo = new THREE.BufferGeometry();
  rayGeo.setAttribute('position', new THREE.BufferAttribute(rayPos, 3));
  rayGeo.setAttribute('dist', new THREE.BufferAttribute(rayDist, 1));
  const rayMat = new THREE.ShaderMaterial({
    vertexShader: RAY_VERT, fragmentShader: RAY_FRAG, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uPulse: { value: RM ? 0 : 1 }, uColor: { value: new THREE.Color(1.0, 0.72, 0.45) } },
  });
  scene.add(new THREE.LineSegments(rayGeo, rayMat));

  function layRays(m) {
    let k = 0;
    RINGS.forEach((b, j) => {
      const h = THREE.MathUtils.lerp(R_SUN * b, 0.36 + 0.1 * j, m);                 // height where the ray passes the lens
      const cross = THREE.MathUtils.lerp(X(FOCUS_AU * b * b), 1.2 + 0.75 * j, m);   // where it meets the axis
      for (let s = 0; s < SPOKES; s++) {
        const a = (s / SPOKES) * Math.PI * 2, cy = Math.cos(a), cz = Math.sin(a);
        const p0 = [START_X, h * cy, h * cz], p1 = [0, h * cy, h * cz];
        const t = END_X / cross;                                                     // carry on past the crossing
        const p2 = [END_X, h * cy * (1 - t), h * cz * (1 - t)];
        const d1 = -START_X, d2 = d1 + Math.hypot(p2[0], p2[1] - p1[1], p2[2] - p1[2]);
        rayPos.set(p0, k * 12); rayPos.set(p1, k * 12 + 3); rayPos.set(p1, k * 12 + 6); rayPos.set(p2, k * 12 + 9);
        rayDist.set([0, d1, d1, d2], k * 4);
        k++;
      }
    });
    rayGeo.attributes.position.needsUpdate = true;
    rayGeo.attributes.dist.needsUpdate = true;
    rayGeo.computeBoundingSphere();
  }

  // the probe
  const probeObj = new THREE.Group();
  probeObj.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshBasicMaterial({ color: 0xfff1de })));
  const probeGlow = glow(0xffc890, 1.0, 0.5);
  probeObj.add(probeGlow);
  scene.add(probeObj);

  // labels, placed over the canvas each frame
  const labels = MARKERS.map((mk) => {
    const el = document.createElement('span');
    el.textContent = mk.text;
    if (mk.key) el.className = 'key';
    labelBox.appendChild(el);
    const tick = glow(mk.key ? 0xef6a5e : 0xcfc7bb, mk.key ? 0.7 : 0.45, 0.9);
    tick.position.set(X(mk.au), 0, 0);
    scene.add(tick);
    return { el, pos: new THREE.Vector3(X(mk.au), 0, 0), tick };
  });
  const probeLabel = document.createElement('span');
  probeLabel.className = 'on';
  probeLabel.textContent = 'Probe';
  labelBox.appendChild(probeLabel);

  // camera: drag to orbit, drifts gently when left alone
  // az, el: how far the reader has turned the view away from the starting angle
  let az = 0, el = 0, lastUse = -1e9, dragging = null, used = false;
  const drag = { x: 0, y: 0, az: 0, el: 0 };
  frame.addEventListener('pointerdown', (e) => {
    dragging = e.pointerId; frame.setPointerCapture(e.pointerId); frame.classList.add('dragging');
    Object.assign(drag, { x: e.clientX, y: e.clientY, az, el });
    lastUse = performance.now();
    if (!used) { used = true; hint.classList.add('gone'); }
  });
  frame.addEventListener('pointermove', (e) => {
    if (e.pointerId !== dragging) return;
    az = drag.az - (e.clientX - drag.x) * 0.006;
    el = THREE.MathUtils.clamp(drag.el + (e.clientY - drag.y) * 0.004, -1.3, 1.1);
    lastUse = performance.now();
  });
  const end = (e) => { if (e.pointerId === dragging) { dragging = null; frame.classList.remove('dragging'); } };
  frame.addEventListener('pointerup', end);
  frame.addEventListener('pointercancel', end);

  // controls
  let mode = 0, m = 0;   // 0 the Sun, 1 the black hole; m eases between them
  const setMode = (v) => { mode = v; sunBtn.setAttribute('aria-pressed', String(v === 0)); holeBtn.setAttribute('aria-pressed', String(v === 1)); updateText(); };
  sunBtn.addEventListener('click', () => setMode(0));
  holeBtn.addEventListener('click', () => setMode(1));
  let au = probeAU(+probe.value);
  function updateText() {
    probe.style.setProperty('--fill', probe.value / 10 + '%');
    probe.disabled = mode === 1;
    if (mode === 1) {
      out('dist').textContent = '—';
      out('lt').textContent = '—';
      out('state').textContent = 'A black hole bends light so hard that its focus begins just beyond it. Line one up with a distant world and the lens is enormous.';
      return;
    }
    out('dist').textContent = fmtAU(au);
    out('lt').textContent = lightTime(au);
    out('state').textContent = au < FOCUS_AU
      ? 'The bent starlight hasn’t met yet. Keep going.'
      : 'In the focus. Here the whole Sun acts as a lens 1.4 million km wide, magnifying distant light about a hundred billion times.';
  }
  probe.addEventListener('input', () => { au = probeAU(+probe.value); updateText(); lastUse = performance.now(); });
  updateText();
  layRays(0);

  const target = new THREE.Vector3(), v = new THREE.Vector3();
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
      const mPrev = m;
      m += (mode - m) * Math.min(1, dt / 260);
      if (Math.abs(m - mPrev) > 1e-4 || t < 100) layRays(m);
      const drift = !RM && t - lastUse > 6000 && dragging === null ? 0.12 * Math.sin(t * 0.00015) : 0;
      rayMat.uniforms.uTime.value = t / 1000;

      sun.scale.setScalar(1 - m * 0.98);
      sun.visible = m < 0.98;
      hole.scale.setScalar(Math.max(0.02, m));
      hole.visible = m > 0.02;
      const px = X(au);
      probeObj.position.set(px, 0, 0);
      probeObj.visible = m < 0.5;
      const inFocus = au >= FOCUS_AU ? 1 : 0;
      probeGlow.material.opacity += ((0.45 + inFocus * 0.55) - probeGlow.material.opacity) * Math.min(1, dt / 200);
      probeGlow.scale.setScalar(1 + inFocus * 1.6 + (RM ? 0 : inFocus * 0.25 * Math.sin(t / 220)));
      focusStart.position.set(THREE.MathUtils.lerp(X(FOCUS_AU), 1.2, m), 0, 0);
      focusStart.material.opacity = 0.9;

      // camera framing: wide for the Sun's long focal line, close in for the black hole
      const portrait = h > w;
      // side-on on wide screens; on tall phones, look along the focal line instead
      const A = (portrait ? 0.95 : 0.16) + az + drift, E = (portrait ? 0.3 : 0.12) + el;
      target.set(THREE.MathUtils.lerp(portrait ? 10.5 : 6.5, 1.8, m), 0, 0);
      const dist = THREE.MathUtils.lerp(portrait ? 47 : 24, portrait ? 13 : 9, m);
      camera.position.set(target.x + dist * Math.cos(E) * Math.sin(A), dist * Math.sin(E), dist * Math.cos(E) * Math.cos(A));
      camera.lookAt(target);

      // labels follow their points; hidden in black-hole mode
      const place = (elm, pos, show, dy) => {
        v.copy(pos).project(camera);
        const on = show && v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
        elm.style.opacity = on ? '1' : '0';
        if (on) elm.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, ${dy})`;
      };
      labels.forEach((lb, i) => { place(lb.el, lb.pos, m < 0.5, i % 2 ? '14px' : 'calc(-100% - 14px)'); lb.tick.visible = m < 0.5; });
      place(probeLabel, probeObj.position, m < 0.5, '22px');
    },
    render() { renderer.render(scene, camera); },
  };
}
