/* Lifespan — application : état, stockage local, écrans, gamification. MASTER.md §1, §6, §7. */
(function () {
  const LS = window.LS, E = LS.engine, VARS = LS.VARS, VAR = LS.VAR, C = LS.charts;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = C.esc;
  const clamp = LS.util.clamp;

  /* ---------- Formats (fr-FR) ---------- */
  const nf = (d) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const F0 = nf(0), F1 = nf(1), F2 = nf(2);
  const f1 = (x) => F1.format(x), f0 = (x) => F0.format(x);
  const sign = (x, d = 1, unit = '') => (x > 0.049 ? '+' : x < -0.049 ? '−' : '±') + nf(d).format(Math.abs(x)) + unit;
  const pct = (x, d = 1) => nf(d).format(x * 100) + ' %';
  const todayKey = (d) => { const x = d ? new Date(d) : new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const dayDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
  const uid = () => Math.random().toString(36).slice(2, 10);
  const deltaClass = (x, goodIfUp = true) => (Math.abs(x) < 0.05 ? 'flat' : (x > 0) === goodIfUp ? 'up' : 'down');

  function fmtVal(v, val, p) {
    if (val == null) return 'Inconnu';
    if (v.kind === 'select') { const o = v.options.find((o) => o[0] === val); return o ? o[1] : String(val); }
    if (v.kind === 'bool') return val ? 'Oui' : 'Non';
    const d = v.step < 0.1 ? 2 : v.step < 1 ? 1 : 0;
    let s = nf(d).format(val) + (v.unit ? ' ' + v.unit : '');
    if (v.id === 'weight' && p && p.height) s += ' · IMC ' + f1(val / Math.pow(p.height / 100, 2));
    return s;
  }

  /* ---------- Icônes ---------- */
  const I = {
    now: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    sim: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    time: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
    quests: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
    science: '<path d="M9 3h6M10 3v6l-5.5 9.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7.5 15h9"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    move: '<circle cx="14" cy="4.5" r="2"/><path d="M8 21l3-7 3 3v5M6 11l3-3 4 1 2 3 3 1"/>',
    sleep: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    subst: '<path d="M3 15h13v4H3zM19 15v4M21 15v4M17 11c0-2 2-2 2-4s-2-2-2-4"/>',
    food: '<path d="M12 21c-5 0-8-4-8-9 4 0 8 2 8 6 0-6 3-11 8-12 0 7-3 15-8 15z"/>',
    body: '<circle cx="12" cy="4.5" r="2"/><path d="M6 8h12M12 8v6M9 21l3-7 3 7"/>',
    clin: '<path d="M3 12h4l2-4 3 8 2-4h7"/><path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 1-.2 1.9-.6 2.8"/>',
    mind: '<path d="M12 5a3 3 0 0 0-5.8 1A3 3 0 0 0 4 11a3 3 0 0 0 2 5 3 3 0 0 0 6 1V5zM12 5a3 3 0 0 1 5.8 1A3 3 0 0 1 20 11a3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
    ctx: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    left: '<path d="M15 6l-6 6 6 6"/>', right: '<path d="M9 6l6 6-6 6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'
  };
  const icon = (n, cls) => `<svg class="${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ''}</svg>`;
  const LOGO = '<svg class="brand-mark" viewBox="0 0 26 26" aria-hidden="true">' + (() => { let s = ''; for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { const on = (i === 2 || j === 2 || (i + j) % 4 === 0); s += `<circle cx="${3 + j * 5}" cy="${3 + i * 5}" r="${on ? 1.9 : 1.1}" style="fill:${i === 2 && j === 2 ? 'var(--accent)' : on ? 'var(--text)' : 'var(--faint)'}"/>`; } return s; })() + '</svg>';

  /* ---------- Coffre chiffré (AES-GCM 256, clé dérivée PBKDF2 du code personnel) ---------- */
  const Vault = {
    ok: !!(window.crypto && window.crypto.subtle && window.isSecureContext !== false),
    b64(buf) { const a = new Uint8Array(buf); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); },
    ub64(s) { return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); },
    newSalt() { return this.b64(crypto.getRandomValues(new Uint8Array(16))); },
    async derive(pass, salt) {
      const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: this.ub64(salt), iterations: 310000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    },
    async encrypt(key, text) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text)); return { iv: this.b64(iv), ct: this.b64(ct) }; },
    async decrypt(key, iv, ct) { const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: this.ub64(iv) }, key, this.ub64(ct)); return new TextDecoder().decode(pt); }
  };

  /* ---------- Stockage local (MASTER §2.5) : en clair, ou chiffré si un code est défini ---------- */
  const KEY = 'lifespan.v1', VKEY = 'lifespan.v1.vault';
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const lsDel = (k) => { try { localStorage.removeItem(k); } catch (e) { /* rien */ } };
  const store = {
    data: null, key: null, salt: null, _chain: Promise.resolve(),
    hasVault() { return !!lsGet(VKEY); },
    load(raw) {
      let d = raw || null;
      if (!d) { try { d = JSON.parse(lsGet(KEY) || 'null'); } catch (e) { d = null; } }
      if (!d || !d.profiles || !Object.keys(d.profiles).length) {
        const ex = makeExample();
        d = { v: 1, activeId: ex.id, profiles: { [ex.id]: ex }, settings: {} };
        this.data = d; this.save();
      }
      d.settings = Object.assign({ theme: 'system', accent: 'signal', lastBackup: null, fired: {} }, d.settings);
      d.settings.reminders = Object.assign({ checkin: { on: false, time: '20:00' } }, d.settings.reminders);
      Object.values(d.profiles).forEach((p) => {
        p.values = Object.assign(LS.defaultValues(), p.values); p.history = p.history || []; p.checkins = p.checkins || {};
        p.badges = p.badges || {}; p.xp = p.xp || 0; p.quests = p.quests || []; p.xpLog = p.xpLog || {};
      });
      if (!d.profiles[d.activeId]) d.activeId = Object.keys(d.profiles)[0];
      this.data = d;
    },
    save() {
      if (!this.key) { lsSet(KEY, JSON.stringify(this.data)); return; }
      const snapshot = JSON.stringify(this.data), key = this.key, salt = this.salt;
      this._chain = this._chain.then(async () => {
        const e = await Vault.encrypt(key, snapshot);
        lsSet(VKEY, JSON.stringify({ v: 1, salt, iv: e.iv, ct: e.ct }));
        lsDel(KEY);
      }).catch(() => toast('Enregistrement chiffré impossible sur ce navigateur'));
    },
    async unlock(code) {
      const v = JSON.parse(lsGet(VKEY));
      const key = await Vault.derive(code, v.salt);
      const text = await Vault.decrypt(key, v.iv, v.ct); // lève une erreur si le code est faux
      this.key = key; this.salt = v.salt;
      this.load(JSON.parse(text));
    },
    async setCode(code) { this.salt = Vault.newSalt(); this.key = await Vault.derive(code, this.salt); this.save(); await this._chain; },
    removeCode() { this.key = null; this.salt = null; lsSet(KEY, JSON.stringify(this.data)); lsDel(VKEY); }
  };
  const active = () => store.data.profiles[store.data.activeId];

  function makeExample() {
    const now = new Date(), y = now.getFullYear();
    const birth = new Date(now); birth.setFullYear(y - 42); birth.setMonth(birth.getMonth() - 3);
    const v = Object.assign(LS.defaultValues(), {
      mvpa: 70, steps: 5400, strength: 0, sitting: 9.5, sleep: 6.4, insomnia: 1, shift: false,
      smoke: 'current', cpd: 8, quit_years: 0, alcohol: 9, cannabis: 0, stim: 0, opioids: 0,
      fv: 2.5, wg: 1, nuts: 1, meat: 7, ssb: 4, upf: 38, fish: 1, coffee: 3,
      weight: 86, waist: 98, sbp: 134, ldl: 1.45, hba1c: 5.7, rhr: 72,
      stress: 6, phq: 6, lonely: 4, social: 5, ls: 6, optimism: 6, purpose: 6, meditation: 0, nature: 30,
      edu: 15, income: 60, pm25: 11
    });
    const ago = (m) => { const d = new Date(now); d.setMonth(d.getMonth() - m); return d.toISOString(); };
    const snap = (m, o) => ({ date: ago(m), values: Object.assign({}, v, o) });
    const history = [
      snap(6, { cpd: 15, weight: 90, mvpa: 15, steps: 4100, sleep: 6.0, alcohol: 14, fv: 1.5, ssb: 8, upf: 45, sbp: 141, stress: 7, phq: 8 }),
      snap(4, { cpd: 12, weight: 89, mvpa: 30, steps: 4600, sleep: 6.1, alcohol: 12, fv: 2, ssb: 6, upf: 42, sbp: 139, stress: 7, phq: 7 }),
      snap(2, { cpd: 10, weight: 87.5, mvpa: 50, steps: 5000, sleep: 6.3, alcohol: 10, fv: 2, ssb: 5, upf: 40, sbp: 136, stress: 6, phq: 6 }),
      snap(0, {})
    ];
    history[3].date = new Date(now.getTime() - 3600e3).toISOString();
    const dl = new Date(now); dl.setMonth(dl.getMonth() + 9);
    const checkins = {};
    for (let i = 13; i >= 0; i--) {
      if (i === 7 || i === 10) continue;
      const d = new Date(now); d.setDate(d.getDate() - i);
      const k = todayKey(d);
      if (i === 0) continue;
      checkins[k] = { steps: 4800 + ((i * 937) % 4200), active: 20 + ((i * 13) % 30), sleep: 6 + ((i * 7) % 12) / 10, drinks: i % 3 === 0 ? 2 : 0, cigs: Math.max(3, 9 - Math.floor((14 - i) / 3)), stress: 5 + (i % 3), mood: 6 + (i % 3), quests: [], xp: 40 };
    }
    // Quêtes personnelles d'exemple, avec un historique sur 12 jours
    const exQuests = [
      { id: 'exq1', title: 'Boire 8 verres d\'eau', dom: 'food', kind: 'count', target: 8, unit: 'verres', freq: 'daily', days: [], xp: 10, reminder: null, created: ago(1), log: {} },
      { id: 'exq2', title: 'Marcher 30 minutes', dom: 'move', kind: 'check', target: 1, freq: 'daily', days: [], xp: 20, reminder: '12:30', created: ago(1), log: {} },
      { id: 'exq3', title: 'Séance de renforcement', dom: 'move', kind: 'check', target: 1, freq: 'days', days: [0, 2, 4], xp: 35, reminder: '18:30', created: ago(1), log: {} },
      { id: 'exq4', title: 'Appeler ou voir un proche', dom: 'mind', kind: 'check', target: 1, freq: 'weekly', perWeek: 2, days: [], xp: 20, reminder: null, created: ago(1), log: {} }
    ];
    const exXp = {};
    for (let i = 12; i >= 1; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i); const k = todayKey(d), dw = (d.getDay() + 6) % 7;
      exQuests[0].log[k] = i % 4 === 0 ? 5 : 8;
      if (i !== 9) exQuests[1].log[k] = 1;
      if ([0, 2, 4].includes(dw) && i > 2) exQuests[2].log[k] = 1;
      if (i % 4 === 1) exQuests[3].log[k] = 1;
      exXp[k] = 40 + ((i * 17) % 50);
    }
    exQuests[0].log[todayKey(now)] = 3;
    return {
      id: 'ex-' + uid(), name: 'Alex', example: true, sex: 'M', birth: birth.toISOString(), country: 'FR', height: 178,
      values: v, history,
      goal: { created: ago(1), deadline: dl.toISOString(), targets: { smoke: 'former', weight: 80, mvpa: 180, steps: 8000, sleep: 7.25, alcohol: 4, fv: 5, upf: 20 }, from: history[2].values },
      checkins, xp: 1180, xpLog: exXp, quests: exQuests, badges: { first_profile: ago(6), first_sim: ago(5), goal_set: ago(1), checkin_1: ago(0.5), progress: ago(2), custom_1: ago(0.4), quest_10: ago(0.2) }, created: ago(6)
    };
  }

  /* ---------- Calculs mis en cache ---------- */
  let cache = { key: null };
  function ctxFor(prof) {
    const key = prof.id + todayKey() + prof.country + prof.sex + prof.height + prof.birth + JSON.stringify(prof.values);
    if (cache.key === key) return cache;
    const p = E.flat(prof);
    const ev = E.evaluate(p);
    const lev = E.levers(p);
    cache = { key, p, ev, lev, dom: null };
    return cache;
  }
  const invalidate = () => { cache = { key: null }; };

  /* ---------- Gamification ---------- */
  const levelOf = (xp) => Math.floor(Math.sqrt(xp / 60)) + 1;
  const xpFor = (lvl) => 60 * Math.pow(lvl - 1, 2);
  function streak(prof) {
    let n = 0; const d = new Date();
    if (!prof.checkins[todayKey(d)]) d.setDate(d.getDate() - 1);
    while (prof.checkins[todayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  const TITLES = ['Éveil', 'Initié·e', 'Explorateur·rice', 'Régulier·ère', 'Athlète du quotidien', 'Stratège', 'Architecte de vie', 'Maître du temps', 'Légende'];
  const titleOf = (lvl) => TITLES[Math.min(TITLES.length - 1, Math.floor((lvl - 1) / 2))];
  const totalDone = (prof) => prof.quests.reduce((s, q) => s + Object.keys(q.log || {}).filter((k) => (q.log[k] || 0) >= qTarget(q)).length, 0) + Object.values(prof.checkins).reduce((s, c) => s + ((c.quests || []).length), 0);
  const maxQStreak = (prof) => prof.quests.reduce((m, q) => Math.max(m, q.best || 0, qStreak(q)), 0);
  const BADGES = [
    { id: 'first_profile', name: 'Premier profil', glyph: 'person' },
    { id: 'first_sim', name: 'Première simulation', glyph: 'sliders' },
    { id: 'goal_set', name: 'Objectif fixé', glyph: 'target' },
    { id: 'checkin_1', name: 'Premier check-in', glyph: 'check' },
    { id: 'custom_1', name: 'Quête sur mesure', glyph: 'plus', prog: (p) => [Math.min(1, p.quests.length), 1] },
    { id: 'streak_7', name: '7 jours de suite', glyph: 'flame', prog: (p) => [streak(p), 7] },
    { id: 'streak_30', name: '30 jours de suite', glyph: 'crown', prog: (p) => [streak(p), 30] },
    { id: 'quest_10', name: '10 quêtes accomplies', glyph: 'star', tier: 'Bronze', prog: (p) => [totalDone(p), 10] },
    { id: 'quest_50', name: '50 quêtes accomplies', glyph: 'star', tier: 'Argent', prog: (p) => [totalDone(p), 50] },
    { id: 'quest_200', name: '200 quêtes accomplies', glyph: 'star', tier: 'Or', prog: (p) => [totalDone(p), 200] },
    { id: 'qstreak_7', name: 'Série de 7 sur une quête', glyph: 'flame', prog: (p) => [maxQStreak(p), 7] },
    { id: 'qstreak_30', name: 'Série de 30 sur une quête', glyph: 'crown', prog: (p) => [maxQStreak(p), 30] },
    { id: 'perfect_day', name: 'Journée parfaite', glyph: 'sun' },
    { id: 'perfect_week', name: 'Semaine parfaite', glyph: 'calendar', prog: (p) => [perfectStreak(p), 7] },
    { id: 'level_5', name: 'Niveau 5', glyph: 'up', prog: (p) => [levelOf(p.xp), 5] },
    { id: 'level_10', name: 'Niveau 10', glyph: 'up2', prog: (p) => [levelOf(p.xp), 10] },
    { id: 'gain_1', name: 'Projection +1 an', glyph: 'up' },
    { id: 'gain_5', name: 'Projection +5 ans', glyph: 'up2' },
    { id: 'steps_10k', name: 'Journée à 10 000 pas', glyph: 'steps' },
    { id: 'sleep_week', name: '7 nuits de 7 h', glyph: 'moon' },
    { id: 'smoke_free_7', name: '7 jours sans tabac', glyph: 'nosmoke' },
    { id: 'progress', name: 'Progrès mesuré', glyph: 'chart' },
    { id: 'reminder', name: 'Rappel activé', glyph: 'bell' },
    { id: 'secure', name: 'Coffre protégé', glyph: 'shield' },
    { id: 'backup', name: 'Données sauvegardées', glyph: 'save' },
    { id: 'scientist', name: 'Curiosité scientifique', glyph: 'flask' }
  ];
  const GLYPHS = {
    person: ['0011100', '0011100', '0001000', '0111110', '0011100', '0010100', '0110110'],
    sliders: ['0000000', '1110111', '0001000', '1111101', '0000010', '1011111', '0000000'],
    target: ['0011100', '0100010', '1001001', '1010101', '1001001', '0100010', '0011100'],
    check: ['0000000', '0000001', '0000010', '1000100', '0101000', '0010000', '0000000'],
    flame: ['0001000', '0011000', '0011100', '0111110', '0110110', '0111110', '0011100'],
    crown: ['0000000', '1001001', '1101011', '1111111', '1111111', '0111110', '0000000'],
    up: ['0001000', '0011100', '0101010', '1001001', '0001000', '0001000', '0001000'],
    up2: ['0001000', '0011100', '0110110', '1011101', '0011100', '0110110', '1000001'],
    steps: ['0110000', '0110000', '0110011', '0000011', '0110000', '0110011', '0000011'],
    moon: ['0011100', '0110000', '1100000', '1100000', '1100001', '0110011', '0011110'],
    nosmoke: ['0011100', '0100110', '1001101', '1011001', '1110001', '0100010', '0011100'],
    chart: ['0000001', '0000011', '0000110', '1001100', '1111000', '0110000', '0000000'],
    flask: ['0011100', '0001000', '0001000', '0010100', '0100010', '1111111', '1111111'],
    plus: ['0001000', '0001000', '0001000', '1111111', '0001000', '0001000', '0001000'],
    star: ['0001000', '0001000', '1111111', '0111110', '0011100', '0110110', '1000001'],
    sun: ['1001001', '0101010', '0011100', '1111111', '0011100', '0101010', '1001001'],
    calendar: ['1111111', '1000001', '1111111', '1010101', '1000001', '1010101', '1111111'],
    bell: ['0001000', '0011100', '0111110', '0111110', '0111110', '1111111', '0001000'],
    shield: ['1111111', '1000001', '1001001', '1011101', '0101010', '0010100', '0001000'],
    save: ['1111110', '1000011', '1111111', '1000001', '1011101', '1011101', '1111111']
  };
  function glyphSvg(name, on) {
    const g = GLYPHS[name] || GLYPHS.check; let s = '<svg viewBox="0 0 70 70" aria-hidden="true">';
    g.forEach((row, i) => row.split('').forEach((c, j) => { s += `<circle cx="${5 + j * 10}" cy="${5 + i * 10}" r="${c === '1' ? 3.8 : 1.6}" style="fill:${c === '1' ? (on ? 'var(--text)' : 'var(--muted)') : 'var(--surface-3)'}"/>`; }));
    return s + '</svg>';
  }
  function award(prof, id) {
    if (prof.badges[id]) return false;
    prof.badges[id] = new Date().toISOString();
    const b = BADGES.find((x) => x.id === id);
    if (b) toast('Badge débloqué · ' + b.name);
    return true;
  }
  function addXP(prof, n, why) {
    const before = levelOf(prof.xp);
    prof.xp = Math.max(0, prof.xp + n);
    const k = todayKey(); prof.xpLog[k] = Math.max(0, (prof.xpLog[k] || 0) + n);
    if (n <= 0) return;
    const after = levelOf(prof.xp);
    toast(`<span class="xp-pop">+${n} XP</span> ${esc(why || '')}${after > before ? ' · Niveau ' + after + ' · ' + esc(titleOf(after)) : ''}`, true);
    if (after >= 5) award(prof, 'level_5');
    if (after >= 10) award(prof, 'level_10');
  }
  function burst(el) {
    if (!el || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let i = 0; i < 14; i++) {
      const d = document.createElement('i'); d.className = 'burst';
      const a = (i / 14) * Math.PI * 2, dist = 28 + Math.random() * 26;
      d.style.left = cx - 3 + 'px'; d.style.top = cy - 3 + 'px';
      d.style.setProperty('--dx', Math.cos(a) * dist + 'px'); d.style.setProperty('--dy', Math.sin(a) * dist + 'px');
      if (i % 3 === 0) d.style.background = 'var(--text)';
      document.body.appendChild(d); setTimeout(() => d.remove(), 850);
    }
  }

  /* ---------- Quêtes personnelles (modulables, répétables) ---------- */
  const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const DOW_LONG = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  const dowOf = (d) => (new Date(d).getDay() + 6) % 7;
  const qTarget = (q) => (q.kind === 'count' ? Math.max(1, q.target || 1) : 1);
  const qCount = (q, d) => (q.log || {})[todayKey(d)] || 0;
  const qDone = (q, d) => qCount(q, d) >= qTarget(q);
  const qEverDone = (q) => Object.keys(q.log || {}).some((k) => q.log[k] >= qTarget(q));
  const weekStart = (d) => { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - dowOf(x)); return x; };
  function qWeekDone(q, d) { const s = weekStart(d); let n = 0; for (let i = 0; i < 7; i++) { const x = new Date(s); x.setDate(s.getDate() + i); if (qDone(q, x)) n++; } return n; }
  // Prévue ce jour-là selon sa fréquence (hors quota hebdomadaire)
  function qScheduled(q, d) {
    if (q.archived) return false;
    const k = todayKey(d);
    if (q.created && k < todayKey(q.created)) return false;
    if (q.freq === 'days') return (q.days || []).includes(dowOf(d));
    if (q.freq === 'once') return q.date ? k === q.date : true;
    return true;
  }
  // À afficher aujourd'hui dans la liste « à faire »
  function qDue(q, d) {
    if (q.archived) return false;
    if (q.freq === 'once') return qDone(q, d) || (!qEverDone(q) && (!q.date || todayKey(d) >= q.date));
    if (!qScheduled(q, d)) return false;
    if (q.freq === 'weekly') return qDone(q, d) || qWeekDone(q, d) < (q.perWeek || 1);
    return true;
  }
  function qStreak(q) {
    const d = new Date(); d.setHours(12, 0, 0, 0);
    if (q.freq === 'once') return 0;
    if (q.freq === 'weekly') {
      let n = 0; const w = weekStart(d);
      if (qWeekDone(q, w) < (q.perWeek || 1)) w.setDate(w.getDate() - 7);
      for (let i = 0; i < 104; i++) { if (qWeekDone(q, w) >= (q.perWeek || 1)) { n++; w.setDate(w.getDate() - 7); } else break; }
      return n;
    }
    if (!qDone(q, d)) d.setDate(d.getDate() - 1);
    let n = 0;
    for (let i = 0; i < 800; i++) {
      if (q.created && todayKey(d) < todayKey(q.created)) break;
      if (qScheduled(q, d)) { if (qDone(q, d)) n++; else break; }
      d.setDate(d.getDate() - 1);
    }
    return n;
  }
  function freqText(q) {
    if (q.freq === 'days') return (q.days || []).length === 7 ? 'Chaque jour' : (q.days || []).slice().sort().map((i) => DOW_LONG[i].slice(0, 3) + '.').join(' ');
    if (q.freq === 'weekly') return (q.perWeek || 1) + '× par semaine';
    if (q.freq === 'once') return 'Une fois' + (q.date ? ' · ' + new Date(q.date + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '');
    return 'Chaque jour';
  }
  function perfectDay(prof, d) {
    const due = prof.quests.filter((q) => (q.freq === 'weekly' ? qDone(q, d) : qScheduled(q, d) && q.freq !== 'once'));
    return !!prof.checkins[todayKey(d)] && due.length > 0 && due.every((q) => qDone(q, d));
  }
  function perfectStreak(prof) {
    const d = new Date(); d.setHours(12, 0, 0, 0);
    if (!perfectDay(prof, d)) d.setDate(d.getDate() - 1);
    let n = 0; for (let i = 0; i < 400 && perfectDay(prof, d); i++) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  const QTPL = [
    { title: 'Boire 8 verres d\'eau', dom: 'food', kind: 'count', target: 8, unit: 'verres', freq: 'daily', xp: 10 },
    { title: 'Marcher 30 minutes', dom: 'move', kind: 'check', freq: 'daily', xp: 20 },
    { title: 'Atteindre 8 000 pas', dom: 'move', kind: 'check', freq: 'daily', xp: 20 },
    { title: 'Séance de renforcement', dom: 'move', kind: 'check', freq: 'days', days: [0, 2, 4], xp: 35 },
    { title: '5 portions de fruits et légumes', dom: 'food', kind: 'count', target: 5, unit: 'portions', freq: 'daily', xp: 20 },
    { title: 'Journée sans alcool', dom: 'subst', kind: 'check', freq: 'weekly', perWeek: 5, xp: 20 },
    { title: 'Journée sans tabac', dom: 'subst', kind: 'check', freq: 'daily', xp: 35 },
    { title: '10 minutes de méditation', dom: 'mind', kind: 'check', freq: 'daily', xp: 10 },
    { title: 'Au lit avant 23 h', dom: 'sleep', kind: 'check', freq: 'days', days: [6, 0, 1, 2, 3], xp: 20 },
    { title: 'Appeler ou voir un proche', dom: 'mind', kind: 'check', freq: 'weekly', perWeek: 2, xp: 20 },
    { title: 'Cuisiner un repas maison', dom: 'food', kind: 'check', freq: 'weekly', perWeek: 4, xp: 20 },
    { title: 'Mesurer ma tension', dom: 'clin', kind: 'check', freq: 'weekly', perWeek: 1, xp: 10 }
  ];

  /* ---------- Rappels : notifications natives (Android) ou web + agenda (.ics) ---------- */
  // Dans l'app Android, capacitor.js et le module de notifications locales sont injectés à la construction (voir .github/workflows/android.yml)
  const capCore = () => (window.capacitorExports && window.capacitorExports.Capacitor) || window.Capacitor;
  const isNative = () => { const c = capCore(); return !!(c && c.isNativePlatform && c.isNativePlatform()); };
  const nativeLN = () => (isNative() ? (window.capacitorLocalNotifications && window.capacitorLocalNotifications.LocalNotifications) || (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) || null : null);
  function reminderItems() {
    const prof = active(), R = store.data.settings.reminders, out = [];
    if (prof.example) return out; // pas de rappels pour le profil de démonstration
    if (R.checkin.on) out.push({ id: 1, kind: 'checkin', title: 'Lifespan · check-in du jour', body: 'Note ta journée en 30 secondes (+20 XP).', time: R.checkin.time });
    prof.quests.forEach((q, i) => {
      if (q.archived || !q.reminder) return;
      const base = 100 + i * 10;
      const body = 'Quête du jour · +' + (q.xp || 15) + ' XP';
      if (q.freq === 'days') (q.days || []).forEach((d) => out.push({ id: base + d, kind: 'quest', qid: q.id, title: q.title, body, time: q.reminder, dow: d }));
      else out.push({ id: base + 9, kind: 'quest', qid: q.id, title: q.title, body, time: q.reminder });
    });
    return out;
  }
  async function syncReminders(ask) {
    const ln = nativeLN();
    if (!ln) return;
    try {
      let perm = await ln.checkPermissions();
      if (perm.display !== 'granted' && ask) perm = await ln.requestPermissions();
      const pend = await ln.getPending();
      if (pend.notifications && pend.notifications.length) await ln.cancel({ notifications: pend.notifications.map((n) => ({ id: n.id })) });
      if (perm.display !== 'granted') return;
      const items = reminderItems();
      if (items.length) await ln.schedule({ notifications: items.map((it) => {
        const [h, m] = it.time.split(':').map(Number);
        const on = { hour: h, minute: m };
        if (it.dow != null) on.weekday = it.dow === 6 ? 1 : it.dow + 2; // Capacitor : 1 = dimanche
        return { id: it.id, title: it.title, body: it.body, schedule: { on, allowWhileIdle: true } };
      }) });
    } catch (e) { console.warn('Rappels natifs', e); }
  }
  // Web : vérification périodique tant que l'app est ouverte (ou installée et active)
  function checkWebReminders() {
    if (isNative() || !store.data) return;
    const now = new Date(), hm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'), tk = todayKey(now);
    const fired = store.data.settings.fired || (store.data.settings.fired = {});
    const prof = active();
    reminderItems().forEach((it) => {
      if (it.dow != null && it.dow !== dowOf(now)) return;
      if (hm < it.time || fired[it.id] === tk) return;
      if (it.kind === 'checkin' && prof.checkins[tk]) return;
      if (it.kind === 'quest') { const q = prof.quests.find((x) => x.id === it.qid); if (!q || qDone(q, now) || !qDue(q, now)) return; }
      fired[it.id] = tk; store.save();
      toast(esc(it.title) + ' · ' + esc(it.body), true);
      if ('Notification' in window && Notification.permission === 'granted') {
        const opts = { body: it.body, icon: 'assets/icon.svg', badge: 'assets/icon.svg', tag: 'lifespan-' + it.id };
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) navigator.serviceWorker.getRegistration().then((reg) => (reg ? reg.showNotification(it.title, opts) : new Notification(it.title, opts))).catch(() => {});
        else try { new Notification(it.title, opts); } catch (e) { /* non pris en charge */ }
      }
    });
  }
  function icsText() {
    const pad = (n) => String(n).padStart(2, '0'), d = new Date();
    const day = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    const BY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lifespan//Rappels//FR', 'CALSCALE:GREGORIAN'];
    const seen = {};
    reminderItems().forEach((it) => {
      const key = (it.qid || 'checkin');
      if (seen[key]) return; seen[key] = 1;
      const q = it.qid ? active().quests.find((x) => x.id === it.qid) : null;
      const rule = q && q.freq === 'days' ? 'FREQ=WEEKLY;BYDAY=' + q.days.map((i) => BY[i]).join(',') : 'FREQ=DAILY';
      const t = it.time.replace(':', '') + '00';
      lines.push('BEGIN:VEVENT', 'UID:lifespan-' + key + '-' + day + '@lifespan', 'DTSTAMP:' + day + 'T000000Z', 'DTSTART:' + day + 'T' + t, 'DURATION:PT10M', 'RRULE:' + rule,
        'SUMMARY:' + it.title.replace(/[,;]/g, ' '), 'DESCRIPTION:' + it.body.replace(/[,;]/g, ' '), 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + it.title.replace(/[,;]/g, ' '), 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
  function downloadFile(name, text, type) {
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type }));
      a.download = name; document.body.appendChild(a); a.click(); a.remove();
      return true;
    } catch (e) { return false; }
  }

  // Quêtes du jour tirées des leviers (MASTER §7)
  const QUESTS = {
    smoke: ['Journée sans tabac, ou une cigarette de moins qu\'hier', 'Remplace une cigarette par 5 min de marche'],
    steps: ['Atteins 8 000 pas aujourd\'hui', 'Descends un arrêt plus tôt et marche'],
    mvpa: ['30 min d\'activité qui essouffle un peu', 'Monte les escaliers toute la journée'],
    strength: ['10 min de renforcement : squats, pompes, gainage', '3 séries de 10 squats'],
    weight: ['Moitié de l\'assiette en légumes au dîner', 'Pas de grignotage après 20 h'],
    alcohol: ['Journée sans alcool', 'Un verre d\'eau entre chaque verre'],
    sleep: ['Au lit 30 min plus tôt', 'Écrans coupés 45 min avant de dormir'],
    insomnia: ['Même heure de lever que hier', 'Pas de café après 14 h'],
    sitting: ['Lève-toi 5 min toutes les heures', 'Un appel en marchant'],
    fv: ['5 portions de fruits et légumes', 'Un fruit au goûter'],
    wg: ['Remplace le pain blanc par du complet', 'Flocons d\'avoine au petit-déjeuner'],
    nuts: ['Une poignée de noix', 'Des lentilles ou pois chiches au repas'],
    meat: ['Journée sans viande rouge', 'Remplace la charcuterie par du poisson ou des œufs'],
    ssb: ['Zéro boisson sucrée aujourd\'hui', 'Eau pétillante + citron à la place du soda'],
    upf: ['Cuisine un repas avec des produits bruts', 'Lis une étiquette : moins de 5 ingrédients'],
    fish: ['Un repas avec du poisson', 'Sardines ou maquereau cette semaine'],
    stress: ['10 min de respiration ou méditation', 'Marche de 15 min sans téléphone'],
    phq: ['Parle à quelqu\'un de confiance', 'Note 3 choses qui se sont bien passées'],
    lonely: ['Appelle un proche', 'Propose un café à quelqu\'un'],
    social: ['Prends des nouvelles d\'un ami', 'Participe à une activité de groupe'],
    sbp: ['Moins de sel : pas de salière à table', 'Mesure ta tension ce soir'],
    ldl: ['Remplace le beurre par de l\'huile d\'olive', 'Un repas riche en fibres'],
    hba1c: ['Marche 10 min après le repas', 'Zéro boisson sucrée aujourd\'hui'],
    tg: ['Moins de sucres rapides aujourd\'hui', 'Marche 10 min après le dîner'],
    _: ['Bois 1,5 L d\'eau', 'Marche 20 min dehors', '10 min dans la nature']
  };
  function dailyQuests(prof, lev) {
    const day = Math.floor(Date.now() / 864e5);
    const ids = lev.list.map((l) => l.id).filter((id) => QUESTS[id]).slice(0, 3);
    while (ids.length < 3) ids.push('_');
    return ids.map((id, i) => { const arr = QUESTS[id]; const text = arr[(day + i) % arr.length]; return { id: id + ':' + ((day + i) % arr.length) + ':' + i, lever: id, text }; });
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg, html) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = html ? msg : esc(msg);
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2600);
  }

  /* ---------- Coquille et routage ---------- */
  const ROUTES = [
    { id: 'now', label: 'Maintenant', icon: 'now' },
    { id: 'sim', label: 'Simuler', icon: 'sim' },
    { id: 'time', label: 'Temps', icon: 'time' },
    { id: 'quests', label: 'Quêtes', icon: 'quests' },
    { id: 'science', label: 'Science', icon: 'science' }
  ];
  function shell() {
    const nav = ROUTES.map((r) => `<a class="tab" href="#${r.id}" data-route="${r.id}">${icon(r.icon)}<span>${r.label}</span></a>`).join('');
    document.getElementById('app').innerHTML = `
      <aside class="rail">
        <a class="brand" href="#now">${LOGO}<span class="brand-word">LIFESPAN</span></a>
        <nav aria-label="Navigation principale">${nav}</nav>
        <div class="rail-foot">
          <button class="profile-chip" data-open="profiles" type="button"><span class="avatar-dot" data-initial></span><span data-name></span></button>
          <span class="label"><span class="live"></span>&nbsp; Données locales</span>
        </div>
      </aside>
      <header class="topbar">
        <a class="brand" href="#now">${LOGO}<span class="brand-word">LIFESPAN</span></a>
        <button class="profile-chip" data-open="profiles" type="button"><span class="avatar-dot" data-initial></span><span data-name></span></button>
      </header>
      <main id="view" tabindex="-1"></main>
      <nav class="tabbar" aria-label="Navigation principale">${nav}</nav>`;
    document.addEventListener('click', (e) => {
      const o = e.target.closest('[data-open]');
      if (o) { e.preventDefault(); openSheet(o.dataset.open, o.dataset); }
    });
  }
  function currentRoute() { const h = (location.hash || '#now').slice(1); return h === 'profile' ? 'profile' : ROUTES.some((r) => r.id === h) ? h : 'now'; }
  function render() {
    const prof = active();
    $$('[data-name]').forEach((el) => (el.textContent = prof.name));
    $$('[data-initial]').forEach((el) => (el.textContent = (prof.name || '?').trim().charAt(0).toUpperCase()));
    let r = currentRoute();
    if (r === 'profile') { r = 'now'; setTimeout(() => openSheet('profiles'), 0); }
    $$('.tab').forEach((t) => t.setAttribute('aria-current', t.dataset.route === r ? 'page' : 'false'));
    const view = $('#view');
    ({ now: viewNow, sim: viewSim, time: viewTime, quests: viewQuests, science: viewScience })[r](view, prof);
    if (r === 'science' && award(prof, 'scientist')) store.save();
  }
  const hostTheme = document.documentElement.getAttribute('data-theme'); // thème imposé par un hôte éventuel
  function applySettings() {
    const s = store.data.settings, root = document.documentElement;
    if (s.theme === 'system') { if (hostTheme) root.setAttribute('data-theme', hostTheme); else root.removeAttribute('data-theme'); } else root.setAttribute('data-theme', s.theme);
    if (s.accent === 'signal') root.removeAttribute('data-accent'); else root.setAttribute('data-accent', s.accent);
  }

  /* ---------- Morceaux réutilisables ---------- */
  function riskChip(rr) {
    const t = LS.Avatar.organTone(rr);
    const cls = t === 'text' ? '' : t;
    const txt = rr < 0.9 ? 'Plus bas' : rr < 1.15 ? 'Dans la moyenne' : rr < 1.5 ? 'Plus élevé' : 'Élevé';
    return `<span class="chip ${cls}">${txt}</span>`;
  }
  function organsFrom(ev, p) {
    return { dem: ev.causes.dem.rr, cvd: ev.causes.cvd.rr, t2d: ev.causes.t2d.rr, lung: p.smoke === 'current' ? 2.4 : p.smoke === 'former' ? 1.2 : 0.95 };
  }
  function avatarParams(p, ev) {
    return { sex: p.sex, bmi: p.weight / Math.pow(p.height / 100, 2), waistExcess: p.waist != null ? Math.max(0, p.waist - (p.sex === 'F' ? 80 : 94)) / 20 : 0,
      vitality: clamp((ev.score || 80) / 100 + (ev.age - ev.riskAge) / 40, 0.2, 1), age: ev.age, riskAge: ev.riskAge, rhr: p.rhr || 66, score: ev.score || 0, organs: organsFrom(ev, p) };
  }
  function mountAvatar(canvas, params) {
    if (!canvas) return null;
    const a = new LS.Avatar(canvas, params);
    canvas._av = a;
    return a;
  }
  const legendOrgans = () => `<div class="organ-legend"><span><i style="background:var(--good)"></i>Plus bas</span><span><i style="background:var(--text)"></i>Moyenne</span><span><i style="background:var(--warn)"></i>Plus élevé</span><span><i style="background:var(--bad)"></i>Élevé</span></div>`;

  /* =========================================================
     ÉCRAN : MAINTENANT
     ========================================================= */
  function viewNow(view, prof) {
    const c = ctxFor(prof), p = c.p, ev = c.ev, lev = c.lev;
    const dLE = ev.leTotal - ev.popLeTotal, dH = ev.haleTotal - ev.popHaleTotal, gapRisk = ev.riskAge - ev.age;
    const lvl = levelOf(prof.xp), st = streak(prof);
    const country = LS.COUNTRIES[prof.country] || LS.COUNTRIES.FR;
    const pot = ev.optLeTotal - ev.leTotal;
    const years = Math.round(ev.leTotal);
    let dots = '';
    for (let i = 0; i < 100; i++) dots += `<i class="${i < Math.floor(ev.age) ? 'on' : i < years ? '' : ''}" style="${i >= Math.floor(ev.age) && i < years ? 'background:var(--muted)' : i >= years && i < Math.round(ev.optLeTotal) ? 'background:var(--accent);opacity:.8' : ''}"></i>`;
    const pop0 = E.core(p, { scale: 0 });
    const popMort = pop0.mort10;
    const goal = prof.goal && prof.goal.targets ? Object.keys(prof.goal.targets).length : 0;

    view.innerHTML = `
      ${prof.example ? `<div class="banner"><span><b>Profil exemple.</b> Ces chiffres sont ceux d'Alex, un personnage fictif. Crée ton profil pour voir les tiens.</span><button class="btn primary sm" data-open="edit" data-new="1" type="button">${icon('plus')} Créer mon profil</button></div>` : ''}
      ${!prof.example && Object.keys(prof.checkins).length + prof.history.length > 3 && (!store.data.settings.lastBackup || Date.now() - new Date(store.data.settings.lastBackup) > 30 * 864e5) ? `<div class="banner"><span><b>Pense à sauvegarder ta progression.</b> Tes données restent sur cet appareil : une sauvegarde chiffrée te protège en cas de perte ou de changement de téléphone.</span><button class="btn sm" data-open="profiles" data-tab="sec" type="button">Sauvegarder</button></div>` : ''}
      <div class="page-head">
        <div><div class="label"><span class="live"></span>&nbsp; ${esc(new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}</div>
          <h1>${esc(prof.name)}, ${f0(Math.floor(ev.age))} ans</h1>
          <p class="sub">${prof.sex === 'F' ? 'Femme' : 'Homme'} · ${esc(country.label)} · comparé à la population ${esc(country.label === 'France' ? 'française' : 'de référence')} du même âge et du même sexe.</p></div>
        <div class="row"><button class="btn sm" data-open="edit" type="button">Modifier mes valeurs</button><a class="btn primary sm" href="#sim">${icon('sim')} Simuler un changement</a></div>
      </div>
      <div class="grid">
        <div class="tile avatar-tile span-2 c3 w4 r2">
          <canvas id="av-now" aria-label="Avatar : silhouette selon l'IMC, organes colorés selon les risques"></canvas>
          <div class="avatar-hud"><span class="chip">${prof.sex === 'F' ? 'F' : 'H'} · ${f0(Math.floor(ev.age))} ans</span><span class="chip ${gapRisk > 1 ? 'warn' : gapRisk < -1 ? 'good' : ''}">Âge de risque ${f0(ev.riskAge)}</span></div>
          <div class="avatar-foot">${legendOrgans()}<span class="label">Potentiel ${ev.score} %</span></div>
        </div>
        <div class="tile hero-le span-2 c3 w5">
          <div class="tile-head"><span class="label">Âge attendu</span><span class="chip">${sign(dLE)} ans vs moyenne</span></div>
          <div><span class="big xl">${f1(ev.leTotal)}</span><span class="unit">ANS</span></div>
          <div class="band">Fourchette ${f1(ev.leLo)} – ${f1(ev.leHi)} · moyenne ${f1(ev.popLeTotal)} ans · ${f1(ev.le)} années restantes en moyenne</div>
          <div class="dotbar" aria-label="Chaque point est une année : vécues, attendues, gagnables">${dots}</div>
          <div class="legend"><span><i style="color:var(--text)"></i>Vécu</span><span><i style="color:var(--muted)"></i>Attendu</span><span><i style="color:var(--accent)"></i>Gagnable avec tes leviers (+${f1(pot)} ans)</span></div>
        </div>
        <div class="tile c2 w3" style="align-items:center">
          <div class="tile-head" style="width:100%"><span class="label">Potentiel exploité</span></div>
          <div class="ring-wrap">${C.ring((ev.score || 0) / 100, { color: 'var(--accent)' })}<div class="ring-center"><span class="big l">${ev.score}</span><span class="label">sur 100</span></div></div>
          <p class="small muted" style="text-align:center">Ton espérance de vie restante comparée à celle que tu aurais avec tous tes leviers.</p>
        </div>
        <div class="tile c2 w3">
          <span class="label">En bonne santé</span>
          <div><span class="big l">${f1(ev.haleTotal)}</span><span class="unit">ANS</span></div>
          <p class="small muted">Âge jusqu'auquel tu vivrais sans incapacité majeure (méthode HALE de l'OMS).</p>
          <span class="delta ${deltaClass(dH)}">${sign(dH)} ans vs moyenne (${f1(ev.popHaleTotal)})</span>
        </div>
        <div class="tile c2 w2" style="align-items:center;text-align:center">
          <span class="label">Âge de risque</span>
          <div class="ring-wrap" style="max-width:130px">${C.ring(clamp(ev.riskAge / 100, 0, 1), { marker: clamp(ev.age / 100, 0, 1), color: gapRisk > 1 ? 'var(--warn)' : 'var(--text)' })}<div class="ring-center"><span class="big m">${f0(ev.riskAge)}</span></div></div>
          <span class="delta ${deltaClass(-gapRisk)}">${gapRisk > 0 ? '+' : ''}${f1(gapRisk)} an${Math.abs(gapRisk) >= 2 ? 's' : ''} vs ton âge</span><span class="xs muted">point rouge = ton âge réel</span>
        </div>
        <div class="tile c6 w3">
          <span class="label">Risque de décès à 10 ans</span>
          <div><span class="big m">${pct(ev.mort10)}</span></div>
          <span class="small muted">Moyenne à ton âge : ${pct(popMort)}</span>
          <span class="delta ${deltaClass(popMort - ev.mort10)}">${ev.mort10 > popMort ? '× ' + F1.format(ev.mort10 / popMort) + ' la moyenne' : 'Sous la moyenne'}</span>
        </div>
      </div>
      <div class="grid" style="margin-top:var(--gap)">
        <div class="tile c2 w4">
          <div class="tile-head"><span class="label">Bonheur</span><span class="chip grade-C">Indicatif</span></div>
          <div class="row" style="align-items:flex-end"><span class="big m">${f0(ev.happy * 10)}</span><span class="unit">/100</span></div>
          <div class="meter accent"><i style="width:${ev.happy * 10}%"></i></div>
          <span class="small muted">Satisfaction de vie déclarée ${f0(p.ls)}/10</span>
        </div>
        <div class="tile c2 w4">
          <div class="tile-head"><span class="label">Stress</span><span class="chip grade-C">Indicatif</span></div>
          <div class="row" style="align-items:flex-end"><span class="big m">${f0(ev.stress * 10)}</span><span class="unit">/100</span></div>
          <div class="meter"><i style="width:${ev.stress * 10}%;background:${ev.stress > 6.5 ? 'var(--warn)' : 'var(--text)'}"></i></div>
          <span class="small muted">Plus bas = mieux</span>
        </div>
        <a class="tile c2 w4" href="#quests" style="text-decoration:none">
          <div class="tile-head"><span class="label">Niveau · ${esc(titleOf(lvl))}</span><span class="chip accent">${st} j de suite</span></div>
          <div class="row" style="align-items:flex-end"><span class="big m">${lvl}</span><span class="unit">${f0(prof.xp)} XP</span></div>
          <div class="meter accent"><i style="width:${clamp(((prof.xp - xpFor(lvl)) / (xpFor(lvl + 1) - xpFor(lvl))) * 100, 0, 100)}%"></i></div>
          <span class="small muted">${goal ? 'Objectif en cours · ' + goal + ' cible' + (goal > 1 ? 's' : '') : 'Aucun objectif : fixe-en un dans Simuler'}</span>
        </a>
      </div>

      <div class="section-title"><h2>Risques de maladie</h2><span class="label">vs même âge et sexe</span></div>
      <div class="tile">
        <div class="causes">${LS.CAUSES.map((cz) => { const o = ev.causes[cz.id]; return `<div class="cause"><div class="ring-wrap">${C.ring(clamp(o.p / 0.5, 0, 1), { n: 36, color: LS.Avatar.organTone(o.rr) === 'text' ? 'var(--text)' : 'var(--' + LS.Avatar.organTone(o.rr) + ')' })}<div class="ring-center"><span class="big s">${o.p < 0.1 ? f1(o.p * 100) : f0(o.p * 100)}<span style="font-size:14px">%</span></span></div></div><div class="small">${cz.label}</div><div class="xs muted">× ${F2.format(o.rr)} · ${cz.horizon}</div>${riskChip(o.rr)}</div>`; }).join('')}</div>
        <p class="xs muted">Probabilités approximatives sur l'horizon indiqué, à partir d'incidences moyennes par âge et sexe (ordre de grandeur). Le multiplicateur × compare ton profil à la moyenne.</p>
      </div>

      <div class="grid" style="margin-top:var(--gap)">
        <div class="tile span-2 c6 w7">
          <div class="tile-head"><h2>Tes leviers</h2><span class="label">années gagnables</span></div>
          <div id="levers">${leversHTML(lev, p, 6)}</div>
          <div class="row between"><span class="small muted">Tous ensemble : <b style="color:var(--text)">${sign(lev.all.dLE)} ans</b> d'espérance de vie, ${sign(lev.all.dHALE)} en bonne santé.</span><a class="btn sm" href="#sim" data-preset="all">Tout simuler</a></div>
        </div>
        <div class="tile span-2 c6 w5">
          <div class="tile-head"><h2>Par domaine</h2><span class="label">vs profil moyen</span></div>
          <div id="domains"><p class="small muted">Calcul…</p></div>
          <p class="xs muted">Années d'espérance de vie apportées (vert) ou retirées (rouge) par chaque domaine par rapport à un profil moyen.</p>
        </div>
      </div>

      <div class="section-title"><h2>Courbe de survie</h2><span class="label">probabilité d'être en vie</span></div>
      <div class="tile">
        <div class="legend"><span style="color:var(--text)"><i></i>Toi</span><span style="color:var(--muted)"><i class="dash"></i>Moyenne</span><span style="color:var(--accent)"><i></i>Avec tous tes leviers</span></div>
        <div class="chart" id="surv"></div>
      </div>
      <p class="disclaimer">Lifespan est un outil d'éducation à la santé, pas un dispositif médical. Les résultats sont des estimations statistiques tirées d'études de population (associations, pas certitudes) et ne remplacent pas l'avis d'un·e professionnel·le de santé. <a href="#science">Voir les sources et les formules</a>.</p>`;

    mountAvatar($('#av-now'), Object.assign(avatarParams(p, ev), { callouts: true }));
    bindLevers(view);
    requestAnimationFrame(() => {
      const dom = c.dom || (c.dom = E.domainImpact(p));
      const max = Math.max(1, ...dom.map((d) => Math.abs(d.years)));
      const box = $('#domains'); if (!box) return;
      box.innerHTML = dom.map((d) => `<div class="dom-row"><span>${esc(d.label)}</span><div class="dom-track"><i class="${d.years >= 0 ? 'pos' : 'neg'}" style="width:${(Math.abs(d.years) / max) * 50}%"></i></div><span class="v">${sign(d.years)}</span></div>`).join('');
      const me = E.survival(p), pop = E.survival(p, { scale: 0 }), best = E.survival(E.applyLevers(p));
      const cut = (arr) => arr.filter((o) => o.x <= 105).map((o) => ({ x: o.x, y: o.y * 100 }));
      const el = $('#surv'); if (!el) return;
      C.line(el, { series: [{ label: 'Moyenne', color: 'var(--muted)', dash: true, points: cut(pop) }, { label: 'Avec leviers', color: 'var(--accent)', points: cut(best) }, { label: 'Toi', color: 'var(--text)', points: cut(me), area: true }],
        xType: 'num', yMin: 0, yMax: 100, yFmt: (v) => f0(v) + ' %', xFmt: (v) => f0(v), xTip: (v) => f0(v) + ' ans', height: 250, noDirect: true, aria: 'Courbes de survie' });
    });
  }

  function leversHTML(lev, p, n) {
    if (!lev.list.length) return '<p class="small muted">Tes habitudes sont déjà au niveau des cibles. Bravo : continue et explore le simulateur.</p>';
    const max = Math.max(...lev.list.map((l) => l.dLE));
    return lev.list.slice(0, n).map((l) => {
      const v = VAR[l.id];
      return `<div class="lever"><div><div class="name">${esc(v.label)}</div><div class="from-to">${esc(fmtVal(v, l.from, p))} → ${esc(fmtVal(v, l.to, Object.assign({}, p, { [l.id]: l.to })))}</div></div>
        <div class="gain">+${f1(l.dLE)}<span class="unit">ANS</span></div>
        <div class="bar"><i style="width:${(l.dLE / max) * 100}%"></i></div>
        <div class="act"><button class="btn sm ghost" type="button" data-sim-lever="${l.id}">Simuler</button><button class="btn sm ghost" type="button" data-goal-lever="${l.id}">${icon('plus')} Objectif</button></div></div>`;
    }).join('');
  }
  function bindLevers(view) {
    if (view._leversBound) return;
    view._leversBound = true;
    view.addEventListener('click', (e) => {
      const prof = active();
      const s = e.target.closest('[data-sim-lever]'), g = e.target.closest('[data-goal-lever]'), pr = e.target.closest('[data-preset]');
      if (s) { const c = ctxFor(prof), id = s.dataset.simLever; simState.forId = null; ensureSim(prof); simState.values[id] = E.leverValue(c.p, VAR[id]); if (id === 'smoke') simState.values.quit_years = 0; location.hash = '#sim'; }
      if (g) {
        const id = g.dataset.goalLever, c = ctxFor(prof), t = E.leverValue(c.p, VAR[id]);
        addGoalTargets(prof, { [id]: t }, 6);
      }
      if (pr) { simState.forId = null; ensureSim(prof); simState.pendingPreset = pr.dataset.preset; }
    });
  }
  function addGoalTargets(prof, targets, months) {
    const isNew = !prof.goal || !prof.goal.targets || !Object.keys(prof.goal.targets).length;
    const dl = new Date(); dl.setMonth(dl.getMonth() + months);
    if (isNew) prof.goal = { created: new Date().toISOString(), deadline: dl.toISOString(), targets: {}, from: Object.assign({}, prof.values) };
    Object.assign(prof.goal.targets, targets);
    if (targets.smoke === 'former') delete prof.goal.targets.quit_years;
    if (isNew) { addXP(prof, 50, 'Objectif fixé'); award(prof, 'goal_set'); } else toast('Ajouté à ton objectif');
    const c = ctxFor(prof), q = Object.assign({}, c.p); Object.assign(q, prof.goal.targets); if (q.smoke === 'former' && c.p.smoke === 'current') q.quit_years = 0;
    const g = E.core(q).leTotal - E.core(c.p).leTotal;
    if (g >= 1) award(prof, 'gain_1');
    if (g >= 5) award(prof, 'gain_5');
    store.save();
  }

  /* =========================================================
     ÉCRAN : SIMULER
     ========================================================= */
  const simState = { forId: null, values: null, open: { move: true, subst: true }, pendingPreset: null };
  function ensureSim(prof) {
    if (simState.forId !== prof.id || !simState.values) { simState.forId = prof.id; simState.values = Object.assign({}, prof.values); }
  }
  const PRESETS = [
    { id: 'smoke', label: 'Arrêter de fumer', when: (p) => p.smoke === 'current', apply: (v) => { v.smoke = 'former'; v.quit_years = 0; } },
    { id: 'walk', label: 'Marcher 8 000 pas', apply: (v) => { v.steps = Math.max(v.steps, 8000); } },
    { id: 'sport', label: '150 min de sport', apply: (v) => { v.mvpa = Math.max(v.mvpa, 150); v.strength = Math.max(v.strength, 60); } },
    { id: 'med', label: 'Assiette méditerranéenne', apply: (v) => { v.fv = Math.max(v.fv, 5); v.wg = Math.max(v.wg, 3); v.nuts = Math.max(v.nuts, 5); v.meat = Math.min(v.meat, 3); v.ssb = 0; v.upf = Math.min(v.upf, 15); v.fish = Math.max(v.fish, 2); } },
    { id: 'sleep', label: 'Dormir 7 h 30', apply: (v) => { v.sleep = 7.5; v.insomnia = 0; } },
    { id: 'alc', label: 'Moins d\'alcool', when: (p) => p.alcohol > 3, apply: (v) => { v.alcohol = Math.min(v.alcohol, 3); } },
    { id: 'zen', label: 'Moins de stress', apply: (v) => { v.stress = Math.min(v.stress, 3); v.meditation = Math.max(v.meditation, 70); v.nature = Math.max(v.nature, 120); } },
    { id: 'all', label: 'Tout optimiser', apply: (v, p) => { const q = E.applyLevers(p); LS.VARS.forEach((x) => { if (q[x.id] !== p[x.id]) v[x.id] = q[x.id]; }); if (v.smoke === 'former' && p.smoke === 'current') v.quit_years = 0; } }
  ];

  function ctlHTML(v, val, base, opts) {
    opts = opts || {};
    const p = opts.p || {};
    if (v.showIf && !v.showIf(Object.assign({}, p, opts.values || {}))) return '';
    const changed = base !== undefined && val !== base;
    const help = v.help ? `<div class="ctl-help">${esc(v.help)}</div>` : '';
    if (v.kind === 'select') {
      return `<div class="ctl" data-ctl="${v.id}"><div class="ctl-top"><span class="ctl-name">${esc(v.label)}</span></div>
        <div class="opt-btns" role="group" aria-label="${esc(v.label)}">${v.options.map((o) => `<button type="button" data-set="${v.id}" data-val='${JSON.stringify(o[0])}' aria-pressed="${o[0] === val}" class="${base !== undefined && o[0] === base ? 'base' : ''}">${esc(o[1])}</button>`).join('')}</div>${help}</div>`;
    }
    if (v.kind === 'bool') {
      return `<div class="ctl" data-ctl="${v.id}"><div class="ctl-top"><label class="ctl-name" for="c-${opts.pre || ''}${v.id}">${esc(v.label)}</label><span class="toggle"><input type="checkbox" id="c-${opts.pre || ''}${v.id}" data-bool="${v.id}" ${val ? 'checked' : ''}><span></span></span></div>${help}</div>`;
    }
    const unknown = val == null;
    const shown = unknown ? (v.def != null ? v.def : (v.min + v.max) / 2) : val;
    const P = ((shown - v.min) / (v.max - v.min)) * 100;
    const bt = base != null && base !== undefined ? `<span class="base-tick" style="left:calc(11px + (100% - 22px) * ${(clamp(base, v.min, v.max) - v.min) / (v.max - v.min)})"></span>` : '';
    const tg = opts.target != null ? `<span class="target-tick" style="left:calc(11px + (100% - 22px) * ${(clamp(opts.target, v.min, v.max) - v.min) / (v.max - v.min)})" title="Cible"></span>` : '';
    const dv = base != null && val != null && changed ? `<span class="delta ${deltaClass(val - base)}" style="color:var(--accent)">${val > base ? '+' : '−'}${nf(v.step < 0.1 ? 2 : v.step < 1 ? 1 : 0).format(Math.abs(val - base))}</span> ` : '';
    return `<div class="ctl" data-ctl="${v.id}"><div class="ctl-top"><label class="ctl-name" for="c-${opts.pre || ''}${v.id}">${esc(v.label)}</label><span class="ctl-val">${dv}<b data-out="${v.id}">${esc(fmtVal(v, val, Object.assign({}, p, opts.values || {})))}</b></span></div>
      <div class="range-wrap">${bt}${tg}<input type="range" id="c-${opts.pre || ''}${v.id}" data-range="${v.id}" min="${v.min}" max="${v.max}" step="${v.step}" value="${shown}" style="--p:${P}%" class="${changed ? 'changed' : ''}" ${unknown ? 'disabled' : ''} aria-valuetext="${esc(fmtVal(v, val, p))}"></div>
      ${v.opt ? `<label class="unknown small muted"><span class="toggle"><input type="checkbox" data-unknown="${v.id}" ${unknown ? 'checked' : ''}><span></span></span>Je ne connais pas cette valeur</label>` : ''}${help}</div>`;
  }

  function viewSim(view, prof) {
    ensureSim(prof);
    const base = E.flat(prof);
    const c = ctxFor(prof);
    if (simState.pendingPreset) { const pr = PRESETS.find((x) => x.id === simState.pendingPreset); if (pr) pr.apply(simState.values, base); simState.pendingPreset = null; }
    const goalT = (prof.goal && prof.goal.targets) || {};
    const domHTML = (d) => {
      const vars = VARS.filter((v) => v.dom === d.id);
      const nChanged = vars.filter((v) => simState.values[v.id] !== prof.values[v.id]).length;
      return `<details class="dom" data-dom="${d.id}" ${simState.open[d.id] ? 'open' : ''}><summary><span class="t">${icon(d.icon)}${esc(d.label)}</span><span class="row">${nChanged ? `<span class="chip accent">${nChanged} modifiée${nChanged > 1 ? 's' : ''}</span>` : ''}${icon('chev', 'chev')}</span></summary>
        <div class="ctl-list">${vars.map((v) => ctlHTML(v, simState.values[v.id], prof.values[v.id], { p: base, values: simState.values, target: typeof goalT[v.id] === 'number' ? goalT[v.id] : null })).join('')}</div></details>`;
    };
    view.innerHTML = `
      <div class="page-head"><div><h1>Simulateur</h1><p class="sub">Change une variable et regarde l'effet sur ta vie. Le trait gris marque ta valeur actuelle, le point rouge ta cible.</p></div>
        <div class="row"><button class="btn sm" id="sim-reset" type="button">Revenir à mes valeurs</button></div></div>
      <div class="sim-sticky" aria-live="polite"><div><div class="k">Âge attendu</div><div class="v" data-o="dle">±0,0</div></div><div><div class="k">En santé</div><div class="v" data-o="dhale">±0,0</div></div><div><div class="k">Âge de risque</div><div class="v" data-o="drisk">±0,0</div></div></div>
      <div class="presets" role="group" aria-label="Scénarios rapides">${PRESETS.filter((pr) => !pr.when || pr.when(base)).map((pr) => `<button class="btn sm" type="button" data-preset-sim="${pr.id}">${esc(pr.label)}</button>`).join('')}</div>
      <div class="sim-layout" style="margin-top:12px">
        <div id="sim-ctls">${LS.DOMAINS.map(domHTML).join('')}</div>
        <div class="sim-panel">
          <div class="duo">
            <div class="tile"><canvas id="av-a"></canvas><span class="cap label">Aujourd'hui</span></div>
            <div class="tile"><canvas id="av-b"></canvas><span class="cap label" style="color:var(--accent)">Simulé</span></div>
          </div>
          <div class="deltas" aria-live="polite">
            ${[['le', 'Âge attendu', 'ans'], ['hale', 'En bonne santé', 'ans'], ['risk', 'Âge de risque', 'ans'], ['m10', 'Décès à 10 ans', ''], ['happy', 'Bonheur', '/100'], ['stress', 'Stress', '/100']].map(([k, l]) => `<div class="dcell"><span class="label">${l}</span><span class="v" data-v="${k}">—</span><span class="delta" data-d="${k}">—</span></div>`).join('')}
          </div>
          <div class="tile"><div class="legend"><span style="color:var(--muted)"><i class="dash"></i>Aujourd'hui</span><span style="color:var(--accent)"><i></i>Simulé</span></div><div class="chart" id="sim-surv"></div></div>
          <div class="tile">
            <div class="tile-head"><h3>En faire un objectif</h3><span class="chip accent" data-o="nchg">0 changement</span></div>
            <div class="row"><div class="seg" role="group" aria-label="Échéance" id="sim-deadline">${[3, 6, 12, 24].map((m) => `<button type="button" data-m="${m}" aria-pressed="${m === (simState.months || 6)}">${m} mois</button>`).join('')}</div></div>
            <button class="btn primary" id="sim-goal" type="button">Définir comme objectif</button>
            <p class="xs muted">Les effets sur la santé arrivent progressivement : la projection dans « Temps » tient compte du délai de chaque habitude.</p>
          </div>
        </div>
      </div>`;

    const avA = mountAvatar($('#av-a'), avatarParams(base, c.ev));
    const avB = mountAvatar($('#av-b'), avatarParams(base, c.ev));
    const baseSurv = E.survival(base).filter((o) => o.x <= 105).map((o) => ({ x: o.x, y: o.y * 100 }));
    let survTimer = null, raf = null;

    function simProfile() { return Object.assign({}, base, simState.values); }
    function update() {
      raf = null;
      const q = simProfile();
      const ev = E.evaluate(q, { ref: base, skipOpt: false, refRiskGap: c.ev.riskAge - c.ev.age });
      const d = { le: ev.leTotal - c.ev.leTotal, hale: ev.haleTotal - c.ev.haleTotal, risk: ev.riskAge - c.ev.riskAge, m10: ev.mort10 - c.ev.mort10, happy: (ev.happy - c.ev.happy) * 10, stress: (ev.stress - c.ev.stress) * 10 };
      const set = (k, v, dd, good) => { const a = $(`[data-v="${k}"]`), b = $(`[data-d="${k}"]`); if (a) a.textContent = v; if (b) { b.textContent = dd; b.className = 'delta ' + good; } };
      set('le', f1(ev.leTotal), sign(d.le) + ' ans', deltaClass(d.le));
      set('hale', f1(ev.haleTotal), sign(d.hale) + ' ans', deltaClass(d.hale));
      set('risk', f0(ev.riskAge), sign(d.risk) + ' ans', deltaClass(-d.risk));
      set('m10', pct(ev.mort10), sign(d.m10 * 100, 1, ' pt'), deltaClass(-d.m10));
      set('happy', f0(ev.happy * 10), sign(d.happy, 0), deltaClass(d.happy));
      set('stress', f0(ev.stress * 10), sign(d.stress, 0), deltaClass(-d.stress));
      const o = (k, t) => $$(`[data-o="${k}"]`).forEach((el) => (el.textContent = t));
      o('dle', sign(d.le)); o('dhale', sign(d.hale)); o('drisk', sign(d.risk));
      const n = VARS.filter((v) => simState.values[v.id] !== prof.values[v.id]).length;
      o('nchg', n + ' changement' + (n > 1 ? 's' : ''));
      if (avB) avB.set(avatarParams(q, ev));
      clearTimeout(survTimer);
      survTimer = setTimeout(() => {
        const el = $('#sim-surv'); if (!el) return;
        const s2 = E.survival(q).filter((o2) => o2.x <= 105).map((o2) => ({ x: o2.x, y: o2.y * 100 }));
        C.line(el, { series: [{ label: 'Aujourd\'hui', color: 'var(--muted)', dash: true, points: baseSurv }, { label: 'Simulé', color: 'var(--accent)', points: s2 }], xType: 'num', yMin: 0, yMax: 100, yFmt: (v) => f0(v) + ' %', xTip: (v) => f0(v) + ' ans', height: 200, noDirect: true, aria: 'Survie aujourd\'hui et simulée' });
      }, 160);
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();

    const ctls = $('#sim-ctls');
    const rerenderDom = (dom) => {
      const el = ctls.querySelector(`details[data-dom="${dom}"]`);
      if (!el) return;
      const tmp = document.createElement('div'); tmp.innerHTML = domHTML(LS.DOMAINS.find((d) => d.id === dom));
      el.replaceWith(tmp.firstElementChild);
    };
    const markSim = () => { if (award(prof, 'first_sim')) store.save(); };
    ctls.addEventListener('input', (e) => {
      const r = e.target.closest('[data-range]');
      if (!r) return;
      const id = r.dataset.range, v = VAR[id], val = parseFloat(r.value);
      simState.values[id] = val;
      r.style.setProperty('--p', ((val - v.min) / (v.max - v.min)) * 100 + '%');
      r.classList.toggle('changed', val !== prof.values[id]);
      const out = ctls.querySelector(`[data-out="${id}"]`); if (out) out.textContent = fmtVal(v, val, simProfile());
      r.setAttribute('aria-valuetext', fmtVal(v, val, simProfile()));
      schedule();
    });
    ctls.addEventListener('change', (e) => {
      const r = e.target.closest('[data-range]'), u = e.target.closest('[data-unknown]'), b = e.target.closest('[data-bool]');
      if (r) { markSim(); rerenderDom(VAR[r.dataset.range].dom); }
      if (u) { const id = u.dataset.unknown, v = VAR[id]; simState.values[id] = u.checked ? null : (prof.values[id] != null ? prof.values[id] : v.def != null ? v.def : Math.round((v.min + v.max) / 2)); rerenderDom(v.dom); schedule(); }
      if (b) { simState.values[b.dataset.bool] = b.checked; markSim(); rerenderDom(VAR[b.dataset.bool].dom); schedule(); }
    });
    ctls.addEventListener('click', (e) => {
      const s = e.target.closest('[data-set]');
      if (!s) return;
      const id = s.dataset.set; simState.values[id] = JSON.parse(s.dataset.val);
      if (id === 'smoke' && simState.values.smoke === 'former' && prof.values.smoke === 'current') simState.values.quit_years = 0;
      markSim(); rerenderDom(VAR[id].dom); schedule();
    });
    ctls.addEventListener('toggle', (e) => { const d = e.target.closest('details[data-dom]'); if (d) simState.open[d.dataset.dom] = d.open; }, true);
    $('.presets').addEventListener('click', (e) => {
      const b = e.target.closest('[data-preset-sim]'); if (!b) return;
      const pr = PRESETS.find((x) => x.id === b.dataset.presetSim); pr.apply(simState.values, base);
      markSim(); viewSim(view, prof);
    });
    $('#sim-reset').addEventListener('click', () => { simState.values = Object.assign({}, prof.values); viewSim(view, prof); });
    $('#sim-deadline').addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (!b) return; simState.months = +b.dataset.m; $$('#sim-deadline button').forEach((x) => x.setAttribute('aria-pressed', x === b)); });
    $('#sim-goal').addEventListener('click', () => {
      const t = {};
      VARS.forEach((v) => { if (simState.values[v.id] !== prof.values[v.id] && v.id !== 'quit_years') t[v.id] = simState.values[v.id]; });
      if (!Object.keys(t).length) { toast('Change au moins une variable pour créer un objectif'); return; }
      if (prof.goal) prof.goal = null;
      addGoalTargets(prof, t, simState.months || 6);
      invalidate();
      toast('Objectif enregistré · vois ta projection dans Temps');
    });
  }

  /* =========================================================
     ÉCRAN : TEMPS
     ========================================================= */
  const timeState = { metric: 'leTotal', years: 5, month: null };
  function viewTime(view, prof) {
    const c = ctxFor(prof);
    const METRICS = { leTotal: { label: 'Âge attendu', up: true }, haleTotal: { label: 'En bonne santé', up: true }, riskAge: { label: 'Âge de risque', up: false } };
    const M = METRICS[timeState.metric];
    const traj = E.trajectory(prof, { years: timeState.years });
    const hist = E.historyPoints(prof);
    const now = new Date();
    const first = hist[0], lastM = traj.maintain[traj.maintain.length - 1], lastG = traj.goal ? traj.goal[traj.goal.length - 1] : null;
    const cur = c.ev[timeState.metric];
    const dStart = first ? cur - first[timeState.metric] : 0;
    const goalGain = lastG ? lastG[timeState.metric] - lastM[timeState.metric] : 0;
    view.innerHTML = `
      <div class="page-head"><div><h1>Temps</h1><p class="sub">D'où tu viens, où tu en es, et où tu vas selon que tu gardes tes habitudes ou que tu atteins tes objectifs.</p></div>
        <div class="row"><div class="seg" id="t-metric" role="group" aria-label="Indicateur">${Object.entries(METRICS).map(([k, m]) => `<button type="button" data-k="${k}" aria-pressed="${k === timeState.metric}">${m.label}</button>`).join('')}</div>
        <div class="seg" id="t-years" role="group" aria-label="Horizon">${[1, 3, 5, 10].map((y) => `<button type="button" data-y="${y}" aria-pressed="${y === timeState.years}">${y} an${y > 1 ? 's' : ''}</button>`).join('')}</div></div></div>
      <div class="kpis">
        <div class="tile"><span class="label">Depuis le début</span><span class="big s">${first ? sign(dStart) : '—'}<span class="unit">ANS</span></span><span class="xs muted">${first ? 'depuis le ' + new Date(first.date).toLocaleDateString('fr-FR') : 'Enregistre ton profil pour démarrer l\'historique'}</span></div>
        <div class="tile"><span class="label">Aujourd'hui</span><span class="big s">${f1(cur)}<span class="unit">ANS</span></span><span class="xs muted">${M.label.toLowerCase()}</span></div>
        <div class="tile"><span class="label">Dans ${timeState.years} an${timeState.years > 1 ? 's' : ''} · maintien</span><span class="big s">${f1(lastM[timeState.metric])}<span class="unit">ANS</span></span><span class="xs muted">si rien ne change</span></div>
        <div class="tile"><span class="label">Dans ${timeState.years} an${timeState.years > 1 ? 's' : ''} · objectif</span><span class="big s" style="color:var(--accent)">${lastG ? f1(lastG[timeState.metric]) : '—'}<span class="unit">ANS</span></span><span class="xs muted">${lastG ? sign(goalGain) + ' ans vs maintien' : 'Aucun objectif en cours'}</span></div>
      </div>
      <div class="tile" style="margin-top:var(--gap)">
        <div class="tile-head"><h2>${M.label} dans le temps</h2><span class="chip grade-C">Projection</span></div>
        <div class="legend"><span style="color:var(--text)"><i></i>Historique</span><span style="color:var(--muted)"><i class="dash"></i>Maintien</span><span style="color:var(--accent)"><i></i>Objectif</span></div>
        <div class="chart" id="traj"></div>
        <details><summary class="small muted" style="cursor:pointer">Voir les valeurs en tableau</summary><div class="scroll-x"><table class="data-table"><thead><tr><th>Date</th><th>Historique</th><th>Maintien</th><th>Objectif</th></tr></thead><tbody>
          ${hist.map((h) => `<tr><td>${C.fmtDate(h.date)}</td><td>${f1(h[timeState.metric])}</td><td></td><td></td></tr>`).join('')}
          ${traj.maintain.map((m, i) => `<tr><td>${C.fmtDate(m.date)}</td><td></td><td>${f1(m[timeState.metric])}</td><td>${traj.goal ? f1(traj.goal[i][timeState.metric]) : ''}</td></tr>`).join('')}
        </tbody></table></div></details>
        <p class="xs muted">${M.up ? '' : 'Pour l\'âge de risque, plus bas = mieux. '}La projection « Objectif » suit une rampe jusqu'à l'échéance, puis applique le délai biologique propre à chaque habitude (ex. activité ~6 mois, nutrition ~18 mois, tabac : baisse du risque sur plusieurs années).</p>
      </div>
      <div class="grid" style="margin-top:var(--gap)">
        <div class="tile span-2 c3 w6"><div class="tile-head"><h2>Calendrier</h2><div class="row"><button class="icon-btn" id="cal-prev" type="button" aria-label="Mois précédent">${icon('left')}</button><span class="label" id="cal-title"></span><button class="icon-btn" id="cal-next" type="button" aria-label="Mois suivant">${icon('right')}</button></div></div>
          <div id="cal"></div>
          <div class="legend"><span><i style="border:0;width:10px;height:10px;border-radius:3px;background:color-mix(in srgb,var(--text) 34%,var(--surface-2))"></i>Check-in (plus foncé = plus d'habitudes tenues)</span><span><i style="border:0;width:7px;height:7px;border-radius:50%;background:var(--accent)"></i>Jalon</span></div></div>
        <div class="tile span-2 c3 w6 lifegrid"><div class="tile-head"><h2>Ta vie en mois</h2><span class="label">1 point = 1 mois</span></div>
          <canvas id="life" aria-label="Grille de vie en mois"></canvas>
          <div class="legend"><span style="color:var(--text)"><i></i>Vécu</span><span style="color:var(--muted)"><i></i>Attendu (${f1(c.ev.leTotal)} ans)</span><span style="color:var(--accent)"><i></i>Gagné avec l'objectif</span></div></div>
      </div>
      <div class="section-title"><h2>Journal</h2><span class="label">instantanés du profil</span></div>
      <div class="tile">${hist.length ? hist.slice().reverse().map((h, i, arr) => { const prev = arr[i + 1]; const d = prev ? h.leTotal - prev.leTotal : 0; return `<div class="goal-row"><div><div>${new Date(h.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div><div class="xs muted">${prev ? changesText(prof.history[prof.history.length - 1 - i - 1].values, prof.history[prof.history.length - 1 - i].values) : 'Premier instantané'}</div></div><div style="text-align:right"><div class="big s">${f1(h.leTotal)}</div>${prev ? `<span class="delta ${deltaClass(d)}">${sign(d)} an</span>` : ''}</div></div>`; }).join('') : '<p class="small muted">Chaque fois que tu enregistres ton profil, un instantané daté est ajouté ici.</p>'}</div>`;

    const mv = (arr) => arr.map((o) => ({ x: o.date, y: o[timeState.metric] }));
    const series = [];
    if (hist.length) series.push({ label: 'Historique', color: 'var(--text)', dots: true, points: hist.map((h) => ({ x: h.date, y: h[timeState.metric] })) });
    series.push({ label: 'Maintien', color: 'var(--muted)', dash: true, points: mv(traj.maintain) });
    if (traj.goal) series.push({ label: 'Objectif', color: 'var(--accent)', points: mv(traj.goal) });
    C.line($('#traj'), { series, xType: 'time', marker: { x: now, label: 'Aujourd\'hui' }, yFmt: (v) => f1(v), yTip: (v) => f1(v) + ' ans', height: 280, aria: M.label + ' : historique et projections' });

    $('#t-metric').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) { timeState.metric = b.dataset.k; viewTime(view, prof); } });
    $('#t-years').addEventListener('click', (e) => { const b = e.target.closest('[data-y]'); if (b) { timeState.years = +b.dataset.y; viewTime(view, prof); } });
    if (!timeState.month) { timeState.month = new Date(); timeState.month.setDate(1); }
    const drawCal = () => renderCalendar(prof, timeState.month);
    $('#cal-prev').addEventListener('click', () => { timeState.month.setMonth(timeState.month.getMonth() - 1); drawCal(); });
    $('#cal-next').addEventListener('click', () => { timeState.month.setMonth(timeState.month.getMonth() + 1); drawCal(); });
    drawCal();
    const goalLE = lastG ? E.core(Object.assign({}, c.p, goalApplied(prof, c.p))).leTotal : c.ev.leTotal;
    drawLifeGrid($('#life'), c.ev.age, c.ev.leTotal, goalLE);
  }
  function goalApplied(prof, p) {
    const t = Object.assign({}, (prof.goal && prof.goal.targets) || {});
    if (t.smoke === 'former' && p.smoke === 'current') t.quit_years = 0;
    return t;
  }
  function changesText(a, b) {
    const ch = VARS.filter((v) => a[v.id] !== b[v.id] && v.lhr).slice(0, 4).map((v) => `${v.short} ${fmtVal(v, a[v.id])} → ${fmtVal(v, b[v.id])}`);
    return ch.length ? ch.join(' · ') : 'Aucun changement de valeur';
  }
  function habitsMet(ci) {
    let n = 0;
    if (ci.steps >= 8000) n++;
    if (ci.active >= 30) n++;
    if (ci.sleep >= 7 && ci.sleep <= 9) n++;
    if (ci.drinks <= 1) n++;
    if (ci.cigs === 0 || ci.cigs == null) n++;
    return n;
  }
  function renderCalendar(prof, month) {
    const box = $('#cal'); if (!box) return;
    $('#cal-title').textContent = month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const start = new Date(month); const dow = (start.getDay() + 6) % 7; start.setDate(1 - dow);
    const milestones = new Set();
    (prof.history || []).forEach((h) => milestones.add(todayKey(h.date)));
    if (prof.goal && prof.goal.deadline) milestones.add(todayKey(prof.goal.deadline));
    const tk = todayKey();
    let s = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => `<div class="dow">${d}</div>`).join('');
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const k = todayKey(d), ci = prof.checkins[k];
      const lvl = ci ? Math.min(3, Math.max(1, Math.ceil(habitsMet(ci) / 1.7))) : 0;
      const isGoal = prof.goal && k === todayKey(prof.goal.deadline);
      s += `<div class="day ${d.getMonth() !== month.getMonth() ? 'out' : ''} ${k === tk ? 'today' : ''} ${lvl ? 'lvl' + lvl : ''}" title="${ci ? habitsMet(ci) + ' habitude(s) tenue(s)' : ''}${isGoal ? ' · Échéance de l\'objectif' : ''}"><span>${d.getDate()}</span>${milestones.has(k) ? '<span class="ms"></span>' : ''}</div>`;
      if (i >= 34 && d.getMonth() !== month.getMonth() && i % 7 === 6) break;
    }
    box.innerHTML = `<div class="cal">${s}</div>`;
  }
  function drawLifeGrid(canvas, age, le, goalLe) {
    if (!canvas) return;
    const draw = () => {
      const W = canvas.clientWidth || 400, dpr = Math.min(2, window.devicePixelRatio || 1);
      const blocksPerRow = W >= 400 ? 5 : 2, rowsOfBlocks = Math.ceil(10 / blocksPerRow);
      const gapB = W >= 400 ? 8 : 12, cell = (W - gapB * (blocksPerRow - 1)) / (blocksPerRow * 12);
      const bh = cell * 10, H = rowsOfBlocks * bh + (rowsOfBlocks - 1) * gapB + 16;
      canvas.style.height = H + 'px'; canvas.width = W * dpr; canvas.height = H * dpr;
      const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const cs = getComputedStyle(document.documentElement), col = (n) => cs.getPropertyValue(n).trim();
      const cText = col('--text'), cMuted = col('--muted'), cAcc = col('--accent'), cFaint = col('--surface-3');
      const nowM = age * 12, leM = le * 12, gM = goalLe * 12;
      ctx.font = '10px ' + (col('--f-mono') || 'monospace');
      for (let dec = 0; dec < 10; dec++) {
        const bx = (dec % blocksPerRow) * (12 * cell + gapB), by = Math.floor(dec / blocksPerRow) * (bh + gapB) + 14;
        ctx.fillStyle = cMuted; ctx.fillText(dec * 10 + ' ans', bx, by - 4);
        for (let y = 0; y < 10; y++) for (let m = 0; m < 12; m++) {
          const idx = (dec * 10 + y) * 12 + m;
          let c = cFaint, r = cell * 0.26;
          if (idx < nowM) { c = cText; r = cell * 0.34; } else if (idx < leM) { c = cMuted; r = cell * 0.3; } else if (idx < gM) { c = cAcc; r = cell * 0.34; }
          ctx.fillStyle = c; ctx.beginPath(); ctx.arc(bx + m * cell + cell / 2, by + y * cell + cell / 2, Math.max(1, r), 0, 6.2832); ctx.fill();
        }
      }
    };
    draw();
    const ro = new ResizeObserver(() => { if (canvas.isConnected) draw(); else ro.disconnect(); }); ro.observe(canvas);
  }

  /* =========================================================
     ÉCRAN : QUÊTES
     ========================================================= */
  function viewQuests(view, prof) {
    const c = ctxFor(prof), lvl = levelOf(prof.xp), st = streak(prof);
    const now = new Date(), tk = todayKey(now), ci = prof.checkins[tk] || null;
    const qs = dailyQuests(prof, c.lev);
    const done = (ci && ci.quests) || [];
    const into = prof.xp - xpFor(lvl), need = xpFor(lvl + 1) - xpFor(lvl);
    const g = prof.goal && prof.goal.targets ? prof.goal : null;
    const d0 = ci || { steps: '', active: '', sleep: '', drinks: '', cigs: '', stress: '', mood: '' };
    const smoker = prof.values.smoke === 'current' || (g && g.targets.smoke === 'former');
    let goalGain = 0;
    if (g) { const q = Object.assign({}, c.p, goalApplied(prof, c.p)); goalGain = E.core(q).leTotal - c.ev.leTotal; }
    // XP de la semaine
    const ws = weekStart(now), wk = [];
    for (let i = 0; i < 7; i++) { const x = new Date(ws); x.setDate(ws.getDate() + i); wk.push({ k: todayKey(x), xp: prof.xpLog[todayKey(x)] || 0, today: todayKey(x) === tk }); }
    const wkMax = Math.max(40, ...wk.map((w) => w.xp)), wkTot = wk.reduce((s, w) => s + w.xp, 0);
    // Quêtes personnelles
    const mine = prof.quests.filter((q) => !q.archived);
    const dueNow = mine.filter((q) => qDue(q, now));
    const later = mine.filter((q) => !qDue(q, now));
    const nDone = dueNow.filter((q) => qDone(q, now)).length;
    const weekStrip = (q) => { let s = '<span class="week" aria-hidden="true">'; for (let i = 0; i < 7; i++) { const x = new Date(ws); x.setDate(ws.getDate() + i); const sch = q.freq === 'weekly' ? true : qScheduled(q, x); s += `<i class="${qDone(q, x) ? 'on' : sch ? '' : 'off'} ${todayKey(x) === tk ? 'today' : ''}"></i>`; } return s + '</span>'; };
    const qRow = (q) => {
      const cnt = qCount(q, now), tg = qTarget(q), dn = cnt >= tg, sk = qStreak(q);
      const ctl = q.kind === 'count'
        ? `<div class="ctr"><button type="button" data-qminus="${q.id}" aria-label="Retirer 1">−</button><span class="n">${cnt}/${tg}</span><button type="button" data-qplus="${q.id}" aria-label="Ajouter 1">+</button></div>`
        : `<button class="chk" type="button" data-qtoggle="${q.id}" aria-pressed="${dn}" aria-label="${dn ? 'Annuler' : 'Marquer comme faite'}">${dn ? icon('check') : ''}</button>`;
      return `<div class="myq ${dn ? 'done' : ''}">${q.kind === 'count' ? `<span class="chk" aria-hidden="true" style="${dn ? 'background:var(--accent);border-color:var(--accent);color:var(--accent-ink)' : ''}">${dn ? icon('check') : ''}</span>` : ctl}
        <div><div class="t">${esc(q.title)}</div><div class="meta"><span class="chip">${esc(freqText(q))}</span>${q.freq === 'weekly' ? `<span class="chip">${qWeekDone(q, now)}/${q.perWeek} cette semaine</span>` : ''}${sk ? `<span class="chip accent">Série ${sk}${q.freq === 'weekly' ? ' sem.' : ' j'}</span>` : ''}${q.reminder ? `<span class="chip">Rappel ${esc(q.reminder)}</span>` : ''}${weekStrip(q)}</div></div>
        <div class="row" style="gap:6px">${q.kind === 'count' ? ctl : ''}<span class="xp mono xs muted">+${q.xp || 15}</span><button class="icon-btn" type="button" data-qedit="${q.id}" aria-label="Modifier ${esc(q.title)}" style="width:34px;height:34px">${icon('gear')}</button></div></div>`;
    };
    const badgeCard = (b) => {
      const got = !!prof.badges[b.id];
      let prog = '';
      if (!got && b.prog) { const [cur, goal] = b.prog(prof); prog = `<div class="prog"><i style="width:${clamp(cur / goal, 0, 1) * 100}%"></i></div><span class="xs muted">${f0(Math.min(cur, goal))} / ${goal}</span>`; }
      const fresh = got && (Date.now() - new Date(prof.badges[b.id]) < 3 * 864e5);
      return `<div class="badge ${got ? '' : 'locked'} ${fresh ? 'new' : ''}" title="${got ? 'Obtenu le ' + new Date(prof.badges[b.id]).toLocaleDateString('fr-FR') : 'À débloquer'}">${glyphSvg(b.glyph, got)}<span>${esc(b.name)}</span>${b.tier ? `<span class="tier">${b.tier}</span>` : ''}${prog}</div>`;
    };
    view.innerHTML = `
      <div class="page-head"><div><h1>Quêtes</h1><p class="sub">Crée tes propres quêtes, note ta journée, gagne de l'XP et débloque des badges. Chaque petite action compte.</p></div>
        <button class="btn primary sm" type="button" data-qnew>${icon('plus')} Nouvelle quête</button></div>
      <div class="grid">
        <div class="tile c2 w4" style="align-items:center;text-align:center">
          <span class="title-chip">${esc(titleOf(lvl))}</span>
          <div class="ring-wrap" style="max-width:180px">${C.ring(into / need, { color: 'var(--accent)' })}<div class="ring-center"><span class="label">Niveau</span><span class="big l">${lvl}</span><span class="xs muted">${f0(into)} / ${f0(need)} XP</span></div></div>
          <div class="row" style="justify-content:center"><span class="chip accent">${st} jour${st > 1 ? 's' : ''} de suite</span><span class="chip">${Object.keys(prof.badges).length} badge${Object.keys(prof.badges).length > 1 ? 's' : ''}</span></div>
          <div style="width:100%"><div class="row between"><span class="label">Cette semaine</span><span class="mono xs">${f0(wkTot)} XP</span></div>
            <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;align-items:end;height:64px;margin-top:8px">${wk.map((w) => `<div title="${w.xp} XP" style="height:${Math.max(4, (w.xp / wkMax) * 56)}px;border-radius:6px;background:${w.today ? 'var(--accent)' : w.xp ? 'var(--text)' : 'var(--surface-3)'};opacity:${w.xp || w.today ? 1 : 0.8}"></div>`).join('')}</div>
            <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:4px">${DOW.map((d) => `<span class="xs muted" style="text-align:center">${d}</span>`).join('')}</div></div>
        </div>
        <div class="tile c4 w8">
          <div class="tile-head"><h2>Mes quêtes du jour</h2><span class="label">${nDone} / ${dueNow.length} faites</span></div>
          ${dueNow.length ? `<div class="meter accent"><i style="width:${dueNow.length ? (nDone / dueNow.length) * 100 : 0}%"></i></div><div>${dueNow.map(qRow).join('')}</div>`
            : `<p class="small muted">Aucune quête prévue aujourd'hui. Crée ta première quête : une habitude à répéter chaque jour, certains jours ou quelques fois par semaine.</p>`}
          ${later.length ? `<details><summary class="small muted" style="cursor:pointer">Autres quêtes (${later.length}) : pas prévues aujourd'hui ou quota atteint</summary><div>${later.map(qRow).join('')}</div></details>` : ''}
          <div class="row"><button class="btn sm" type="button" data-qnew>${icon('plus')} Créer une quête</button><button class="btn sm ghost" type="button" data-open="profiles" data-tab="rem">Régler mes rappels</button></div>
        </div>
        <form class="tile span-2 c6 w7" id="checkin" autocomplete="off">
          <div class="tile-head"><h2>Check-in du jour</h2><span class="label">${now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span></div>
          <div class="checkin-grid">
            ${[['steps', 'Pas', 0, 50000, 100], ['active', 'Minutes actives', 0, 600, 5], ['sleep', 'Sommeil (h)', 0, 14, 0.25], ['drinks', 'Verres d\'alcool', 0, 30, 1], ...(smoker ? [['cigs', 'Cigarettes', 0, 80, 1]] : []), ['stress', 'Stress (0–10)', 0, 10, 1], ['mood', 'Humeur (0–10)', 0, 10, 1]]
              .map(([k, l, mi, ma, stp]) => `<div class="field"><label for="ci-${k}">${l}</label><input type="number" inputmode="decimal" id="ci-${k}" name="${k}" min="${mi}" max="${ma}" step="${stp}" value="${d0[k] === '' || d0[k] == null ? '' : d0[k]}"></div>`).join('')}
          </div>
          <div class="row between"><span class="xs muted">Habitudes : 8 000 pas · 30 min actives · 7–9 h de sommeil · ≤ 1 verre · 0 cigarette</span><button class="btn primary" type="submit">${ci ? 'Mettre à jour' : 'Enregistrer · +20 XP'}</button></div>
          <div class="row"><button class="btn sm" type="button" id="apply-avg">Appliquer ma moyenne 7 jours au profil</button><span class="xs muted">Met à jour pas, activité, sommeil, alcool${smoker ? ', tabac' : ''} et stress.</span></div>
        </form>
        <div class="tile span-2 c6 w5">
          <div class="tile-head"><h2>Défis du jour</h2><span class="label">+15 XP · tirés de tes leviers</span></div>
          <div>${qs.map((q) => `<div class="quest"><button class="chk" type="button" data-quest="${q.id}" aria-pressed="${done.includes(q.id)}" aria-label="Marquer comme fait">${done.includes(q.id) ? icon('check') : ''}</button><div><div>${esc(q.text)}</div><div class="xs muted">Levier : ${esc(q.lever === '_' ? 'bien-être général' : VAR[q.lever].short)} · <button class="btn ghost sm" style="min-height:24px;padding:0 8px" type="button" data-qadopt="${esc(q.text)}" data-dom="${q.lever === '_' ? 'mind' : VAR[q.lever].dom}">Garder chaque jour</button></div></div><span class="xp">+15</span></div>`).join('')}</div>
        </div>
        <div class="tile span-2 c6 w12">
          <div class="tile-head"><h2>Objectif santé</h2>${g ? `<span class="chip accent">${sign(goalGain)} ans à terme</span>` : ''}</div>
          ${g ? `<div class="xs muted">Échéance : ${new Date(g.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} · ${Math.max(0, dayDiff(new Date(), g.deadline))} jours restants</div>
            <div class="grid" style="margin-top:4px">${Object.entries(g.targets).map(([id, t]) => `<div class="span-2 c3 w6">${goalRow(prof, id, t)}</div>`).join('')}</div>
            <div class="row"><a class="btn sm" href="#sim">Ajuster dans le simulateur</a><button class="btn sm danger" type="button" id="goal-del">Supprimer l'objectif</button></div><div id="goal-confirm"></div>`
            : `<p class="small muted">Pas encore d'objectif. Ouvre le simulateur, change une ou plusieurs habitudes, puis « Définir comme objectif ».</p><a class="btn primary sm" href="#sim">Ouvrir le simulateur</a>`}
        </div>
      </div>
      <div class="section-title"><h2>Badges</h2><span class="label">${Object.keys(prof.badges).filter((k) => BADGES.some((b) => b.id === k)).length} / ${BADGES.length}</span></div>
      <div class="badges">${BADGES.map(badgeCard).join('')}</div>`;

    const rerender = () => { store.save(); viewQuests(view, prof); };
    const findQ = (id) => prof.quests.find((q) => q.id === id);
    const setCount = (q, n, el) => {
      q.log = q.log || {};
      const was = qDone(q, now);
      if (n <= 0) delete q.log[tk]; else q.log[tk] = n;
      const is = qDone(q, now);
      if (!was && is) {
        addXP(prof, q.xp || 15, 'Quête · ' + q.title); burst(el);
        q.best = Math.max(q.best || 0, qStreak(q));
      } else if (was && !is) addXP(prof, -(q.xp || 15));
      checkBadges(prof); rerender();
    };
    view.querySelectorAll('[data-qtoggle]').forEach((b) => b.addEventListener('click', () => { const q = findQ(b.dataset.qtoggle); setCount(q, qDone(q, now) ? 0 : 1, b); }));
    view.querySelectorAll('[data-qplus]').forEach((b) => b.addEventListener('click', () => { const q = findQ(b.dataset.qplus); setCount(q, qCount(q, now) + 1, b); }));
    view.querySelectorAll('[data-qminus]').forEach((b) => b.addEventListener('click', () => { const q = findQ(b.dataset.qminus); setCount(q, qCount(q, now) - 1, b); }));
    view.querySelectorAll('[data-qedit]').forEach((b) => b.addEventListener('click', () => sheetQuest(prof, findQ(b.dataset.qedit))));
    view.querySelectorAll('[data-qnew]').forEach((b) => b.addEventListener('click', () => sheetQuest(prof, null)));
    view.querySelectorAll('[data-qadopt]').forEach((b) => b.addEventListener('click', () => sheetQuest(prof, null, { title: b.dataset.qadopt, dom: b.dataset.dom, kind: 'check', freq: 'daily', xp: 15 })));

    $('#checkin').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target), rec = {};
      ['steps', 'active', 'sleep', 'drinks', 'cigs', 'stress', 'mood'].forEach((k) => { const v = fd.get(k); rec[k] = v === null || v === '' ? null : parseFloat(String(v).replace(',', '.')); });
      if (rec.cigs == null && !smoker) rec.cigs = 0;
      const first = !prof.checkins[tk];
      rec.quests = (prof.checkins[tk] && prof.checkins[tk].quests) || [];
      prof.checkins[tk] = rec;
      const hm = habitsMet(rec);
      if (first) { addXP(prof, 20 + hm * 10, `Check-in · ${hm} habitude${hm > 1 ? 's' : ''} tenue${hm > 1 ? 's' : ''}`); award(prof, 'checkin_1'); burst(e.submitter); } else toast('Check-in mis à jour');
      checkBadges(prof); rerender();
    });
    $('#apply-avg').addEventListener('click', () => {
      const days = []; for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() - i); const r = prof.checkins[todayKey(d)]; if (r) days.push(r); }
      if (days.length < 3) { toast('Il faut au moins 3 check-ins sur les 7 derniers jours'); return; }
      const avg = (k) => { const a = days.map((d) => d[k]).filter((x) => x != null && !isNaN(x)); return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null; };
      const v = Object.assign({}, prof.values), set = (id, x) => { if (x != null) v[id] = clamp(Math.round(x / VAR[id].step) * VAR[id].step, VAR[id].min, VAR[id].max); };
      set('steps', avg('steps')); set('mvpa', avg('active') != null ? avg('active') * 7 : null); set('sleep', avg('sleep')); set('alcohol', avg('drinks') != null ? avg('drinks') * 7 : null); set('stress', avg('stress'));
      if (prof.values.smoke === 'current') { const cg = avg('cigs'); if (cg != null) { if (cg === 0 && days.length >= 7) { v.smoke = 'former'; v.quit_years = 0; } else set('cpd', Math.max(1, cg)); } }
      saveValues(prof, v); toast('Profil mis à jour avec ta moyenne sur 7 jours'); viewQuests(view, prof);
    });
    view.querySelectorAll('[data-quest]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.quest;
      const rec = prof.checkins[tk] || (prof.checkins[tk] = { quests: [] });
      rec.quests = rec.quests || [];
      if (rec.quests.includes(id)) { rec.quests = rec.quests.filter((x) => x !== id); addXP(prof, -15); }
      else { rec.quests.push(id); addXP(prof, 15, 'Défi relevé'); burst(b); }
      checkBadges(prof); rerender();
    }));
    const del = $('#goal-del');
    if (del) del.addEventListener('click', () => {
      $('#goal-confirm').innerHTML = `<div class="confirm">Supprimer l'objectif et sa projection ? <button class="btn sm danger" type="button" id="goal-del-yes">Supprimer</button><button class="btn sm" type="button" id="goal-del-no">Annuler</button></div>`;
      $('#goal-del-yes').addEventListener('click', () => { prof.goal = null; store.save(); toast('Objectif supprimé'); viewQuests(view, prof); });
      $('#goal-del-no').addEventListener('click', () => ($('#goal-confirm').innerHTML = ''));
    });
  }

  // Création / modification d'une quête personnelle
  function sheetQuest(prof, q, preset) {
    const isNew = !q;
    const d = Object.assign({ title: '', dom: 'move', kind: 'check', target: 5, unit: '', freq: 'daily', days: [0, 1, 2, 3, 4], perWeek: 3, date: todayKey(), xp: 20, reminder: null }, q || preset || {});
    const back = sheet(isNew ? 'Nouvelle quête' : 'Modifier la quête', '<div data-qbody></div>');
    const body = back.querySelector('[data-qbody]');
    const draw = () => {
      body.innerHTML = `
        ${isNew ? `<span class="label">Modèles</span><div class="tpl-grid" style="margin:8px 0 16px">${QTPL.map((t, i) => `<button class="tpl" type="button" data-tpl="${i}"><b style="font-weight:500">${esc(t.title)}</b><span class="xs muted">${esc(freqText(t))} · +${t.xp} XP</span></button>`).join('')}</div><hr class="hr" style="margin-bottom:14px">` : ''}
        <div class="form-grid">
          <div class="field" style="grid-column:1/-1"><label for="q-title">Nom de la quête</label><input type="text" id="q-title" maxlength="60" value="${esc(d.title)}" placeholder="Ex. Marcher après le déjeuner"></div>
          <div class="field"><label for="q-dom">Catégorie</label><select id="q-dom">${LS.DOMAINS.map((x) => `<option value="${x.id}" ${d.dom === x.id ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select></div>
          <div class="field"><span class="lab">Type</span><div class="seg" data-kind>${[['check', 'Case à cocher'], ['count', 'Compteur']].map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${d.kind === k}">${l}</button>`).join('')}</div></div>
          ${d.kind === 'count' ? `<div class="field"><label for="q-target">Objectif par jour</label><input type="number" id="q-target" min="1" max="100" step="1" value="${d.target}"></div><div class="field"><label for="q-unit">Unité</label><input type="text" id="q-unit" maxlength="16" value="${esc(d.unit || '')}" placeholder="verres, portions, pages…"></div>` : ''}
        </div>
        <div class="field" style="margin-top:14px"><span class="lab">Fréquence</span><div class="seg" data-freq>${[['daily', 'Chaque jour'], ['days', 'Certains jours'], ['weekly', 'X fois / semaine'], ['once', 'Une seule fois']].map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${d.freq === k}">${l}</button>`).join('')}</div></div>
        ${d.freq === 'days' ? `<div class="days" style="margin-top:10px" role="group" aria-label="Jours">${DOW.map((x, i) => `<button type="button" data-day="${i}" aria-pressed="${d.days.includes(i)}" aria-label="${DOW_LONG[i]}">${x}</button>`).join('')}</div>` : ''}
        ${d.freq === 'weekly' ? `<div class="field" style="margin-top:10px;max-width:220px"><label for="q-pw">Nombre de fois par semaine</label><input type="number" id="q-pw" min="1" max="7" step="1" value="${d.perWeek}"></div>` : ''}
        ${d.freq === 'once' ? `<div class="field" style="margin-top:10px;max-width:220px"><label for="q-date">Date</label><input type="date" id="q-date" value="${d.date}"></div>` : ''}
        <div class="field" style="margin-top:14px"><span class="lab">Difficulté (XP gagnée)</span><div class="seg" data-xp>${[[10, 'Facile · 10'], [20, 'Moyen · 20'], [35, 'Difficile · 35']].map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${d.xp === k}">${l}</button>`).join('')}</div></div>
        <div class="set-row" style="margin-top:14px"><label class="row" for="q-rem-on"><span class="toggle"><input type="checkbox" id="q-rem-on" ${d.reminder ? 'checked' : ''}><span></span></span>Rappel</label>${d.reminder ? `<input type="time" id="q-rem" value="${d.reminder}">` : '<span class="xs muted">Une notification à l\'heure choisie les jours prévus</span>'}</div>
        <p class="small" data-err style="color:var(--bad)"></p>
        <div class="sheet-foot">${isNew ? '<span></span>' : '<button class="btn danger" type="button" data-qdel>Supprimer</button>'}<div class="row"><button class="btn" type="button" data-close>Annuler</button><button class="btn primary" type="button" data-qsave>${isNew ? 'Créer la quête' : 'Enregistrer'}</button></div></div>
        <div data-qconfirm></div>`;
    };
    const readInputs = () => {
      const v = (id) => { const el = body.querySelector('#' + id); return el ? el.value : null; };
      if (v('q-title') != null) d.title = v('q-title');
      if (v('q-dom')) d.dom = v('q-dom');
      if (v('q-target') != null) d.target = clamp(parseInt(v('q-target'), 10) || 1, 1, 100);
      if (v('q-unit') != null) d.unit = v('q-unit');
      if (v('q-pw') != null) d.perWeek = clamp(parseInt(v('q-pw'), 10) || 1, 1, 7);
      if (v('q-date')) d.date = v('q-date');
      if (v('q-rem')) d.reminder = v('q-rem');
    };
    body.addEventListener('click', (e) => {
      const t = e.target;
      const tpl = t.closest('[data-tpl]');
      if (tpl) { Object.assign(d, JSON.parse(JSON.stringify(QTPL[+tpl.dataset.tpl]))); draw(); return; }
      const seg = t.closest('[data-kind] [data-v], [data-freq] [data-v], [data-xp] [data-v]');
      if (seg) {
        readInputs();
        const grp = seg.parentElement;
        if (grp.hasAttribute('data-kind')) d.kind = seg.dataset.v;
        if (grp.hasAttribute('data-freq')) d.freq = seg.dataset.v;
        if (grp.hasAttribute('data-xp')) d.xp = +seg.dataset.v;
        draw(); return;
      }
      const day = t.closest('[data-day]');
      if (day) { readInputs(); const i = +day.dataset.day; d.days = d.days.includes(i) ? d.days.filter((x) => x !== i) : d.days.concat(i); draw(); return; }
      if (t.closest('[data-qsave]')) {
        readInputs();
        const err = body.querySelector('[data-err]');
        if (!d.title.trim()) { err.textContent = 'Donne un nom à ta quête.'; return; }
        if (d.freq === 'days' && !d.days.length) { err.textContent = 'Choisis au moins un jour.'; return; }
        const clean = { title: d.title.trim(), dom: d.dom, kind: d.kind, target: d.kind === 'count' ? d.target : 1, unit: d.kind === 'count' ? d.unit : '', freq: d.freq, days: d.freq === 'days' ? d.days.slice().sort() : [], perWeek: d.freq === 'weekly' ? d.perWeek : null, date: d.freq === 'once' ? d.date : null, xp: d.xp, reminder: d.reminder || null };
        if (isNew) {
          prof.quests.push(Object.assign({ id: uid(), created: new Date().toISOString(), log: {} }, clean));
          addXP(prof, 10, 'Quête créée'); award(prof, 'custom_1');
        } else Object.assign(q, clean);
        if (clean.reminder) award(prof, 'reminder');
        store.save(); syncReminders(!!clean.reminder); closeSheet(); render();
        if (clean.reminder && !isNative() && 'Notification' in window && Notification.permission === 'default') toast('Autorise les notifications dans Profil → Rappels pour recevoir ce rappel');
        return;
      }
      if (t.closest('[data-qdel]')) {
        body.querySelector('[data-qconfirm]').innerHTML = `<div class="confirm" style="margin-top:10px">Supprimer « ${esc(q.title)} » et son historique ? <button class="btn sm danger" type="button" data-qdel-yes>Supprimer</button><button class="btn sm" type="button" data-qdel-no>Annuler</button></div>`;
        return;
      }
      if (t.closest('[data-qdel-yes]')) { prof.quests = prof.quests.filter((x) => x !== q); store.save(); syncReminders(false); closeSheet(); render(); toast('Quête supprimée'); return; }
      if (t.closest('[data-qdel-no]')) { body.querySelector('[data-qconfirm]').innerHTML = ''; }
    });
    body.addEventListener('change', (e) => {
      if (e.target.id === 'q-rem-on') { readInputs(); d.reminder = e.target.checked ? d.reminder || '08:00' : null; draw(); }
    });
    draw();
  }
  function goalRow(prof, id, t) {
    const v = VAR[id]; if (!v) return '';
    const cur = prof.values[id], from = prof.goal.from ? prof.goal.from[id] : cur;
    let prog;
    if (typeof t === 'number' && typeof cur === 'number' && typeof from === 'number') prog = from === t ? 1 : clamp((cur - from) / (t - from), 0, 1);
    else prog = cur === t ? 1 : 0;
    return `<div class="goal-row"><div><div>${esc(v.label)}</div><div class="xs muted">${esc(fmtVal(v, from, prof))} → <b style="color:var(--text)">${esc(fmtVal(v, t, prof))}</b> · actuel ${esc(fmtVal(v, cur, prof))}</div><div class="meter accent" style="margin-top:6px"><i style="width:${prog * 100}%"></i></div></div><span class="label" style="align-self:center">${f0(prog * 100)} %</span></div>`;
  }
  function checkBadges(prof) {
    const s = streak(prof);
    if (s >= 7) award(prof, 'streak_7');
    if (s >= 30) award(prof, 'streak_30');
    const recs = Object.entries(prof.checkins).sort((a, b) => (a[0] < b[0] ? 1 : -1));
    if (recs.some(([, r]) => r.steps >= 10000)) award(prof, 'steps_10k');
    const last7 = recs.slice(0, 7);
    if (last7.length === 7 && last7.every(([, r]) => r.sleep >= 7)) award(prof, 'sleep_week');
    if (last7.length === 7 && last7.every(([, r]) => r.cigs === 0) && (prof.values.smoke !== 'never')) award(prof, 'smoke_free_7');
    const td = totalDone(prof);
    if (td >= 10) award(prof, 'quest_10');
    if (td >= 50) award(prof, 'quest_50');
    if (td >= 200) award(prof, 'quest_200');
    const qs = maxQStreak(prof);
    if (qs >= 7) award(prof, 'qstreak_7');
    if (qs >= 30) award(prof, 'qstreak_30');
    if (perfectDay(prof, new Date())) award(prof, 'perfect_day');
    if (perfectStreak(prof) >= 7) award(prof, 'perfect_week');
    if (levelOf(prof.xp) >= 5) award(prof, 'level_5');
    if (levelOf(prof.xp) >= 10) award(prof, 'level_10');
  }

  /* =========================================================
     ÉCRAN : SCIENCE
     ========================================================= */
  const sciState = { dom: 'all' };
  function viewScience(view, prof) {
    const c = ctxFor(prof), p = c.p;
    const srcIds = Object.keys(LS.SOURCES);
    const num = {}; srcIds.forEach((k, i) => (num[k] = i + 1));
    const refLinks = (ids) => ids.map((k) => { const s = LS.SOURCES[k]; if (!s) return ''; return s.url ? `<a href="${s.url}" target="_blank" rel="noopener">[${num[k]}]${s.verify ? ' ⚠' : ''}</a>` : `<span>[${num[k]}]${s.verify ? ' ⚠' : ''}</span>`; }).join('');
    const bench = benchmarks();
    view.innerHTML = `
      <div class="page-head"><div><h1>Science</h1><p class="sub">Chaque chiffre de Lifespan vient d'une étude publiée. Voici les formules, les courbes, les tests et les sources.</p></div></div>
      <div class="grid">
        <div class="tile span-2 c3 w6"><h2>Ce que Lifespan calcule</h2><div class="prose small">
          <p>Lifespan estime ton <strong>espérance de vie</strong>, tes <strong>années en bonne santé</strong>, ton <strong>âge de risque</strong> et tes <strong>risques de maladie</strong> à partir de ${VARS.filter((v) => v.lhr).length} variables et de ${srcIds.length} sources.</p>
          <p>Les effets viennent surtout d'<strong>études observationnelles</strong> : ce sont des associations. Quand des essais randomisés existent (tension, LDL), le modèle les privilégie.</p>
          <p>Les chiffres « Bonheur » et « Stress » sont <strong>indicatifs</strong> (grade C) : ils montrent une tendance, pas une mesure.</p></div></div>
        <div class="tile span-2 c3 w6"><h2>Ce que Lifespan n'est pas</h2><div class="prose small">
          <p>Ce n'est <strong>pas un dispositif médical</strong> ni un diagnostic. Deux personnes avec les mêmes valeurs n'auront pas la même vie : le modèle décrit des moyennes.</p>
          <p>Tes données restent <strong>sur ton appareil</strong> (stockage local du navigateur). Aucun serveur, aucun traceur.</p>
          <p>En cas de détresse psychologique en France : <strong>3114</strong> (24 h/24, gratuit).</p></div></div>
      </div>
      <div class="section-title"><h2>Méthode</h2><span class="label">de tes valeurs à tes résultats</span></div>
      <ol class="pipeline" style="padding:0;margin:0">
        <li><div><b>Mortalité de base du pays.</b> <span class="small muted">Loi de Gompertz-Makeham par sexe, calibrée pour retrouver l'espérance de vie à la naissance (${esc((LS.COUNTRIES[prof.country] || LS.COUNTRIES.FR).src)}).</span><div class="formula">h₀(x) = A + B·e^(b·x)    b = ${LS.PARAMS.b.M} (H), ${LS.PARAMS.b.F} (F) ; B résolu par bissection</div></div></li>
        <li><div><b>Effet de chaque variable.</b> <span class="small muted">Courbe dose-réponse non linéaire (interpolation log-linéaire entre les points publiés), par outcome : mortalité, cardio-vasculaire, diabète, démence, cancer, dépression.</span><div class="formula">ln HRᵢ(v) = interpolation des points [v, HR] des méta-analyses ; plat hors des données</div></div></li>
        <li><div><b>Combinaison sans double comptage.</b> <span class="small muted">Somme sur l'échelle log (produit des HR), avec recouvrements traités par domaine et médiation de l'IMC par la tension, le LDL et la glycémie.</span><div class="formula">Aérobie = fort + 0,4 × faible (activité ↔ pas)      Nutrition × 0,6      Esprit × 0,6
IMC × (1 − 0,5 × biomarqueurs connus / 3)
L = Σ domaines × k  (k = ${LS.PARAMS.k} ; tabac/substances ${LS.PARAMS.kSubst} ; corps ${LS.PARAMS.kBody})
L plafonné = ${LS.PARAMS.cap} · tanh(L / ${LS.PARAMS.cap})</div></div></li>
        <li><div><b>Comparaison à la population.</b> <span class="small muted">La mortalité nationale contient déjà les fumeurs, les sédentaires… On compare donc ton profil à un mélange de 4 profils types, pondéré par la survie.</span><div class="formula">R(x) = L_toi(x) − ln Σ wᵢ(x)·e^(Lᵢ(x))      wᵢ(x) ∝ wᵢ · exp(−(e^(Lᵢ−L̄) − 1)·H₀(30→x))</div></div></li>
        <li><div><b>Effet de l'âge.</b> <span class="small muted">Les risques relatifs diminuent avec l'âge (IMC, tension, glycémie surtout). Le nadir de l'IMC monte de 22 à 24.</span><div class="formula">corps & clinique : × (1 − 0,5 · rampe(55→85 ans))     autres : × (1 − 0,25 · rampe(60→90))</div></div></li>
        <li><div><b>Table de survie.</b> <span class="small muted">Intégration trimestrielle jusqu'à ${LS.PARAMS.maxAge} ans.</span><div class="formula">h(x) = h₀(x)·e^R(x)     S(x) = exp(−∫ h)     EV = ∫ S(x) dx     décès 10 ans = 1 − S(a+10)
âge de risque = a + R(a) / b      fourchette : R × ${LS.PARAMS.bandLo} et R × ${LS.PARAMS.bandHi}</div></div></li>
        <li><div><b>Années en bonne santé.</b> <span class="small muted">Méthode de Sullivan : prévalence d'incapacité logistique calibrée sur le HALE de l'OMS, décalée selon ton âge de risque.</span><div class="formula">EVBS = ∫ S(x)·[1 − π(x + R/b)] dx     π(x) = 1 / (1 + e^(−(x − m)/${LS.PARAMS.haleS}))</div></div></li>
        <li><div><b>Projections.</b> <span class="small muted">Chaque objectif suit une rampe jusqu'à l'échéance ; l'effet biologique suit avec un délai propre à l'habitude.</span><div class="formula">v_eff(t+Δ) = v_eff(t) + (v_rampe(t+Δ) − v_eff(t))·(1 − e^(−Δ/τ))     τ : activité 0,5 an · nutrition 1,5 · alcool 1 · clinique 0,5–1</div></div></li>
      </ol>
      <div class="section-title"><h2>Tests de calibration</h2><span class="label">modèle vs études publiées, calculé en direct</span></div>
      <div class="tile scroll-x"><table class="data-table"><thead><tr><th>Cas</th><th>Publié</th><th>Lifespan</th><th>Source</th></tr></thead><tbody>
        ${bench.map((b) => `<tr><td>${esc(b.label)}</td><td>${esc(b.pub)}</td><td class="num"><b>${sign(b.val)} ans</b></td><td>${refLinks([b.ref])}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="section-title"><h2>Variables</h2><span class="label">${VARS.filter((v) => v.formula).length} documentées</span></div>
      <div class="seg" id="sci-dom" role="group" aria-label="Domaine" style="margin-bottom:12px"><button type="button" data-d="all" aria-pressed="${sciState.dom === 'all'}">Toutes</button>${LS.DOMAINS.map((d) => `<button type="button" data-d="${d.id}" aria-pressed="${sciState.dom === d.id}">${esc(d.label)}</button>`).join('')}</div>
      <div class="var-cards">${VARS.filter((v) => v.formula && (sciState.dom === 'all' || v.dom === sciState.dom)).map((v) => `
        <article class="tile var-card">
          <div class="tile-head"><h3>${esc(v.label)}</h3><span class="chip grade-${v.grade}" title="Grade de preuve">Grade ${v.grade}</span></div>
          <div class="xs muted">${esc(LS.DOMAINS.find((d) => d.id === v.dom).label)}${v.unit ? ' · ' + esc(v.unit) : ''} · ta valeur : <b style="color:var(--text)">${esc(fmtVal(v, p[v.id], p))}</b></div>
          ${v.lhr && !v.kind && v.id !== 'hba1c' ? `<div class="curve">${C.doseCurve(v, p)}</div><div class="xs muted">Risque relatif de mortalité (échelle log) selon la valeur ; point rouge = toi.</div>` : ''}
          <div class="formula">${esc(v.formula)}</div>
          ${v.effects && v.effects.length ? `<div class="scroll-x"><table class="data-table"><thead><tr><th>Seuil</th><th>Outcome</th><th>Effet</th><th></th></tr></thead><tbody>${v.effects.map((e) => `<tr><td>${esc(e[0])}</td><td>${esc(e[1])}</td><td>${esc(e[2])}</td><td>${refLinks([e[3]])}</td></tr>`).join('')}</tbody></table></div>` : ''}
          <div class="refs">${refLinks(v.refs)}</div>
        </article>`).join('')}</div>
      <div class="section-title"><h2>Bibliographie</h2><span class="label">⚠ = attribution à vérifier</span></div>
      <div class="tile"><ol class="biblio" style="padding:0;margin:0">${srcIds.map((k) => { const s = LS.SOURCES[k]; return `<li id="src-${k}"><span class="k">[${num[k]}]${s.m ? ' · M' + s.m : ''}</span><span>${esc(s.t)} <i class="muted">${esc(s.j)}</i>${s.url ? ` <a href="${s.url}" target="_blank" rel="noopener" class="xs">lien</a>` : ''}${s.verify ? ' <span class="chip warn">⚠ à vérifier</span>' : ''}</span></li>`; }).join('')}</ol>
        <p class="xs muted" style="margin-top:10px">« M53 » = référence [53] de la matrice de paramétrage d'origine.</p></div>
      <div class="section-title"><h2>Limites</h2></div>
      <div class="tile prose small">
        <p>Preuves quasi exclusivement <strong>observationnelles</strong> : confusion résiduelle, biais du « healthy user » et causalité inverse (surtout pour le bien-être, le long sommeil, l'alcool faible et le LDL bas).</p>
        <p><strong>Hétérogénéité élevée</strong> entre études (I² souvent &gt; 70 %) et définitions variables des catégories « saines ».</p>
        <p>Beaucoup d'associations psychosociales <strong>s'atténuent</strong> après ajustement sur la dépression, les comportements de santé et le statut socio-économique.</p>
        <p>Drogues : pas de vraie courbe dose-réponse ; SMR issus de populations en traitement, probablement <strong>surestimés</strong> pour l'usage occasionnel (rétrécis dans le modèle).</p>
        <p>Les incidences de maladies à 10 ans sont des <strong>ordres de grandeur</strong> (Europe de l'Ouest), pas des scores cliniques validés comme SCORE2.</p>
        <p>Les espérances de vie hors France sont des approximations récentes ; elles peuvent différer des tables officielles de quelques mois.</p>
      </div>`;
    $('#sci-dom').addEventListener('click', (e) => { const b = e.target.closest('[data-d]'); if (b) { sciState.dom = b.dataset.d; viewScience(view, prof); } });
  }
  let benchCache = null;
  function benchmarks() {
    if (benchCache) return benchCache;
    const mk = (sex, age, v) => {
      const h = sex === 'F' ? 164 : 177;
      const p = Object.assign({}, LS.defaultValues(), LS.BASE_PROFILE, v, { sex, height: h, country: 'FR', _age: age });
      p.weight = (v.bmi || 26) * Math.pow(h / 100, 2);
      VARS.filter((x) => x.opt).forEach((x) => { if (!(x.id in v)) p[x.id] = null; });
      return p;
    };
    const L = (p) => E.core(p, { noHale: true }).leTotal;
    const h5 = { smoke: 'never', bmi: 22, mvpa: 300, alcohol: 5, fv: 5, wg: 3, nuts: 5, meat: 3, ssb: 0, upf: 18, fish: 2 };
    const u5 = { smoke: 'current', cpd: 15, bmi: 31, mvpa: 20, steps: 4000, alcohol: 20, fv: 1.5, wg: 0.5, nuts: 0, meat: 10, ssb: 7, upf: 50, fish: 0 };
    benchCache = [
      { label: '5 facteurs sains vs 0, homme de 50 ans', pub: '+12,2 ans', val: L(mk('M', 50, h5)) - L(mk('M', 50, u5)), ref: 'li2018' },
      { label: '5 facteurs sains vs 0, femme de 50 ans', pub: '+14,0 ans', val: L(mk('F', 50, h5)) - L(mk('F', 50, u5)), ref: 'li2018' },
      { label: 'Ne jamais fumer vs 20 cig/j à vie, homme de 25 ans', pub: '≥ +10 ans', val: L(mk('M', 25, {})) - L(mk('M', 25, { smoke: 'current', cpd: 20 })), ref: 'jha2013' },
      { label: 'Arrêter à 35 ans vs continuer (20 cig/j)', pub: '~ +9 à 10 ans', val: L(mk('M', 35, { smoke: 'former', cpd: 20, quit_years: 0 })) - L(mk('M', 35, { smoke: 'current', cpd: 20 })), ref: 'jha2013' },
      { label: 'Activité 225 min/sem (+ pas) vs inactif, 40 ans', pub: '+3,4 ans', val: L(mk('M', 40, { mvpa: 225, steps: 7500 })) - L(mk('M', 40, { mvpa: 0, steps: 4000 })), ref: 'moore2012' },
      { label: '45 verres/sem vs 5, homme de 40 ans', pub: '−4 à −5 ans', val: L(mk('M', 40, { alcohol: 45 })) - L(mk('M', 40, { alcohol: 5 })), ref: 'wood2018' },
      { label: 'IMC 35 vs 23, homme de 40 ans', pub: '−3 à −7 ans', val: L(mk('M', 40, { bmi: 35 })) - L(mk('M', 40, { bmi: 23 })), ref: 'peeters2003' }
    ];
    return benchCache;
  }

  /* =========================================================
     FEUILLES : profils, édition, réglages, export
     ========================================================= */
  function closeSheet() { const s = $('#sheet'); if (s) s.remove(); document.removeEventListener('keydown', escClose); }
  function escClose(e) { if (e.key === 'Escape') closeSheet(); }
  function sheet(title, body) {
    closeSheet();
    const back = document.createElement('div');
    back.id = 'sheet'; back.className = 'sheet-back';
    back.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" type="button" data-close aria-label="Fermer">${icon('close')}</button></div><div class="sheet-body">${body}</div></div>`;
    document.body.appendChild(back);
    back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('[data-close]')) closeSheet(); });
    document.addEventListener('keydown', escClose);
    const f = back.querySelector('input, button:not([data-close])'); if (f) f.focus({ preventScroll: true });
    return back;
  }
  function openSheet(kind, ds) {
    if (kind === 'profiles') return sheetProfiles(ds);
    if (kind === 'edit') return sheetEdit(ds && ds.new ? null : active());
  }
  function sheetProfiles(ds) {
    const d = store.data;
    const list = Object.values(d.profiles).map((p) => {
      const age = Math.floor(E.ageAt(p.birth, new Date()));
      return `<div class="profile-item ${p.id === d.activeId ? 'active' : ''}" data-pid="${p.id}"><span class="avatar-dot">${esc((p.name || '?').charAt(0).toUpperCase())}</span><div class="grow"><div>${esc(p.name)} ${p.example ? '<span class="chip">Exemple</span>' : ''}</div><div class="xs muted">${p.sex === 'F' ? 'Femme' : 'Homme'} · ${age} ans · niveau ${levelOf(p.xp)} · ${esc((LS.COUNTRIES[p.country] || LS.COUNTRIES.FR).label)}</div></div>
        ${p.id === d.activeId ? '<span class="chip accent">Actif</span>' : `<button class="btn sm" type="button" data-use="${p.id}">Ouvrir</button>`}
        <button class="icon-btn" type="button" data-del="${p.id}" aria-label="Supprimer ${esc(p.name)}">${icon('close')}</button></div><div data-confirm="${p.id}"></div>`;
    }).join('');
    const s = d.settings, R = s.reminders;
    const notifState = isNative() ? 'app' : !('Notification' in window) ? 'none' : Notification.permission;
    const lastB = s.lastBackup ? new Date(s.lastBackup).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'jamais';
    const back = sheet('Profil et réglages', `
      <div class="profile-list">${list}</div>
      <div class="row" style="margin-top:12px"><button class="btn primary sm" type="button" data-new-profile>${icon('plus')} Nouveau profil</button><button class="btn sm" type="button" data-edit-active>Modifier le profil actif</button></div>
      <p class="xs muted" style="margin-top:8px">Chaque personne garde ses données sur son propre appareil. Plusieurs profils sur un même appareil : pratique pour un·e soignant·e ou une famille.</p>

      <hr class="hr" style="margin:18px 0">
      <section id="set-rem" class="stack"><span class="label">Rappels</span>
        <div class="set-row"><label class="row" for="r-ci"><span class="toggle"><input type="checkbox" id="r-ci" ${R.checkin.on ? 'checked' : ''}><span></span></span>Rappel du check-in quotidien</label><input type="time" id="r-ci-time" value="${R.checkin.time}" aria-label="Heure du rappel"></div>
        <p class="xs muted">Chaque quête peut aussi avoir son propre rappel (bouton réglages de la quête).</p>
        ${notifState === 'app' ? '<div class="notice">Application Android : les rappels arrivent comme des notifications du téléphone, même app fermée.</div>'
          : notifState === 'none' ? '<div class="notice warn">Ce navigateur ne gère pas les notifications. Utilise l\'ajout à l\'agenda ci-dessous.</div>'
          : `<div class="notice ${notifState === 'denied' ? 'warn' : ''}"><div class="stack" style="gap:6px"><span>${notifState === 'granted' ? 'Notifications autorisées.' : notifState === 'denied' ? 'Notifications bloquées : réautorise-les dans les réglages du navigateur.' : 'Autorise les notifications pour recevoir les rappels.'} Sur le site, un rappel s'affiche quand Lifespan est ouvert ou installé sur l'écran d'accueil. Pour un rappel garanti même téléphone verrouillé, ajoute-les à ton agenda ou utilise l'app Android.</span>${notifState === 'default' ? '<button class="btn sm primary" type="button" data-notif style="align-self:flex-start">Autoriser les notifications</button>' : ''}</div></div>`}
        <div class="row"><button class="btn sm" type="button" data-ics>Ajouter mes rappels à mon agenda (.ics)</button><button class="btn sm ghost" type="button" data-test-notif>Tester une notification</button></div>
        <div data-rem-io></div>
      </section>

      <hr class="hr" style="margin:18px 0">
      <section id="set-sec" class="stack"><span class="label">Sécurité et sauvegarde</span>
        ${Vault.ok ? (store.key
          ? `<div class="notice"><div class="stack" style="gap:6px"><b style="font-weight:500">Coffre activé</b><span>Tes données sont chiffrées (AES-256) sur cet appareil. Le code est demandé à chaque ouverture.</span></div></div>
             <div class="row"><button class="btn sm" type="button" data-lock-now>Verrouiller maintenant</button><button class="btn sm" type="button" data-code-change>Changer le code</button><button class="btn sm danger" type="button" data-code-off>Désactiver le code</button></div>`
          : `<p class="small muted">Protège tes données par un code : elles seront chiffrées sur l'appareil et illisibles sans lui. <b style="color:var(--text);font-weight:500">Garde ce code en lieu sûr</b> : il ne peut pas être récupéré.</p>
             <button class="btn sm primary" type="button" data-code-on style="align-self:flex-start">Protéger par un code</button>`)
          : '<p class="small muted">Le chiffrement nécessite une adresse sécurisée (https). Il sera disponible sur la version en ligne.</p>'}
        <div data-code-io></div>
        <div class="set-row"><div><div>Sauvegarde</div><div class="xs muted">Dernière : ${esc(lastB)}. Une sauvegarde permet de changer de téléphone sans rien perdre.</div></div></div>
        <div class="row"><button class="btn sm primary" type="button" data-export>Exporter une sauvegarde</button><label class="btn sm" for="imp-file">Importer un fichier</label><input type="file" id="imp-file" accept="application/json,.json,.lifespan" hidden><button class="btn sm ghost" type="button" data-paste>Coller une sauvegarde</button></div>
        <div data-io></div>
      </section>

      <hr class="hr" style="margin:18px 0">
      <section class="stack"><span class="label">Apparence</span>
        <div class="seg" role="group" aria-label="Thème" data-theme-seg>${[['system', 'Système'], ['dark', 'Sombre'], ['light', 'Clair']].map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${s.theme === k}">${l}</button>`).join('')}</div>
        <span class="label" style="margin-top:8px">Couleur d'accent</span>
        <div class="swatches" role="group" aria-label="Couleur d'accent">${[['signal', '#ff3b30', 'Rouge signal'], ['amber', '#ffb020', 'Ambre'], ['mint', '#3ddc97', 'Menthe'], ['ice', '#6cc5ff', 'Glace'], ['mono', '#f3f3f0', 'Blanc']].map(([k, c, l]) => `<button type="button" data-acc="${k}" aria-pressed="${s.accent === k}" style="background:${c}" aria-label="${l}" title="${l}"></button>`).join('')}</div>
      </section>`);
    if (ds && ds.tab) setTimeout(() => { const el = back.querySelector(ds.tab === 'sec' ? '#set-sec' : '#set-rem'); if (el) el.scrollIntoView({ block: 'start' }); }, 30);

    const codeForm = (mode) => {
      back.querySelector('[data-code-io]').innerHTML = `<div class="form-grid" style="margin-top:6px"><div class="field"><label for="code1">${mode === 'change' ? 'Nouveau code' : 'Code (au moins 4 caractères)'}</label><input type="password" id="code1" class="pin" autocomplete="new-password" inputmode="text"></div><div class="field"><label for="code2">Confirmer le code</label><input type="password" id="code2" class="pin" autocomplete="new-password"></div></div>
        <div class="row" style="margin-top:8px"><button class="btn sm primary" type="button" data-code-save>Activer</button><button class="btn sm" type="button" data-code-cancel>Annuler</button></div><p class="small" data-code-err style="color:var(--bad)"></p>`;
      back.querySelector('#code1').focus();
    };
    back.addEventListener('change', (e) => {
      if (e.target.id === 'r-ci') { R.checkin.on = e.target.checked; if (R.checkin.on) { award(active(), 'reminder'); askNotif(); } store.save(); syncReminders(true); toast(R.checkin.on ? 'Rappel du check-in activé à ' + R.checkin.time : 'Rappel désactivé'); }
      if (e.target.id === 'r-ci-time') { R.checkin.time = e.target.value || '20:00'; store.save(); syncReminders(false); }
    });
    back.addEventListener('click', async (e) => {
      const t = e.target;
      const use = t.closest('[data-use]'), del = t.closest('[data-del]');
      if (use) { d.activeId = use.dataset.use; simState.forId = null; invalidate(); store.save(); syncReminders(false); closeSheet(); render(); }
      if (del) {
        const id = del.dataset.del, box = back.querySelector(`[data-confirm="${id}"]`);
        box.innerHTML = `<div class="confirm">Supprimer définitivement « ${esc(d.profiles[id].name)} » et son historique ? <button class="btn sm danger" type="button" data-del-yes="${id}">Supprimer</button><button class="btn sm" type="button" data-del-no>Annuler</button></div>`;
      }
      const yes = t.closest('[data-del-yes]');
      if (yes) {
        delete d.profiles[yes.dataset.delYes];
        if (!Object.keys(d.profiles).length) { const ex = makeExample(); d.profiles[ex.id] = ex; }
        if (!d.profiles[d.activeId]) d.activeId = Object.keys(d.profiles)[0];
        simState.forId = null; invalidate(); store.save(); render(); sheetProfiles();
      }
      if (t.closest('[data-del-no]')) t.closest('.confirm').remove();
      if (t.closest('[data-new-profile]')) sheetEdit(null);
      if (t.closest('[data-edit-active]')) sheetEdit(active());
      const th = t.closest('[data-theme-seg] [data-v]');
      if (th) { s.theme = th.dataset.v; applySettings(); store.save(); back.querySelectorAll('[data-theme-seg] button').forEach((b) => b.setAttribute('aria-pressed', b === th)); refreshColors(); }
      const ac = t.closest('[data-acc]');
      if (ac) { s.accent = ac.dataset.acc; applySettings(); store.save(); back.querySelectorAll('[data-acc]').forEach((b) => b.setAttribute('aria-pressed', b === ac)); refreshColors(); }
      if (t.closest('[data-notif]')) { await askNotif(); sheetProfiles({ tab: 'rem' }); }
      if (t.closest('[data-test-notif]')) testNotif();
      if (t.closest('[data-ics]')) {
        if (!reminderItems().length) { toast('Active d\'abord un rappel (check-in ou quête)'); return; }
        const txt = icsText();
        downloadFile('lifespan-rappels.ics', txt, 'text/calendar');
        back.querySelector('[data-rem-io]').innerHTML = '<p class="xs muted">Ouvre le fichier téléchargé : ton agenda (Google, Apple, Outlook) propose d\'ajouter les rappels récurrents.</p>';
      }
      // Coffre
      if (t.closest('[data-code-on]') || t.closest('[data-code-change]')) codeForm(t.closest('[data-code-change]') ? 'change' : 'on');
      if (t.closest('[data-code-cancel]')) back.querySelector('[data-code-io]').innerHTML = '';
      if (t.closest('[data-code-save]')) {
        const a = back.querySelector('#code1').value, b = back.querySelector('#code2').value, err = back.querySelector('[data-code-err]');
        if (a.length < 4) { err.textContent = 'Le code doit contenir au moins 4 caractères.'; return; }
        if (a !== b) { err.textContent = 'Les deux codes ne correspondent pas.'; return; }
        err.textContent = 'Chiffrement…';
        try { await store.setCode(a); award(active(), 'secure'); store.save(); toast('Coffre activé : tes données sont chiffrées'); sheetProfiles(); }
        catch (x) { err.textContent = 'Le chiffrement a échoué sur ce navigateur.'; }
      }
      if (t.closest('[data-code-off]')) {
        back.querySelector('[data-code-io]').innerHTML = `<div class="confirm">Désactiver le code ? Tes données seront de nouveau stockées sans chiffrement. <button class="btn sm danger" type="button" data-code-off-yes>Désactiver</button><button class="btn sm" type="button" data-code-cancel>Annuler</button></div>`;
      }
      if (t.closest('[data-code-off-yes]')) { store.removeCode(); toast('Code désactivé'); sheetProfiles(); }
      if (t.closest('[data-lock-now]')) { await store._chain; location.reload(); }
      // Sauvegardes
      if (t.closest('[data-export]')) exportForm(back);
      if (t.closest('[data-do-export]')) doExport(back);
      if (t.closest('[data-paste]')) back.querySelector('[data-io]').innerHTML = `<div class="field" style="margin-top:10px"><label for="imp-text">Colle le contenu d'une sauvegarde Lifespan</label><textarea id="imp-text"></textarea><button class="btn sm primary" type="button" data-imp-text>Importer</button></div>`;
      if (t.closest('[data-imp-text]')) doImport(back.querySelector('#imp-text').value, back);
      if (t.closest('[data-imp-pass]')) doImport(back._pending, back, back.querySelector('#imp-pass').value);
    });
    back.querySelector('#imp-file').addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader(); r.onload = () => doImport(String(r.result), back); r.readAsText(f);
    });
  }
  async function askNotif() {
    if (isNative()) { await syncReminders(true); return; }
    if ('Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch (e) { /* refusé */ } }
  }
  async function testNotif() {
    const title = 'Lifespan', body = 'Voici à quoi ressemblera ton rappel.';
    const ln = nativeLN();
    if (ln) { try { await ln.requestPermissions(); await ln.schedule({ notifications: [{ id: 9999, title, body, schedule: { at: new Date(Date.now() + 3000) } }] }); toast('Notification dans 3 secondes'); } catch (e) { toast('Notifications refusées dans les réglages du téléphone'); } return; }
    if (!('Notification' in window)) { toast('Ce navigateur ne gère pas les notifications'); return; }
    if (Notification.permission !== 'granted') await askNotif();
    if (Notification.permission !== 'granted') { toast('Notifications non autorisées'); return; }
    const opts = { body, icon: 'assets/icon.svg', tag: 'lifespan-test' };
    try { const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration()); if (reg) await reg.showNotification(title, opts); else new Notification(title, opts); } catch (e) { toast(body); }
  }
  function exportForm(back) {
    back.querySelector('[data-io]').innerHTML = `<div class="stack" style="margin-top:10px">
      ${Vault.ok ? `<div class="field"><label for="exp-pass">Mot de passe de la sauvegarde (recommandé)</label><input type="password" id="exp-pass" autocomplete="new-password" placeholder="Laisser vide pour une sauvegarde non chiffrée"></div><p class="xs muted">Avec un mot de passe, le fichier est chiffré : utile si tu l'envoies par e-mail ou le ranges dans le cloud.</p>` : ''}
      <button class="btn sm primary" type="button" data-do-export style="align-self:flex-start">Télécharger la sauvegarde</button></div>`;
  }
  async function doExport(back) {
    const pass = back.querySelector('#exp-pass') ? back.querySelector('#exp-pass').value : '';
    let payload = JSON.stringify(store.data), name = 'lifespan-sauvegarde-' + todayKey() + '.json';
    if (pass) {
      const salt = Vault.newSalt(), key = await Vault.derive(pass, salt), e = await Vault.encrypt(key, payload);
      payload = JSON.stringify({ lifespanBackup: 1, enc: true, salt, iv: e.iv, ct: e.ct });
      name = 'lifespan-sauvegarde-chiffree-' + todayKey() + '.json';
    }
    downloadFile(name, payload, 'application/json');
    store.data.settings.lastBackup = new Date().toISOString(); award(active(), 'backup'); store.save();
    back.querySelector('[data-io]').innerHTML = `<div class="field" style="margin-top:10px"><label for="exp-text">Fichier « ${esc(name)} » téléchargé. S'il n'apparaît pas, copie ce texte et garde-le précieusement :</label><textarea id="exp-text" readonly>${esc(payload)}</textarea><button class="btn sm" type="button" id="exp-copy">Copier</button></div>`;
    back.querySelector('#exp-copy').addEventListener('click', () => {
      const ta = back.querySelector('#exp-text');
      (navigator.clipboard ? navigator.clipboard.writeText(payload) : Promise.reject()).then(() => toast('Sauvegarde copiée')).catch(() => { ta.focus(); ta.select(); toast('Texte sélectionné : copie-le avec Ctrl+C'); });
    });
  }
  async function doImport(text, back, pass) {
    const io = back.querySelector('[data-io]');
    const fail = (msg) => io.insertAdjacentHTML('beforeend', `<p class="small" style="color:var(--bad)">${esc(msg)}</p>`);
    let d;
    try { d = JSON.parse(text); } catch (e) { fail('Ce fichier n\'est pas une sauvegarde Lifespan valide.'); return; }
    if (d && d.enc) {
      if (!pass) {
        back._pending = text;
        io.innerHTML = `<div class="field" style="margin-top:10px"><label for="imp-pass">Cette sauvegarde est chiffrée. Mot de passe :</label><input type="password" id="imp-pass" autocomplete="current-password"><button class="btn sm primary" type="button" data-imp-pass style="align-self:flex-start">Déchiffrer et importer</button></div>`;
        back.querySelector('#imp-pass').focus();
        return;
      }
      try { const key = await Vault.derive(pass, d.salt); d = JSON.parse(await Vault.decrypt(key, d.iv, d.ct)); } catch (e) { fail('Mot de passe incorrect.'); return; }
    }
    try {
      if (!d || !d.profiles || typeof d.profiles !== 'object') throw new Error('format');
      Object.values(d.profiles).forEach((p) => { if (!p.id || !p.values || !p.birth) throw new Error('profil'); });
      Object.values(store.data.profiles).forEach((p) => { if (p.example) delete store.data.profiles[p.id]; });
      Object.assign(store.data.profiles, d.profiles);
      if (d.activeId && store.data.profiles[d.activeId]) store.data.activeId = d.activeId;
      store.load(store.data); store.save(); invalidate(); simState.forId = null; syncReminders(false); closeSheet(); render(); toast('Sauvegarde importée');
    } catch (e) { fail('Ce fichier n\'est pas une sauvegarde Lifespan valide. Vérifie qu\'il vient bien de « Exporter une sauvegarde ».'); }
  }
  function refreshColors() { $$('canvas').forEach((cv) => { if (cv._av) { cv._av.readColors(); cv._av.build(); } }); render(); }

  // Édition / création de profil : assistant en étapes
  function sheetEdit(prof) {
    const isNew = !prof;
    const age0 = prof ? Math.floor(E.ageAt(prof.birth, new Date())) : 35;
    const draft = { name: prof ? (prof.example ? '' : prof.name) : '', sex: prof ? prof.sex : 'F', age: age0, height: prof ? prof.height : 168, country: prof ? prof.country : 'FR', values: Object.assign({}, prof ? prof.values : LS.defaultValues()) };
    if (isNew) draft.values.weight = 65;
    const steps = [{ id: 'id', label: 'Identité' }].concat(LS.DOMAINS.map((d) => ({ id: d.id, label: d.label })));
    let step = 0;
    const back = sheet(isNew ? 'Nouveau profil' : 'Modifier le profil', '<div class="steps" role="tablist"></div><div data-step-body></div><div class="sheet-foot"><button class="btn" type="button" data-prev>Précédent</button><div class="row"><button class="btn" type="button" data-next>Suivant</button><button class="btn primary" type="button" data-save>Enregistrer</button></div></div><p class="small" data-err style="color:var(--bad)"></p>');
    const body = back.querySelector('[data-step-body]');
    const drawSteps = () => { back.querySelector('.steps').innerHTML = steps.map((s, i) => `<button type="button" role="tab" data-step="${i}" aria-current="${i === step ? 'step' : 'false'}">${i + 1}. ${esc(s.label)}</button>`).join(''); };
    const pFlat = () => Object.assign({}, draft.values, { height: draft.height, sex: draft.sex });
    const draw = () => {
      drawSteps();
      const s = steps[step];
      if (s.id === 'id') {
        body.innerHTML = `<div class="form-grid">
          <div class="field"><label for="e-name">Prénom ou pseudo</label><input type="text" id="e-name" maxlength="30" value="${esc(draft.name)}" placeholder="Ex. Camille"></div>
          <div class="field"><span class="lab">Sexe (biologique, pour les tables de mortalité)</span><div class="seg" role="group" data-sex>${[['F', 'Femme'], ['M', 'Homme']].map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${draft.sex === k}">${l}</button>`).join('')}</div></div>
          <div class="field"><label for="e-age">Âge</label><input type="number" id="e-age" min="18" max="100" step="1" value="${draft.age}"></div>
          <div class="field"><label for="e-height">Taille (cm)</label><input type="number" id="e-height" min="120" max="220" step="1" value="${draft.height}"></div>
          <div class="field"><label for="e-country">Pays de référence</label><select id="e-country">${Object.entries(LS.COUNTRIES).map(([k, c]) => `<option value="${k}" ${draft.country === k ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select></div>
        </div><p class="xs muted" style="margin-top:12px">Les champs suivants ont des valeurs moyennes par défaut. Ajuste ce que tu connais ; pour les analyses de sang, coche « Je ne connais pas » si tu n'as pas de résultat récent.</p>`;
        body.querySelector('[data-sex]').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { draft.sex = b.dataset.v; draw(); } });
        ['name', 'age', 'height', 'country'].forEach((k) => body.querySelector('#e-' + k).addEventListener('input', (e) => { draft[k] = k === 'name' || k === 'country' ? e.target.value : parseFloat(e.target.value); }));
      } else {
        const vars = VARS.filter((v) => v.dom === s.id);
        body.innerHTML = `<div class="ctl-list" style="padding:0">${vars.map((v) => ctlHTML(v, draft.values[v.id], undefined, { p: pFlat(), values: draft.values, pre: 'e-' })).join('')}</div>`;
      }
      back.querySelector('[data-prev]').disabled = step === 0;
      back.querySelector('[data-next]').hidden = step === steps.length - 1;
    };
    back.addEventListener('input', (e) => {
      const r = e.target.closest('[data-range]'); if (!r) return;
      const id = r.dataset.range, v = VAR[id], val = parseFloat(r.value);
      draft.values[id] = val; r.style.setProperty('--p', ((val - v.min) / (v.max - v.min)) * 100 + '%');
      const out = body.querySelector(`[data-out="${id}"]`); if (out) out.textContent = fmtVal(v, val, pFlat());
    });
    back.addEventListener('change', (e) => {
      const u = e.target.closest('[data-unknown]'), b = e.target.closest('[data-bool]');
      if (u) { const v = VAR[u.dataset.unknown]; draft.values[v.id] = u.checked ? null : (v.def != null ? v.def : Math.round(((v.min + v.max) / 2) / v.step) * v.step); draw(); }
      if (b) { draft.values[b.dataset.bool] = b.checked; }
    });
    back.addEventListener('click', (e) => {
      const st = e.target.closest('[data-step]'); if (st) { step = +st.dataset.step; draw(); body.scrollIntoView({ block: 'nearest' }); }
      const set = e.target.closest('[data-set]'); if (set) { draft.values[set.dataset.set] = JSON.parse(set.dataset.val); draw(); }
      if (e.target.closest('[data-prev]')) { step = Math.max(0, step - 1); draw(); }
      if (e.target.closest('[data-next]')) { step = Math.min(steps.length - 1, step + 1); draw(); }
      if (e.target.closest('[data-save]')) {
        const err = back.querySelector('[data-err]');
        const name = (draft.name || '').trim();
        if (!name) { step = 0; draw(); err.textContent = 'Ajoute un prénom ou un pseudo pour enregistrer le profil.'; return; }
        if (!(draft.age >= 18 && draft.age <= 100)) { step = 0; draw(); err.textContent = 'L\'âge doit être compris entre 18 et 100 ans.'; return; }
        if (!(draft.height >= 120 && draft.height <= 220)) { step = 0; draw(); err.textContent = 'La taille doit être comprise entre 120 et 220 cm.'; return; }
        const birth = new Date(); birth.setFullYear(birth.getFullYear() - draft.age); birth.setMonth(birth.getMonth() - 6);
        if (isNew || (prof && prof.example)) {
          const np = { id: uid(), name, sex: draft.sex, birth: birth.toISOString(), country: draft.country, height: draft.height, values: draft.values, history: [], checkins: {}, xp: 0, badges: {}, goal: null, created: new Date().toISOString() };
          np.history.push({ date: new Date().toISOString(), values: Object.assign({}, draft.values) });
          store.data.profiles[np.id] = np; store.data.activeId = np.id;
          award(np, 'first_profile'); np.xp += 30;
        } else {
          const keepBirth = Math.floor(E.ageAt(prof.birth, new Date())) === draft.age;
          Object.assign(prof, { name, sex: draft.sex, country: draft.country, height: draft.height });
          if (!keepBirth) prof.birth = birth.toISOString();
          saveValues(prof, draft.values);
        }
        simState.forId = null; invalidate(); store.save(); closeSheet(); render();
        toast(isNew ? 'Profil créé' : 'Profil enregistré · instantané ajouté au journal');
      }
    });
    draw();
  }
  function saveValues(prof, values) {
    const before = cache.key && cache.ev ? cache.ev.leTotal : null;
    prof.values = Object.assign({}, values);
    const tk = todayKey(), last = prof.history[prof.history.length - 1];
    const snap = { date: new Date().toISOString(), values: Object.assign({}, values) };
    if (last && todayKey(last.date) === tk) prof.history[prof.history.length - 1] = snap; else prof.history.push(snap);
    invalidate();
    const after = ctxFor(prof).ev.leTotal;
    if (before != null && after > before + 0.05 && prof.history.length > 1) award(prof, 'progress');
    store.save();
  }

  /* ---------- Démarrage ---------- */
  function lockScreen() {
    document.getElementById('app').innerHTML = `<div class="lock-screen"><form class="lock-card" id="unlock" autocomplete="off">
      ${LOGO.replace('brand-mark', 'brand-mark" style="width:52px;height:52px')}
      <span class="brand-word" style="font-size:18px">LIFESPAN</span>
      <p class="muted small">Tes données sont chiffrées sur cet appareil. Entre ton code pour les ouvrir.</p>
      <input type="password" id="unlock-code" class="pin" autocomplete="current-password" aria-label="Code" style="max-width:260px">
      <button class="btn primary" type="submit" style="min-width:200px">Déverrouiller</button>
      <p class="small" id="unlock-err" style="color:var(--bad);min-height:20px"></p>
      <button class="btn ghost sm" type="button" id="forgot">Code oublié ?</button><div id="forgot-box"></div>
    </form></div>`;
    $('#unlock-code').focus();
    $('#unlock').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('#unlock-err'); err.textContent = 'Vérification…';
      try { await store.unlock($('#unlock-code').value); start(); }
      catch (x) { err.textContent = 'Code incorrect.'; $('#unlock-code').select(); }
    });
    $('#forgot').addEventListener('click', () => {
      $('#forgot-box').innerHTML = `<div class="confirm" style="text-align:left">Sans le code, les données chiffrées ne peuvent pas être récupérées. Tu peux tout effacer et repartir de zéro, puis importer une sauvegarde si tu en as une. <button class="btn sm danger" type="button" id="wipe">Tout effacer</button></div>`;
      $('#wipe').addEventListener('click', () => { lsDel(VKEY); lsDel(KEY); location.reload(); });
    });
  }
  function start() {
    applySettings();
    shell();
    render();
    window.addEventListener('hashchange', () => { closeSheet(); render(); const v = $('#view'); if (v) v.focus({ preventScroll: true }); window.scrollTo(0, 0); });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', () => { if (store.data.settings.theme === 'system') refreshColors(); });
    syncReminders(false);
    checkWebReminders();
    setInterval(checkWebReminders, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkWebReminders(); });
  }
  function boot() {
    if ('serviceWorker' in navigator && location.protocol === 'https:' && !isNative()) navigator.serviceWorker.register('sw.js').catch(() => {});
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    if (store.hasVault() && Vault.ok) { lockScreen(); return; }
    store.load();
    start();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

})();
