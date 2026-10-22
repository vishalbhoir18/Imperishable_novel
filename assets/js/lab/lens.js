// Real-time gravitational lensing for the hero, chapter 1 (bending) and chapter 2 (Einstein ring).
// Every pixel is traced back through a point-mass lens with the thin-lens equation
//     beta = theta - thetaE^2 * theta / |theta|^2
// and coloured by whatever lies at beta behind the lens. Arcs, double images and rings all
// follow from that one line; nothing is drawn on top except guides and the lens galaxy's own glow.
import * as THREE from 'three';
import { galaxyField } from './sky.js';

const VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = /* glsl */`
varying vec2 vUv;
uniform sampler2D uBg;
uniform float uAspect, uThetaE, uSrcR, uSrcOn, uBgGain, uBgScale, uShadow, uGuide, uPx, uMarker, uLensGlow;
uniform vec2 uLens, uSrc, uBgOffset;
const float TAU = 6.2831853;
float line(float d, float w) { return 1.0 - smoothstep(w, w + uPx * 1.5, abs(d)); }
float dashes(vec2 d, float n) { return step(0.42, fract(atan(d.y, d.x) / TAU * n)); }
void main() {
  // view units: y runs -1..1, x is scaled by the aspect ratio
  vec2 p = vec2((vUv.x - 0.5) * 2.0 * uAspect, (vUv.y - 0.5) * 2.0);
  vec2 d = p - uLens;
  float r2 = max(dot(d, d), 1e-7), r = sqrt(r2);
  vec2 beta = p - uThetaE * uThetaE * d / r2;          // where this pixel's light really came from
  vec3 col = texture2D(uBg, beta * uBgScale + uBgOffset).rgb * uBgGain;
  if (uSrcOn > 0.5) {                                   // one bright galaxy, placed by the reader
    float s = length(beta - uSrc) / uSrcR;
    col += vec3(1.0, 0.86, 0.64) * (exp(-s * s) * 1.6 + exp(-s * s * 0.12) * 0.22);
  }
  if (uLensGlow > 0.0) {                                // the lens galaxy's own light (in front, not bent)
    float g = r / 0.1;
    col += vec3(1.0, 0.8, 0.6) * uLensGlow * (exp(-g * g) + 0.3 * exp(-g * g * 0.07));
  }
  if (uShadow > 0.0) {                                  // a black hole: its shadow and photon ring
    col *= smoothstep(uShadow, uShadow + uPx * 2.0, r);
    float e = (r - uShadow * 1.06) / (uShadow * 0.07);
    col += vec3(1.0, 0.88, 0.74) * exp(-e * e) * 0.75;
  }
  if (uGuide > 0.0) col = mix(col, vec3(0.94, 0.42, 0.37), uGuide * 0.9 * line(r - uThetaE, uPx * 0.6) * dashes(d, 56.0));
  if (uMarker > 0.0) {
    vec2 m = p - uSrc;
    col = mix(col, vec3(0.96, 0.9, 0.82), uMarker * 0.75 * line(length(m) - uSrcR * 2.4, uPx * 0.6) * dashes(m, 18.0));
  }
  gl_FragColor = vec4(col, 1.0);
}`;

function createLensView(canvas, field) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  const tex = new THREE.CanvasTexture(galaxyField(field));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const u = {
    uBg: { value: tex }, uAspect: { value: 1 }, uThetaE: { value: 0.3 }, uLens: { value: new THREE.Vector2() },
    uSrc: { value: new THREE.Vector2(9, 9) }, uSrcR: { value: 0.05 }, uSrcOn: { value: 0 }, uBgGain: { value: 1 },
    uBgScale: { value: 0.25 }, uBgOffset: { value: new THREE.Vector2(0.37, 0.61) }, uShadow: { value: 0 },
    uGuide: { value: 0 }, uPx: { value: 0.002 }, uMarker: { value: 0 }, uLensGlow: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: u, depthTest: false, depthWrite: false });
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  const camera = new THREE.Camera();
  return {
    u,
    resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      u.uAspect.value = w / h;
      u.uPx.value = 2 / (h * renderer.getPixelRatio());
    },
    render() { renderer.render(scene, camera); },
    // screen point -> view units, and the size of one CSS pixel in view units
    toView(x, y) {
      const b = canvas.getBoundingClientRect();
      return new THREE.Vector2(((x - b.left) / b.width - 0.5) * 2 * (b.width / b.height), -((y - b.top) / b.height - 0.5) * 2);
    },
    pxToView() { return 2 / canvas.getBoundingClientRect().height; },
  };
}

