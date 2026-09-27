/* Lifespan — moteur : table de survie, sorties, leviers, projections. MASTER.md §3. */
(function (root) {
  const LS = (root.LS = root.LS || {});
  const { clamp, ramp } = LS.util;
  const VAR = LS.VAR, OUT = LS.OUTCOMES;

  const P = {
    k: 0.7, kSubst: 0.92, kBody: 0.85, cap: 2.3, morbExtra: 0,
    b: { M: 0.088, F: 0.095 }, A: { M: 0.0003, F: 0.00015 },
    dt: 0.25, maxAge: 115, anchor: 2.5,
    haleS: 8, bandLo: 0.6, bandHi: 1.4
  };
  LS.PARAMS = P;

  /* ---------- Âge et dates ---------- */
  const YEAR_MS = 365.2425 * 864e5;
  function ageAt(birthISO, date) { return (new Date(date) - new Date(birthISO)) / YEAR_MS; }
  function addMonths(d, m) { const x = new Date(d); x.setMonth(x.getMonth() + m); return x; }

  /* ---------- Profil aplati pour le calcul ---------- */
  function flat(profile, values, date) {
    const v = Object.assign({}, LS.defaultValues(), values || profile.values);
    v.sex = profile.sex; v.height = profile.height; v.country = profile.country || 'FR';
    v._age = profile.birth ? ageAt(profile.birth, date || new Date()) : (profile.age || 40);
    return v;
  }

  /* ---------- Log-HR par domaine ---------- */
  const comb = (a, b, w) => (a <= 0 && b <= 0 ? Math.min(a, b) + w * Math.max(a, b) : a >= 0 && b >= 0 ? Math.max(a, b) + w * Math.min(a, b) : a + b);
  const att1 = (x) => 1 - 0.5 * ramp(x, 55, 85);
  const att2 = (x) => 1 - 0.25 * ramp(x, 60, 90);
  const Z = () => ({ m: 0, cvd: 0, t2d: 0, dem: 0, can: 0, dep: 0 });
  const addTo = (acc, o, f = 1) => { if (o) OUT.forEach((k) => (acc[k] += f * (o[k] || 0))); return acc; };

  function term(p, id) {
    const v = VAR[id];
    if (!v || !v.lhr) return null;
    if (id === 'hba1c') return v.lhr(null, p); // gère HbA1c, glycémie et diabète
    const val = p[id];
    if (val == null) return null;
    return v.lhr(val, p);
  }

  // Renvoie { dom: {move:{m..}, ...}, tot: {m..} } pour le profil p à l'âge x
  function domains(p, x) {
    const q = Object.assign({}, p, { _age: x });
    const d = {};
    // Mouvement
    const mv = term(q, 'mvpa'), st = term(q, 'steps'), fit = term(q, 'vo2max'), str = term(q, 'strength'), gr = term(q, 'grip'), sit = term(q, 'sitting');
    d.move = Z();
    OUT.forEach((k) => {
      let aer = comb(mv ? mv[k] : 0, st ? st[k] : 0, 0.4);
      if (fit) aer = comb(aer, fit[k], 0.3);
      let s = str && gr ? comb(str[k], gr[k], 0.3) : str ? str[k] : gr ? gr[k] : 0;
      let t = aer + s;
      if (aer < 0 && s < 0) t *= 0.85;
      d.move[k] = t + (sit ? sit[k] : 0);
    });
    d.sleep = ['sleep', 'insomnia', 'shift'].reduce((a, id) => addTo(a, term(q, id)), Z());
    d.subst = ['smoke', 'alcohol', 'cannabis', 'stim', 'opioids'].reduce((a, id) => addTo(a, term(q, id)), Z());
    d.food = ['fv', 'wg', 'nuts', 'meat', 'ssb', 'upf', 'fish', 'coffee'].reduce((a, id) => addTo(a, term(q, id)), Z());
    OUT.forEach((k) => (d.food[k] = clamp(d.food[k] * 0.6, -0.45, 0.45)));
    // Corps avec médiation
    const glycKnown = q.hba1c != null || q.glucose != null;
    const known = (q.sbp != null) + (q.ldl != null) + glycKnown;
    const med = 1 - (0.5 * known) / 3;
    d.body = ['weight', 'waist'].reduce((a, id) => addTo(a, term(q, id)), Z());
    d.body.m *= med; d.body.cvd *= med; if (glycKnown) d.body.t2d *= 0.5;
    d.clin = ['sbp', 'ldl', 'hdl', 'tg', 'hba1c', 'rhr', 'cvd_hist'].reduce((a, id) => addTo(a, term(q, id)), Z());
    d.mind = ['stress', 'phq', 'lonely', 'social', 'ls', 'optimism', 'purpose'].reduce((a, id) => addTo(a, term(q, id)), Z());
    OUT.forEach((k) => (d.mind[k] *= 0.6));
    const se = ['edu', 'income'].reduce((a, id) => addTo(a, term(q, id)), Z());
    d.ctx = addTo(addTo(addTo(Z(), se, 0.7), term(q, 'pm25')), term(q, 'parents'));
    // Atténuation par l'âge
    // Substances : atténuation faible (HR tabac ~constants 25–79 ans, Jha 2013) et pas de rétrécissement k.
    const a1 = att1(x), a2 = att2(x), a3 = 1 - 0.1 * ramp(x, 60, 90);
    const tot = Z();
    Object.keys(d).forEach((dk) => {
      const f = dk === 'body' || dk === 'clin' ? a1 : dk === 'subst' ? a3 : a2;
      const kk = dk === 'subst' ? P.kSubst : dk === 'body' ? P.kBody : P.k;
      OUT.forEach((k) => { d[dk][k] *= f * kk; tot[k] += d[dk][k]; });
    });
    OUT.forEach((k) => (tot[k] = P.cap * Math.tanh(tot[k] / P.cap)));
    return { dom: d, tot };
  }

  /* ---------- Population : mélange d'archétypes, même masque de variables inconnues ---------- */
  const popCache = new Map();
  function archetypeProfiles(p) {
    const h2 = Math.pow(p.height / 100, 2);
    return LS.ARCHETYPES.map((a) => {
      const q = Object.assign({}, a.v, { sex: p.sex, height: p.height, country: p.country });
      q.weight = a.v.bmi * h2;
      LS.VARS.forEach((v) => { if (v.opt && p[v.id] == null) q[v.id] = null; });
      if (p.hba1c == null && p.glucose == null) { q.hba1c = null; q.glucose = null; }
      q.diabetes = false; q.cvd_hist = false;
      return { w: a.w, p: q };
    });
  }
  function popKey(p) { return p.sex + '|' + p.country + '|' + p.height + '|' + LS.VARS.filter((v) => v.opt).map((v) => (p[v.id] == null ? 0 : 1)).join(''); }
  function popAt(p, x) {
    const key = popKey(p);
    let c = popCache.get(key);
    if (!c) { c = { arch: archetypeProfiles(p), byAge: new Map() }; popCache.set(key, c); }
    const xi = Math.round(x * 2) / 2;
    let r = c.byAge.get(xi);
    if (!r) {
      r = {};
      const ds = c.arch.map((a) => ({ w: a.w, d: domains(a.p, xi) }));
      // Sélection par la survie : le poids d'un archétype décroît avec son surrisque cumulé depuis 30 ans.
      const bp = baseParams(p.sex, p.country), H0 = cumBase(bp, 30, xi);
      const mix = (k, wts) => Math.log(ds.reduce((s, a, i) => s + wts[i] * Math.exp(a.d.tot[k]), 0) / wts.reduce((s, w) => s + w, 0));
      let w = ds.map((a) => a.w);
      const L0 = mix('m', w);
      w = ds.map((a) => a.w * Math.exp(-(Math.exp(a.d.tot.m - L0) - 1) * H0));
      OUT.forEach((k) => (r[k] = mix(k, w)));
      r._moyen = ds[1].d.dom; // pour la décomposition morbidité
      c.byAge.set(xi, r);
    }
    return r;
  }

  /* ---------- Mortalité de base (Gompertz-Makeham calibré) ---------- */
  function cumBase(bp, a, b) { return b <= a ? 0 : bp.A * (b - a) + (bp.B / bp.b) * (Math.exp(bp.b * b) - Math.exp(bp.b * a)); }
  const baseCache = new Map();
  function baseParams(sex, country) {
    const key = sex + country;
    if (baseCache.has(key)) return baseCache.get(key);
    const C = LS.COUNTRIES[country] || LS.COUNTRIES.FR;
    const target = C.e0[sex], b = P.b[sex], A = P.A[sex];
    const e0 = (B) => lifeInt(0, (x) => A + B * Math.exp(b * x), () => 0).e;
    let lo = Math.log(1e-8), hi = Math.log(1e-2);
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (e0(Math.exp(mid)) > target) lo = mid; else hi = mid; }
    const B = Math.exp((lo + hi) / 2);
    const h0 = (x) => A + B * Math.exp(b * x);
    // Calibrage HALE : milieu m de la prévalence logistique d'incapacité
    const haleTarget = C.hale[sex] * target;
    let mlo = 40, mhi = 120;
    for (let i = 0; i < 50; i++) {
      const mid = (mlo + mhi) / 2;
      const hh = lifeInt(0, h0, () => 0, (x) => 1 - 1 / (1 + Math.exp(-(x - mid) / P.haleS))).h;
      if (hh > haleTarget) mhi = mid; else mlo = mid;
    }
    const r = { A, B, b, h0, m: (mlo + mhi) / 2, e0: target };
    baseCache.set(key, r);
    return r;
  }

  // Intégration de la survie depuis l'âge a. R(x) = log-HR relatif ; health(x) = proba d'être en bonne santé.
  function lifeInt(a, h0, R, health, a10, rec) {
    let S = 1, e = 0, hs = 0, S10 = null, i = 0;
    const dt = P.dt;
    if (rec) rec.push({ x: a, y: 1 });
    for (let x = a; x < P.maxAge; x += dt, i++) {
      const h = h0(x + dt / 2) * Math.exp(R(x));
      const Sn = S * Math.exp(-h * dt);
      const avg = (S + Sn) / 2;
      e += avg * dt;
      if (health) hs += avg * dt * health(x + dt / 2);
      if (a10 != null && S10 == null && x + dt >= a10 - 1e-9) S10 = Sn;
      if (rec && i % 4 === 3) rec.push({ x: a + (i + 1) * dt, y: Sn });
      S = Sn;
    }
    return { e, h: hs, S10 };
  }

  /* ---------- Incidences moyennes à 10 ans (ordre de grandeur) ---------- */
  const P0 = {
    cvd: (a, s) => clamp(0.025 * Math.exp(0.075 * (a - 40)) * (s === 'F' ? 0.55 : 1), 0.002, 0.6),
    t2d: (a) => clamp(a < 40 ? 0.02 + 0.001 * (a - 25) : a < 60 ? 0.03 + 0.002 * (a - 40) : 0.07, 0.01, 0.1),
    dem: (a) => clamp(0.03 * Math.exp(0.12 * (a - 65)), 0.0005, 0.6),
    can: (a, s) => clamp(s === 'F' ? 0.055 * Math.exp(0.045 * (a - 50)) : 0.05 * Math.exp(0.06 * (a - 50)), 0.005, 0.5),
    dep: (a, s) => (s === 'F' ? 0.1 : 0.06)
  };
  LS.CAUSES = [
    { id: 'cvd', label: 'Cardio-vasculaire', short: 'Cœur', horizon: '10 ans' },
    { id: 't2d', label: 'Diabète de type 2', short: 'Diabète', horizon: '10 ans' },
    { id: 'dem', label: 'Démence', short: 'Cerveau', horizon: '10 ans' },
    { id: 'can', label: 'Cancer', short: 'Cancer', horizon: '10 ans' },
    { id: 'dep', label: 'Épisode dépressif', short: 'Humeur', horizon: '12 mois' }
  ];

  /* ---------- Bien-être et stress (grade C, indicatif) ---------- */
  const fAct = (m) => 1 - Math.exp(-(m || 0) / 150);
  const probit = (q) => Math.log(q / (1 - q)) / 1.7;
  function lsPred(p) {
    let s = 0;
    s += -0.15 * (p.lonely - 3) + 0.1 * (p.social - 5);
    s += 0.6 * (fAct(p.mvpa) - fAct(120));
    s += -0.25 * Math.max(0, 7 - p.sleep) - 0.1 * Math.max(0, p.sleep - 9) - 0.25 * (p.insomnia || 0);
    s += -0.1 * (p.phq - 4) - 0.12 * (p.stress - 5);
    s += (0.35 * (0.65 * probit(clamp(p.income, 1, 99) / 100))) / Math.LN2;
    if (p.smoke === 'current') s -= 0.25;
    s -= Math.min(0.5, 0.03 * Math.max(0, p.alcohol - 14));
    s += 0.04 * (Math.min(p.fv, 8) - 3);
    s += 0.25 * Math.min(1, (p.meditation || 0) / 150) + 0.2 * Math.min(1, (p.nature || 0) / 120);
    s += 0.12 * (p.purpose - 6) + 0.08 * (p.optimism - 6);
    return s;
  }
  function stPred(p) {
    return -1.0 * fAct(p.mvpa) + 0.3 * Math.max(0, 7 - p.sleep) + 0.4 * (p.insomnia || 0) - 0.08 * (p.social - 5)
      - 1.2 * Math.min(1, (p.meditation || 0) / 150) - 0.5 * Math.min(1, (p.nature || 0) / 120) + 0.1 * Math.max(0, p.alcohol - 14) / 7;
  }

  /* ---------- Évaluation complète ---------- */
  function core(p, opts) {
    opts = opts || {};
    const a = p._age, sex = p.sex, bp = baseParams(sex, p.country);
    // Log-HR relatif évalué à des âges d'ancrage (pas de 2,5 ans) puis interpolé linéairement.
    const anc = [a];
    for (let x = Math.ceil(a / P.anchor + 1e-9) * P.anchor; x <= P.maxAge; x += P.anchor) if (x > a + 1e-6) anc.push(x);
    const Rv = [], Mv = [];
    anc.forEach((x) => {
      const q = Object.assign({}, p);
      if (q.smoke === 'former') q.quit_years = (p.quit_years || 0) + (x - a);
      const di = domains(q, x), pop = popAt(q, x);
      const r = di.tot.m - pop.m;
      // décalage morbidité supplémentaire (P.morbExtra × domaines mouvement, corps, esprit vs « Moyen »)
      const extra = ['move', 'body', 'mind'].reduce((s, dk) => s + (di.dom[dk].m - pop._moyen[dk].m), 0) * P.morbExtra;
      Rv.push(r); Mv.push(r + extra);
    });
    const interp = (arr, x) => {
      if (anc.length === 1 || x <= anc[0]) return arr[0];
      let i = x <= anc[1] ? 0 : Math.min(anc.length - 2, 1 + Math.floor((x - anc[1]) / P.anchor));
      const t = clamp((x - anc[i]) / (anc[i + 1] - anc[i]), 0, 1);
      return arr[i] + t * (arr[i + 1] - arr[i]);
    };
    const scale = opts.scale != null ? opts.scale : 1;
    const R = (x) => interp(Rv, x) * scale;
    const health = (x) => { const xe = x + (interp(Mv, x) * scale) / bp.b; return 1 - 1 / (1 + Math.exp(-(xe - bp.m) / P.haleS)); };
    const rec = opts.record ? [] : null;
    const res = lifeInt(a, bp.h0, R, opts.noHale ? null : health, a + 10, rec);
    const r0 = Rv[0];
    return { curve: rec, age: a, le: res.e, leTotal: a + res.e, hale: res.h, haleTotal: a + res.h, mort10: 1 - res.S10, rel: r0, hr: Math.exp(r0), riskAge: a + r0 / bp.b, base: bp };
  }

  function evaluate(p, opts) {
    opts = opts || {};
    const c = core(p);
    const lo = core(p, { scale: P.bandLo, noHale: true }), hi = core(p, { scale: P.bandHi, noHale: true });
    const popE = core(Object.assign({}, p), { scale: 0, noHale: false });
    // Risques par maladie
    const di = domains(p, p._age), pop = popAt(p, p._age);
    const causes = {};
    LS.CAUSES.forEach((cz) => {
      const rr = Math.exp(di.tot[cz.id] - pop[cz.id]);
      const p0 = P0[cz.id](p._age, p.sex);
      causes[cz.id] = { rr, p0, p: clamp(1 - Math.pow(1 - p0, rr), 0, 0.95) };
    });
    // Potentiel : tous les leviers appliqués
    const opt = opts.skipOpt ? null : core(applyLevers(p), { noHale: true });
    const ref = opts.ref || p;
    const refRisk = opts.refRiskGap != null ? opts.refRiskGap : c.riskAge - c.age;
    const happy = clamp(p.ls + lsPred(p) - lsPred(ref) - 0.03 * clamp((c.riskAge - c.age) - refRisk, -20, 20), 0, 10);
    const stress = clamp(p.stress + stPred(p) - stPred(ref), 0, 10);
    return Object.assign(c, {
      leLo: Math.min(lo.le, hi.le) + c.age, leHi: Math.max(lo.le, hi.le) + c.age,
      popLeTotal: popE.leTotal, popHaleTotal: popE.haleTotal,
      causes, happy, stress,
      optLeTotal: opt ? opt.leTotal : null,
      score: opt ? clamp(Math.round((100 * c.le) / opt.le), 1, 100) : null,
      domains: di.dom
    });
  }

  /* ---------- Leviers ---------- */
  function leverValue(p, v) {
    if (!v.lever) return null;
    const t = v.lever(p);
    if (t == null || t === p[v.id]) return null;
    return t;
  }
  function applyLevers(p, ids) {
    const q = Object.assign({}, p);
    LS.VARS.forEach((v) => {
      if (ids && !ids.includes(v.id)) return;
      const t = leverValue(p, v);
      if (t == null) return;
      q[v.id] = t;
      if (v.id === 'smoke' && t === 'former') q.quit_years = 0;
    });
    return q;
  }
  function levers(p) {
    const b = core(p);
    const out = [];
    LS.VARS.forEach((v) => {
      const t = leverValue(p, v);
      if (t == null) return;
      const q = applyLevers(p, [v.id]);
      const c = core(q);
      const d = c.leTotal - b.leTotal, dh = c.haleTotal - b.haleTotal;
      if (d > 0.02 || dh > 0.02) out.push({ id: v.id, from: p[v.id], to: t, dLE: d, dHALE: dh, dRisk: c.riskAge - b.riskAge });
    });
    out.sort((x, y) => y.dLE - x.dLE);
    const all = core(applyLevers(p));
    return { list: out, all: { dLE: all.leTotal - b.leTotal, dHALE: all.haleTotal - b.haleTotal } };
  }

  /* ---------- Décomposition par domaine (vs profil « Moyen ») ---------- */
  function domainImpact(p) {
    const b = core(p, { noHale: true });
    const avg = LS.ARCHETYPES[1].v;
    return LS.DOMAINS.map((d) => {
      const q = Object.assign({}, p);
      LS.VARS.filter((v) => v.dom === d.id && v.lhr).forEach((v) => {
        if (p[v.id] == null) return;
        if (v.id === 'weight') q.weight = avg.bmi * Math.pow(p.height / 100, 2);
        else if (v.id === 'hba1c') { if (p.hba1c != null) q.hba1c = avg.hba1c; if (p.glucose != null) q.glucose = avg.glucose; q.diabetes = false; }
        else if (v.id === 'cvd_hist') q.cvd_hist = false;
        else if (avg[v.id] !== undefined && avg[v.id] !== null) q[v.id] = avg[v.id];
      });
      if (d.id === 'subst') { q.smoke = 'former'; q.quit_years = 12; q.cpd = 10; }
      const c = core(q, { noHale: true });
      return { id: d.id, label: d.label, years: b.leTotal - c.leTotal };
    });
  }

  /* ---------- Projections dans le temps ---------- */
  function trajectory(profile, opts) {
    opts = opts || {};
    const now = opts.now ? new Date(opts.now) : new Date();
    const years = opts.years || 5, H = years * 12, every = opts.every || (years > 5 ? 6 : 3);
    const base = flat(profile, profile.values, now);
    const pt = (m, q) => { const c = core(q, { noHale: false }); return { m, date: addMonths(now, m), leTotal: c.leTotal, haleTotal: c.haleTotal, riskAge: c.riskAge, age: c.age }; };
    const maintain = [];
    for (let m = 0; m <= H; m += every) {
      const q = Object.assign({}, base, { _age: base._age + m / 12 });
      if (q.smoke === 'former') q.quit_years = (base.quit_years || 0) + m / 12;
      maintain.push(pt(m, q));
    }
    let goal = null;
    const g = profile.goal;
    if (g && g.targets && Object.keys(g.targets).length) {
      goal = [];
      const Dm = Math.max(1, Math.round((new Date(g.deadline) - now) / (YEAR_MS / 12)));
      const eff = {};
      Object.keys(g.targets).forEach((id) => (eff[id] = base[id]));
      let quitAt = null;
      for (let m = 0; m <= H; m++) {
        const q = Object.assign({}, base, { _age: base._age + m / 12 });
        const frac = clamp(m / Dm, 0, 1);
        Object.keys(g.targets).forEach((id) => {
          const v = VAR[id], tgt = g.targets[id], cur = base[id];
          if (id === 'smoke') {
            if (tgt === 'former' && base.smoke === 'current' && frac >= 1) { if (quitAt == null) quitAt = m; q.smoke = 'former'; q.quit_years = (m - quitAt) / 12; }
            return;
          }
          if (typeof tgt !== 'number' || typeof cur !== 'number') { if (frac >= 1) q[id] = tgt; return; }
          const path = cur + (tgt - cur) * frac;
          const tau = v && v.tau ? v.tau : 0;
          eff[id] = tau > 0 ? eff[id] + (path - eff[id]) * (1 - Math.exp(-1 / 12 / tau)) : path;
          q[id] = eff[id];
        });
        if (base.smoke === 'former') q.quit_years = (base.quit_years || 0) + m / 12;
        if (m % every === 0) goal.push(pt(m, q));
      }
    }
    return { maintain, goal };
  }

  function historyPoints(profile) {
    return (profile.history || []).map((h) => {
      const q = flat(profile, h.values, h.date);
      const c = core(q);
      return { date: new Date(h.date), leTotal: c.leTotal, haleTotal: c.haleTotal, riskAge: c.riskAge, age: c.age };
    });
  }

  function survival(p, opts) { return core(p, Object.assign({}, opts || {}, { noHale: true, record: true })).curve; }

  LS.engine = { survival, flat, domains, core, evaluate, levers, applyLevers, leverValue, domainImpact, trajectory, historyPoints, ageAt, addMonths, lsPred, stPred, baseParams, popAt };
})(typeof window !== 'undefined' ? window : globalThis);
