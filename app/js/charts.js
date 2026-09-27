/* Lifespan — graphiques SVG légers (courbes temporelles, survie, anneaux, courbes dose-réponse). */
(function (root) {
  const LS = (root.LS = root.LS || {});
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function niceTicks(min, max, n) {
    const span = max - min || 1, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n) || 10 * mag;
    const out = [];
    for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const fmtDate = (d) => MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  const fmtDateShort = (d) => MONTHS[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2);

  /* Courbes : cfg = { series:[{label, color, dash, dots, points:[{x,y}]}], xType:'time'|'num', yFmt, xFmt, marker:{x,label}, height } */
  function line(el, cfg) {
    const draw = () => {
      const W = Math.max(280, el.clientWidth || 600), H = cfg.height || 260;
      const narrow = W < 560;
      const m = { l: 40, r: narrow || cfg.noDirect ? 14 : 96, t: 14, b: 28 };
      const all = cfg.series.flatMap((s) => s.points);
      if (!all.length) { el.innerHTML = '<p class="muted small">Pas encore de données.</p>'; return; }
      const X = (p) => (cfg.xType === 'time' ? +p.x : p.x);
      let x0 = Math.min(...all.map(X)), x1 = Math.max(...all.map(X));
      if (cfg.marker) { x0 = Math.min(x0, +cfg.marker.x); x1 = Math.max(x1, +cfg.marker.x); }
      if (x0 === x1) x1 = x0 + 1;
      let y0 = cfg.yMin != null ? cfg.yMin : Math.min(...all.map((p) => p.y)), y1 = cfg.yMax != null ? cfg.yMax : Math.max(...all.map((p) => p.y));
      const pad = (y1 - y0) * 0.12 || 1; if (cfg.yMin == null) y0 -= pad; if (cfg.yMax == null) y1 += pad;
      const sx = (v) => m.l + ((v - x0) / (x1 - x0)) * (W - m.l - m.r);
      const sy = (v) => m.t + (1 - (v - y0) / (y1 - y0)) * (H - m.t - m.b);
      const yt = niceTicks(y0, y1, 4);
      const yFmt = cfg.yFmt || ((v) => v.toFixed(0));
      let xt;
      if (cfg.xType === 'time') {
        const spanM = (x1 - x0) / (30.44 * 864e5), every = spanM > 60 ? 12 : spanM > 24 ? 6 : spanM > 8 ? 3 : 1;
        xt = []; const d = new Date(x0); d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() + 1);
        while (+d <= x1) { if (d.getMonth() % every === 0 || every === 1) xt.push(+d); d.setMonth(d.getMonth() + 1); }
        const maxT = Math.max(2, Math.floor((W - m.l - m.r) / 70));
        while (xt.length > maxT) xt = xt.filter((_, i) => i % 2 === 0);
      } else xt = niceTicks(x0, x1, narrow ? 4 : 7);
      const xFmt = cfg.xFmt || (cfg.xType === 'time' ? (v) => fmtDateShort(new Date(v)) : (v) => v.toFixed(0));
      let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(cfg.aria || '')}">`;
      s += '<g class="axis">';
      yt.forEach((v) => { s += `<line class="grid-line" x1="${m.l}" x2="${W - m.r}" y1="${sy(v)}" y2="${sy(v)}"/><text x="${m.l - 8}" y="${sy(v) + 3.5}" text-anchor="end">${esc(yFmt(v))}</text>`; });
      xt.forEach((v) => { s += `<text x="${sx(v)}" y="${H - 8}" text-anchor="middle">${esc(xFmt(v))}</text>`; });
      s += '</g>';
      if (cfg.marker) {
        const mx = sx(+cfg.marker.x);
        s += `<line class="today" x1="${mx}" x2="${mx}" y1="${m.t}" y2="${H - m.b}"/><text class="lbl" x="${mx + 5}" y="${m.t + 9}">${esc(cfg.marker.label || '')}</text>`;
      }
      if (cfg.band) {
        const b = cfg.band.points;
        if (b.length > 1) {
          const up = b.map((p) => `${sx(X(p))},${sy(p.hi)}`).join(' '), dn = b.slice().reverse().map((p) => `${sx(X(p))},${sy(p.lo)}`).join(' ');
          s += `<polygon points="${up} ${dn}" style="fill:${cfg.band.color};opacity:.12"/>`;
        }
      }
      const labels = [];
      cfg.series.forEach((se) => {
        if (!se.points.length) return;
        const pts = se.points.map((p) => `${sx(X(p)).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
        if (se.area) s += `<polygon points="${sx(X(se.points[0]))},${sy(y0)} ${pts} ${sx(X(se.points[se.points.length - 1]))},${sy(y0)}" style="fill:${se.color};opacity:.08"/>`;
        s += `<polyline points="${pts}" fill="none" style="stroke:${se.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" ${se.dash ? 'stroke-dasharray="5 5"' : ''}/>`;
        if (se.dots) se.points.forEach((p) => { s += `<circle cx="${sx(X(p))}" cy="${sy(p.y)}" r="4" style="fill:${se.color};stroke:var(--surface)" stroke-width="2"/>`; });
        const last = se.points[se.points.length - 1];
        s += `<circle cx="${sx(X(last))}" cy="${sy(last.y)}" r="4.5" style="fill:${se.color};stroke:var(--surface)" stroke-width="2"/>`;
        if (!narrow && !cfg.noDirect && X(last) >= x1 - (x1 - x0) * 0.02) labels.push({ y: sy(last.y), x: sx(X(last)), text: se.label, val: yFmt(last.y), color: se.color });
      });
      labels.sort((a, b) => a.y - b.y);
      for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 26) labels[i].y = labels[i - 1].y + 26;
      labels.forEach((l) => {
        s += `<text class="lbl" x="${W - m.r + 10}" y="${l.y - 2}" style="fill:var(--text-2)">${esc(l.text)}</text><text class="lbl" x="${W - m.r + 10}" y="${l.y + 11}" style="fill:var(--text);font-weight:500">${esc(l.val)}</text>`;
      });
      s += `<line class="xh" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" style="stroke:var(--muted)" stroke-width="1" visibility="hidden"/>`;
      s += `<rect class="hit" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent"/>`;
      s += '</svg>';
      el.innerHTML = s + '<div class="tooltip" hidden></div>';
      const svg = el.querySelector('svg'), tip = el.querySelector('.tooltip'), xh = el.querySelector('.xh');
      const hit = el.querySelector('.hit');
      const at = (se, xv) => {
        const p = se.points; if (!p.length) return null;
        if (xv <= X(p[0])) return X(p[0]) - xv < (x1 - x0) * 0.03 ? p[0].y : null;
        if (xv >= X(p[p.length - 1])) return xv - X(p[p.length - 1]) < (x1 - x0) * 0.03 ? p[p.length - 1].y : null;
        for (let i = 1; i < p.length; i++) if (xv <= X(p[i])) { const t = (xv - X(p[i - 1])) / (X(p[i]) - X(p[i - 1])); return p[i - 1].y + t * (p[i].y - p[i - 1].y); }
        return null;
      };
      const move = (ev) => {
        const r = svg.getBoundingClientRect(), px = ((ev.clientX - r.left) / r.width) * W;
        const xv = x0 + ((px - m.l) / (W - m.l - m.r)) * (x1 - x0);
        const rows = cfg.series.map((se) => ({ se, v: at(se, xv) })).filter((o) => o.v != null);
        if (!rows.length) { tip.hidden = true; xh.setAttribute('visibility', 'hidden'); return; }
        xh.setAttribute('x1', px); xh.setAttribute('x2', px); xh.setAttribute('visibility', 'visible');
        tip.hidden = false;
        tip.innerHTML = `<div class="t">${esc(cfg.xType === 'time' ? fmtDate(new Date(xv)) : (cfg.xTip || xFmt)(xv))}</div>` + rows.map((o) => `<div class="r"><span><i class="sw" style="background:${o.se.color}"></i>${esc(o.se.label)}</span><b>${esc((cfg.yTip || yFmt)(o.v))}</b></div>`).join('');
        const left = (px / W) * r.width;
        tip.style.left = Math.max(80, Math.min(r.width - 80, left)) + 'px';
        tip.style.top = (sy(rows[0].v) / H) * r.height + 'px';
      };
      hit.addEventListener('pointermove', move);
      hit.addEventListener('pointerdown', move);
      hit.addEventListener('pointerleave', () => { tip.hidden = true; xh.setAttribute('visibility', 'hidden'); });
    };
    draw();
    if (!el._ro) { el._ro = new ResizeObserver(() => { if (el.clientWidth !== el._w) { el._w = el.clientWidth; draw(); } }); el._ro.observe(el); }
    el._w = el.clientWidth;
  }

  /* Anneau de points (style widget) : frac 0–1 */
  function ring(frac, opts) {
    opts = opts || {};
    const n = opts.n || 48, R = 44, r = opts.r || 2.6, color = opts.color || 'var(--text)';
    let s = `<svg viewBox="0 0 100 100" aria-hidden="true">`;
    for (let i = 0; i < n; i++) {
      const f = i / n, a = f * Math.PI * 2 - Math.PI / 2;
      const on = f < frac - 1e-9;
      s += `<circle cx="${(50 + Math.cos(a) * R).toFixed(2)}" cy="${(50 + Math.sin(a) * R).toFixed(2)}" r="${on ? r : r * 0.7}" style="fill:${on ? color : 'var(--surface-3)'}"/>`;
    }
    if (opts.marker != null) {
      const a = opts.marker * Math.PI * 2 - Math.PI / 2;
      s += `<circle cx="${(50 + Math.cos(a) * R).toFixed(2)}" cy="${(50 + Math.sin(a) * R).toFixed(2)}" r="${r * 1.9}" style="fill:var(--accent);stroke:var(--surface)" stroke-width="1.5"/>`;
    }
    return s + '</svg>';
  }

  /* Courbe dose-réponse (mortalité) d'une variable, avec marqueur de la valeur du profil */
  function doseCurve(v, profile, outcome) {
    outcome = outcome || 'm';
    if (!v.lhr || v.kind) return '';
    const W = 340, H = 110, m = { l: 34, r: 10, t: 10, b: 22 };
    const lo = v.min, hi = v.max, N = 60, pts = [];
    for (let i = 0; i <= N; i++) {
      const x = lo + ((hi - lo) * i) / N;
      const p = Object.assign({}, profile, { [v.id]: x });
      if (v.id === 'hba1c') { p.hba1c = x; }
      let y;
      try { y = Math.exp(v.lhr(x, p)[outcome] || 0); } catch (e) { y = 1; }
      pts.push([x, y]);
    }
    let y0 = Math.min(0.5, ...pts.map((p) => p[1])), y1 = Math.max(1.5, ...pts.map((p) => p[1]));
    y0 = Math.max(0.2, Math.floor(y0 * 10) / 10); y1 = Math.min(4, Math.ceil(y1 * 10) / 10);
    const sx = (x) => m.l + ((x - lo) / (hi - lo)) * (W - m.l - m.r);
    const sy = (y) => m.t + (1 - (Math.log(Math.min(Math.max(y, y0), y1)) - Math.log(y0)) / (Math.log(y1) - Math.log(y0))) * (H - m.t - m.b);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbe dose-réponse : ${esc(v.label)}"><g class="axis">`;
    [...new Set([y0, 1, y1])].filter((t) => t === 1 || Math.abs(Math.log(t)) > 0.12).forEach((t) => { s += `<line class="grid-line" x1="${m.l}" x2="${W - m.r}" y1="${sy(t)}" y2="${sy(t)}" ${t === 1 ? 'style="stroke:var(--line-strong)"' : ''}/><text x="${m.l - 6}" y="${sy(t) + 3.5}" text-anchor="end">${t.toFixed(t === 1 ? 1 : 2).replace('.', ',')}</text>`; });
    niceTicks(lo, hi, 4).forEach((t) => { s += `<text x="${sx(t)}" y="${H - 6}" text-anchor="middle">${t}</text>`; });
    s += '</g>';
    s += `<polyline points="${pts.map((p) => sx(p[0]).toFixed(1) + ',' + sy(p[1]).toFixed(1)).join(' ')}" fill="none" style="stroke:var(--text)" stroke-width="2"/>`;
    const val = profile[v.id];
    if (val != null && typeof val === 'number') {
      const yv = Math.exp(v.lhr(val, profile)[outcome] || 0);
      s += `<circle cx="${sx(Math.min(hi, Math.max(lo, val)))}" cy="${sy(yv)}" r="5" style="fill:var(--accent);stroke:var(--surface)" stroke-width="2"/>`;
    }
    return s + '</svg>';
  }

  LS.charts = { line, ring, doseCurve, fmtDate, fmtDateShort, niceTicks, esc };
})(window);
