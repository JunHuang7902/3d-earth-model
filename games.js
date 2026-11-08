/* ============================================================================
   Correr para Vivir — MINIJUEGOS
   ----------------------------------------------------------------------------
   Sopa de letras y crucigrama. Ambos se generan de forma DETERMINISTA (misma
   semilla => mismo tablero), así al volver a una pantalla el juego conserva
   su forma y el progreso guardado sigue siendo válido.
============================================================================ */
(function () {
  'use strict';

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------
  function norm(s) {
    return String(s || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toUpperCase().replace(/[^A-Z]/g, '');
  }

  function hashStr(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return (h >>> 0) || 1;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  // ==================================================================
  // SOPA DE LETRAS — generador
  // ==================================================================
  var WS_DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1]]; // →, ↓, ↘, ↗ (lectura natural)
  var FILL = 'AAAAABBCCCDDDEEEEEEFGGHIIIIJLLLLMMNNNNOOOOOPPQRRRRSSSSTTTTUUUVZ';

  function buildWordSearch(rawWords, seedStr) {
    var words = rawWords.map(norm).filter(Boolean);
    var sorted = words.slice().sort(function (a, b) { return b.length - a.length; });
    var maxLen = sorted[0].length;
    var total = words.reduce(function (s, w) { return s + w.length; }, 0);
    var size = Math.max(maxLen, Math.ceil(Math.sqrt(total * 1.9)), 10);
    var rng = mulberry32(hashStr(seedStr || words.join('')));
    var grid, placements;

    for (var attempt = 0; attempt < 120; attempt++) {
      if (attempt > 0 && attempt % 20 === 0) size++;
      grid = [];
      for (var i = 0; i < size; i++) { grid.push(new Array(size).fill(null)); }
      placements = [];
      var ok = true;
      var base = Math.floor(rng() * WS_DIRS.length);
      for (var wi = 0; wi < sorted.length && ok; wi++) {
        var w = sorted[wi];
        var placed = false;
        for (var t = 0; t < 500 && !placed; t++) {
          // primero se intenta una dirección rotativa (variedad), luego cualquiera
          var d = t < 200 ? WS_DIRS[(base + wi) % WS_DIRS.length] : WS_DIRS[Math.floor(rng() * WS_DIRS.length)];
          var dr = d[0], dc = d[1], L = w.length;
          var rMin = dr < 0 ? L - 1 : 0;
          var rMax = dr > 0 ? size - L : size - 1;
          var cMax = dc > 0 ? size - L : size - 1;
          if (rMax < rMin || cMax < 0) continue;
          var r0 = rMin + Math.floor(rng() * (rMax - rMin + 1));
          var c0 = Math.floor(rng() * (cMax + 1));
          var fits = true;
          for (var k = 0; k < L; k++) {
            var ch = grid[r0 + dr * k][c0 + dc * k];
            if (ch !== null && ch !== w[k]) { fits = false; break; }
          }
          if (!fits) continue;
          var cells = [];
          for (var k2 = 0; k2 < L; k2++) {
            grid[r0 + dr * k2][c0 + dc * k2] = w[k2];
            cells.push([r0 + dr * k2, c0 + dc * k2]);
          }
          placements.push({ word: w, cells: cells });
          placed = true;
        }
        if (!placed) ok = false;
      }
      if (ok) break;
    }

    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        if (grid[r][c] === null) grid[r][c] = FILL[Math.floor(rng() * FILL.length)];
      }
    }
    return { size: size, grid: grid, placements: placements, words: words };
  }

  // ==================================================================
  // SOPA DE LETRAS — componente interactivo
  // ==================================================================
  function mountWordSearch(root, cfg, state, hooks) {
    var data = buildWordSearch(cfg.words, cfg.seed);
    var n = data.size;
    state.found = state.found || [];

    var wrap = el('div', 'ws');
    var boardWrap = el('div', 'ws-board-wrap');
    var board = el('div', 'ws-board');
    board.style.setProperty('--n', n);
    board.setAttribute('role', 'grid');
    board.setAttribute('aria-label', 'Sopa de letras');

    var cellEls = [];
    for (var r = 0; r < n; r++) {
      cellEls.push([]);
      for (var c = 0; c < n; c++) {
        var cell = el('div', 'ws-cell', data.grid[r][c]);
        cell.dataset.r = r; cell.dataset.c = c;
        board.appendChild(cell);
        cellEls[r].push(cell);
      }
    }

    var SVGNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'ws-lines');
    svg.setAttribute('viewBox', '0 0 ' + n + ' ' + n);
    svg.setAttribute('preserveAspectRatio', 'none');
    var selLine = document.createElementNS(SVGNS, 'line');
    selLine.setAttribute('class', 'ws-sel-line');
    svg.appendChild(selLine);

    boardWrap.appendChild(board);
    boardWrap.appendChild(svg);

    var side = el('div', 'ws-side');
    var counter = el('div', 'ws-counter');
    var list = el('ul', 'ws-words');
    data.words.forEach(function (w) {
      var li = el('li', 'ws-word', w);
      li.dataset.w = w;
      list.appendChild(li);
    });
    var actions = el('div', 'game-actions');
    var revealBtn = el('button', 'btn btn-ghost btn-sm', 'Revelar solución');
    revealBtn.type = 'button';
    actions.appendChild(revealBtn);
    side.appendChild(counter);
    side.appendChild(list);
    side.appendChild(actions);

    wrap.appendChild(boardWrap);
    wrap.appendChild(side);
    root.appendChild(wrap);

    function lineFor(a, b, cls) {
      var line = document.createElementNS(SVGNS, 'line');
      line.setAttribute('x1', a[1] + 0.5); line.setAttribute('y1', a[0] + 0.5);
      line.setAttribute('x2', b[1] + 0.5); line.setAttribute('y2', b[0] + 0.5);
      line.setAttribute('class', cls);
      return line;
    }

    function markFound(entry, animate) {
      var line = lineFor(entry.a, entry.b, 'ws-found-line' + (animate ? ' pop' : ''));
      svg.insertBefore(line, selLine);
      pathCells(entry.a, entry.b).forEach(function (p) { cellEls[p[0]][p[1]].classList.add('found'); });
      var li = list.querySelector('[data-w="' + entry.w + '"]');
      if (li) li.classList.add('done');
    }

    function refreshCounter() {
      counter.innerHTML = '<strong>' + state.found.length + '</strong> / ' + data.words.length + ' palabras';
    }

    function pathCells(a, b) {
      var dr = Math.sign(b[0] - a[0]), dc = Math.sign(b[1] - a[1]);
      var len = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
      var out = [];
      for (var k = 0; k <= len; k++) out.push([a[0] + dr * k, a[1] + dc * k]);
      return out;
    }

    function snapEnd(a, rc) {
      var dr = rc[0] - a[0], dc = rc[1] - a[1];
      if (dr === 0 && dc === 0) return a;
      var ang = Math.atan2(dr, dc);
      var oct = Math.round(ang / (Math.PI / 4));
      var sdr = Math.round(Math.sin(oct * Math.PI / 4));
      var sdc = Math.round(Math.cos(oct * Math.PI / 4));
      var len = Math.max(Math.abs(dr), Math.abs(dc));
      // recorta para no salir del tablero
      while (len > 0) {
        var er = a[0] + sdr * len, ec = a[1] + sdc * len;
        if (er >= 0 && er < n && ec >= 0 && ec < n) return [er, ec];
        len--;
      }
      return a;
    }

    function isFound(w) {
      return state.found.some(function (f) { return f.w === w; });
    }

    function evaluate(a, b) {
      var cells = pathCells(a, b);
      if (cells.length < 2) return false;
      var s = cells.map(function (p) { return data.grid[p[0]][p[1]]; }).join('');
      var rev = s.split('').reverse().join('');
      for (var i = 0; i < data.words.length; i++) {
        var w = data.words[i];
        if (isFound(w)) continue;
        if (w === s || w === rev) {
          var entry = { w: w, a: a, b: b };
          state.found.push(entry);
          markFound(entry, true);
          refreshCounter();
          if (hooks.onFound) hooks.onFound(w);
          if (state.found.length === data.words.length) finish(false);
          return true;
        }
      }
      return false;
    }

    function finish(revealed) {
      wrap.classList.add('complete');
      revealBtn.disabled = true;
      if (hooks.onComplete) hooks.onComplete({ revealed: revealed });
    }

    function revealAll() {
      data.placements.forEach(function (p) {
        if (isFound(p.word)) return;
        var entry = { w: p.word, a: p.cells[0], b: p.cells[p.cells.length - 1], revealed: true };
        state.found.push(entry);
        markFound(entry, true);
      });
      state.revealed = true;
      refreshCounter();
      finish(true);
    }

    // ---- interacción ----
    var start = null, anchor = null, current = null, dragging = false, moved = false;

    function cellFromPoint(x, y) {
      var t = document.elementFromPoint(x, y);
      var cEl = t && t.closest ? t.closest('.ws-cell') : null;
      if (!cEl || !board.contains(cEl)) return null;
      return [parseInt(cEl.dataset.r, 10), parseInt(cEl.dataset.c, 10)];
    }

    function showSel(a, b) {
      selLine.setAttribute('x1', a[1] + 0.5); selLine.setAttribute('y1', a[0] + 0.5);
      selLine.setAttribute('x2', b[1] + 0.5); selLine.setAttribute('y2', b[0] + 0.5);
      selLine.classList.add('on');
      board.querySelectorAll('.ws-cell.sel').forEach(function (x) { x.classList.remove('sel'); });
      pathCells(a, b).forEach(function (p) { cellEls[p[0]][p[1]].classList.add('sel'); });
    }
    function clearSel() {
      selLine.classList.remove('on');
      board.querySelectorAll('.ws-cell.sel').forEach(function (x) { x.classList.remove('sel'); });
    }

    function flashMiss() {
      wrap.classList.remove('miss'); void wrap.offsetWidth; wrap.classList.add('miss');
    }

    board.addEventListener('pointerdown', function (e) {
      if (wrap.classList.contains('complete')) return;
      var rc = cellFromPoint(e.clientX, e.clientY);
      if (!rc) return;
      e.preventDefault();
      if (anchor && (anchor[0] !== rc[0] || anchor[1] !== rc[1])) {
        var end = snapEnd(anchor, rc);
        var ok = evaluate(anchor, end);
        anchor = null; clearSel();
        if (!ok) flashMiss();
        return;
      }
      start = rc; current = rc; dragging = true; moved = false;
      try { board.setPointerCapture(e.pointerId); } catch (err) {}
      showSel(start, start);
    });

    board.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var rc = cellFromPoint(e.clientX, e.clientY);
      if (!rc) return;
      var end = snapEnd(start, rc);
      if (end[0] !== current[0] || end[1] !== current[1]) {
        current = end; moved = true;
        showSel(start, current);
      }
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      if (!moved || (current[0] === start[0] && current[1] === start[1])) {
        // modo "dos toques": la primera letra queda marcada como ancla
        anchor = start;
        showSel(start, start);
        return;
      }
      var ok = evaluate(start, current);
      clearSel();
      if (!ok) flashMiss();
    }
    board.addEventListener('pointerup', endDrag);
    board.addEventListener('pointercancel', function () { dragging = false; clearSel(); });

    revealBtn.addEventListener('click', revealAll);

    // ---- restaurar progreso guardado ----
    state.found.forEach(function (f) { markFound(f, false); });
    refreshCounter();
    if (state.found.length >= data.words.length) {
      wrap.classList.add('complete');
      revealBtn.disabled = true;
    }

    return {
      complete: function () { return state.found.length >= data.words.length; },
      solveAll: revealAll,
      data: data,
    };
  }

  // ==================================================================
  // CRUCIGRAMA — generador determinista
  // ==================================================================
  function buildCrossword(entries) {
    var words = entries.map(function (e, i) { return { answer: norm(e.answer), clue: e.clue, i: i }; });
    var order = words.slice().sort(function (a, b) { return (b.answer.length - a.answer.length) || (a.i - b.i); });
    var cells = {};
    var placed = [];
    function k(r, c) { return r + ',' + c; }
    function get(r, c) { return cells[k(r, c)]; }

    function canPlace(w, r, c, dir) {
      var L = w.length, dr = dir === 'down' ? 1 : 0, dc = dir === 'across' ? 1 : 0;
      if (get(r - dr, c - dc)) return -1;
      if (get(r + dr * L, c + dc * L)) return -1;
      var inter = 0;
      for (var i = 0; i < L; i++) {
        var rr = r + dr * i, cc = c + dc * i;
        var cell = get(rr, cc);
        if (cell) {
          if (cell.ch !== w[i]) return -1;
          if (cell[dir] != null) return -1;
          inter++;
        } else if (dir === 'across') {
          if (get(rr - 1, cc) || get(rr + 1, cc)) return -1;
        } else {
          if (get(rr, cc - 1) || get(rr, cc + 1)) return -1;
        }
      }
      return inter;
    }

    function bounds(extra) {
      var minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
      Object.keys(cells).forEach(function (key) {
        var p = key.split(',');
        var r = +p[0], c = +p[1];
        if (r < minR) minR = r; if (r > maxR) maxR = r;
        if (c < minC) minC = c; if (c > maxC) maxC = c;
      });
      if (extra) {
        extra.forEach(function (p) {
          if (p[0] < minR) minR = p[0]; if (p[0] > maxR) maxR = p[0];
          if (p[1] < minC) minC = p[1]; if (p[1] > maxC) maxC = p[1];
        });
      }
      return { minR: minR, maxR: maxR, minC: minC, maxC: maxC };
    }

    function place(w, r, c, dir) {
      var dr = dir === 'down' ? 1 : 0, dc = dir === 'across' ? 1 : 0;
      var idx = placed.length;
      for (var i = 0; i < w.answer.length; i++) {
        var key = k(r + dr * i, c + dc * i);
        if (!cells[key]) cells[key] = { ch: w.answer[i], across: null, down: null };
        cells[key][dir] = idx;
      }
      placed.push({ answer: w.answer, clue: w.clue, i: w.i, r: r, c: c, dir: dir });
    }

    if (!order.length) return { rows: 0, cols: 0, words: [], cells: [], unplaced: [] };
    place(order[0], 0, 0, 'across');
    var pending = order.slice(1);
    var progress = true;
    while (pending.length && progress) {
      progress = false;
      for (var pi = 0; pi < pending.length; pi++) {
        var w = pending[pi];
        var best = null;
        var acrossCount = placed.filter(function (p) { return p.dir === 'across'; }).length;
        for (var qi = 0; qi < placed.length; qi++) {
          var p = placed[qi];
          for (var a = 0; a < p.answer.length; a++) {
            for (var b = 0; b < w.answer.length; b++) {
              if (p.answer[a] !== w.answer[b]) continue;
              var dir = p.dir === 'across' ? 'down' : 'across';
              var pr = p.r + (p.dir === 'down' ? a : 0);
              var pc = p.c + (p.dir === 'across' ? a : 0);
              var r = dir === 'down' ? pr - b : pr;
              var c = dir === 'across' ? pc - b : pc;
              var inter = canPlace(w.answer, r, c, dir);
              if (inter <= 0) continue;
              var endR = r + (dir === 'down' ? w.answer.length - 1 : 0);
              var endC = c + (dir === 'across' ? w.answer.length - 1 : 0);
              var bb = bounds([[r, c], [endR, endC]]);
              var h = bb.maxR - bb.minR + 1, wd = bb.maxC - bb.minC + 1;
              var balance = dir === 'across' ? (acrossCount > placed.length / 2 ? -6 : 6) : (acrossCount > placed.length / 2 ? 6 : -6);
              var score = inter * 1000 - h * wd - Math.abs(h - wd) * 4 + balance;
              if (!best || score > best.score) best = { r: r, c: c, dir: dir, score: score };
            }
          }
        }
        if (best) {
          place(w, best.r, best.c, best.dir);
          pending.splice(pi, 1);
          pi--;
          progress = true;
        }
      }
    }

    var bb2 = bounds();
    var rows = bb2.maxR - bb2.minR + 1, cols = bb2.maxC - bb2.minC + 1;
    placed.forEach(function (p) { p.r -= bb2.minR; p.c -= bb2.minC; });
    var cellList = [];
    var map = {};
    Object.keys(cells).forEach(function (key) {
      var parts = key.split(',');
      var cr = +parts[0] - bb2.minR, cc = +parts[1] - bb2.minC;
      var obj = { r: cr, c: cc, ch: cells[key].ch, num: null };
      map[cr + ',' + cc] = obj;
      cellList.push(obj);
    });
    cellList.sort(function (x, y) { return (x.r - y.r) || (x.c - y.c); });
    var num = 0;
    var startNums = {};
    cellList.forEach(function (cell) {
      var starts = placed.filter(function (p) { return p.r === cell.r && p.c === cell.c; });
      if (starts.length) {
        num++;
        cell.num = num;
        startNums[cell.r + ',' + cell.c] = num;
      }
    });
    placed.forEach(function (p) {
      p.num = startNums[p.r + ',' + p.c];
      p.cells = [];
      for (var i = 0; i < p.answer.length; i++) {
        p.cells.push([p.r + (p.dir === 'down' ? i : 0), p.c + (p.dir === 'across' ? i : 0)]);
      }
    });
    placed.sort(function (x, y) { return (x.num - y.num) || (x.dir === 'across' ? -1 : 1); });
    return { rows: rows, cols: cols, words: placed, cells: cellList, map: map, unplaced: pending };
  }

  // ==================================================================
  // CRUCIGRAMA — componente interactivo
  // ==================================================================
  function mountCrossword(root, cfg, state, hooks) {
    var data = buildCrossword(cfg.entries);
    state.letters = state.letters || {};
    var wrap = el('div', 'cw');
    var boardWrap = el('div', 'cw-board-wrap');
    var board = el('div', 'cw-board');
    board.style.setProperty('--cols', data.cols);
    board.style.setProperty('--rows', data.rows);

    var inputs = {};
    for (var r = 0; r < data.rows; r++) {
      for (var c = 0; c < data.cols; c++) {
        var cell = data.map[r + ',' + c];
        if (!cell) {
          board.appendChild(el('div', 'cw-void'));
          continue;
        }
        var box = el('div', 'cw-cell');
        box.dataset.r = r; box.dataset.c = c;
        if (cell.num) box.appendChild(el('span', 'cw-num', String(cell.num)));
        var inp = document.createElement('input');
        inp.type = 'text';
        inp.maxLength = 2;
        inp.autocomplete = 'off';
        inp.setAttribute('autocorrect', 'off');
        inp.setAttribute('autocapitalize', 'characters');
        inp.spellcheck = false;
        inp.setAttribute('aria-label', 'Casilla fila ' + (r + 1) + ' columna ' + (c + 1));
        inp.dataset.r = r; inp.dataset.c = c;
        inp.value = state.letters[r + ',' + c] || '';
        box.appendChild(inp);
        board.appendChild(box);
        inputs[r + ',' + c] = inp;
      }
    }
    boardWrap.appendChild(board);

    var cluesBox = el('div', 'cw-clues');
    var activeClue = el('div', 'cw-active-clue', 'Toca una pista o una casilla para empezar.');
    var lists = { across: el('ol', 'cw-list'), down: el('ol', 'cw-list') };
    var hA = el('h4', 'cw-h', 'Horizontales');
    var hD = el('h4', 'cw-h', 'Verticales');
    data.words.forEach(function (w, idx) {
      var li = el('li', 'cw-clue', '<b>' + w.num + '</b><span>' + w.clue + ' <em>(' + w.answer.length + ')</em></span>');
      li.dataset.idx = idx;
      li.tabIndex = 0;
      lists[w.dir].appendChild(li);
      w.li = li;
    });
    cluesBox.appendChild(hA); cluesBox.appendChild(lists.across);
    cluesBox.appendChild(hD); cluesBox.appendChild(lists.down);

    var counter = el('div', 'cw-counter');
    var actions = el('div', 'game-actions');
    var hintBtn = el('button', 'btn btn-ghost btn-sm', 'Pista');
    var checkBtn = el('button', 'btn btn-ghost btn-sm', 'Comprobar');
    var revealBtn = el('button', 'btn btn-ghost btn-sm', 'Revelar solución');
    [hintBtn, checkBtn, revealBtn].forEach(function (b) { b.type = 'button'; actions.appendChild(b); });

    var side = el('div', 'cw-side');
    side.appendChild(activeClue);
    side.appendChild(counter);
    side.appendChild(cluesBox);
    side.appendChild(actions);

    wrap.appendChild(boardWrap);
    wrap.appendChild(side);
    root.appendChild(wrap);

    var active = { word: null, r: null, c: null };

    function wordsAt(r, c) {
      return data.words.filter(function (w) {
        return w.cells.some(function (p) { return p[0] === r && p[1] === c; });
      });
    }
    function letterAt(r, c) { return norm(inputs[r + ',' + c].value); }
    function wordSolved(w) {
      return w.cells.every(function (p) { return letterAt(p[0], p[1]) === data.map[p[0] + ',' + p[1]].ch; });
    }

    function paint() {
      board.querySelectorAll('.cw-cell').forEach(function (b) { b.classList.remove('in-word', 'is-active'); });
      data.words.forEach(function (w) { w.li.classList.remove('active'); });
      if (active.word) {
        active.word.cells.forEach(function (p) { inputs[p[0] + ',' + p[1]].parentNode.classList.add('in-word'); });
        active.word.li.classList.add('active');
        activeClue.innerHTML = '<span class="tag">' + active.word.num + (active.word.dir === 'across' ? ' Horizontal' : ' Vertical') + '</span> ' + active.word.clue;
      }
      if (active.r != null) inputs[active.r + ',' + active.c].parentNode.classList.add('is-active');
    }

    function setActive(word, r, c, focus) {
      active.word = word;
      if (r == null) {
        var first = word.cells.find(function (p) { return !letterAt(p[0], p[1]); }) || word.cells[0];
        r = first[0]; c = first[1];
      }
      active.r = r; active.c = c;
      paint();
      if (focus !== false) {
        var inp = inputs[r + ',' + c];
        try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); }
      }
    }

    function refreshSolved(animateWord) {
      var solvedCount = 0;
      data.words.forEach(function (w) {
        var s = wordSolved(w);
        w.li.classList.toggle('done', s);
        if (s) solvedCount++;
        w.cells.forEach(function (p) {
          var box = inputs[p[0] + ',' + p[1]].parentNode;
          var ok = wordsAt(p[0], p[1]).some(wordSolved);
          box.classList.toggle('ok', ok);
          inputs[p[0] + ',' + p[1]].readOnly = ok;
        });
        if (s && animateWord === w) {
          w.cells.forEach(function (p, i) {
            var box = inputs[p[0] + ',' + p[1]].parentNode;
            box.style.animationDelay = (i * 40) + 'ms';
            box.classList.remove('wave'); void box.offsetWidth; box.classList.add('wave');
          });
        }
      });
      counter.innerHTML = '<strong>' + solvedCount + '</strong> / ' + data.words.length + ' palabras';
      if (solvedCount === data.words.length && !wrap.classList.contains('complete')) {
        wrap.classList.add('complete');
        [hintBtn, checkBtn, revealBtn].forEach(function (b) { b.disabled = true; });
        if (hooks.onComplete) hooks.onComplete({ revealed: !!state.revealed });
      }
      return solvedCount;
    }

    function save(r, c) {
      state.letters[r + ',' + c] = norm(inputs[r + ',' + c].value);
      if (hooks.onChange) hooks.onChange();
    }

    function step(delta) {
      if (!active.word) return;
      var cells = active.word.cells;
      var idx = cells.findIndex(function (p) { return p[0] === active.r && p[1] === active.c; });
      var ni = idx + delta;
      while (ni >= 0 && ni < cells.length) {
        var p = cells[ni];
        if (!inputs[p[0] + ',' + p[1]].readOnly || delta < 0) {
          setActive(active.word, p[0], p[1]);
          return;
        }
        ni += delta;
      }
    }

    function nextUnsolvedWord() {
      if (!active.word) return data.words.find(function (w) { return !wordSolved(w); });
      var i = data.words.indexOf(active.word);
      for (var k2 = 1; k2 <= data.words.length; k2++) {
        var w = data.words[(i + k2) % data.words.length];
        if (!wordSolved(w)) return w;
      }
      return null;
    }

    Object.keys(inputs).forEach(function (key) {
      var inp = inputs[key];
      var r0 = +inp.dataset.r, c0 = +inp.dataset.c;

      inp.addEventListener('focus', function () {
        if (active.r === r0 && active.c === c0 && active.word) return;
        var ws = wordsAt(r0, c0);
        var pick = (active.word && ws.indexOf(active.word) >= 0) ? active.word
          : (ws.find(function (w) { return !wordSolved(w); }) || ws[0]);
        setActive(pick, r0, c0, false);
      });

      inp.addEventListener('pointerdown', function () {
        if (active.r === r0 && active.c === c0) {
          var ws = wordsAt(r0, c0);
          if (ws.length > 1) {
            var other = ws.find(function (w) { return w !== active.word; });
            setActive(other, r0, c0);
          }
        }
      });

      inp.addEventListener('input', function () {
        if (inp.readOnly) return;
        var v = norm(inp.value);
        inp.value = v ? v.slice(-1) : '';
        save(r0, c0);
        var before = active.word;
        var solvedNow = before && wordSolved(before);
        refreshSolved(solvedNow ? before : null);
        if (inp.value) {
          if (solvedNow) {
            var nw = nextUnsolvedWord();
            if (nw) setActive(nw);
          } else {
            step(1);
          }
        }
      });

      inp.addEventListener('keydown', function (e) {
        var keyName = e.key;
        if (keyName === 'Backspace') {
          if (!inp.value || inp.readOnly) {
            e.preventDefault();
            step(-1);
            var cur = inputs[active.r + ',' + active.c];
            if (cur && !cur.readOnly) { cur.value = ''; save(active.r, active.c); refreshSolved(null); }
          }
          return;
        }
        var moves = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] };
        if (moves[keyName]) {
          e.preventDefault();
          e.stopPropagation();
          var m = moves[keyName];
          var nr = r0 + m[0], nc = c0 + m[1];
          while (nr >= 0 && nr < data.rows && nc >= 0 && nc < data.cols) {
            if (inputs[nr + ',' + nc]) {
              var dirWanted = m[0] === 0 ? 'across' : 'down';
              var ws = wordsAt(nr, nc);
              var pick = ws.find(function (w) { return w.dir === dirWanted; }) || ws[0];
              setActive(pick, nr, nc);
              break;
            }
            nr += m[0]; nc += m[1];
          }
          return;
        }
        if (keyName === 'Enter' || keyName === 'Tab') {
          var nw = nextUnsolvedWord();
          if (nw) { e.preventDefault(); setActive(nw); }
        }
        e.stopPropagation();
      });
    });

    data.words.forEach(function (w) {
      w.li.addEventListener('click', function () { setActive(w); });
      w.li.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(w); } });
    });

    hintBtn.addEventListener('click', function () {
      var w = (active.word && !wordSolved(active.word)) ? active.word : nextUnsolvedWord();
      if (!w) return;
      var p = w.cells.find(function (q) { return letterAt(q[0], q[1]) !== data.map[q[0] + ',' + q[1]].ch; });
      if (!p) return;
      var inp = inputs[p[0] + ',' + p[1]];
      inp.value = data.map[p[0] + ',' + p[1]].ch;
      inp.parentNode.classList.add('hinted');
      save(p[0], p[1]);
      state.hints = (state.hints || 0) + 1;
      refreshSolved(wordSolved(w) ? w : null);
      setActive(wordSolved(w) ? (nextUnsolvedWord() || w) : w);
    });

    checkBtn.addEventListener('click', function () {
      var wrong = 0;
      Object.keys(inputs).forEach(function (key) {
        var inp = inputs[key];
        var v = norm(inp.value);
        if (v && v !== data.map[key].ch) {
          wrong++;
          var box = inp.parentNode;
          box.classList.remove('bad'); void box.offsetWidth; box.classList.add('bad');
        }
      });
      if (hooks.onToast) hooks.onToast(wrong ? (wrong === 1 ? 'Hay 1 letra incorrecta (marcada en rojo).' : 'Hay ' + wrong + ' letras incorrectas (marcadas en rojo).') : '¡Todo lo que escribiste es correcto! Sigue así.');
    });

    function revealAll() {
      Object.keys(inputs).forEach(function (key) {
        inputs[key].value = data.map[key].ch;
        state.letters[key] = data.map[key].ch;
      });
      state.revealed = true;
      if (hooks.onChange) hooks.onChange();
      refreshSolved(null);
    }
    revealBtn.addEventListener('click', revealAll);

    refreshSolved(null);

    return {
      complete: function () { return wrap.classList.contains('complete'); },
      solveAll: revealAll,
      data: data,
    };
  }

  // ==================================================================
  // CLASIFICAR — tarjetas que se ubican en una de dos columnas
  // ==================================================================
  function shuffledIndexes(n, seed) {
    var rng = mulberry32(hashStr(seed));
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    for (var j = n - 1; j > 0; j--) { var k = Math.floor(rng() * (j + 1)); var t = a[j]; a[j] = a[k]; a[k] = t; }
    return a;
  }

  function mountSort(root, cfg, state, hooks) {
    state.placed = state.placed || {};
    var cards = cfg.cards;
    var wrap = el('div', 'sort');
    var top = el('div', 'sort-top');
    var counter = el('div', 'game-counter');
    top.appendChild(counter);
    var pool = el('div', 'sort-pool');
    var bins = el('div', 'sort-bins');
    var fb = el('div', 'feedback');
    fb.hidden = true;
    var actions = el('div', 'game-actions');
    var revealBtn = el('button', 'btn btn-ghost btn-sm', 'Revelar solución');
    revealBtn.type = 'button';
    actions.appendChild(revealBtn);

    var cardEls = {};
    shuffledIndexes(cards.length, cfg.seed || 'sort').forEach(function (ci) {
      var b = el('button', 'sort-card', '<span>' + cards[ci].text + '</span>');
      b.type = 'button';
      b.draggable = true;
      b.dataset.idx = ci;
      cardEls[ci] = b;
      pool.appendChild(b);
    });
    var binEls = cfg.bins.map(function (bn, bi) {
      var b = el('div', 'sort-bin bin-' + bi);
      b.dataset.bin = bi;
      b.tabIndex = 0;
      b.setAttribute('role', 'button');
      b.setAttribute('aria-label', 'Columna: ' + bn.title);
      b.innerHTML = '<div class="sb-head">' + (hooks.icon ? '<span class="sb-ico">' + hooks.icon(bn.icon) + '</span>' : '') +
        '<div><h4>' + bn.title + '</h4><p>' + bn.hint + '</p></div><span class="sb-count">0</span></div><div class="sb-items"></div>';
      bins.appendChild(b);
      return b;
    });

    wrap.appendChild(top);
    wrap.appendChild(pool);
    wrap.appendChild(fb);
    wrap.appendChild(bins);
    wrap.appendChild(actions);
    root.appendChild(wrap);

    var selected = null;
    function placedCount() { return Object.keys(state.placed).length; }
    function refresh() {
      counter.innerHTML = '<strong>' + placedCount() + '</strong> / ' + cards.length + ' tarjetas clasificadas';
      binEls.forEach(function (b, bi) {
        var n = Object.keys(state.placed).filter(function (k) { return state.placed[k] === bi; }).length;
        b.querySelector('.sb-count').textContent = n;
      });
      pool.classList.toggle('empty', placedCount() === cards.length);
    }
    function setSelected(ci) {
      selected = ci;
      Object.keys(cardEls).forEach(function (k) { cardEls[k].classList.toggle('selected', +k === ci); });
      wrap.classList.toggle('armed', ci != null);
    }
    function place(ci, bi, animate) {
      var card = cardEls[ci];
      card.classList.remove('selected');
      card.classList.add('placed');
      if (animate) card.classList.add('land');
      card.disabled = true;
      card.draggable = false;
      binEls[bi].querySelector('.sb-items').appendChild(card);
    }
    function finish(revealed) {
      wrap.classList.add('complete');
      revealBtn.disabled = true;
      setSelected(null);
      if (hooks.onComplete) hooks.onComplete({ revealed: revealed });
    }
    function showFb(ok, html) {
      fb.hidden = false;
      fb.className = 'feedback ' + (ok ? 'ok' : 'bad') + ' pop';
      fb.innerHTML = html;
    }
    function attempt(ci, bi) {
      if (ci == null || state.placed[ci] != null) return;
      var c = cards[ci];
      if (c.bin === bi) {
        state.placed[ci] = bi;
        place(ci, bi, true);
        showFb(true, '<div class="fb-title">' + (hooks.icon ? hooks.icon('check') : '') + '¡Bien!</div><p>' + c.why + '</p>');
        if (hooks.onFeedback) hooks.onFeedback(true, '¡Bien! Clasificación correcta.');
        refresh();
        if (hooks.onChange) hooks.onChange();
        if (placedCount() === cards.length) finish(false);
      } else {
        var card = cardEls[ci], bin = binEls[bi];
        [card, bin].forEach(function (x) { x.classList.remove('shake', 'bad'); void x.offsetWidth; x.classList.add('shake', 'bad'); });
        setTimeout(function () { bin.classList.remove('bad'); card.classList.remove('bad'); }, 900);
        showFb(false, '<div class="fb-title">' + (hooks.icon ? hooks.icon('x') : '') + 'Incorrecto</div><p>' + (cfg.wrongText || 'Piensa si esta situación acerca o aleja a las personas, e inténtalo de nuevo.') + '</p>');
        if (hooks.onFeedback) hooks.onFeedback(false, 'Incorrecto. Inténtalo de nuevo.');
      }
      setSelected(null);
    }

    Object.keys(cardEls).forEach(function (k) {
      var ci = +k, b = cardEls[k];
      b.addEventListener('click', function () {
        if (state.placed[ci] != null) return;
        setSelected(selected === ci ? null : ci);
      });
      b.addEventListener('dragstart', function (e) {
        if (state.placed[ci] != null) { e.preventDefault(); return; }
        try { e.dataTransfer.setData('text/plain', String(ci)); e.dataTransfer.effectAllowed = 'move'; } catch (err) {}
        setSelected(ci);
      });
      b.addEventListener('dragend', function () { binEls.forEach(function (x) { x.classList.remove('over'); }); });
    });
    binEls.forEach(function (b, bi) {
      b.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('.sort-card')) return;
        if (selected == null) {
          if (placedCount() < cards.length) showFb(false, '<div class="fb-title">Primero elige una tarjeta</div><p>Toca una de las situaciones de arriba y luego esta columna.</p>');
          return;
        }
        attempt(selected, bi);
      });
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (selected != null) attempt(selected, bi); } });
      b.addEventListener('dragover', function (e) { e.preventDefault(); b.classList.add('over'); });
      b.addEventListener('dragleave', function () { b.classList.remove('over'); });
      b.addEventListener('drop', function (e) {
        e.preventDefault();
        b.classList.remove('over');
        var v = null;
        try { v = parseInt(e.dataTransfer.getData('text/plain'), 10); } catch (err) {}
        attempt(isNaN(v) ? selected : v, bi);
      });
    });

    function revealAll() {
      cards.forEach(function (c, ci) {
        if (state.placed[ci] == null) { state.placed[ci] = c.bin; place(ci, c.bin, true); }
      });
      state.revealed = true;
      refresh();
      if (hooks.onChange) hooks.onChange();
      fb.hidden = true;
      finish(true);
    }
    revealBtn.addEventListener('click', revealAll);

    Object.keys(state.placed).forEach(function (k) { place(+k, state.placed[k], false); });
    refresh();
    if (placedCount() === cards.length) { wrap.classList.add('complete'); revealBtn.disabled = true; }
    return { complete: function () { return placedCount() === cards.length; }, solveAll: revealAll };
  }

  // ==================================================================
  // EMPAREJAR — concepto ↔ significado
  // ==================================================================
  function mountMatch(root, cfg, state, hooks) {
    state.matched = state.matched || [];
    var pairs = cfg.pairs;
    var wrap = el('div', 'match');
    var counter = el('div', 'game-counter');
    var cols = el('div', 'match-cols');
    var colA = el('div', 'match-col col-a');
    var colB = el('div', 'match-col col-b');
    colA.appendChild(el('div', 'match-h', cfg.labelA || 'Concepto'));
    colB.appendChild(el('div', 'match-h', cfg.labelB || 'Significado'));
    var fb = el('div', 'feedback');
    fb.hidden = true;
    var actions = el('div', 'game-actions');
    var revealBtn = el('button', 'btn btn-ghost btn-sm', 'Revelar solución');
    revealBtn.type = 'button';
    actions.appendChild(revealBtn);

    var items = { a: {}, b: {} };
    shuffledIndexes(pairs.length, (cfg.seed || 'match') + 'A').forEach(function (pi) {
      var b = el('button', 'match-item side-a', '<span class="mi-badge"></span><span class="mi-text">' + pairs[pi].a + '</span>');
      b.type = 'button'; b.dataset.pair = pi; b.dataset.side = 'a';
      items.a[pi] = b; colA.appendChild(b);
    });
    shuffledIndexes(pairs.length, (cfg.seed || 'match') + 'B').forEach(function (pi) {
      var b = el('button', 'match-item side-b', '<span class="mi-badge"></span><span class="mi-text">' + pairs[pi].b + '</span>');
      b.type = 'button'; b.dataset.pair = pi; b.dataset.side = 'b';
      items.b[pi] = b; colB.appendChild(b);
    });
    cols.appendChild(colA);
    cols.appendChild(colB);
    wrap.appendChild(counter);
    wrap.appendChild(cols);
    wrap.appendChild(fb);
    wrap.appendChild(actions);
    root.appendChild(wrap);

    var sel = null; // { side, pair }
    function refresh() {
      counter.innerHTML = '<strong>' + state.matched.length + '</strong> / ' + pairs.length + ' parejas';
    }
    function markMatched(pi, n, animate) {
      ['a', 'b'].forEach(function (sd) {
        var b = items[sd][pi];
        b.classList.remove('selected');
        b.classList.add('done');
        if (animate) b.classList.add('land');
        b.disabled = true;
        b.querySelector('.mi-badge').textContent = n;
      });
    }
    function clearSel() {
      sel = null;
      ['a', 'b'].forEach(function (sd) { Object.keys(items[sd]).forEach(function (k) { items[sd][k].classList.remove('selected'); }); });
    }
    function finish(revealed) {
      wrap.classList.add('complete');
      revealBtn.disabled = true;
      clearSel();
      if (hooks.onComplete) hooks.onComplete({ revealed: revealed });
    }
    function pick(side, pi) {
      if (state.matched.indexOf(pi) >= 0) return;
      if (!sel || sel.side === side) {
        if (sel && sel.side === side && sel.pair === pi) { clearSel(); return; }
        clearSel();
        sel = { side: side, pair: pi };
        items[side][pi].classList.add('selected');
        return;
      }
      var other = sel;
      if (other.pair === pi) {
        state.matched.push(pi);
        markMatched(pi, state.matched.length, true);
        fb.hidden = false;
        fb.className = 'feedback ok pop';
        fb.innerHTML = '<div class="fb-title">' + (hooks.icon ? hooks.icon('check') : '') + '¡Pareja correcta!</div><p><strong>' + pairs[pi].a + ':</strong> ' + pairs[pi].b + '</p>';
        if (hooks.onFeedback) hooks.onFeedback(true, '¡Pareja correcta!');
        clearSel();
        refresh();
        if (hooks.onChange) hooks.onChange();
        if (state.matched.length === pairs.length) finish(false);
      } else {
        var x = items[other.side][other.pair], y = items[side][pi];
        [x, y].forEach(function (b) { b.classList.remove('shake', 'bad'); void b.offsetWidth; b.classList.add('shake', 'bad'); });
        setTimeout(function () { x.classList.remove('bad'); y.classList.remove('bad'); }, 900);
        fb.hidden = false;
        fb.className = 'feedback bad pop';
        fb.innerHTML = '<div class="fb-title">' + (hooks.icon ? hooks.icon('x') : '') + 'Incorrecto</div><p>' + (cfg.wrongText || 'Esa pareja no corresponde. Inténtalo de nuevo.') + '</p>';
        if (hooks.onFeedback) hooks.onFeedback(false, 'Incorrecto. Esa pareja no corresponde.');
        clearSel();
      }
    }
    ['a', 'b'].forEach(function (sd) {
      Object.keys(items[sd]).forEach(function (k) {
        items[sd][k].addEventListener('click', function () { pick(sd, +k); });
      });
    });
    function revealAll() {
      pairs.forEach(function (_, pi) {
        if (state.matched.indexOf(pi) < 0) { state.matched.push(pi); markMatched(pi, state.matched.length, true); }
      });
      state.revealed = true;
      refresh();
      fb.hidden = true;
      if (hooks.onChange) hooks.onChange();
      finish(true);
    }
    revealBtn.addEventListener('click', revealAll);

    state.matched.forEach(function (pi, i) { markMatched(pi, i + 1, false); });
    refresh();
    if (state.matched.length === pairs.length) { wrap.classList.add('complete'); revealBtn.disabled = true; }
    return { complete: function () { return state.matched.length === pairs.length; }, solveAll: revealAll };
  }

  window.Games = {
    norm: norm,
    buildWordSearch: buildWordSearch,
    buildCrossword: buildCrossword,
    wordsearch: mountWordSearch,
    crossword: mountCrossword,
    sort: mountSort,
    match: mountMatch,
    shuffledIndexes: shuffledIndexes,
  };
})();
