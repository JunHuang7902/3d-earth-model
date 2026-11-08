/* ============================================================================
   Correr para Vivir — MOTOR DE LA EXPERIENCIA
   ----------------------------------------------------------------------------
   Cómo funciona (y por qué ya no se congela):

   1. El recorrido es una lista de pasos (CONTENT.flow). Cada pantalla se
      CONSTRUYE al entrar y se DESTRUYE al salir. Sus <video>/<audio> viven
      dentro de la pantalla, así que al salir se pausan, se descargan y se
      eliminan: es imposible que sigan sonando por debajo de la siguiente.

   2. Cada pantalla recibe un "scope" con setTimeout / setInterval / on().
      Al salir, el scope se limpia solo: no quedan temporizadores fantasma
      (por ejemplo, el de los 49 s del capitán) que disparen saltos raros.

   3. "Volver" lleva a la pantalla de contenido anterior según el orden del
      recorrido, saltando las de tránsito (despegue, vuelos, videos a
      pantalla completa). Al volver, el video se reanuda desde donde quedó;
      si el navegador bloquea el autoplay aparece un botón ▶ grande.

   4. Un único dock inferior controla todo: Volver · play/pausa, barra de
      progreso, silencio, Saltar · Siguiente. La navegación se bloquea
      durante la transición para evitar dobles clics.

   5. El único sonido que cruza pantallas es el audio del capitán (intro →
      despegue → vuelo), tal como se pidió; se apaga con un fundido en
      cuanto se llega a cualquier otra pantalla o se omite la intro.
============================================================================ */
(function () {
  'use strict';

  var C = window.CONTENT;
  var FLOW = C.flow;
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------------
  // Iconos (SVG en línea)
  // ------------------------------------------------------------------
  var P = {
    play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>',
    vol: '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" stroke="none"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
    mute: '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" stroke="none"/><path d="M17 9.5l5 5M22 9.5l-5 5"/>',
    right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    left: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    skip: '<path d="M5 5l10 7-10 7z" fill="currentColor" stroke="none"/><path d="M19 5v14"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    replay: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3z"/>',
    pulse: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    wave: '<path d="M3 15c3 0 3-6 6-6s3 6 6 6 3-6 6-6"/>',
    key: '<circle cx="8" cy="14" r="4"/><path d="M11 11l8-8M16 6l2 2M14 8l2 2"/>',
    dna: '<path d="M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9M8.5 7h7M8.5 17h7"/>',
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    path: '<path d="M5 19c4 0 3-6 7-6s3-6 7-6"/><circle cx="5" cy="19" r="1.6"/><circle cx="19" cy="7" r="1.6"/>',
    hammer: '<path d="M14 4l6 6-2 2-6-6zM12 6L4 18l2 2 12-8"/>',
    anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v13M5 13a7 7 0 0 0 14 0M9 10h6"/>',
    cloud: '<path d="M7 18h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.6 1.5A3.3 3.3 0 0 0 7 18z"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    balance: '<path d="M12 4v16M7 20h10M5 8h14M5 8l-3 6h6zM19 8l-3 6h6z"/>',
    hand: '<path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V11M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12M16 9.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L4.5 13a1.5 1.5 0 0 1 2.5-1.6L8 13"/>',
    chat: '<path d="M4 5h16v10H9l-5 4z"/>',
    shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    root: '<path d="M12 3v9M12 12c0 4-4 4-6 8M12 12c0 4 4 4 6 8M12 15v6M8 6c2 0 4 1 4 3M16 6c-2 0-4 1-4 3"/>',
    hands: '<path d="M12 21s-6-3.8-6-8.5A3.5 3.5 0 0 1 12 10a3.5 3.5 0 0 1 6 2.5C18 17.2 12 21 12 21z"/><path d="M3 12l3 3M21 12l-3 3"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5A5 5 0 0 1 21 20"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M8 7h7"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    plane: '<path d="M10.5 21l1.5-1 1.5 1v-3l-1.5-1 3-1 6 2v-2l-6-4V6a1.5 1.5 0 0 0-3 0v6l-6 4v2l6-2 3 1-1.5 1z" fill="currentColor" stroke="none"/>',
  };
  function icon(name, cls) {
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }

  // ------------------------------------------------------------------
  // Utilidades DOM
  // ------------------------------------------------------------------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function h(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmtTime(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60), ss = Math.floor(s % 60);
    return m + ':' + (ss < 10 ? '0' : '') + ss;
  }
  function indexOfId(id) {
    for (var i = 0; i < FLOW.length; i++) if (FLOW[i].id === id) return i;
    return -1;
  }
  function chapterOf(step) {
    for (var i = 0; i < C.chapters.length; i++) if (C.chapters[i].id === step.chapter) return C.chapters[i];
    return C.chapters[0];
  }

  // ------------------------------------------------------------------
  // Progreso guardado (localStorage siempre dentro de try/catch)
  // ------------------------------------------------------------------
  var STORE_KEY = 'cpv-progreso-v2';
  var store = (function () {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && typeof s === 'object') {
          s.steps = s.steps || {}; s.reflections = s.reflections || {};
          if (typeof s.furthest !== 'number') s.furthest = 0;
          if (typeof s.current !== 'number') s.current = -1;
          return s;
        }
      }
    } catch (e) { /* almacenamiento no disponible */ }
    return { furthest: 0, current: -1, steps: {}, reflections: {} };
  })();
  var saveTimer = null;
  function saveStore(now) {
    if (saveTimer) clearTimeout(saveTimer);
    var write = function () { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {} };
    if (now) write(); else saveTimer = setTimeout(write, 250);
  }
  function stepState(id) { return store.steps[id] || (store.steps[id] = {}); }

  // ------------------------------------------------------------------
  // Scope: temporizadores y listeners que se limpian solos al salir
  // ------------------------------------------------------------------
  function Scope() { this.timers = []; this.intervals = []; this.listeners = []; this.cleanups = []; this.alive = true; }
  Scope.prototype.timeout = function (fn, ms) {
    var self = this;
    var id = setTimeout(function () { if (self.alive) fn(); }, ms);
    this.timers.push(id);
    return id;
  };
  Scope.prototype.interval = function (fn, ms) {
    var self = this;
    var id = setInterval(function () { if (self.alive) fn(); }, ms);
    this.intervals.push(id);
    return id;
  };
  Scope.prototype.on = function (target, ev, fn, opts) {
    var self = this;
    var wrapped = function (e) { if (self.alive) fn(e); };
    target.addEventListener(ev, wrapped, opts);
    this.listeners.push([target, ev, wrapped, opts]);
  };
  Scope.prototype.add = function (fn) { this.cleanups.push(fn); };
  Scope.prototype.dispose = function () {
    if (!this.alive) return;
    this.timers.forEach(clearTimeout);
    this.intervals.forEach(clearInterval);
    this.listeners.forEach(function (l) { try { l[0].removeEventListener(l[1], l[2], l[3]); } catch (e) {} });
    this.cleanups.forEach(function (fn) { try { fn(); } catch (e) { console.warn(e); } });
    this.alive = false;
  };

  // ------------------------------------------------------------------
  // Medios
  // ------------------------------------------------------------------
  var gestureUnlocked = false;

  function makeVideo(src, opts) {
    opts = opts || {};
    var v = document.createElement('video');
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.playsInline = true;
    v.preload = opts.preload || 'auto';
    if (opts.muted) { v.muted = true; v.setAttribute('muted', ''); v.volume = 0; }
    if (opts.cls) v.className = opts.cls;
    v.src = src;
    return v;
  }

  function safePlay(media) {
    if (!media) return Promise.resolve(false);
    try {
      var p = media.play();
      if (p && typeof p.then === 'function') {
        return p.then(function () { return true; }).catch(function (err) {
          if (err && err.name === 'AbortError') return false;
          Media.blocked(media);
          return false;
        });
      }
    } catch (e) { Media.blocked(media); return Promise.resolve(false); }
    return Promise.resolve(true);
  }

  function unloadMediaIn(root) {
    $$('video, audio', root).forEach(function (m) {
      try { m.pause(); } catch (e) {}
      try { m.removeAttribute('src'); m.load(); } catch (e) {}
    });
  }

  // Grupo de medios de la pantalla actual (lo controla el dock)
  var Media = {
    primary: null,
    members: [],
    label: '',
    resumeSet: null,
    onBlocked: null,
    set: function (cfg) {
      this.primary = cfg ? cfg.primary : null;
      this.members = cfg ? (cfg.members || (cfg.primary ? [cfg.primary] : [])).filter(Boolean) : [];
      this.label = cfg && cfg.label ? cfg.label : '';
      this.onBlocked = cfg && cfg.onBlocked ? cfg.onBlocked : null;
      this.resumeSet = null;
      if (this.members.length) {
        var muted = Media.isMuted();
        this.members.forEach(function (m) { if (!m.hasAttribute('data-force-muted')) m.muted = muted; });
      }
      Dock.renderMedia();
    },
    clear: function () { this.set(null); },
    anyPlaying: function () {
      return this.members.some(function (m) { return !m.paused && !m.ended; });
    },
    toggle: function () {
      if (!this.members.length) return;
      if (this.anyPlaying()) this.pause(); else this.play();
    },
    pause: function () {
      this.resumeSet = this.members.filter(function (m) { return !m.paused && !m.ended; });
      this.members.forEach(function (m) { try { m.pause(); } catch (e) {} });
      Dock.renderMedia();
    },
    play: function () {
      var set = (this.resumeSet && this.resumeSet.length) ? this.resumeSet : [this.primary || this.members[0]];
      this.resumeSet = null;
      set.forEach(function (m) {
        if (!m) return;
        if (m.ended && m === Media.primary) { try { m.currentTime = 0; } catch (e) {} }
        safePlay(m);
      });
      Dock.renderMedia();
    },
    isMuted: function () { return !!store.muted; },
    toggleMute: function () {
      store.muted = !store.muted;
      saveStore();
      this.members.forEach(function (m) { if (!m.hasAttribute('data-force-muted')) m.muted = store.muted; });
      if (App.carry && App.carry.el) App.carry.el.muted = store.muted;
      Dock.renderMedia();
    },
    blocked: function (m) {
      if (Media.members.indexOf(m) < 0) return;
      if (Media.onBlocked) Media.onBlocked(m);
      Dock.renderMedia();
    },
  };

  // ------------------------------------------------------------------
  // Efectos: confeti y avisos
  // ------------------------------------------------------------------
  var FX = (function () {
    var cv = $('#fx'), ctx = cv.getContext('2d'), parts = [], raf = null;
    var COLORS = ['#e3262f', '#ffffff', '#ff6b6b', '#b3121b', '#f2f2f2'];
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = window.innerWidth * dpr; cv.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function loop() {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      parts = parts.filter(function (p) { return p.life > 0; });
      parts.forEach(function (p) {
        p.vy += 0.25; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 1;
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life / 30);
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (parts.length) raf = requestAnimationFrame(loop);
      else { raf = null; ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
    }
    return {
      burst: function (x, y, n) {
        if (REDUCED) return;
        if (x == null) { x = window.innerWidth / 2; y = window.innerHeight / 2; }
        resize();
        n = n || 90;
        for (var i = 0; i < n; i++) {
          var a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 9;
          parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
            w: 6 + Math.random() * 6, h: 3 + Math.random() * 5, color: COLORS[i % COLORS.length], life: 70 + Math.random() * 40 });
        }
        if (!raf) raf = requestAnimationFrame(loop);
      },
    };
  })();

  var toastTimer = null;
  function toast(msg, kind) {
    var t = $('#toast');
    t.textContent = msg;
    t.className = 'show' + (kind ? ' ' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = ''; }, 2800);
  }

  function burstAt(elm, n) {
    if (!elm) { FX.burst(null, null, n); return; }
    var r = elm.getBoundingClientRect();
    FX.burst(r.left + r.width / 2, r.top + r.height / 2, n);
  }

  // ------------------------------------------------------------------
  // Dock inferior
  // ------------------------------------------------------------------
  var Dock = (function () {
    var dock = $('#dock');
    var back = $('#btn-back'), next = $('#btn-next'), skip = $('#btn-skip'), hint = $('#dock-hint');
    var ctl = $('#media-ctl'), play = $('#btn-play'), mute = $('#btn-mute'), seek = $('#media-seek'), time = $('#media-time'), label = $('#media-label'), eq = $('#media-eq');
    var state = { back: false, next: 'hidden', nextLabel: 'Siguiente', hint: '', skip: null, visible: true };
    var seeking = false;
    var quiet = false;

    back.innerHTML = icon('left') + '<span>Volver</span>';
    back.addEventListener('click', function () { App.back(); });
    next.addEventListener('click', function () { if (state.next === 'enabled') App.next(); });
    skip.addEventListener('click', function () { if (state.skip && state.skip.fn) state.skip.fn(); });
    play.addEventListener('click', function () { Media.toggle(); });
    mute.addEventListener('click', function () { Media.toggleMute(); });
    seek.addEventListener('input', function () {
      seeking = true;
      var m = Media.primary;
      if (m && isFinite(m.duration) && m.duration > 0) {
        try { m.currentTime = (seek.value / 1000) * m.duration; } catch (e) {}
      }
    });
    seek.addEventListener('change', function () { seeking = false; });

    function render() {
      dock.classList.toggle('hidden', !state.visible);
      back.hidden = !state.back;
      if (state.next === 'hidden') {
        next.hidden = true;
      } else {
        var wasHidden = next.hidden || next.disabled;
        next.hidden = false;
        next.disabled = state.next === 'disabled';
        next.innerHTML = '<span>' + esc(state.nextLabel) + '</span>' + icon('right');
        if (wasHidden && state.next === 'enabled' && !quiet) {
          next.classList.remove('pop'); void next.offsetWidth; next.classList.add('pop');
        }
      }
      hint.textContent = state.next === 'hidden' ? state.hint : '';
      hint.hidden = !(state.next === 'hidden' && state.hint);
      if (state.skip) {
        skip.hidden = false;
        skip.innerHTML = '<span>' + esc(state.skip.label) + '</span>' + icon('skip');
      } else {
        skip.hidden = true;
      }
    }

    function renderMedia() {
      var has = Media.members.length > 0;
      ctl.hidden = !has;
      if (!has) return;
      var playing = Media.anyPlaying();
      play.innerHTML = icon(playing ? 'pause' : 'play');
      play.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
      play.title = playing ? 'Pausar (Espacio)' : 'Reproducir (Espacio)';
      ctl.classList.toggle('is-playing', playing);
      var muted = Media.isMuted();
      mute.innerHTML = icon(muted ? 'mute' : 'vol');
      mute.setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar');
      label.textContent = Media.label || '';
      label.hidden = !Media.label;
      eq.classList.toggle('on', playing);
    }

    function tick() {
      var m = Media.primary;
      if (!m || ctl.hidden) return;
      var d = m.duration, t = m.currentTime;
      if (!seeking && isFinite(d) && d > 0) seek.value = Math.round((t / d) * 1000);
      seek.style.setProperty('--p', (isFinite(d) && d > 0 ? (t / d) * 100 : 0) + '%');
      time.textContent = fmtTime(t) + ' / ' + fmtTime(d);
      var playing = Media.anyPlaying();
      if (playing !== ctl.classList.contains('is-playing')) renderMedia();
    }
    setInterval(tick, 250);

    return {
      set: function (patch) {
        Object.keys(patch).forEach(function (k) { state[k] = patch[k]; });
        render();
      },
      get: function () { return state; },
      renderMedia: renderMedia,
      quiet: function (q) { quiet = q; },
      reset: function () {
        state = { back: false, next: 'hidden', nextLabel: 'Siguiente', hint: '', skip: null, visible: true };
        render();
      },
    };
  })();

  // ------------------------------------------------------------------
  // Barra superior y menú de capítulos
  // ------------------------------------------------------------------
  var Top = (function () {
    var chapterEl = $('#top-chapter'), fill = $('#top-progress-fill'), count = $('#top-count');
    var menu = $('#menu'), list = $('#menu-list');
    $('#btn-menu').innerHTML = icon('menu');
    $('#btn-fullscreen').innerHTML = icon('full');
    $('#btn-menu-close').innerHTML = icon('close');

    $('#btn-menu').addEventListener('click', function () { open(); });
    $('#btn-menu-close').addEventListener('click', function () { close(); });
    menu.addEventListener('click', function (e) { if (e.target === menu) close(); });
    $('#btn-fullscreen').addEventListener('click', function () {
      try {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
      } catch (e) {}
    });
    var restartArmed = false, restartTimer = null;
    $('#btn-restart').addEventListener('click', function () {
      var b = $('#btn-restart');
      if (!restartArmed) {
        restartArmed = true;
        b.textContent = '¿Seguro? Toca otra vez para borrar el progreso';
        b.classList.add('armed');
        clearTimeout(restartTimer);
        restartTimer = setTimeout(function () { restartArmed = false; b.textContent = 'Reiniciar el viaje'; b.classList.remove('armed'); }, 4000);
        return;
      }
      restartArmed = false; b.textContent = 'Reiniciar el viaje'; b.classList.remove('armed');
      App.restart();
      close();
    });

    function firstIndex(chId) {
      for (var i = 0; i < FLOW.length; i++) if (FLOW[i].chapter === chId) return i;
      return -1;
    }

    function buildList() {
      list.innerHTML = '';
      var curCh = App.index >= 0 ? FLOW[App.index].chapter : null;
      C.chapters.forEach(function (ch, n) {
        var fi = firstIndex(ch.id);
        if (fi < 0) return;
        var unlocked = fi <= store.furthest;
        var li = h('li', 'menu-item' + (ch.id === curCh ? ' current' : '') + (unlocked ? '' : ' locked'));
        var b = h('button', 'menu-btn',
          '<span class="menu-n">' + (n === 0 ? 'P' : n) + '</span><span class="menu-t">' + esc(ch.title) + '</span>' +
          (unlocked ? (ch.id === curCh ? '<span class="menu-s">Aquí estás</span>' : icon('right')) : icon('lock')));
        b.type = 'button';
        b.disabled = !unlocked;
        b.addEventListener('click', function () { close(); App.jump(fi); });
        li.appendChild(b);
        list.appendChild(li);
      });
    }

    var lastFocus = null;
    function open() {
      buildList();
      lastFocus = document.activeElement;
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add('open'); });
      var first = $('.menu-btn:not([disabled])', menu);
      if (first) first.focus();
    }
    function close() {
      menu.classList.remove('open');
      setTimeout(function () { menu.hidden = true; }, 220);
      if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {}
    }

    return {
      update: function () {
        var step = FLOW[App.index];
        var ch = chapterOf(step);
        chapterEl.textContent = ch.title;
        var frac = App.index / (FLOW.length - 1);
        fill.style.transform = 'scaleX(' + frac.toFixed(4) + ')';
        count.textContent = (App.index + 1) + ' / ' + FLOW.length;
      },
      open: open,
      close: close,
      isOpen: function () { return !menu.hidden; },
    };
  })();

  // ------------------------------------------------------------------
  // Motor de navegación
  // ------------------------------------------------------------------
  var stage = $('#stage');

  var App = {
    index: -1,
    cur: null,
    busy: false,
    carry: null,

    prevContentIndex: function (i) {
      for (var j = i - 1; j >= 0; j--) if (!FLOW[j].skipOnBack) return j;
      return -1;
    },

    go: function (i, opts) {
      opts = opts || {};
      if (i < 0 || i >= FLOW.length) return false;
      if (App.busy && !opts.force) return false;
      App.busy = true;
      var step = FLOW[i];

      // 1) salir de la pantalla actual
      var prev = App.cur;
      if (prev) {
        try { if (prev.api && prev.api.leave) prev.api.leave(); } catch (e) { console.warn(e); }
        prev.scope.dispose();
        unloadMediaIn(prev.el);
      }
      Media.clear();
      Dock.reset();
      clearTimeout(toastTimer); $('#toast').className = '';

      // 2) audio del capitán: solo continúa en intro → despegue → primer vuelo
      if (App.carry && App.carry.keep.indexOf(step.id) < 0) App.stopCarry(true);

      // 3) construir la nueva pantalla
      var el = h('section', 'scene scene-' + step.type + (opts.dir < 0 ? ' from-left' : ''));
      el.dataset.step = step.id;
      stage.appendChild(el);
      var scope = new Scope();
      var ctx = makeCtx(step, el, scope, i);
      App.index = i;
      App.cur = { step: step, el: el, scope: scope, api: null, ctx: ctx };

      document.body.className = 'type-' + step.type + (step.type === 'intro' ? ' is-intro' : '') +
        (IMMERSIVE[step.type] ? ' immersive' : '');

      var prevIdx = App.prevContentIndex(i);
      Dock.set({ back: prevIdx >= 0 && !step.skipOnBack ? true : (prevIdx >= 0 && step.type === 'cinematic'), visible: true });

      Dock.quiet(true);
      try {
        App.cur.api = (Renderers[step.type] || Renderers.unknown)(ctx) || {};
      } catch (err) {
        console.error(err);
        el.innerHTML = '<div class="center-card"><h2>Ups, algo falló en esta pantalla</h2><p>Puedes continuar con el recorrido.</p></div>';
        Dock.set({ next: 'enabled' });
        App.cur.api = {};
      }
      Dock.quiet(false);

      // 4) transición
      if (prev) {
        var old = prev.el;
        old.classList.add('out');
        setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 520);
      }
      requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('in'); }); });
      setTimeout(function () { App.busy = false; }, 420);

      // 5) progreso
      if (i > store.furthest) store.furthest = i;
      if (!step.skipOnBack) store.current = i;
      saveStore();
      Top.update();
      try { stage.scrollTop = 0; } catch (e) {}
      return true;
    },

    next: function () {
      var api = App.cur && App.cur.api;
      if (api && api.onNext && api.onNext()) return;
      App.go(App.index + 1, { dir: 1 });
    },
    forceNext: function () { App.go(App.index + 1, { dir: 1, force: true }); },
    back: function () {
      var api = App.cur && App.cur.api;
      if (api && api.onBack && api.onBack()) return;
      var j = App.prevContentIndex(App.index);
      if (j >= 0) App.go(j, { dir: -1 });
    },
    jump: function (i) {
      App.stopCarry(false);
      App.go(i, { dir: i < App.index ? -1 : 1, force: true });
    },
    stopCarry: function (fade) {
      var c = App.carry;
      if (!c) return;
      App.carry = null;
      var a = c.el;
      if (!fade || REDUCED) { try { a.pause(); a.removeAttribute('src'); a.load(); } catch (e) {} if (a.parentNode) a.parentNode.removeChild(a); return; }
      var v0 = a.volume, steps = 12, n = 0;
      var t = setInterval(function () {
        n++;
        try { a.volume = Math.max(0, v0 * (1 - n / steps)); } catch (e) {}
        if (n >= steps) {
          clearInterval(t);
          try { a.pause(); a.removeAttribute('src'); a.load(); } catch (e) {}
          if (a.parentNode) a.parentNode.removeChild(a);
        }
      }, 50);
    },
    skipIntro: function () {
      App.stopCarry(false);
      try { Earth.preload(); } catch (e) {}
      App.go(indexOfId('flight-1'), { dir: 1, force: true });
    },
    restart: function () {
      App.stopCarry(false);
      store = { furthest: 0, current: -1, steps: {}, reflections: {}, muted: store.muted };
      saveStore(true);
      App.go(0, { dir: -1, force: true });
    },
  };

  var IMMERSIVE = { intro: true, takeoff: true, flight: true, cinematic: true, dialogue: true };

  function makeCtx(step, el, scope, index) {
    var state = stepState(step.id);
    return {
      step: step, el: el, scope: scope, state: state, index: index,
      gate: function (open, hintText) {
        if (!scope.alive) return;
        Dock.set({ next: open ? 'enabled' : 'hidden', hint: open ? '' : (hintText || '') });
      },
      next: function () { if (scope.alive) App.forceNext(); },
      save: function () { saveStore(); },
    };
  }

  // ------------------------------------------------------------------
  // Componentes reutilizables
  // ------------------------------------------------------------------

  // Reproductor de video con overlay ▶, reanudación y brillo al reproducir
  function createPlayer(ctx, src, opts) {
    opts = opts || {};
    var wrap = h('div', 'player');
    var v = makeVideo(src, { preload: 'auto' });
    v.className = 'player-video';
    wrap.appendChild(v);
    var overlay = h('button', 'player-overlay', '<span class="po-circle">' + icon('play') + '</span><span class="po-text">Reproducir</span>');
    overlay.type = 'button';
    overlay.setAttribute('aria-label', 'Reproducir video');
    wrap.appendChild(overlay);
    var badge = h('div', 'player-badge', '<span class="eq on"><i></i><i></i><i></i><i></i></span><span>Reproduciendo</span>');
    wrap.appendChild(badge);
    var err = h('div', 'player-error', '<strong>No se pudo cargar el video.</strong><span>Revisa tu conexión. Puedes continuar con la actividad.</span>');
    wrap.appendChild(err);

    var st = ctx.state;
    ctx.scope.on(v, 'loadedmetadata', function () {
      if (st.t && st.t > 0.5 && st.t < v.duration - 1) { try { v.currentTime = st.t; } catch (e) {} }
    });
    function sync() {
      wrap.classList.toggle('playing', !v.paused && !v.ended);
      wrap.classList.toggle('paused', v.paused && !v.ended);
      overlay.querySelector('.po-text').textContent = v.ended ? 'Ver de nuevo' : (v.currentTime > 0.3 ? 'Continuar' : 'Reproducir');
      overlay.querySelector('.po-circle').innerHTML = icon(v.ended ? 'replay' : 'play');
      Dock.renderMedia();
    }
    ctx.scope.on(v, 'play', sync);
    ctx.scope.on(v, 'pause', sync);
    ctx.scope.on(v, 'ended', function () { wrap.classList.add('ended'); st.t = 0; ctx.save(); sync(); if (opts.onEnded) opts.onEnded(); });
    ctx.scope.on(v, 'playing', function () { wrap.classList.remove('ended', 'loading', 'error'); });
    ctx.scope.on(v, 'waiting', function () { wrap.classList.add('loading'); });
    ctx.scope.on(v, 'canplay', function () { wrap.classList.remove('loading'); });
    ctx.scope.on(v, 'error', function () { wrap.classList.add('error'); sync(); });
    ctx.scope.on(v, 'click', function () { Media.toggle(); });
    ctx.scope.on(overlay, 'click', function () {
      if (v.ended) { try { v.currentTime = 0; } catch (e) {} }
      wrap.classList.remove('ended');
      safePlay(v);
    });
    ctx.scope.interval(function () { if (!v.paused) { st.t = v.currentTime; ctx.save(); } }, 1500);
    ctx.scope.add(function () { st.t = v.ended ? 0 : v.currentTime; saveStore(); });

    Media.set({ primary: v, members: [v], label: opts.label || '' });
    wrap.classList.add('paused', 'loading');
    sync();
    safePlay(v);
    return { el: wrap, video: v };
  }

  // Opciones de selección múltiple con evaluación inmediata
  function mountChoices(container, cfg) {
    // cfg: { options:[{letter,text,correct}], solved, onSolved, wrongText, explanation, wrongPicked:[] }
    var list = h('div', 'choices');
    var fb = h('div', 'feedback', '');
    fb.hidden = true;
    var buttons = cfg.options.map(function (o, idx) {
      var b = h('button', 'choice reveal', '<span class="choice-letter">' + esc(o.letter) + '</span><span class="choice-text">' + o.text + '</span><span class="choice-mark"></span>');
      b.type = 'button';
      b.style.setProperty('--i', idx);
      b.dataset.idx = idx;
      list.appendChild(b);
      return b;
    });
    container.appendChild(list);
    container.appendChild(fb);

    function showCorrect(btn, animate) {
      buttons.forEach(function (b) { b.disabled = true; });
      btn.classList.add('correct');
      btn.querySelector('.choice-mark').innerHTML = icon('check');
      fb.hidden = false;
      fb.className = 'feedback ok' + (animate ? ' pop' : '');
      fb.innerHTML = '<div class="fb-title">' + icon('check') + '¡Correcto!</div>' + (cfg.explanation ? '<p>' + cfg.explanation + '</p>' : '');
    }
    (cfg.wrongPicked || []).forEach(function (i) {
      var b = buttons[i];
      if (b) { b.classList.add('wrong'); b.disabled = true; b.querySelector('.choice-mark').innerHTML = icon('x'); }
    });
    if (cfg.solved) {
      var ci = cfg.options.findIndex(function (o) { return o.correct; });
      showCorrect(buttons[ci], false);
    }
    buttons.forEach(function (b, idx) {
      b.addEventListener('click', function () {
        if (cfg.solved) return;
        var o = cfg.options[idx];
        if (o.correct) {
          cfg.solved = true;
          showCorrect(b, true);
          burstAt(b, 70);
          if (cfg.onSolved) cfg.onSolved();
        } else {
          b.classList.remove('shake'); void b.offsetWidth;
          b.classList.add('wrong', 'shake');
          b.disabled = true;
          b.querySelector('.choice-mark').innerHTML = icon('x');
          fb.hidden = false;
          fb.className = 'feedback bad';
          fb.innerHTML = '<div class="fb-title">' + icon('x') + 'Incorrecto</div><p>' + esc(cfg.wrongText || 'Inténtalo de nuevo.') + '</p>';
          if (cfg.onWrong) cfg.onWrong(idx);
        }
      });
    });
    return { buttons: buttons };
  }

  function header(step, extraCls) {
    var hd = h('header', 'act-head' + (extraCls ? ' ' + extraCls : ''));
    if (step.kicker) hd.appendChild(h('div', 'kicker reveal', esc(step.kicker)));
    if (step.title) hd.appendChild(h('h2', 'act-title reveal', esc(step.title)));
    if (step.intro) hd.appendChild(h('p', 'act-intro reveal', esc(step.intro)));
    return hd;
  }

  // Entrada escalonada. Al terminar la animación se quita la clase, para que
  // otras animaciones (sacudida, acierto…) no vuelvan a ocultar el elemento.
  function stagger(root) {
    $$('.reveal', root).forEach(function (n, i) {
      if (!n.style.getPropertyValue('--i')) n.style.setProperty('--i', i);
      n.addEventListener('animationend', function done(e) {
        if (e.target !== n || e.animationName !== 'rise') return;
        n.classList.remove('reveal');
        n.removeEventListener('animationend', done);
      });
    });
  }

  // ------------------------------------------------------------------
  // Renderizadores por tipo de pantalla
  // ------------------------------------------------------------------
  var Renderers = {};

  // ---------- INTRO: sala de espera + audio del capitán ----------
  Renderers.intro = function (ctx) {
    var s = ctx.step;
    Dock.set({ visible: false });
    var resumeIdx = store.current;
    var canResume = resumeIdx > indexOfId('flight-1') && resumeIdx < FLOW.length;
    ctx.el.innerHTML =
      '<div class="bg kenburns" style="background-image:url(\'' + s.bg + '\')"></div>' +
      '<div class="shade"></div>' +
      '<div class="intro-wrap">' +
      '  <div class="intro-tag reveal">' + icon('plane') + '<span>Experiencia interactiva</span></div>' +
      '  <h1 class="intro-title reveal">Correr<br/><span>para Vivir</span></h1>' +
      '  <p class="intro-sub reveal">' + esc(s.subtitle) + '</p>' +
      '  <div class="intro-actions reveal">' +
      '    <button class="btn btn-primary btn-lg" data-act="start" type="button">' + icon('play') + '<span>Comenzar el viaje</span></button>' +
      '    <button class="btn btn-ghost btn-lg" data-act="skip" type="button"><span>Omitir intro</span>' + icon('skip') + '</button>' +
      '  </div>' +
      (canResume ? '  <button class="btn btn-link reveal" data-act="resume" type="button">' + icon('replay') + '<span>Continuar donde quedaste · ' + esc(chapterOf(FLOW[resumeIdx]).short) + '</span></button>' : '') +
      '  <p class="intro-hint reveal">Activa el sonido · Se recomienda usar audífonos</p>' +
      '</div>' +
      '<div class="captain" hidden>' +
      '  <div class="captain-eq"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
      '  <div class="captain-text"><strong>' + esc(s.caption) + '</strong><span>Prepárate: el despegue comenzará en breve</span></div>' +
      '  <div class="captain-bar"><div></div></div>' +
      '</div>';
    stagger(ctx.el);

    var captain = $('.captain', ctx.el);
    var bar = $('.captain-bar div', ctx.el);
    var started = false;

    function start() {
      if (started) return;
      started = true;
      gestureUnlocked = true;
      ctx.el.classList.add('started');
      captain.hidden = false;
      try { Earth.preload(); } catch (e) {}

      var a = document.createElement('audio');
      a.preload = 'auto';
      a.src = s.audio;
      a.muted = Media.isMuted();
      $('#persist').appendChild(a);
      App.carry = { el: a, keep: ['intro', 'takeoff', 'flight-1'] };

      Media.set({ primary: a, members: [a], label: s.caption });
      Dock.set({ visible: true, back: false, skip: { label: 'Omitir intro', fn: App.skipIntro } });

      var failed = false, virtual = 0, last = performance.now();
      a.addEventListener('error', function () { failed = true; });
      safePlay(a).then(function (ok) { if (!ok && a.paused) failed = true; });

      ctx.scope.interval(function () {
        var now = performance.now(), dt = (now - last) / 1000; last = now;
        var tNow;
        if (!failed && a.readyState > 0 && !a.error) { tNow = a.currentTime; }
        else { if (!Media.resumeSet) virtual += dt; tNow = virtual; }
        bar.style.transform = 'scaleX(' + Math.min(1, tNow / s.transitionAt).toFixed(3) + ')';
        if (tNow >= s.transitionAt) ctx.next();
      }, 200);
    }

    ctx.scope.on($('[data-act="start"]', ctx.el), 'click', start);
    ctx.scope.on($('[data-act="skip"]', ctx.el), 'click', function () { gestureUnlocked = true; App.skipIntro(); });
    var rb = $('[data-act="resume"]', ctx.el);
    if (rb) ctx.scope.on(rb, 'click', function () { gestureUnlocked = true; try { Earth.preload(); } catch (e) {} App.jump(resumeIdx); });
    return {};
  };

  // ---------- DESPEGUE: dos videos encadenados sin corte ----------
  Renderers.takeoff = function (ctx) {
    var s = ctx.step;
    var v1 = makeVideo(s.videos[0], { cls: 'fs-video' });
    var v2 = makeVideo(s.videos[1], { cls: 'fs-video is-hidden' });
    ctx.el.appendChild(v1);
    ctx.el.appendChild(v2);
    var play = h('button', 'big-play', '<span class="po-circle">' + icon('play') + '</span><span class="po-text">Toca para continuar</span>');
    play.type = 'button'; play.hidden = true;
    ctx.el.appendChild(play);
    var current = v1;
    var carry = App.carry ? App.carry.el : null;

    Dock.set({ back: false, skip: { label: 'Omitir intro', fn: App.skipIntro } });
    function bind(v) {
      Media.set({ primary: v, members: [v, carry], label: 'Despegue', onBlocked: function () { play.hidden = false; } });
    }
    bind(v1);
    ctx.scope.on(play, 'click', function () { play.hidden = true; safePlay(current); });
    ctx.scope.on(v1, 'playing', function () { play.hidden = true; });
    ctx.scope.on(v1, 'ended', function () {
      current = v2;
      v2.classList.remove('is-hidden');
      v1.classList.add('is-hidden');
      bind(v2);
      safePlay(v2);
    });
    ctx.scope.on(v2, 'playing', function () { play.hidden = true; });
    ctx.scope.on(v2, 'ended', function () { ctx.next(); });
    [v1, v2].forEach(function (v) {
      ctx.scope.on(v, 'error', function () {
        toast('No se pudo cargar el video del despegue. Continuamos el viaje.');
        ctx.scope.timeout(ctx.next, 1200);
      });
    });
    safePlay(v1);
    return {};
  };

  // ---------- VUELO 3D ----------
  Renderers.flight = function (ctx) {
    var s = ctx.step;
    var layer = $('#earth-layer');
    layer.classList.add('on');
    ctx.el.innerHTML = '<div class="flight-loading"><div class="spinner"></div><span>Preparando el vuelo…</span></div>' +
      '<div class="flight-title reveal"><span>' + esc(C.cities[s.from].name) + '</span>' + icon('plane') + '<span>' + esc(C.cities[s.to].name) + '</span></div>';
    var loading = $('.flight-loading', ctx.el);
    Dock.set({ back: false, visible: !!App.carry });
    if (App.carry) Media.set({ primary: App.carry.el, members: [App.carry.el], label: 'Mensaje del capitán' });

    var started = false;
    function fallback() {
      loading.innerHTML = '<div class="center-card"><h2>No se pudo cargar la animación 3D</h2><p>Revisa tu conexión a internet. Puedes continuar el recorrido.</p></div>';
      loading.classList.add('error');
      Dock.set({ next: 'enabled', visible: true });
    }
    Earth.preload().then(function () {
      if (!ctx.scope.alive) return;
      loading.classList.add('done');
      started = true;
      Earth.start({
        origin: C.cities[s.from], destination: C.cities[s.to], code: s.flightCode, duration: 4,
        onArrive: function () { ctx.scope.timeout(ctx.next, 2000); },
      });
    }).catch(function (err) {
      console.error(err);
      if (ctx.scope.alive) fallback();
    });
    return {
      leave: function () {
        if (started || Earth.isReady()) Earth.stop();
        layer.classList.remove('on');
      },
    };
  };

  // ---------- LLEGADA: aeropuerto + López Lomong ----------
  Renderers.dialogue = function (ctx) {
    var s = ctx.step;
    ctx.el.innerHTML =
      '<div class="bg kenburns" style="background-image:url(\'' + s.bg + '\')"></div>' +
      '<div class="shade"></div>' +
      '<img class="character" src="' + s.character + '" alt="' + esc(s.name) + '" />' +
      '<div class="dialogue">' +
      '  <div class="dialogue-name">' + esc(s.name) + '</div>' +
      '  <p class="dialogue-text"><span class="typed"></span><span class="caret"></span></p>' +
      '</div>';
    var typed = $('.typed', ctx.el), box = $('.dialogue', ctx.el), ch = $('.character', ctx.el);
    var full = s.text, i = 0, typing = true, exiting = false;
    Dock.set({ next: 'enabled', nextLabel: 'Continuar' });

    function finishTyping() { typing = false; typed.textContent = full; box.classList.add('done'); }
    ctx.scope.timeout(function () {
      ch.classList.add('in');
      ctx.scope.timeout(function () {
        box.classList.add('in');
        if (REDUCED) { finishTyping(); return; }
        ctx.scope.interval(function () {
          if (!typing) return;
          i++;
          typed.textContent = full.slice(0, i);
          if (i >= full.length) finishTyping();
        }, 30);
      }, 550);
    }, 120);
    ctx.scope.on(box, 'click', function () { if (typing) finishTyping(); });

    return {
      onNext: function () {
        if (typing) { finishTyping(); return true; }
        if (exiting) return true;
        exiting = true;
        box.classList.remove('in');
        ch.classList.add('out');
        ctx.scope.timeout(ctx.next, REDUCED ? 0 : 750);
        return true;
      },
    };
  };

  // ---------- Pantalla dividida: video + pregunta ----------
  function splitLayout(ctx, videoSide) {
    var split = h('div', 'split' + (videoSide === 'right' ? ' video-right' : ''));
    var media = h('div', 'pane-media');
    var content = h('div', 'pane-content');
    split.appendChild(media);
    split.appendChild(content);
    ctx.el.appendChild(split);
    return { media: media, content: content };
  }

  Renderers.videoQuiz = function (ctx) {
    var s = ctx.step, st = ctx.state;
    var L = splitLayout(ctx, s.videoSide);
    var player = createPlayer(ctx, s.video, { label: 'Video' });
    L.media.appendChild(player.el);
    var c = L.content;
    c.appendChild(h('div', 'kicker reveal', esc(s.kicker)));
    c.appendChild(h('h2', 'question reveal', s.question));
    c.appendChild(h('p', 'help reveal', 'Mira el video y elige la respuesta correcta.'));
    mountChoices(c, {
      options: s.options, solved: !!st.solved, explanation: s.explanation, wrongText: s.wrong,
      wrongPicked: st.wrong || [],
      onWrong: function (idx) { st.wrong = (st.wrong || []).concat([idx]); ctx.save(); },
      onSolved: function () { st.solved = true; ctx.save(); ctx.gate(true); toast('¡Correcto! Pulsa «Siguiente» para continuar.', 'ok'); },
    });
    stagger(c);
    ctx.gate(!!st.solved, 'Responde correctamente para continuar');
    return {};
  };

  Renderers.videoText = function (ctx) {
    var s = ctx.step;
    var L = splitLayout(ctx, s.videoSide);
    var player = createPlayer(ctx, s.video, { label: 'Video' });
    L.media.appendChild(player.el);
    var c = L.content;
    c.classList.add('center-y');
    if (s.kicker) c.appendChild(h('div', 'kicker reveal', esc(s.kicker)));
    var body = h('div', 'rich reveal', s.html);
    c.appendChild(body);
    stagger(c);
    ctx.gate(true);
    return {};
  };

  // ---------- Pregunta sin video ----------
  Renderers.quiz = function (ctx) {
    var s = ctx.step, st = ctx.state;
    var wrap = h('div', 'page');
    var card = h('div', 'card card-quiz');
    card.appendChild(h('div', 'kicker reveal', esc(s.kicker)));
    card.appendChild(h('h2', 'question reveal', s.question));
    mountChoices(card, {
      options: s.options, solved: !!st.solved, explanation: s.explanation, wrongText: s.wrong,
      wrongPicked: st.wrong || [],
      onWrong: function (idx) { st.wrong = (st.wrong || []).concat([idx]); ctx.save(); },
      onSolved: function () { st.solved = true; ctx.save(); ctx.gate(true); toast('¡Correcto! Pulsa «Siguiente» para continuar.', 'ok'); },
    });
    wrap.appendChild(card);
    ctx.el.appendChild(wrap);
    stagger(card);
    ctx.gate(!!st.solved, 'Responde correctamente para continuar');
    return {};
  };

  // ---------- Texto de reflexión ----------
  Renderers.text = function (ctx) {
    var s = ctx.step;
    var wrap = h('div', 'page');
    var card = h('div', 'card card-text');
    if (s.kicker) card.appendChild(h('div', 'kicker reveal', esc(s.kicker)));
    card.appendChild(h('div', 'rich reveal', s.html));
    wrap.appendChild(card);
    ctx.el.appendChild(wrap);
    stagger(card);
    ctx.gate(true);
    return {};
  };

  // ---------- Video a pantalla completa (con audio opcional) ----------
  Renderers.cinematic = function (ctx) {
    var s = ctx.step;
    var v = makeVideo(s.video, { cls: 'fs-video', muted: !!s.videoMuted });
    if (s.videoMuted) v.setAttribute('data-force-muted', '');
    ctx.el.appendChild(v);
    var a = null;
    if (s.audio) {
      a = document.createElement('audio');
      a.preload = 'auto';
      a.src = s.audio;
      ctx.el.appendChild(a);
    }
    var vignette = h('div', 'vignette');
    ctx.el.appendChild(vignette);
    if (s.caption) {
      ctx.el.appendChild(h('div', 'cine-caption', '<span class="eq on"><i></i><i></i><i></i><i></i></span><strong>' + esc(s.caption) + '</strong>'));
    }
    var play = h('button', 'big-play', '<span class="po-circle">' + icon('play') + '</span><span class="po-text">Toca para reproducir</span>');
    play.type = 'button'; play.hidden = true;
    ctx.el.appendChild(play);

    var loopsLeft = s.loops || 1, plays = 0;
    var videoDone = false, audioDone = !a, finished = false;
    function maybeFinish() {
      if (finished) return;
      if (videoDone && audioDone) { finished = true; ctx.next(); }
    }
    Media.set({ primary: a || v, members: a ? [v, a] : [v], label: s.caption || '', onBlocked: function () { play.hidden = false; } });
    Dock.set({ skip: { label: 'Saltar', fn: function () { ctx.next(); } } });

    ctx.scope.on(play, 'click', function () { play.hidden = true; safePlay(v); if (a && !audioDone) safePlay(a); });
    ctx.scope.on(v, 'playing', function () { play.hidden = true; ctx.el.classList.add('is-playing'); });
    ctx.scope.on(v, 'ended', function () {
      plays++;
      if (plays < loopsLeft) {
        try { v.currentTime = 0; } catch (e) {}
        safePlay(v);
      } else {
        videoDone = true;
        maybeFinish();
      }
    });
    ctx.scope.on(v, 'error', function () {
      videoDone = true;
      ctx.el.classList.add('no-video');
      if (!a) { toast('No se pudo cargar el video. Continuamos.'); ctx.scope.timeout(ctx.next, 1400); }
      else maybeFinish();
    });
    if (a) {
      ctx.scope.on(a, 'ended', function () { audioDone = true; maybeFinish(); });
      ctx.scope.on(a, 'error', function () { audioDone = true; maybeFinish(); });
    }
    safePlay(v);
    if (a) safePlay(a);
    return {};
  };

  // ---------- E-book con páginas ----------
  Renderers.ebook = function (ctx) {
    var s = ctx.step, st = ctx.state;
    st.page = Math.min(st.page || 0, s.pages.length - 1);
    var wrap = h('div', 'book-wrap');
    var book = h('div', 'book');
    var pages = s.pages.map(function (pg, i) {
      var p = h('article', 'book-page');
      p.innerHTML =
        '<div class="book-meta"><span>' + icon('book') + 'E-book</span><span>Página ' + (i + 1) + ' de ' + s.pages.length + '</span></div>' +
        '<h1 class="book-title">' + esc(pg.title) + '</h1>' +
        pg.paragraphs.map(function (t, k) { return '<p' + (k === 0 ? ' class="dropcap"' : '') + '>' + esc(t) + '</p>'; }).join('');
      book.appendChild(p);
      return p;
    });
    var nav = h('div', 'book-nav');
    var prevB = h('button', 'btn btn-ghost btn-sm', icon('left') + '<span>Página anterior</span>');
    var nextB = h('button', 'btn btn-ghost btn-sm', '<span>Página siguiente</span>' + icon('right'));
    prevB.type = nextB.type = 'button';
    var dots = h('div', 'book-dots');
    s.pages.forEach(function (_, i) {
      var d = h('button', 'dot'); d.type = 'button'; d.setAttribute('aria-label', 'Ir a la página ' + (i + 1));
      d.addEventListener('click', function () { show(i); });
      dots.appendChild(d);
    });
    nav.appendChild(prevB); nav.appendChild(dots); nav.appendChild(nextB);
    wrap.appendChild(book); wrap.appendChild(nav);
    ctx.el.appendChild(wrap);

    function show(i, dir) {
      var prevPage = st.page;
      st.page = i; ctx.save();
      pages.forEach(function (p, k) {
        p.classList.remove('active', 'flip-in-next', 'flip-in-prev');
        if (k === i) {
          p.classList.add('active');
          if (dir) p.classList.add(dir > 0 ? 'flip-in-next' : 'flip-in-prev');
        }
      });
      $$('.dot', dots).forEach(function (d, k) { d.classList.toggle('on', k === i); });
      prevB.disabled = i === 0;
      nextB.disabled = i === s.pages.length - 1;
      var last = i === s.pages.length - 1;
      Dock.set({ next: 'enabled', nextLabel: last ? 'Siguiente' : 'Siguiente página', back: i > 0 || App.prevContentIndex(App.index) >= 0 });
      if (prevPage !== i) { try { ctx.el.scrollTop = 0; book.scrollTop = 0; } catch (e) {} }
    }
    prevB.addEventListener('click', function () { if (st.page > 0) show(st.page - 1, -1); });
    nextB.addEventListener('click', function () { if (st.page < s.pages.length - 1) show(st.page + 1, 1); });
    show(st.page);
    return {
      onNext: function () { if (st.page < s.pages.length - 1) { show(st.page + 1, 1); return true; } return false; },
      onBack: function () { if (st.page > 0) { show(st.page - 1, -1); return true; } return false; },
    };
  };

  // ---------- Sopa de letras ----------
  Renderers.wordsearch = function (ctx) {
    var s = ctx.step, st = ctx.state;
    var wrap = h('div', 'page page-wide');
    var card = h('div', 'card card-game');
    card.appendChild(header(s));
    var host = h('div', 'game-host reveal');
    card.appendChild(host);
    wrap.appendChild(card);
    ctx.el.appendChild(wrap);
    st.ws = st.ws || {};
    Games.wordsearch(host, { words: s.words, seed: s.id }, st.ws, {
      onFound: function (w) { ctx.save(); toast('¡Encontraste «' + w + '»!', 'ok'); },
      onComplete: function (r) {
        st.solved = true; ctx.save();
        ctx.gate(true);
        if (!r.revealed) { burstAt(host, 120); toast('¡Sopa de letras completada!', 'ok'); }
      },
    });
    stagger(card);
    ctx.gate(!!st.solved, 'Encuentra todas las palabras (o revela la solución) para continuar');
    return {};
  };

  // ---------- Crucigrama ----------
  Renderers.crossword = function (ctx) {
    var s = ctx.step, st = ctx.state;
    var wrap = h('div', 'page page-wide');
    var card = h('div', 'card card-game');
    card.appendChild(header(s));
    var host = h('div', 'game-host reveal');
    card.appendChild(host);
    wrap.appendChild(card);
    ctx.el.appendChild(wrap);
    st.cw = st.cw || {};
    Games.crossword(host, { entries: s.entries }, st.cw, {
      onChange: function () { ctx.save(); },
      onToast: function (m) { toast(m); },
      onComplete: function (r) {
        st.solved = true; ctx.save();
        ctx.gate(true);
        if (!r.revealed) { burstAt(host, 120); toast('¡Crucigrama completado!', 'ok'); }
      },
    });
    stagger(card);
    ctx.gate(!!st.solved, 'Completa el crucigrama (o revela la solución) para continuar');
    return {};
  };

  // ---------- Clasificar y emparejar (actividades sin sopa ni crucigrama) ----------
  function simpleGame(kind, hint) {
    return function (ctx) {
      var s = ctx.step, st = ctx.state;
      var wrap = h('div', 'page page-wide');
      var card = h('div', 'card card-game');
      card.appendChild(header(s));
      var host = h('div', 'game-host reveal');
      card.appendChild(host);
      wrap.appendChild(card);
      ctx.el.appendChild(wrap);
      st.g = st.g || {};
      var cfg = { seed: s.id, wrongText: s.wrong };
      if (kind === 'sort') { cfg.cards = s.cards; cfg.bins = s.bins; }
      else { cfg.pairs = s.pairs; }
      Games[kind](host, cfg, st.g, {
        icon: icon,
        onFeedback: function (good, msg) { if (window.innerWidth < 900) toast(msg, good ? 'ok' : ''); },
        onChange: function () { ctx.save(); },
        onComplete: function (r) {
          st.solved = true; ctx.save();
          ctx.gate(true);
          if (!r.revealed) { burstAt(host, 120); toast('¡Actividad completada!', 'ok'); }
        },
      });
      stagger(card);
      ctx.gate(!!st.solved, hint);
      return {};
    };
  }
  Renderers.sort = simpleGame('sort', 'Clasifica todas las tarjetas (o revela la solución) para continuar');
  Renderers.match = simpleGame('match', 'Forma todas las parejas (o revela la solución) para continuar');

  // ---------- Portada de sección ----------
  Renderers.section = function (ctx) {
    var s = ctx.step;
    ctx.el.innerHTML =
      '<div class="sec-bg"><span class="sec-stripe"></span><span class="sec-stripe s2"></span><span class="sec-num">' + esc(s.number) + '</span></div>' +
      '<div class="sec-wrap">' +
      '  <div class="kicker reveal">Sección ' + esc(s.number) + '</div>' +
      '  <h1 class="sec-title reveal">' + esc(s.title) + '</h1>' +
      '  <p class="sec-tagline reveal">' + esc(s.tagline) + '</p>' +
      '  <blockquote class="sec-quote reveal"><p>«' + esc(s.quote) + '»</p><cite>— ' + esc(s.quoteAuthor) + '</cite></blockquote>' +
      '  <div class="sec-steps reveal"><span class="sec-steps-t">En esta sección</span><ol>' +
      s.steps.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></div>' +
      '  <p class="sec-sources reveal">Basado en: ' + esc(s.sources) + '</p>' +
      '</div>';
    stagger(ctx.el);
    ctx.gate(true);
    Dock.set({ nextLabel: 'Empezar' });
    return {};
  };

  // ---------- Página de información ----------
  function renderBlock(b) {
    var out = h('div', 'blk blk-' + b.type + ' reveal');
    if (b.title) out.appendChild(h('h3', 'blk-title', esc(b.title)));
    var row;
    switch (b.type) {
      case 'pair':
      case 'cards':
        row = h('div', b.type === 'pair' ? 'pair' : 'cards');
        b.items.forEach(function (it) {
          row.appendChild(h('div', 'mini-card', '<span class="mc-ico">' + icon(it.icon) + '</span><div><h4>' + esc(it.title) + '</h4><p>' + it.text + '</p></div>'));
        });
        out.appendChild(row);
        break;
      case 'callout':
        out.innerHTML = '<span class="mc-ico">' + icon(b.icon || 'spark') + '</span><p>' + b.text + '</p>';
        break;
      case 'types':
        row = h('div', 'types');
        b.items.forEach(function (it) {
          row.appendChild(h('div', 'type-card',
            '<div class="tc-head"><h4>' + esc(it.name) + '</h4><span class="tc-virtue">' + esc(it.virtue) + '</span></div>' +
            '<div class="tc-bars"><span>Competencia <b class="' + (it.comp === 'Alta' ? 'hi' : 'lo') + '">' + esc(it.comp) + '</b></span><span>Merecimiento <b class="' + (it.mer === 'Alto' ? 'hi' : 'lo') + '">' + esc(it.mer) + '</b></span></div>' +
            '<p>' + it.text + '</p>'));
        });
        out.appendChild(row);
        break;
      case 'roots':
        row = h('div', 'roots');
        b.items.forEach(function (it, i) {
          row.appendChild(h('div', 'root-item', '<span class="mc-ico">' + icon(it.icon) + '</span><h4>' + esc(it.title) + '</h4><p>' + it.text + '</p>'));
          if (i < b.items.length - 1) row.appendChild(h('span', 'root-plus', '+'));
        });
        out.appendChild(row);
        break;
      case 'levels':
        row = h('ol', 'levels');
        b.items.forEach(function (it, i) {
          row.appendChild(h('li', 'level', '<span class="lv-n">' + (i + 1) + '</span><div><h4>' + esc(it.title) + '</h4><p>' + it.text + '</p></div>'));
        });
        out.appendChild(row);
        break;
      case 'decalogue':
        row = h('ol', 'decalogue');
        b.items.forEach(function (it, i) {
          row.appendChild(h('li', 'dec-item', '<span class="dec-n">' + (i + 1) + '</span><div><h4>' + esc(it.title) + '</h4><p>' + esc(it.text) + '</p></div>'));
        });
        out.appendChild(row);
        break;
      case 'pillars':
      case 'moths':
        row = h('div', b.type === 'pillars' ? 'pillars' : 'moths');
        b.items.forEach(function (it) {
          row.appendChild(h('div', 'pm-item', '<h4>' + esc(it.title) + '</h4><p>' + esc(it.text) + '</p>'));
        });
        out.appendChild(row);
        break;
    }
    return out;
  }

  Renderers.info = function (ctx) {
    var s = ctx.step;
    var wrap = h('div', 'page page-wide');
    var paper = h('article', 'paper');
    paper.innerHTML =
      '<div class="paper-top"><span class="kicker">' + esc(s.kicker) + '</span><span class="paper-page">' + esc(s.page) + '</span></div>' +
      '<h1 class="paper-title reveal">' + esc(s.title) + '</h1>' +
      '<p class="paper-lead reveal">' + s.lead + '</p>';
    s.blocks.forEach(function (b) { paper.appendChild(renderBlock(b)); });
    wrap.appendChild(paper);
    ctx.el.appendChild(wrap);
    stagger(paper);
    ctx.gate(true);
    return {};
  };

  // ---------- Serie de preguntas de selección múltiple ----------
  Renderers.mcq = function (ctx) {
    var s = ctx.step, st = ctx.state;
    st.q = st.q || {};
    var wrap = h('div', 'page');
    var card = h('div', 'card card-mcq');
    card.appendChild(header(s));
    var prog = h('div', 'mcq-progress reveal');
    card.appendChild(prog);
    var letters = ['A', 'B', 'C', 'D', 'E'];
    function solvedCount() { return s.questions.filter(function (_, i) { return st.q[i] && st.q[i].solved; }).length; }
    function refresh() {
      var n = solvedCount();
      prog.innerHTML = '<div class="mcq-bar"><i style="transform:scaleX(' + (n / s.questions.length) + ')"></i></div><span><strong>' + n + '</strong> de ' + s.questions.length + ' respondidas correctamente</span>';
      if (n === s.questions.length) {
        if (!st.solved) { st.solved = true; ctx.save(); FX.burst(null, null, 130); toast('¡Excelente! Respondiste todas correctamente.', 'ok'); }
        ctx.gate(true);
      }
    }
    s.questions.forEach(function (q, qi) {
      var qs = st.q[qi] || (st.q[qi] = {});
      var box = h('section', 'mcq-q reveal');
      box.appendChild(h('h3', 'mcq-title', '<span class="mcq-n">' + (qi + 1) + '</span>' + esc(q.q)));
      mountChoices(box, {
        options: q.options.map(function (t, i) { return { letter: letters[i], text: esc(t), correct: i === q.correct }; }),
        solved: !!qs.solved, explanation: esc(q.explanation), wrongText: s.wrong, wrongPicked: qs.wrong || [],
        onWrong: function (idx) { qs.wrong = (qs.wrong || []).concat([idx]); ctx.save(); },
        onSolved: function () { qs.solved = true; ctx.save(); refresh(); },
      });
      card.appendChild(box);
    });
    wrap.appendChild(card);
    ctx.el.appendChild(wrap);
    stagger(card);
    refresh();
    if (!st.solved) ctx.gate(false, 'Responde correctamente todas las preguntas para continuar');
    return {};
  };

  // ---------- Preguntas de reflexión ----------
  Renderers.reflection = function (ctx) {
    var s = ctx.step;
    var answers = store.reflections[s.id] || (store.reflections[s.id] = {});
    var wrap = h('div', 'page');
    var card = h('div', 'card card-refl');
    card.appendChild(header(s));
    s.questions.forEach(function (q, qi) {
      var box = h('label', 'refl-q reveal');
      box.innerHTML = '<span class="refl-n">' + (qi + 1) + '</span><span class="refl-text">' + esc(q) + '</span>';
      var ta = h('textarea', 'refl-input');
      ta.rows = 3;
      ta.placeholder = 'Escribe aquí tu reflexión (opcional)…';
      ta.value = answers[qi] || '';
      var status = h('span', 'refl-status', ta.value ? 'Guardado' : '');
      ctx.scope.on(ta, 'input', function () {
        answers[qi] = ta.value;
        status.textContent = 'Guardando…';
        saveStore();
        ctx.scope.timeout(function () { status.textContent = ta.value ? 'Guardado' : ''; }, 500);
      });
      box.appendChild(ta);
      box.appendChild(status);
      card.appendChild(box);
    });
    wrap.appendChild(card);
    ctx.el.appendChild(wrap);
    stagger(card);
    ctx.gate(true);
    return {};
  };

  // ---------- Final ----------
  function reflectionsText() {
    var lines = ['CORRER PARA VIVIR — MIS REFLEXIONES', 'Fecha: ' + new Date().toLocaleDateString('es-CO'), ''];
    var any = false;
    FLOW.forEach(function (s) {
      if (s.type !== 'reflection') return;
      var ans = store.reflections[s.id] || {};
      lines.push('== ' + chapterOf(s).title + ' ==');
      s.questions.forEach(function (q, i) {
        lines.push((i + 1) + '. ' + q);
        lines.push('   ' + (ans[i] ? ans[i].replace(/\n/g, '\n   ') : '(sin respuesta)'));
        if (ans[i]) any = true;
        lines.push('');
      });
    });
    return { text: lines.join('\n'), any: any };
  }

  Renderers.final = function (ctx) {
    var s = ctx.step;
    var games = 0, gamesDone = 0, quizzes = 0, quizzesDone = 0;
    var sections = FLOW.filter(function (x) { return x.type === 'section'; }).length;
    FLOW.forEach(function (x) {
      var stt = store.steps[x.id] || {};
      if (x.type === 'wordsearch' || x.type === 'crossword' || x.type === 'sort' || x.type === 'match') { games++; if (stt.solved) gamesDone++; }
      if (x.type === 'videoQuiz' || x.type === 'quiz' || x.type === 'mcq') { quizzes++; if (stt.solved) quizzesDone++; }
    });
    ctx.el.innerHTML =
      '<div class="final-wrap">' +
      '  <div class="final-badge">' + icon('check') + '</div>' +
      '  <h1 class="final-title reveal">' + esc(s.title) + '</h1>' +
      '  <p class="final-text reveal">' + esc(s.text) + '</p>' +
      '  <div class="final-stats reveal">' +
      '    <div><strong>' + gamesDone + '/' + games + '</strong><span>juegos y actividades</span></div>' +
      '    <div><strong>' + quizzesDone + '/' + quizzes + '</strong><span>evaluaciones superadas</span></div>' +
      '    <div><strong>' + sections + '</strong><span>secciones exploradas</span></div>' +
      '  </div>' +
      '  <div class="final-actions reveal">' +
      '    <button class="btn btn-primary" data-act="dl" type="button">' + icon('download') + '<span>Descargar mis reflexiones</span></button>' +
      '    <button class="btn btn-ghost" data-act="menu" type="button">' + icon('menu') + '<span>Ver capítulos</span></button>' +
      '    <button class="btn btn-ghost" data-act="again" type="button">' + icon('replay') + '<span>Volver a empezar</span></button>' +
      '  </div>' +
      '</div>';
    stagger(ctx.el);
    ctx.scope.timeout(function () { FX.burst(null, window.innerHeight * 0.35, 160); }, 500);
    ctx.scope.on($('[data-act="dl"]', ctx.el), 'click', function () {
      var r = reflectionsText();
      if (!r.any) toast('Aún no escribiste reflexiones, pero igual puedes descargar las preguntas.');
      try {
        var blob = new Blob([r.text], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'mis-reflexiones-correr-para-vivir.txt';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      } catch (e) { toast('No se pudo descargar el archivo en este navegador.'); }
    });
    ctx.scope.on($('[data-act="menu"]', ctx.el), 'click', function () { Top.open(); });
    ctx.scope.on($('[data-act="again"]', ctx.el), 'click', function () { App.jump(0); });
    return {};
  };

  Renderers.unknown = function (ctx) {
    ctx.el.innerHTML = '<div class="center-card"><h2>Pantalla no disponible</h2></div>';
    ctx.gate(true);
    return {};
  };

  // ------------------------------------------------------------------
  // Teclado
  // ------------------------------------------------------------------
  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented) return;
    var t = e.target;
    var typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (e.key === 'Escape' && Top.isOpen()) { Top.close(); return; }
    if (typing || Top.isOpen()) return;
    var d = Dock.get();
    if (e.key === 'ArrowRight') {
      if (d.next === 'enabled' && !$('#btn-next').hidden) { e.preventDefault(); App.next(); }
    } else if (e.key === 'ArrowLeft') {
      if (!$('#btn-back').hidden) { e.preventDefault(); App.back(); }
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      var onButton = t && t.tagName === 'BUTTON';
      var inDock = onButton && t.closest && (t.closest('#dock') || t.closest('.player') || t.closest('.big-play'));
      if (Media.members.length && (!onButton || inDock)) { e.preventDefault(); Media.toggle(); }
    } else if (e.key === 'm' || e.key === 'M') {
      if (Media.members.length) Media.toggleMute();
    }
  });

  window.addEventListener('error', function (e) { console.error('Error:', e.message); });

  // Interfaz de prueba (solo con ?test=1 en la URL)
  if (/[?&]test=1/.test(location.search)) {
    window.__app = {
      App: App, Media: Media, store: function () { return store; }, flow: FLOW, Dock: Dock,
      index: function () { return App.index; },
      step: function () { return FLOW[App.index]; },
    };
  }

  // ------------------------------------------------------------------
  // Arranque
  // ------------------------------------------------------------------
  App.go(0, { force: true });
})();
