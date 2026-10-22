// Generated textures for the Lens Lab: a seamless field of distant galaxies, and a soft glow for sprites.
// Warm whites, golds and reds only (the novel's no-blue rule).

function random(seed) {
  let s = seed >>> 0;
  return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
const TINTS = ['255,246,232', '255,234,206', '255,218,178', '255,200,156', '248,240,232', '255,186,150'];

// A square tile that repeats without seams: anything near an edge is drawn again on the opposite side.
export function galaxyField({ size = 2048, seed = 7, galaxies = 110, stars = 2400 } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const r = random(seed);
  g.fillStyle = '#030203';
  g.fillRect(0, 0, size, size);
  function wrapped(x, y, reach, draw) {
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      const X = x + dx, Y = y + dy;
      if (X + reach < 0 || X - reach > size || Y + reach < 0 || Y - reach > size) continue;
      draw(X, Y);
    }
  }
  function blob(X, Y, rad, rgb, alpha) {
    const gr = g.createRadialGradient(X, Y, 0, X, Y, rad);
    gr.addColorStop(0, `rgba(${rgb},${alpha})`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr;
    g.fillRect(X - rad, Y - rad, rad * 2, rad * 2);
  }

  // faint dust glow
  for (let i = 0; i < 16; i++) {
    const x = r() * size, y = r() * size, rad = size * (0.1 + r() * 0.18);
    wrapped(x, y, rad, (X, Y) => blob(X, Y, rad, '130,74,58', 0.09));
  }
  // stars
  for (let i = 0; i < stars; i++) {
    const x = r() * size, y = r() * size, b = Math.pow(r(), 6), rad = 1.2 + b * 4.5;
    const tint = TINTS[(r() * TINTS.length) | 0];
    wrapped(x, y, rad, (X, Y) => {
      blob(X, Y, rad, tint, 0.3 + 0.7 * b);
      if (b > 0.35) { g.fillStyle = `rgba(${tint},0.95)`; g.fillRect(X - 0.6, Y - 0.6, 1.2, 1.2); }
    });
  }
  // galaxies: ellipticals, discs and a few spirals, small to medium
  for (let i = 0; i < galaxies; i++) {
    const x = r() * size, y = r() * size;
    const big = r() < 0.12;
    const rad = big ? 34 + r() * 46 : 8 + r() * 22;
    const flat = 0.25 + r() * 0.75, rot = r() * Math.PI, tint = TINTS[(r() * 4) | 0];
    const spiral = big && r() < 0.6;
    wrapped(x, y, rad * 1.4, (X, Y) => {
      g.save();
      g.translate(X, Y);
      g.rotate(rot);
      g.scale(1, flat);
      blob(0, 0, rad, tint, 0.55);
      blob(0, 0, rad * 0.32, '255,244,226', 0.9);
      if (spiral) {
        for (let arm = 0; arm < 2; arm++) {
          for (let k = 0; k < 70; k++) {
            const t = k / 70, a = arm * Math.PI + t * 4.2, d = rad * (0.2 + 0.85 * t);
            blob(Math.cos(a) * d, Math.sin(a) * d, rad * (0.16 - 0.08 * t), '255,226,196', 0.32 * (1 - t));
          }
        }
      }
      g.restore();
    });
  }
  return c;
}

// A soft round glow, white in the middle, for sprites (tinted by the material colour).
export function glowCanvas(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const h = size / 2;
  const gr = g.createRadialGradient(h, h, 0, h, h, h);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.18, 'rgba(255,255,255,0.55)');
  gr.addColorStop(0.45, 'rgba(255,255,255,0.12)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  return c;
}