// Drag a handle around a frame. On touch, a drag only takes over the page when it starts near the
// handle, so a finger elsewhere still scrolls; with a mouse, a press anywhere moves the handle there.
function draggable(frame, view, getHandle, setHandle, onUse) {
  let active = null;
  function near(x, y, reachPx) { return view.toView(x, y).distanceTo(getHandle()) < reachPx * view.pxToView(); }
  frame.addEventListener('touchstart', (e) => { if (e.touches.length === 1 && near(e.touches[0].clientX, e.touches[0].clientY, 70)) e.preventDefault(); }, { passive: false });
  frame.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' && !near(e.clientX, e.clientY, 70)) return;
    active = e.pointerId;
    frame.setPointerCapture(e.pointerId);
    frame.classList.add('dragging');
    setHandle(view.toView(e.clientX, e.clientY));
    onUse();
  });
  frame.addEventListener('pointermove', (e) => { if (e.pointerId === active) { setHandle(view.toView(e.clientX, e.clientY)); onUse(); } });
  const end = (e) => { if (e.pointerId === active) { active = null; frame.classList.remove('dragging'); } };
  frame.addEventListener('pointerup', end);
  frame.addEventListener('pointercancel', end);
}

function sliderFill(input) { input.style.setProperty('--fill', ((input.value - input.min) / (input.max - input.min)) * 100 + '%'); }
function toggle(btn, on) { btn.setAttribute('aria-pressed', String(on)); }

// ── hero: a black hole that follows the pointer, and drifts on its own when left alone ──
export function mountHero(section, RM) {
  const view = createLensView(section.querySelector('canvas'), { seed: 11, galaxies: 130 });
  const u = view.u;
  u.uThetaE.value = 0.36;
  u.uShadow.value = 0.125;
  const pos = new THREE.Vector2(0.45, 0.25), aim = pos.clone();
  let lastUse = -1e9;
  const steer = (e) => { aim.copy(view.toView(e.clientX, e.clientY)); lastUse = performance.now(); };
  section.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || e.pressure > 0) steer(e); });
  section.addEventListener('pointerdown', steer);
  return {
    resize: view.resize,
    update(dt, t) {
      if (!RM && t - lastUse > 3500) aim.set(Math.sin(t * 0.00019) * 0.6 * Math.min(u.uAspect.value, 1.6), 0.18 + Math.sin(t * 0.00031 + 1.0) * 0.32);
      pos.lerp(aim, 1 - Math.exp(-dt / 260));
      u.uLens.value.copy(pos);
      if (!RM) u.uBgOffset.value.x = 0.37 + t * 0.0000018;
    },
    render: view.render,
  };
}

// ── chapter 1: drag a lens across the galaxies ──
export function mountBend(frame, RM) {
  const view = createLensView(frame.querySelector('canvas'), { seed: 3, galaxies: 120 });
  const u = view.u;
  const wrap = frame.parentElement;
  const mass = wrap.querySelector('[data-ctl="mass"]');
  const guideBtn = wrap.querySelector('[data-ctl="guide"]');
  const pathsBtn = wrap.querySelector('[data-ctl="paths"]');
  const inset = frame.querySelector('.inset');
  const hint = frame.querySelector('.lab-hint');
  const lens = new THREE.Vector2(-0.3, 0.1);
  let lastUse = -1e9, guide = true, paths = false, used = false;
  const use = () => { lastUse = performance.now(); if (!used) { used = true; hint.classList.add('gone'); } };
  draggable(frame, view, () => lens, (v) => lens.copy(v), use);
  const setMass = () => { u.uThetaE.value = 0.07 + (mass.value / 100) * 0.45; sliderFill(mass); };
  mass.addEventListener('input', () => { setMass(); use(); });
  setMass();
  guideBtn.addEventListener('click', () => { guide = !guide; toggle(guideBtn, guide); });
  pathsBtn.addEventListener('click', () => { paths = !paths; toggle(pathsBtn, paths); inset.classList.toggle('on', paths); });
  return {
    resize: view.resize,
    update(dt, t) {
      if (!RM && t - lastUse > 7000) {
        const a = Math.min(u.uAspect.value, 1.7);
        lens.lerp(new THREE.Vector2(Math.sin(t * 0.00017) * 0.7 * a, Math.sin(t * 0.00029) * 0.45), 1 - Math.exp(-dt / 900));
      }
      u.uLens.value.copy(lens);
      u.uGuide.value += ((guide ? 1 : 0) - u.uGuide.value) * Math.min(1, dt / 150);
      if (paths) drawPaths(inset, u.uThetaE.value);
    },
    render: view.render,
  };
}

