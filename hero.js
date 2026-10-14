(() => {
  const root = document.querySelector('.slideshow');
  if (!root) return;
  const track = root.querySelector('.slides');
  const prog = root.querySelector('.slide-progress i');
  const slides = [...track.children];
  const dots = [...root.querySelectorAll('.dot')];
  const prev = root.querySelector('.ctl-prev');
  const next = root.querySelector('.ctl-next');
  const pauseBtn = root.querySelector('.ctl-pause');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0;
  let timer = null;
  let userPaused = reduced;
  let hovering = false;

  const PAUSE_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M8 5v14M16 5v14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
  const PLAY_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
  const setLive = () => {
    track.setAttribute('aria-live', timer ? 'off' : 'polite');
    root.dataset.playing = timer ? 'true' : 'false';
  };
  const restartProgress = () => {
    if (!prog) return;
    prog.style.animation = 'none';
    void prog.offsetWidth;
    prog.style.animation = '';
  };

  const go = (n) => {
    index = (n + slides.length) % slides.length;
    track.style.setProperty('--i', index);
    slides.forEach((s, i) => {
      if (i === index) { s.removeAttribute('inert'); s.removeAttribute('aria-hidden'); }
      else { s.setAttribute('inert', ''); s.setAttribute('aria-hidden', 'true'); }
    });
    dots.forEach((d, i) => d.setAttribute('aria-current', String(i === index)));
  };

  const stop = () => { if (timer) { clearInterval(timer); timer = null; } setLive(); };
  const start = () => {
    stop();
    if (userPaused || hovering || document.hidden) return;
    timer = setInterval(() => go(index + 1), 9000);
    restartProgress();
    setLive();
  };
  const setPaused = (p) => {
    userPaused = p;
    pauseBtn.removeAttribute('aria-pressed');
    pauseBtn.setAttribute('aria-label', p ? 'Resume automatic slide change' : 'Pause automatic slide change');
    pauseBtn.innerHTML = p ? PLAY_SVG : PAUSE_SVG;
    start();
  };

  prev.addEventListener('click', () => { go(index - 1); start(); });
  next.addEventListener('click', () => { go(index + 1); start(); });
  dots.forEach((d, i) => d.addEventListener('click', () => { go(i); start(); }));
  pauseBtn.addEventListener('click', () => setPaused(!userPaused));
  root.addEventListener('pointerenter', () => { hovering = true; stop(); });
  root.addEventListener('pointerleave', () => { hovering = false; start(); });
  root.addEventListener('focusin', () => { hovering = true; stop(); });
  root.addEventListener('focusout', () => { hovering = false; start(); });
  document.addEventListener('visibilitychange', start);
  root.addEventListener('keydown', (e) => {
    if (e.target.closest('.chart-wrap')) return;
    if (!e.target.closest('.slide-controls, .ctl')) return;
    if (e.key === 'ArrowLeft') { go(index - 1); start(); e.preventDefault(); }
    if (e.key === 'ArrowRight') { go(index + 1); start(); e.preventDefault(); }
  });

  /* swipe: simple pointer events on the slides (vertical scrolling stays with the page) */
  let sx = null, sy = null, sid = null;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('.chart-wrap, button, a, input, select, textarea')) { sx = null; return; }
    sx = e.clientX; sy = e.clientY; sid = e.pointerId;
  });
  const endSwipe = (e) => {
    if (sx === null || e.pointerId !== sid) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    sx = null;
    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { go(index + (dx < 0 ? 1 : -1)); start(); }
  };
  track.addEventListener('pointerup', endSwipe);
  track.addEventListener('pointercancel', () => { sx = null; });

  /* slicers: choose a person (attendance) or a week (bike rentals); the chosen panel is shown, the others hidden */
  root.querySelectorAll('.slicer[data-group]:not([data-group="period"]) .seg').forEach((btn) => {
    btn.addEventListener('click', () => {
      const g = btn.dataset.group, k = btn.dataset.key;
      const scope = btn.closest('.slide');
      btn.closest('.slicer').querySelectorAll('.seg').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      scope.querySelectorAll('[data-panel-group="' + g + '"]').forEach((p) => { p.hidden = p.dataset.key !== k; });
    });
  });

  /* GSE: period slicer redraws the chart range from window.GSE_SERIES; pointer or arrow keys read the level on a date */
  const series = window.GSE_SERIES;
  const panel = root.querySelector('[data-gse-main]');
  if (series && series.dates && series.values && panel) {
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fmtDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MON[m - 1]} ${y}`; };
    const fmt2 = (v) => v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmt0 = (v) => v.toLocaleString('en-GB', { maximumFractionDigits: 0 });
    const ord = (iso) => Date.parse(iso + 'T00:00:00Z') / 864e5;
    const W = 600, H = 150;
    const allDates = series.dates, allVals = series.values, allOrd = allDates.map(ord);
    const lastISO = allDates[allDates.length - 1];
    /* calendar months back, day clamped to the month length (same rule as tools/build_hero_charts.py) */
    const subMonths = (iso, n) => {
      let [y, m, d] = iso.split('-').map(Number);
      m -= n; while (m < 1) { m += 12; y -= 1; }
      const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
      return `${y}-${String(m).padStart(2, '0')}-${String(Math.min(d, dim)).padStart(2, '0')}`;
    };

    const slide = panel.closest('.slide');
    const wrap = panel.querySelector('.chart-wrap');
    const svg = wrap.querySelector('.chart-svg');
    const line = svg.querySelector('.chart-line');
    const area = svg.querySelector('.chart-area');
    const cursor = panel.querySelector('.chart-cursor');
    const dot = panel.querySelector('.chart-dot');
    const valEl = slide.querySelector('.js-val');
    const dateEl = slide.querySelector('.js-date');
    const kpi = (key) => slide.querySelector('.kpi[data-k="' + key + '"]');
    const brush = slide.querySelector('.brush');
    const fullO0 = allOrd[0], fullO1 = allOrd[allOrd.length - 1];
    let ds = [], vs = [], os = [], lo = 0, hi = 1, cur = 0, last = 0;

    const show = (i, active) => {
      cur = Math.max(0, Math.min(last, i));
      const x = ((os[cur] - os[0]) / (os[last] - os[0])) * 100;
      const y = (1 - (vs[cur] - lo) / (hi - lo)) * 100;
      cursor.style.left = x + '%';
      dot.style.left = x + '%';
      dot.style.top = y + '%';
      valEl.textContent = fmt2(vs[cur]);
      dateEl.textContent = fmtDate(ds[cur]);
      wrap.classList.toggle('on', active);
    };
    const reset = () => show(last, false);

    const setKpi = (key, val, sub) => {
      const k = kpi(key); if (!k) return;
      k.querySelector('.kpi-val').innerHTML = val;
      k.querySelector('.kpi-sub').textContent = sub;
    };

    const setPeriod = (key, name) => {
      let from = 0;
      if (key !== 'all') { const cut = subMonths(lastISO, Number(key)); from = allDates.findIndex((d) => d >= cut); }
      ds = allDates.slice(from); vs = allVals.slice(from); os = allOrd.slice(from);
      last = ds.length - 1;
      let mn = Infinity, mx = -Infinity, iMn = 0, iMx = 0;
      vs.forEach((v, i) => { if (v < mn) { mn = v; iMn = i; } if (v > mx) { mx = v; iMx = i; } });
      const pad = (mx - mn) * 0.08;
      lo = mn - pad; hi = mx + pad;
      const o0 = os[0], o1 = os[last];
      const pts = ds.map((d, i) => `${(((os[i] - o0) / (o1 - o0)) * W).toFixed(1)},${(H - ((vs[i] - lo) / (hi - lo)) * H).toFixed(1)}`).join(' ');
      line.setAttribute('points', pts);
      area.setAttribute('points', `0,${H} ${pts} ${W},${H}`);
      panel.querySelector('.js-yhi').textContent = fmt0(hi);
      panel.querySelector('.js-ymid').textContent = fmt0((hi + lo) / 2);
      panel.querySelector('.js-ylo').textContent = fmt0(lo);
      panel.querySelector('.js-x0').textContent = fmtDate(ds[0]);
      panel.querySelector('.js-xn').textContent = fmtDate(ds[last]);
      const nm = slide.querySelector('.js-period-name'); if (nm) nm.textContent = key === 'all' ? 'full history' : 'last ' + name;
      wrap.setAttribute('aria-label', `GSE Composite Index, daily levels from ${fmtDate(ds[0])} (${fmt0(vs[0])}) to ${fmtDate(ds[last])} (${fmt0(vs[last])}). Move the pointer or use the left and right arrow keys to read the level on a date.`);
      const chg = (vs[last] / vs[0] - 1) * 100;
      const up = chg >= 0;
      setKpi('latest', fmt2(vs[last]), fmtDate(ds[last]));
      setKpi('change', `<span aria-hidden="true">${up ? '▲' : '▼'}</span> ${up ? '+' : '−'}${Math.abs(chg).toFixed(1)}%`, `from ${fmt2(vs[0])} on ${fmtDate(ds[0])}`);
      const ch = kpi('change'); if (ch) { const s = ch.querySelector('.sr-only'); if (s) s.textContent = up ? 'Up' : 'Down'; }
      setKpi('high', fmt2(mx), fmtDate(ds[iMx]));
      setKpi('low', fmt2(mn), fmtDate(ds[iMn]));
      if (brush) {
        const l = ((o0 - fullO0) / (fullO1 - fullO0)) * 100;
        brush.style.left = l.toFixed(2) + '%';
        brush.style.width = (100 - l).toFixed(2) + '%';
      }
      cur = last;
      show(last, false);
    };

    const nearest = (clientX) => {
      const r = wrap.getBoundingClientRect();
      const t = os[0] + Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * (os[last] - os[0]);
      let a = 0, b = os.length - 1;
      while (b - a > 1) { const m = (a + b) >> 1; if (os[m] <= t) a = m; else b = m; }
      return Math.abs(os[a] - t) <= Math.abs(os[b] - t) ? a : b;
    };

    wrap.addEventListener('pointermove', (e) => show(nearest(e.clientX), true));
    wrap.addEventListener('pointerdown', (e) => show(nearest(e.clientX), true));
    wrap.addEventListener('pointerleave', () => { if (document.activeElement !== wrap) reset(); });
    wrap.addEventListener('focus', () => show(cur, true));
    wrap.addEventListener('blur', reset);
    wrap.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowLeft') { show(cur - step, true); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { show(cur + step, true); e.preventDefault(); }
      else if (e.key === 'Home') { show(0, true); e.preventDefault(); }
      else if (e.key === 'End') { show(last, true); e.preventDefault(); }
    });

    const NAMES = { '1': '1 month', '3': '3 months', '6': '6 months', '12': '12 months' };
    slide.querySelectorAll('.slicer[data-group="period"] .seg').forEach((btn) => {
      btn.addEventListener('click', () => {
        slide.querySelectorAll('.slicer[data-group="period"] .seg').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        setPeriod(btn.dataset.key, NAMES[btn.dataset.key]);
      });
    });
    const on = slide.querySelector('.slicer[data-group="period"] .seg[aria-pressed="true"]');
    setPeriod(on ? on.dataset.key : '3', on ? NAMES[on.dataset.key] : '3 months');
  }

  setPaused(reduced);
  go(0);
  start();
})();
