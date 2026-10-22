/* IMPERISHABLE: landing page scroll engine (no dependencies).
   - .pin sections: a tall track with a sticky stage; scroll progress p (0..1) scrubs a canvas image
     sequence and fades text phases in and out ([data-in], [data-out]).
   - .science: the picture stays put and grows as the steps scroll past.
   - .reveal: fades up once on entering the screen; [data-count] numbers count up.
   - prefers-reduced-motion: no scrubbing or pinning; every scene shows as a still. */
(function () {
  'use strict';
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (RM) document.documentElement.classList.add('rm');

  // ── links from config.js ──
  var S = window.SITE || {};
  // the shown handle: "@name" from a profile URL, or the address itself for email
  function handleOf(key, url) {
    if (key === 'email') return url;
    var seg;
    try { seg = new URL(url).pathname.split('/').filter(Boolean).pop(); } catch (e) { return ''; }
    if (!seg) return '';
    return key === 'linkedin' ? seg : '@' + seg.replace(/^@/, '');
  }
  document.querySelectorAll('[data-link]').forEach(function (a) {
    var key = a.getAttribute('data-link'), url = S[key];
    if (url === '' || (url === undefined && key === 'email')) { (a.closest('[data-link-wrap]') || a).remove(); return; }
    if (key === 'email' && url) { a.href = 'mailto:' + url; }
    else if (url) a.href = url;
    if (url && url !== '#' && /^https?:/.test(url)) { a.target = '_blank'; a.rel = 'noopener'; }
    var h = a.querySelector('[data-handle]');
    if (h && url && url !== '#') h.textContent = handleOf(key, url);
  });
  var handles = document.querySelector('.handles');
  if (handles && !handles.children.length) handles.remove();

  var clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  var vh = function () { return window.innerHeight; };

  // ── image sequences on canvas ──
  function Sequence(section) {
    var n = +section.getAttribute('data-frames');
    var name = section.getAttribute('data-seq');
    var canvas = section.querySelector('canvas.seq');
    var ctx = canvas.getContext('2d');
    var portrait = window.innerHeight > window.innerWidth * 1.1;
    var dir = 'assets/seq/' + name + '/' + (portrait ? 'p' : 'l') + '/';
    var frames = new Array(n), loaded = new Array(n), started = false, current = -1;
    // data-v on the section: bump it whenever that scene's frames are re-exported, so browsers drop cached copies
    var ver = section.getAttribute('data-v');
    function src(i) { return dir + String(i + 1).padStart(3, '0') + '.webp' + (ver ? '?v=' + ver : ''); }
    function load(i) {
      if (frames[i]) return;
      var im = new Image(); frames[i] = im;
      im.onload = function () { loaded[i] = true; if (current < 0 || Math.abs(i - current) < 1.5) draw(current < 0 ? 0 : current, true); };
      im.decoding = 'async'; im.src = src(i);
    }
    function loadAll() {
      if (started) return; started = true;
      // first, last and middle first, then fill in: the scene is usable within a few frames
      [0, n - 1, n >> 1].forEach(load);
      for (var step = n >> 2; step >= 1; step >>= 1) for (var i = 0; i < n; i += step) load(i);
    }
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(canvas.clientHeight * dpr);
      if (current >= 0) draw(current, true);
    }
    // nearest loaded frame at or before i (then after), so scrubbing never blanks
    function nearest(i) {
      var k = i;
      while (k >= 0 && !loaded[k]) k--;
      if (k < 0) { k = i; while (k < n && !loaded[k]) k++; if (k >= n) return -1; }
      return k;
    }
    function paint(im, alpha) {
      var cw = canvas.width, ch = canvas.height;
      var s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
      var w = im.naturalWidth * s, h = im.naturalHeight * s;
      ctx.globalAlpha = alpha;
      ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
    }
    // f is a fractional frame position: the two frames either side are cross-faded, so scrubbing never steps
    function draw(f, force) {
      if (Math.abs(f - current) < 0.02 && !force) return;
      var i0 = Math.floor(f), i1 = Math.min(i0 + 1, n - 1), t = f - i0;
      var k = nearest(i0);
      if (k < 0) return;
      current = f;
      paint(frames[k], 1);
      if (k === i0 && t > 0.02 && loaded[i1]) paint(frames[i1], t);
      ctx.globalAlpha = 1;
    }
    load(0); size();
    window.addEventListener('resize', size);
    return {
      near: function () { loadAll(); },
      // at rest, settle on a single whole frame: a held cross-fade can show two images at once
      show: function (p, rest) { var f = clamp(p, 0, 1) * (n - 1); draw(rest ? Math.round(f) : f); },
    };
  }

  var pins = Array.prototype.map.call(document.querySelectorAll('.pin'), function (sec) {
    return { el: sec, seq: Sequence(sec), phases: Array.prototype.slice.call(sec.querySelectorAll('.phase')), hint: sec.querySelector('.hint') };
  });
  function pinProgress(el) {
    var r = el.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - vh()), 0, 1);
  }
  function phaseStyle(ph, p) {
    var a = +ph.getAttribute('data-in'), b = +ph.getAttribute('data-out'), ramp = 0.05;
    var o = clamp((p - a) / ramp, 0, 1) * clamp((b - p) / ramp, 0, 1);
    var y = p < a + ramp ? (1 - clamp((p - a) / ramp, 0, 1)) * 24 : -(1 - clamp((b - p) / ramp, 0, 1)) * 24;
    ph.style.opacity = o.toFixed(3);
    ph.style.transform = 'translateY(' + y.toFixed(1) + 'px)';
  }

  // ── science ──
  var sci = document.querySelector('.science');
  var sciFrame = sci && sci.querySelector('.sci-frame');
  var steps = sci ? Array.prototype.slice.call(sci.querySelectorAll('.step')) : [];

  // ── quote parallax ──
  var quote = document.querySelector('.quote');

  // ── pinned scenes follow the scroll with a little easing, so a mouse-wheel notch glides instead of jumping ──
  var easing = false, lastT = 0;
  function render(pn, rest) {
    pn.seq.show(pn.cur, rest);
    pn.phases.forEach(function (ph) { phaseStyle(ph, pn.cur); });
    if (pn.hint) pn.hint.style.opacity = pn.cur < 0.02 ? 1 : 0;
  }
  function ease(now) {
    var dt = lastT ? Math.min(now - lastT, 64) : 16; lastT = now;
    var k = 1 - Math.exp(-dt / 110), moving = false;
    pins.forEach(function (pn) {
      if (!pn.live) return;
      var d = pn.target - pn.cur;
      var rest = Math.abs(d) < 0.0004;
      if (rest) pn.cur = pn.target; else { pn.cur += d * k; moving = true; }
      render(pn, rest);
    });
    if (moving) requestAnimationFrame(ease); else { easing = false; lastT = 0; }
  }

  // ── nav ──
  var nav = document.getElementById('nav'), lastY = 0;

  function frame() {
    var y = window.scrollY;
    nav.classList.toggle('solid', y > vh() * 0.6);
    nav.classList.toggle('hide', y > lastY && y > vh() * 1.2);
    lastY = y;
    if (RM) return;
    pins.forEach(function (pn) {
      var r = pn.el.getBoundingClientRect();
      var live = !(r.bottom < -vh() || r.top > vh() * 2.5);
      if (live) {
        pn.seq.near();
        pn.target = pinProgress(pn.el);
        if (!pn.live) { pn.cur = pn.target; render(pn, true); }   // coming back into range: no catch-up glide
      }
      pn.live = live;
    });
    if (!easing) { easing = true; requestAnimationFrame(ease); }
    if (sci) {
      var r = sci.getBoundingClientRect();
      var p = clamp(-r.top / Math.max(1, r.height - vh()), 0, 1);
      sciFrame.style.setProperty('--p', p.toFixed(3));
      var mid = vh() * 0.55;
      steps.forEach(function (st) { var b = st.getBoundingClientRect(); st.classList.toggle('on', b.top < mid && b.bottom > mid * 0.6); });
    }
    if (quote) {
      var q = quote.getBoundingClientRect();
      quote.style.setProperty('--p', clamp((vh() - q.top) / (vh() + q.height), 0, 1).toFixed(3));
    }
  }
  var ticking = false;
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; frame(); }); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  if (RM) {
    // stills: show the last frame of each scene
    pins.forEach(function (pn) { pn.seq.near(); setTimeout(function () { pn.seq.show(1); }, 400); });
    steps.forEach(function (st) { st.classList.add('on'); });
  }
  frame();

  // ── reveals and counters ──
  function count(el) {
    var to = parseFloat(el.getAttribute('data-count')), dec = +(el.getAttribute('data-dec') || 0);
    if (RM) { el.textContent = to.toFixed(dec); return; }
    var t0 = performance.now(), dur = 1400;
    (function tick(t) {
      var k = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
      el.textContent = (to * e).toFixed(dec);
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      en.target.querySelectorAll('[data-count]').forEach(count);
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' }) : null;
  document.querySelectorAll('.reveal').forEach(function (el) {
    if (io && !RM) io.observe(el);
    else { el.classList.add('in'); el.querySelectorAll('[data-count]').forEach(count); }
  });
})();