// Side view of the same lens: light from the galaxies bends around the mass on its way to you.
function drawPaths(cv, thetaE) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const mid = h * 0.57, xs = 20, xl = w * 0.5, xo = w - 22, k = 34 * thetaE * thetaE;
  g.font = '11px system-ui, -apple-system, sans-serif';
  g.textAlign = 'center';
  g.fillStyle = 'rgba(207,199,187,0.85)';
  g.fillText('galaxies', xs + 18, 16);
  g.fillText('lens', xl, 16);
  g.fillText('you', xo, 16);
  g.strokeStyle = 'rgba(243,238,230,0.14)';
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(xs, 24); g.lineTo(xs, h - 8); g.stroke();
  const glow = g.createRadialGradient(xl, mid, 0, xl, mid, 6 + thetaE * 30);
  glow.addColorStop(0, 'rgba(239,106,94,0.9)');
  glow.addColorStop(1, 'rgba(239,106,94,0)');
  g.fillStyle = glow;
  g.fillRect(xl - 40, mid - 40, 80, 80);
  for (const b of [-0.24, -0.15, -0.07, 0.07, 0.15, 0.24]) {
    const by = b * h, yl = mid + by;
    const slope = by / (xo - xl) - k / by;   // traced back from you, the ray bends towards the lens
    const ys = yl + slope * (xl - xs);
    g.setLineDash([3, 4]);
    g.strokeStyle = 'rgba(243,238,230,0.22)';
    g.beginPath(); g.moveTo(xl, yl); g.lineTo(xs, yl + (by / (xo - xl)) * (xl - xs)); g.stroke();
    g.setLineDash([]);
    g.strokeStyle = 'rgba(255,214,170,0.9)';
    g.beginPath(); g.moveTo(xo, mid); g.lineTo(xl, yl); g.lineTo(xs, ys); g.stroke();
    g.fillStyle = 'rgba(255,236,210,0.95)';
    g.beginPath(); g.arc(xs, ys, 2, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = 'rgba(243,238,230,0.95)';
  g.beginPath(); g.arc(xo, mid, 3, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(143,135,124,0.9)';
  g.textAlign = 'left';
  g.fillText('dashed: the way the light seems to come', 8, h - 6);
}

// ── chapter 2: move a bright galaxy behind a lens galaxy until it becomes a ring ──
const G = 6.674e-11, C = 2.998e8, M_SUN = 1.989e30, GPC = 3.0857e25, ARCSEC = 180 / Math.PI * 3600;
const D_L = 1 * GPC, D_S = 2 * GPC, D_LS = 1 * GPC;   // flat-space simplification
export function einsteinRadiusArcsec(suns) { return Math.sqrt((4 * G * suns * M_SUN / (C * C)) * D_LS / (D_L * D_S)) * ARCSEC; }

function massWords(suns) {
  if (suns < 1e12) return Math.round(suns / 1e9 / 10) * 10 + ' billion suns';
  const t = suns / 1e12;
  return (t < 1.05 ? '1' : t.toFixed(1)) + ' trillion suns';
}

export function mountRing(frame, RM) {
  const view = createLensView(frame.querySelector('canvas'), { seed: 21, galaxies: 70, stars: 2000 });
  const u = view.u;
  const wrap = frame.parentElement;
  const mass = wrap.querySelector('[data-ctl="mass"]');
  const out = (k) => wrap.querySelector(`[data-out="${k}"]`);
  const hint = frame.querySelector('.lab-hint');
  u.uSrcOn.value = 1;
  u.uSrcR.value = 0.05;
  u.uBgGain.value = 0.5;
  u.uLensGlow.value = 0.55;
  u.uMarker.value = 1;
  const src = new THREE.Vector2(0.55, 0.12);
  let lastUse = -1e9, used = false, suns = 1e12;
  const use = () => { lastUse = performance.now(); if (!used) { used = true; hint.classList.add('gone'); } };
  draggable(frame, view, () => src, (v) => src.copy(v), use);
  const setMass = () => {
    suns = Math.pow(10, 11 + (mass.value / 100) * 1.7);
    u.uThetaE.value = 0.27 * Math.sqrt(suns / 1e12);
    out('mass').textContent = massWords(suns);
    out('theta').textContent = einsteinRadiusArcsec(suns).toFixed(1) + '″';
    sliderFill(mass);
  };
  mass.addEventListener('input', () => { setMass(); use(); });
  setMass();
  let shown = '';
  return {
    resize: view.resize,
    update(dt, t) {
      if (!RM && t - lastUse > 7000) {
        const a = Math.min(u.uAspect.value, 1.7);
        src.lerp(new THREE.Vector2(Math.sin(t * 0.00023) * 0.62 * a, 0.03 + Math.sin(t * 0.00037) * 0.06), 1 - Math.exp(-dt / 700));
      }
      u.uSrc.value.copy(src);
      // how far off-axis the galaxy is, in Einstein radii, and how much the lens brightens it
      const uu = Math.max(src.length() / u.uThetaE.value, u.uSrcR.value / u.uThetaE.value * 0.6);
      const mag = (uu * uu + 2) / (uu * Math.sqrt(uu * uu + 4));
      const state = uu < 0.12 ? 'An Einstein ring' : uu < 0.55 ? 'Two bright arcs' : uu < 2.2 ? 'Two images' : 'One image, nudged';
      const text = state + '|' + (mag < 9.95 ? mag.toFixed(1) : Math.round(mag));
      if (text !== shown) { shown = text; out('state').textContent = state; out('mag').textContent = '×' + text.split('|')[1]; }
    },
    render: view.render,
  };
}
