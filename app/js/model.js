/* Lifespan — définition des variables, courbes dose-réponse, pays et archétypes.
   Chaque variable renvoie des log-HR par outcome :
   m = mortalité toutes causes, cvd = maladies cardiovasculaires, t2d = diabète de type 2,
   dem = démence, can = cancer, dep = dépression.
   Voir MASTER.md §3 pour les règles de combinaison. */
(function (root) {
  const LS = (root.LS = root.LS || {});
  const ln = Math.log;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ramp = (x, a, b) => clamp((x - a) / (b - a), 0, 1);

  // Interpolation log-linéaire par morceaux : pts = [[x, HR], ...] triés. Plat hors bornes.
  function curve(pts) {
    const L = pts.map(([x, h]) => [x, ln(h)]);
    return function (v) {
      if (v <= L[0][0]) return L[0][1];
      for (let i = 1; i < L.length; i++) {
        if (v <= L[i][0]) {
          const [x0, y0] = L[i - 1], [x1, y1] = L[i];
          return y0 + ((v - x0) / (x1 - x0)) * (y1 - y0);
        }
      }
      return L[L.length - 1][1];
    };
  }
  const O = (m = 0, cvd = 0, t2d = 0, dem = 0, can = 0, dep = 0) => ({ m, cvd, t2d, dem, can, dep });
  const OUTCOMES = ['m', 'cvd', 't2d', 'dem', 'can', 'dep'];

  const age = (p) => p._age; // injecté par le moteur (âge à l'instant évalué)
  const bmiOf = (p) => p.weight / Math.pow(p.height / 100, 2);
  const LDL_MMOL = 2.586, TG_MMOL = 1.129; // g/L -> mmol/L

  /* ---------- Courbes ---------- */
  const K = {
    mvpa: {
      m: curve([[0, 1], [75, 0.8], [225, 0.69], [375, 0.63], [600, 0.61]]),
      cvd: curve([[0, 1], [150, 0.73], [300, 0.66], [600, 0.62]]),
      t2d: curve([[0, 1], [150, 0.74], [300, 0.64], [600, 0.6]]),
      dem: curve([[0, 1], [150, 0.82], [300, 0.75]]),
      can: curve([[0, 1], [150, 0.88], [300, 0.85]]),
      dep: curve([[0, 1], [75, 0.82], [150, 0.75], [300, 0.72]])
    },
    steps: {
      m: curve([[1000, 1.06], [2000, 1], [4000, 0.66], [7000, 0.53], [8800, 0.49], [12000, 0.47]]),
      cvd: curve([[2000, 1], [4000, 0.7], [7100, 0.51], [10000, 0.49]]),
      t2d: curve([[2000, 1], [7000, 0.86], [10000, 0.83]]),
      dem: curve([[2000, 1], [4000, 0.8], [7000, 0.62], [10000, 0.6]]),
      can: curve([[2000, 1], [7000, 0.8], [10000, 0.78]]),
      dep: curve([[2000, 1], [7000, 0.78], [10000, 0.76]])
    },
    strength: {
      m: curve([[0, 1], [30, 0.83], [60, 0.74], [90, 0.76], [140, 0.85], [240, 0.92]]),
      cvd: curve([[0, 1], [60, 0.83], [100, 0.81], [200, 0.9]]),
      t2d: curve([[0, 1], [60, 0.7], [150, 0.72]]),
      dem: curve([[0, 1], [60, 0.95]]),
      can: curve([[0, 1], [60, 0.86], [150, 0.9]]),
      dep: curve([[0, 1], [60, 0.9]])
    },
    smokeCur: {
      m: curve([[0, 1], [1, 1.64], [5, 1.85], [10, 2.1], [20, 2.7], [30, 2.8], [40, 2.9]]),
      cvd: curve([[0, 1], [1, 1.5], [10, 1.9], [20, 2.2], [40, 2.6]]),
      t2d: curve([[0, 1], [5, 1.2], [20, 1.45], [40, 1.57]]),
      can: curve([[0, 1], [1, 1.5], [10, 2.4], [20, 3.0], [40, 3.5]])
    },
    bmiUp: curve([[0, 1], [3.75, 1.11], [8.75, 1.45], [13.75, 1.94], [21.25, 2.76], [30, 3.4]]),
    bmiDown: curve([[0, 1], [2.5, 1.05], [4, 1.13], [6, 1.51], [9, 2.2]]),
    hba1c: {
      m: curve([[4.0, 1.25], [4.5, 1.1], [5.0, 1], [5.6, 1], [6.0, 1.2], [6.4, 1.45], [7.0, 1.6], [8.0, 1.9], [9, 2.3], [10, 2.8]]),
      cvd: curve([[5.0, 1], [5.6, 1], [6.0, 1.2], [6.5, 1.6], [7, 1.9], [8, 2.3], [9, 2.8]]),
      t2d: curve([[5.0, 1], [5.4, 1.6], [5.7, 3.5], [6.0, 7], [6.4, 12]]),
      dem: curve([[5.6, 1], [6.0, 1.1], [6.5, 1.45], [8, 1.7]]),
      can: curve([[5.6, 1], [6.5, 1.15], [8, 1.25]]),
      dep: curve([[5.6, 1], [6.5, 1.3], [8, 1.45]])
    },
    hdl: {
      m: curve([[0.7, 1.5], [1.0, 1.25], [1.4, 1], [1.55, 1], [2.1, 1.22], [2.6, 1.5]]),
      cvd: curve([[0.8, 1.5], [1.0, 1.3], [1.4, 1], [2.0, 1]])
    },
    fv: { m: curve([[0, 1.12], [2, 1], [5, 0.87], [8, 0.85]]), cvd: curve([[0, 1.15], [2, 1], [5, 0.88]]), can: curve([[0, 1.08], [2, 1], [5, 0.9]]), dep: curve([[0, 1.1], [2, 1], [5, 0.9]]) },
    wg: { m: curve([[0, 1], [3, 0.83], [7, 0.78]]), cvd: curve([[0, 1], [3, 0.81]]), t2d: curve([[0, 1], [3, 0.75]]), can: curve([[0, 1], [3, 0.89]]) },
    nuts: { m: curve([[0, 1], [3, 0.88], [7, 0.8]]), cvd: curve([[0, 1], [7, 0.79]]), can: curve([[0, 1], [7, 0.85]]) },
    meat: { m: curve([[0, 1], [2, 1], [7, 1.1], [14, 1.22]]), cvd: curve([[2, 1], [7, 1.1], [14, 1.2]]), t2d: curve([[0, 0.9], [2, 1], [7, 1.2], [14, 1.4]]), can: curve([[2, 1], [7, 1.12], [14, 1.25]]) },
    ssb: { m: curve([[0, 1], [7, 1.07], [14, 1.14], [28, 1.3]]), cvd: curve([[0, 1], [7, 1.1], [28, 1.35]]), t2d: curve([[0, 1], [7, 1.18], [28, 1.5]]) },
    upf: { m: curve([[10, 1], [20, 1.03], [40, 1.12], [60, 1.21], [80, 1.3]]), cvd: curve([[10, 1], [60, 1.2]]), t2d: curve([[10, 1], [60, 1.3]]), dep: curve([[10, 1], [60, 1.22]]) },
    fish: { m: curve([[0, 1.04], [1, 1], [2, 0.95], [4, 0.93]]), cvd: curve([[0, 1.05], [2, 0.9]]) },
    coffee: { m: curve([[0, 1], [1, 0.92], [3, 0.85], [5, 0.88], [8, 0.95]]), cvd: curve([[0, 1], [3, 0.85], [8, 0.95]]), t2d: curve([[0, 1], [3, 0.79], [6, 0.7]]), dep: curve([[0, 1], [3, 0.9]]) },
    social: { m: curve([[0, 1.32], [2, 1.25], [5, 1], [8, 0.85], [10, 0.8]]), cvd: curve([[0, 1.3], [5, 1], [10, 0.9]]), dem: curve([[0, 1.26], [5, 1], [10, 0.9]]), dep: curve([[0, 1.8], [5, 1], [10, 0.75]]) }
  };

  /* ---------- Attentes par âge/sexe (forme, force) ---------- */
  function expectedVO2(p) {
    const a = age(p);
    return p.sex === 'F' ? Math.max(14, 38 - 0.4 * (a - 25)) : Math.max(16, 48 - 0.5 * (a - 25));
  }
  function expectedGrip(p) {
    const a = age(p);
    return p.sex === 'F' ? 29 - 0.25 * Math.max(0, a - 40) : 46 - 0.35 * Math.max(0, a - 40);
  }
  function bmiNadir(p) { return 22 + 2 * ramp(age(p), 50, 70); }

  /* ---------- Tabac ---------- */
  // Fraction d'excès résiduel après l'arrêt : r + (1-r)·e^(-t/τ), r selon l'âge d'arrêt (Jha 2013).
  function quitFrac(yearsSince, quitAge, tau, rScale) {
    const r = clamp((quitAge - 35) / 40, 0.05, 0.6) * rScale;
    return r + (1 - r) * Math.exp(-Math.max(0, yearsSince) / tau);
  }
  function smokeLHR(p) {
    if (p.smoke === 'never') return O();
    const cpd = clamp(p.cpd || 10, 1, 60);
    const ex = (fn) => Math.exp(fn(cpd)) - 1; // excès de HR
    let f = { m: 1, cvd: 1, t2d: 1, can: 1, dem: 1, dep: 1 };
    if (p.smoke === 'former') {
      const ys = p.quit_years || 0, qa = age(p) - ys;
      f = { m: quitFrac(ys, qa, 7, 1), cvd: quitFrac(ys, qa, 4, 0.5), t2d: quitFrac(ys, qa, 5, 0.3), can: quitFrac(ys, qa, 9, 1.2), dem: quitFrac(ys, qa, 3, 0), dep: quitFrac(ys, qa, 1, 0) };
    }
    return O(
      ln(1 + ex(K.smokeCur.m) * f.m),
      ln(1 + ex(K.smokeCur.cvd) * f.cvd),
      ln(1 + ex(K.smokeCur.t2d) * f.t2d),
      ln(1 + 0.3 * f.dem),
      ln(1 + ex(K.smokeCur.can) * f.can),
      ln(1 + 0.4 * f.dep)
    );
  }

  /* ---------- Domaines ---------- */
  LS.DOMAINS = [
    { id: 'move', label: 'Mouvement', icon: 'move' },
    { id: 'sleep', label: 'Sommeil', icon: 'sleep' },
    { id: 'subst', label: 'Substances', icon: 'subst' },
    { id: 'food', label: 'Nutrition', icon: 'food' },
    { id: 'body', label: 'Corps', icon: 'body' },
    { id: 'clin', label: 'Clinique', icon: 'clin' },
    { id: 'mind', label: 'Esprit & liens', icon: 'mind' },
    { id: 'ctx', label: 'Contexte', icon: 'ctx' }
  ];

  /* ---------- Variables ----------
     kind: range | select | bool ; opt: peut être inconnue (null)
     lever: cible saine pour le calcul des leviers (fonction du profil) ou null
     att: 1 = atténuation forte avec l'âge (corps, clinique), 2 = modérée, 0 = aucune
     tau: délai de l'effet biologique (années) pour les projections */
  const V = [];
  const add = (o) => V.push(o);

  // ——— Mouvement ———
  add({ id: 'mvpa', dom: 'move', label: 'Activité physique modérée à vigoureuse', short: 'Activité', unit: 'min/sem', min: 0, max: 900, step: 10, def: 90,
    help: 'Minutes par semaine en équivalent modéré. 1 min vigoureuse (course, vélo rapide) = 2 min modérées (marche rapide).',
    lever: (p) => Math.max(p.mvpa, 300), att: 2, tau: 0.5, grade: 'A', refs: ['arem2015', 'garcia2023', 'moore2012', 'smith2016', 'pearce2022', 'ji2024', 'isomarkku2022', 'moore2016'],
    formula: 'Courbe curvilinéaire (Arem 2015) : 0 → 1,00 ; 75 → 0,80 ; 225 → 0,69 ; 375 → 0,63 ; ≥ 600 → 0,61. Femmes : dose × 1,25 (bénéfice atteint plus tôt, Ji 2024).',
    effects: [['< 150 min/sem', 'Mortalité', 'HR 0,80 (0,78–0,82)', 'arem2015'], ['150–300 min/sem', 'Mortalité', 'HR 0,69 (0,67–0,70)', 'arem2015'], ['300–450 min/sem', 'Mortalité', 'HR 0,63 (0,62–0,65)', 'arem2015'], ['≥ 22,5 MET-h/sem', 'Mortalité', 'HR 0,61 (0,59–0,62)', 'arem2015'], ['8,75 mMET-h/sem', 'Mortalité CV', 'RR 0,71 (0,66–0,77)', 'garcia2023'], ['150 min/sem', 'DT2', 'RR 0,74 (0,69–0,80)', 'smith2016'], ['Haute vs basse', 'Démence', 'RR 0,75 (0,68–0,82)', 'isomarkku2022'], ['Recommandations', 'Dépression', 'RR 0,75', 'pearce2022'], ['7,5–15 MET-h/sem', 'Espérance de vie', '+3,4 à 3,7 ans', 'moore2012'], ['≥ 22,5 MET-h/sem', 'Espérance de vie', '+4,5 ans', 'moore2012']],
    lhr: (v, p) => { const x = p.sex === 'F' ? v * 1.25 : v; const o = {}; OUTCOMES.forEach((k) => (o[k] = K.mvpa[k](x))); return o; } });

  add({ id: 'steps', dom: 'move', label: 'Pas quotidiens', short: 'Pas', unit: 'pas/j', min: 500, max: 20000, step: 250, def: 5500,
    help: 'Moyenne sur une semaine (téléphone ou montre).', lever: (p) => Math.max(p.steps, 8500), att: 2, tau: 0.5, grade: 'B', refs: ['ding2025', 'stens2023', 'paluch2022', 'banach2023'],
    formula: 'Courbe (Ding 2025, Stens 2023) : 2 000 → 1,00 ; 4 000 → 0,66 ; 7 000 → 0,53 ; 8 800 → 0,49 ; plateau. Log-HR × 0,85 (causalité inverse). Combiné à l\'activité : le plus protecteur + 40 % de l\'autre.',
    effects: [['4 000 vs ~1 900', 'Mortalité', 'HR 0,63 (0,57–0,71)', 'paluch2022'], ['7 000 vs 2 000', 'Mortalité', 'HR 0,53 (0,46–0,60)', 'ding2025'], ['8 763 (optimum) vs 2 000', 'Mortalité', 'HR 0,40 (0,38–0,43)', 'stens2023'], ['+1 000 pas/j', 'Mortalité', 'HR 0,88 (0,83–0,93)', 'banach2023'], ['7 126 vs 2 000', 'MCV', 'HR 0,49 (0,45–0,55)', 'stens2023'], ['7 000 vs 2 000', 'Démence', 'HR 0,62 (0,53–0,73)', 'ding2025'], ['7 000 vs 2 000', 'DT2', 'HR 0,86 (0,74–0,99)', 'ding2025']],
    lhr: (v) => { const o = {}; OUTCOMES.forEach((k) => (o[k] = 0.85 * K.steps[k](v))); return o; } });

  add({ id: 'strength', dom: 'move', label: 'Renforcement musculaire', short: 'Musculation', unit: 'min/sem', min: 0, max: 300, step: 5, def: 0,
    help: 'Musculation, poids du corps, élastiques, Pilates exigeant.', lever: () => 60, att: 2, tau: 0.5, grade: 'B', refs: ['shailendra2022', 'momma2022'],
    formula: 'Courbe en J (Shailendra 2022) : 0 → 1,00 ; 30 → 0,83 ; 60 → 0,74 (optimum) ; 140 → 0,85 ; 240 → 0,92. Si aérobie et force sont protectrices, domaine × 0,85.',
    effects: [['Toute vs aucune', 'Mortalité', 'RR 0,85 (0,77–0,93)', 'shailendra2022'], ['~60 min/sem', 'Mortalité', 'RR 0,74 (0,64–0,86)', 'shailendra2022'], ['Toute', 'Mortalité par cancer', 'RR 0,86 (0,78–0,95)', 'shailendra2022'], ['1–2 séances/sem', 'DT2', '~ −30 %', 'momma2022'], ['Aérobie + force', 'Mortalité', '−40 à −46 %', 'momma2022']],
    lhr: (v) => { const o = {}; OUTCOMES.forEach((k) => (o[k] = K.strength[k](v))); return o; } });

  add({ id: 'sitting', dom: 'move', label: 'Temps assis', short: 'Assis', unit: 'h/j', min: 2, max: 16, step: 0.5, def: 8.5,
    help: 'Travail, écrans, transport. Atténué par l\'activité physique.', lever: (p) => Math.min(p.sitting, 6.5), att: 2, tau: 0.5, grade: 'B', refs: ['patterson2018', 'ajufo2024', 'sagelv2023', 'ekelund2016'],
    formula: 'Log-HR = ln(1,04)·max(0, h−8) + ln(1,05)·max(0, h−10). Multiplié par (1 − atténuation MVPA) : −60 % à 35 min/j, −90 % à 70 min/j (Ekelund 2016).',
    effects: [['+1 h/j au-delà de 8 h', 'Mortalité', 'RR 1,04 (1,03–1,05)', 'patterson2018'], ['> 10,6 h/j', 'Mortalité CV', 'HR 1,62 (1,34–1,96)', 'ajufo2024'], ['> 12 h/j et < 22 min/j MVPA', 'Mortalité', 'HR 1,38 (1,10–1,74)', 'sagelv2023'], ['≥ 8 h/j', 'Démence', 'RR 1,27 (1,17–1,39)', 'isomarkku2022']],
    lhr: (v, p) => {
      const day = (p.mvpa || 0) / 7;
      const f = 1 - 0.6 * ramp(day, 0, 35) - 0.3 * ramp(day, 35, 70);
      return O(f * (ln(1.04) * Math.max(0, v - 8) + ln(1.05) * Math.max(0, v - 10)), f * (ln(1.62) * ramp(v, 8, 10.6) + ln(1.04) * Math.max(0, v - 10.6)),
        f * ln(1.3) * ramp(v, 4, 10), f * ln(1.27) * ramp(v, 6, 10), f * ln(1.08) * ramp(v, 6, 12), f * ln(1.12) * ramp(v, 8, 12));
    } });

  add({ id: 'vo2max', dom: 'move', label: 'VO2max (forme cardiorespiratoire)', short: 'VO2max', unit: 'ml/kg/min', min: 12, max: 75, step: 0.5, def: null, opt: true, adv: true,
    help: 'Test d\'effort ou estimation montre connectée. Laisser vide si inconnue.', lever: null, att: 2, tau: 0.5, grade: 'A', refs: ['lang2024', 'kodama2009'],
    formula: 'Log-HR = ln(0,86) × (METs − METs attendus pour l\'âge et le sexe), METs = VO2/3,5, borné à ±5 METs. Remplace en partie l\'activité déclarée (forte + 30 % de l\'autre).',
    effects: [['+1 MET', 'Mortalité', '−14 %', 'lang2024'], ['+1 MET', 'Mortalité CV', '−16 %', 'lang2024'], ['+1 MET', 'Mortalité', 'RR 0,87 (0,84–0,90)', 'kodama2009']],
    lhr: (v, p) => { const d = clamp((v - expectedVO2(p)) / 3.5, -5, 5); return O(ln(0.86) * d, ln(0.84) * d, ln(0.9) * d, ln(0.93) * d, ln(0.95) * d, ln(0.93) * d); } });

  add({ id: 'grip', dom: 'move', label: 'Force de préhension', short: 'Préhension', unit: 'kg', min: 8, max: 80, step: 1, def: null, opt: true, adv: true,
    help: 'Dynamomètre, meilleure main.', lever: null, att: 2, tau: 0.5, grade: 'B', refs: ['leong2015'],
    formula: 'Log-HR = ln(1,16) × (attendu − mesuré)/5 kg, borné à ±3. Attendu : H 46 kg, F 29 kg à 40 ans, puis déclin.',
    effects: [['−5 kg', 'Mortalité', 'HR 1,16 (1,13–1,20)', 'leong2015'], ['−5 kg', 'Mortalité CV', 'HR 1,17', 'leong2015']],
    lhr: (v, p) => { const d = clamp((expectedGrip(p) - v) / 5, -3, 3); return O(ln(1.16) * d, ln(1.12) * d, ln(1.05) * d, ln(1.05) * d, 0, ln(1.05) * d); } });

  // ——— Sommeil ———
  add({ id: 'sleep', dom: 'sleep', label: 'Durée de sommeil', short: 'Sommeil', unit: 'h/nuit', min: 3.5, max: 11, step: 0.25, def: 6.8,
    help: 'Moyenne réelle endormi·e.', lever: (p) => (p.sleep < 7 || p.sleep > 8.5 ? 7.5 : p.sleep), att: 2, tau: 0.25, grade: 'B', refs: ['liu2017', 'yin2017', 'shan2015'],
    formula: 'Courbe en U, plateau 7–8 h. Sous 7 h : ln(1,06) par heure manquante. Au-delà de 8 h : ln(1,13) par heure × 0,6 (causalité inverse probable).',
    effects: [['−1 h sous 7 h', 'Mortalité', 'RR 1,06 (1,04–1,07)', 'liu2017'], ['+1 h au-dessus de 7 h', 'Mortalité', 'RR 1,13 (1,11–1,15)', 'liu2017'], ['9 h', 'Mortalité', 'RR 1,21 (1,18–1,24)', 'yin2017'], ['< 7 h', 'MCV', 'HR 1,14 (1,10–1,18)', 'yin2017'], ['< 7 h', 'DT2', 'OR 1,18 (1,13–1,23)', 'shan2015'], ['≥ 9 h', 'AVC', 'RR 1,65 (1,45–1,87)', 'yin2017'], ['≤ 5 h vs 6–8 h', 'Dépression', '+14,1 points de %', 'matrice']],
    lhr: (v) => { const s = Math.max(0, 7 - v), l = Math.max(0, v - 8) * 0.6;
      return O(ln(1.06) * s + ln(1.13) * l, (ln(1.14) / 1.5) * s + ln(1.3) * l, (ln(1.18) / 1.5) * s + ln(1.13) * l, (ln(1.18) / 1.5) * s + ln(1.43) * l, 0, (ln(1.4) / 2) * s + ln(1.3) * l); } });

  add({ id: 'insomnia', dom: 'sleep', label: 'Insomnie / mauvaise qualité', short: 'Insomnie', kind: 'select', def: 0,
    options: [[0, 'Rarement'], [1, 'Parfois'], [2, 'Souvent (≥ 3 nuits/sem)']], lever: () => 0, att: 2, tau: 0.5, grade: 'B', refs: ['sofi2014', 'shan2015', 'baglioni2011'],
    formula: 'Souvent : MCV ln(1,45), DT2 ln(1,5), dépression ln(2,0), mortalité ln(1,10) (conversion via part CV des décès). Parfois : ~⅓ de l\'effet.',
    effects: [['Insomnie', 'MCV', 'RR 1,45 (1,29–1,62)', 'sofi2014'], ['Mauvaise qualité', 'DT2', 'OR 1,50 (1,30–1,72)', 'shan2015'], ['Insomnie', 'Dépression', 'OR ~2,6', 'baglioni2011']],
    lhr: (v) => { const f = v === 2 ? 1 : v === 1 ? 0.33 : 0; return O(f * ln(1.1), f * ln(1.45), f * ln(1.5), f * ln(1.1), 0, f * ln(2.0)); } });

  add({ id: 'shift', dom: 'sleep', label: 'Travail de nuit / posté', short: 'Travail posté', kind: 'bool', def: false, lever: null, att: 2, tau: 1, grade: 'B', refs: ['torquati2018'],
    formula: 'MCV ln(1,13) ; mortalité ln(1,06) (via mortalité CV RR 1,27) ; DT2 ln(1,10).',
    effects: [['Travail posté', 'MCV', 'RR 1,13 (1,10–1,16)', 'torquati2018'], ['Travail posté', 'Mortalité CV', 'RR 1,27 (1,18–1,36)', 'torquati2018']],
    lhr: (v) => (v ? O(ln(1.06), ln(1.13), ln(1.1), 0, 0, ln(1.1)) : O()) });

  // ——— Substances ———
  add({ id: 'smoke', dom: 'subst', label: 'Tabac', short: 'Tabac', kind: 'select', def: 'never',
    options: [['never', 'Jamais fumé'], ['former', 'Ancien·ne fumeur·se'], ['current', 'Fumeur·se actuel·le']],
    lever: (p) => (p.smoke === 'current' ? 'former' : null), att: 2, tau: 0, grade: 'A', refs: ['carter2015', 'inoue2017', 'hackshaw2018', 'jha2013', 'doll2004', 'zhong2015', 'cho2024', 'pan2015'],
    formula: 'Actuel : courbe par cigarettes/j (1 → 1,64 ; 5 → 1,85 ; 10 → 2,10 ; 20 → 2,70 ; 40 → 2,90). Ancien : excès × [r + (1−r)·e^(−t/7)], r = (âge d\'arrêt − 35)/40 borné 0,05–0,6. Démence : risque normalisé après arrêt (RR 1,01).',
    effects: [['Actuel vs jamais', 'Mortalité', 'HR ~2,7–2,8', 'carter2015'], ['1–10 cig/j', 'Mortalité', 'HR 1,87 (1,64–2,13)', 'inoue2017'], ['1 cig/j', 'Coronaropathie', 'RR ~1,48–1,57', 'hackshaw2018'], ['Actuel', 'Démence', 'RR 1,30 (1,18–1,45)', 'zhong2015'], ['Tabagisme continu', 'Espérance de vie', '≥ 10 ans perdus', 'jha2013'], ['Arrêt à 25–34 ans', 'Espérance de vie', '~ +10 ans', 'jha2013'], ['Arrêt à 40–49 ans', 'Espérance de vie', '~ +6 ans', 'jha2013'], ['Arrêt avant 40 ans', 'Surrisque de décès', '−90 %', 'jha2013']],
    lhr: (v, p) => smokeLHR(p) });
  add({ id: 'cpd', dom: 'subst', parent: 'smoke', label: 'Cigarettes par jour', short: 'Cig/j', unit: 'cig/j', min: 1, max: 60, step: 1, def: 10, lever: null, showIf: (p) => p.smoke !== 'never', grade: 'A', refs: ['inoue2017'], help: 'Actuellement, ou quand vous fumiez.' });
  add({ id: 'quit_years', dom: 'subst', parent: 'smoke', label: 'Arrêt depuis', short: 'Arrêt', unit: 'ans', min: 0, max: 70, step: 0.5, def: 5, lever: null, showIf: (p) => p.smoke === 'former', grade: 'A', refs: ['jha2013'] });

  add({ id: 'alcohol', dom: 'subst', label: 'Alcool', short: 'Alcool', unit: 'verres/sem', min: 0, max: 70, step: 1, def: 5,
    help: 'Verre standard = 10 g d\'alcool (25 cl de bière, 10 cl de vin, 3 cl d\'alcool fort).', lever: (p) => Math.min(p.alcohol, 3), att: 2, tau: 1, grade: 'A', refs: ['wood2018', 'bagnardi2015', 'xu2017'],
    formula: 'Aucun effet protecteur retenu (randomisation mendélienne). g = verres × 10. Mortalité : ln-HR = 0,0011 × max(0, g − 100). Cancer : ln(1,08) par 100 g/sem. Démence : ln(1,23) au-delà de 120 g/sem.',
    effects: [['≤ 100 g/sem', 'Mortalité', 'Risque minimal', 'wood2018'], ['200–350 g/sem', 'Espérance de vie à 40 ans', '−1 à −2 ans', 'wood2018'], ['> 350 g/sem', 'Espérance de vie à 40 ans', '−4 à −5 ans', 'wood2018'], ['+100 g/sem', 'AVC', 'HR 1,14 (1,10–1,17)', 'wood2018'], ['+1 verre/j', 'Cancer du sein', 'RR 1,12 (1,10–1,14)', 'bagnardi2015'], ['> 17,5 g/j', 'Démence', 'RR 1,23 (1,09–1,35)', 'xu2017']],
    lhr: (v) => { const g = v * 10; return O(0.0011 * Math.max(0, g - 100), ln(1.05) * (g / 100), ln(1.1) * Math.max(0, g - 200) / 100, ln(1.23) * clamp((g - 120) / 120, 0, 1.5), ln(1.08) * (g / 100), ln(1.5) * ramp(g, 140, 350)); } });

  add({ id: 'cannabis', dom: 'subst', label: 'Cannabis', short: 'Cannabis', kind: 'select', def: 0, options: [[0, 'Jamais'], [1, 'Occasionnel (≤ 1/mois)'], [2, 'Hebdomadaire'], [3, 'Quotidien']],
    lever: () => 0, att: 2, tau: 1, grade: 'C', refs: ['storck2025'], formula: 'Mortalité : 0 / 0 / ln(1,05) / ln(1,20). MCV : 0 / ln(1,05) / ln(1,20) / ln(1,50). Données limitées, sans vraie courbe dose-réponse.',
    effects: [['Usage', 'Syndrome coronarien aigu', 'RR 1,29 (1,05–1,59)', 'storck2025'], ['Usage', 'AVC', 'RR 1,20 (1,13–1,26)', 'storck2025'], ['Usage', 'Décès CV', 'RR 2,10 (1,29–3,42)', 'storck2025']],
    lhr: (v) => O([0, 0, ln(1.05), ln(1.2)][v], [0, ln(1.05), ln(1.2), ln(1.5)][v], 0, 0, [0, 0, ln(1.03), ln(1.08)][v], [0, 0, ln(1.2), ln(1.5)][v]) });

  add({ id: 'stim', dom: 'subst', label: 'Cocaïne / stimulants', short: 'Stimulants', kind: 'select', def: 0, options: [[0, 'Jamais'], [1, 'Occasionnel'], [2, 'Régulier']],
    lever: () => 0, att: 2, tau: 0.5, grade: 'C', refs: ['cocaine_smr'], formula: 'SMR 6,13 rétréci sur l\'échelle log : occasionnel exp(0,2·ln 6,13) = 1,44 ; régulier exp(0,5·ln 6,13) = 2,48.',
    effects: [['Usage régulier', 'Mortalité', 'SMR 6,13 (4,15–9,05)', 'cocaine_smr']],
    lhr: (v) => { const f = [0, 0.2, 0.5][v]; return O(f * ln(6.13), f * ln(7), 0, 0, 0, f * ln(3)); } });

  add({ id: 'opioids', dom: 'subst', label: 'Opioïdes non prescrits', short: 'Opioïdes', kind: 'select', def: 0, options: [[0, 'Jamais'], [1, 'Occasionnel'], [2, 'Dépendance']],
    lever: () => 0, att: 2, tau: 0.5, grade: 'C', refs: ['degenhardt2011'], formula: 'SMR 14,66 rétréci : occasionnel exp(0,2·ln 14,66) = 1,71 ; dépendance exp(0,5·ln 14,66) = 3,83.',
    effects: [['Dépendance', 'Mortalité', 'SMR 14,66 (12,82–16,50)', 'degenhardt2011'], ['Dépendance', 'Espérance de vie à 18 ans', '~ −15 ans', 'matrice']],
    lhr: (v) => { const f = [0, 0.2, 0.5][v]; return O(f * ln(14.66), f * ln(3), 0, 0, 0, f * ln(4)); } });

  // ——— Nutrition ———
  const food = (id, label, short, unit, min, max, step, def, lever, refs, formula, effects, key, help) =>
    add({ id, dom: 'food', label, short, unit, min, max, step, def, lever, att: 2, tau: 1.5, grade: id === 'coffee' ? 'C' : 'B', refs, formula, effects, help,
      lhr: (v) => { const o = O(); Object.keys(K[key]).forEach((k) => (o[k] = K[key][k](v))); return o; } });
  food('fv', 'Fruits et légumes', 'Fruits & légumes', 'portions/j', 0, 12, 0.5, 3, (p) => Math.max(p.fv, 5), ['wang2021', 'mujcic2016'],
    'Courbe avec plateau à 5 portions/j (Wang 2021) : 0 → 1,12 ; 2 → 1,00 ; 5 → 0,87 ; 8 → 0,85.', [['5 vs 2 portions/j', 'Mortalité', 'HR 0,87 (0,85–0,90)', 'wang2021']], 'fv', '1 portion = 80 g (une pomme, une poignée de haricots verts).');
  food('wg', 'Céréales complètes', 'Complet', 'portions/j', 0, 8, 0.5, 1, (p) => Math.max(p.wg, 3), ['aune2016wg'],
    '90 g/j (≈ 3 portions) → RR 0,83 ; plateau 0,78.', [['90 g/j', 'Mortalité', 'RR 0,83 (0,77–0,90)', 'aune2016wg']], 'wg', 'Pain complet, flocons d\'avoine, riz brun (30 g sec).');
  food('nuts', 'Noix et oléagineux', 'Noix', 'poignées/sem', 0, 14, 1, 1, (p) => Math.max(p.nuts, 5), ['aune2016nuts'],
    '28 g/j → RR 0,78 ; courbe : 3/sem → 0,88 ; 7/sem → 0,80.', [['28 g/j', 'Mortalité', 'RR 0,78 (0,72–0,84)', 'aune2016nuts']], 'nuts', 'Une poignée = ~28 g.');
  food('meat', 'Viande rouge et transformée', 'Viande rouge', 'portions/sem', 0, 21, 1, 6, (p) => Math.min(p.meat, 3), ['schwingshackl2017'],
    '≤ 2/sem → 1,00 ; 7/sem → 1,10 ; 14/sem → 1,22.', [['Par portion/j', 'Mortalité', 'RR ~1,10', 'schwingshackl2017']], 'meat', 'Bœuf, porc, agneau, charcuterie (100 g).');
  food('ssb', 'Boissons sucrées', 'Sodas', 'verres/sem', 0, 35, 1, 3, () => 0, ['malik2019'],
    '1 verre/j → 1,07 ; 2/j → 1,14 ; 4/j → 1,30.', [['≥ 2/j vs < 1/mois', 'Mortalité', 'HR 1,21 (1,13–1,28)', 'malik2019']], 'ssb', 'Sodas, jus sucrés, boissons énergisantes (25 cl).');
  food('upf', 'Aliments ultra-transformés', 'Ultra-transformés', '% calories', 0, 80, 5, 32, (p) => Math.min(p.upf, 15), ['lane2024'],
    '10 % → 1,00 ; 40 % → 1,12 ; 60 % → 1,21 (plus élevé vs plus bas).', [['Plus vs moins', 'Mortalité', 'RR 1,21 (1,15–1,27)', 'lane2024'], ['Plus vs moins', 'Troubles mentaux', 'OR 1,53', 'lane2024']], 'upf', 'France : ~30–35 % des calories en moyenne.');
  food('fish', 'Poisson', 'Poisson', 'portions/sem', 0, 7, 1, 1, (p) => Math.max(p.fish, 2), ['schwingshackl2017'],
    '2 portions/sem → 0,95 ; plateau 0,93.', [['2 portions/sem', 'Mortalité', 'RR ~0,93–0,95', 'schwingshackl2017']], 'fish');
  food('coffee', 'Café', 'Café', 'tasses/j', 0, 8, 0.5, 2, null, ['poole2017'],
    'Courbe en J, nadir 3–4 tasses (Poole 2017). Grade C : confusion résiduelle ; non utilisé comme levier.', [['3–4 tasses/j', 'Mortalité', 'RR 0,83 (0,79–0,88)', 'poole2017']], 'coffee');

  // ——— Corps ———
  add({ id: 'weight', dom: 'body', label: 'Poids (IMC)', short: 'Poids', unit: 'kg', min: 35, max: 200, step: 0.5, def: 74,
    help: 'L\'IMC est calculé avec la taille.', lever: (p) => { const b = bmiOf(p), h2 = Math.pow(p.height / 100, 2); return b > 25 ? Math.round(24.5 * h2 * 2) / 2 : b < 18.5 ? Math.round(20 * h2 * 2) / 2 : p.weight; },
    att: 1, tau: 0.5, grade: 'A', refs: ['gbmc2016', 'peeters2003', 'luppino2010'],
    formula: 'Courbe en U autour d\'un nadir de 22 (≤ 50 ans) à 24 (≥ 70 ans). Au-dessus : +3,75 → 1,11 ; +8,75 → 1,45 ; +13,75 → 1,94 ; +21,25 → 2,76. En dessous : −4 → 1,13 ; −6 → 1,51. Hommes × 1,15, femmes × 0,85 (log). Réduit jusqu\'à 50 % si PAS, LDL, HbA1c sont connues (médiation).',
    effects: [['+5 kg/m² au-dessus de 25', 'Mortalité', 'HR 1,31 (1,29–1,33)', 'gbmc2016'], ['30–35', 'Mortalité', 'HR 1,45 (1,41–1,48)', 'gbmc2016'], ['35–40', 'Mortalité', 'HR 1,94 (1,87–2,01)', 'gbmc2016'], ['40–60', 'Mortalité', 'HR 2,76 (2,60–2,92)', 'gbmc2016'], ['+5 kg/m²', 'DT2', 'RR 1,72 (1,65–1,81)', 'matrice'], ['IMC ≥ 30 à 40 ans', 'Espérance de vie', '−3 à −7 ans', 'peeters2003'], ['Obésité', 'Dépression', 'OR 1,55', 'luppino2010']],
    lhr: (v, p) => {
      const b = v / Math.pow(p.height / 100, 2), d = b - bmiNadir(p), sx = p.sex === 'F' ? 0.85 : 1.15;
      const m = (d >= 0 ? K.bmiUp(d) : K.bmiDown(-d)) * sx;
      const a = age(p);
      return O(m, ln(1.24) * Math.max(0, d) / 5, ln(1.72) * Math.max(0, b - 21) / 5, a < 65 ? ln(1.33) * ramp(b, 25, 32) : 0, ln(1.1) * Math.max(0, d) / 5, ln(1.5) * ramp(b, 27, 35));
    } });

  add({ id: 'waist', dom: 'body', label: 'Tour de taille', short: 'Taille', unit: 'cm', min: 50, max: 170, step: 1, def: null, opt: true, adv: true,
    help: 'Mesuré au niveau du nombril, en expirant.', lever: (p) => (p.waist != null ? Math.min(p.waist, p.sex === 'F' ? 80 : 94) : null), att: 1, tau: 0.5, grade: 'B', refs: ['jayedi2020'],
    formula: 'Au-delà du seuil (H 94 cm, F 80 cm) : ln(1,11) par 10 cm, × 0,5 (chevauchement avec l\'IMC).',
    effects: [['+10 cm', 'Mortalité', 'HR 1,11 (1,08–1,13)', 'jayedi2020']],
    lhr: (v, p) => { const x = Math.max(0, v - (p.sex === 'F' ? 80 : 94)) / 10; return O(0.5 * ln(1.11) * x, 0.5 * ln(1.15) * x, 0.5 * ln(1.3) * x, 0, 0, 0); } });

  // ——— Clinique ———
  add({ id: 'sbp', dom: 'clin', label: 'Pression artérielle systolique', short: 'PAS', unit: 'mmHg', min: 85, max: 210, step: 1, def: null, opt: true,
    help: 'Moyenne de plusieurs mesures au repos.', lever: (p) => (p.sbp != null && p.sbp > 125 ? 120 : null), att: 1, tau: 0.5, grade: 'A', refs: ['ettehad2016', 'lewington2002', 'bplttc2021'],
    formula: 'Relation log-linéaire (ECR) : mortalité ln(1/0,87) par 10 mmHg au-dessus de 120 ; MCV ln(1,25) par 10 mmHg au-dessus de 115. Légère remontée sous 110.',
    effects: [['−10 mmHg', 'Mortalité', 'RR 0,87 (0,84–0,91)', 'ettehad2016'], ['−10 mmHg', 'MCV majeure', 'RR 0,80 (0,77–0,83)', 'ettehad2016'], ['−10 mmHg', 'AVC', 'RR 0,73 (0,68–0,77)', 'ettehad2016'], ['+20 mmHg', 'Mortalité AVC & CI', '× 2', 'lewington2002'], ['−5 mmHg', 'MCV majeure', 'HR 0,91 (0,89–0,94)', 'bplttc2021']],
    lhr: (v, p) => { const up = Math.max(0, v - 120) / 10, lo = Math.max(0, 110 - v) / 10;
      return O(ln(1 / 0.87) * up + ln(1.03) * lo, ln(1.25) * Math.max(0, v - 115) / 10, 0, (age(p) < 70 ? ln(1.15) : ln(1.05)) * up, 0, 0); } });

  add({ id: 'ldl', dom: 'clin', label: 'LDL-cholestérol', short: 'LDL', unit: 'g/L', min: 0.3, max: 3.2, step: 0.05, def: null, opt: true,
    help: 'Bilan lipidique (g/L). 1 g/L = 2,59 mmol/L.', lever: (p) => (p.ldl != null && p.ldl > 1.15 ? 1.0 : null), att: 1, tau: 1, grade: 'A', refs: ['ctt2010', 'johannesen2020'],
    formula: 'Relation monotone issue des ECR (choix interventionnel, MASTER §9) : mortalité ln(1/0,90) par mmol/L au-dessus de 2,0 ; MCV ln(1/0,78) par mmol/L au-dessus de 1,8.',
    effects: [['−1 mmol/L (statines)', 'Événements vasculaires', 'RR 0,78–0,81', 'ctt2010'], ['LDL < 70 mg/dL (obs.)', 'Mortalité', 'HR 1,25–1,45 (confusion)', 'johannesen2020'], ['Nadir observationnel', 'Mortalité', '3,4–3,9 mmol/L', 'johannesen2020']],
    lhr: (v) => { const mm = v * LDL_MMOL; return O(ln(1 / 0.9) * Math.max(0, mm - 2.0), ln(1 / 0.78) * Math.max(0, mm - 1.8), 0, 0, 0, 0); } });

  add({ id: 'hdl', dom: 'clin', label: 'HDL-cholestérol', short: 'HDL', unit: 'g/L', min: 0.2, max: 1.2, step: 0.01, def: null, opt: true, adv: true,
    lever: null, att: 1, tau: 1, grade: 'C', refs: ['madsen2017'], formula: 'Courbe en U (nadir ~1,4–1,55 mmol/L), poids 0,5 : marqueur non causal (randomisation mendélienne).',
    effects: [['< 40 mg/dL', 'Mortalité', 'HR 1,17–1,56', 'madsen2017'], ['≥ 80 mg/dL', 'Mortalité', 'HR 1,24 (1,08–1,43)', 'madsen2017']],
    lhr: (v) => { const mm = v * LDL_MMOL; return O(0.5 * K.hdl.m(mm), 0.5 * K.hdl.cvd(mm), 0, 0, 0, 0); } });

  add({ id: 'tg', dom: 'clin', label: 'Triglycérides', short: 'TG', unit: 'g/L', min: 0.3, max: 6, step: 0.05, def: null, opt: true, adv: true,
    lever: (p) => (p.tg != null && p.tg > 1.5 ? 1.0 : null), att: 1, tau: 0.5, grade: 'C', refs: ['hokanson1996', 'erfc2009'],
    formula: 'Risque CV seulement : 30 % de l\'effet brut (H ln 1,32, F ln 1,76 par mmol/L au-dessus de 1,7), non significatif après ajustement HDL/non-HDL.',
    effects: [['+1 mmol/L (brut)', 'MCV', 'RR 1,32 (H) / 1,76 (F)', 'hokanson1996'], ['Après ajustement', 'MCV', 'Non significatif', 'erfc2009']],
    lhr: (v, p) => O(0, 0.3 * (p.sex === 'F' ? ln(1.76) : ln(1.32)) * Math.max(0, v * TG_MMOL - 1.7), 0, 0, 0, 0) });

  add({ id: 'hba1c', dom: 'clin', label: 'HbA1c', short: 'HbA1c', unit: '%', min: 4, max: 13, step: 0.1, def: null, opt: true,
    help: 'Hémoglobine glyquée. Si inconnue, la glycémie à jeun est utilisée.', lever: (p) => (p.hba1c != null && p.hba1c > 5.7 ? (p.hba1c >= 6.5 ? Math.max(6.5, p.hba1c - 1) : 5.5) : null), att: 1, tau: 0.5, grade: 'A', refs: ['selvin2010', 'stratton2000', 'erfc2011'],
    formula: 'Courbe en J : 4,5 → 1,10 ; 5,0–5,6 → 1,00 ; 6,0 → 1,20 ; 6,4 → 1,45 ; 7 → 1,60 ; 8 → 1,90 ; 9 → 2,30. Glycémie → HbA1c : (mg/dL + 46,7)/28,7. Diabète sans HbA1c : ln(1,8).',
    effects: [['HbA1c > 6,0 % (non diabétiques)', 'Mortalité', 'HR 1,74 (1,38–2,20)', 'selvin2010'], ['+1 % au-dessus de 7 %', 'MCV', 'HR 1,21 (1,18–1,23)', 'matrice'], ['−1 % HbA1c', 'Infarctus', '−14 %', 'stratton2000'], ['5,5–5,9 %', 'DT2 incident', 'HR 4,87', 'selvin2010'], ['Diabète', 'Mortalité', 'HR 1,80', 'erfc2011']],
    lhr: (v, p) => glyc(p) });
  add({ id: 'glucose', dom: 'clin', label: 'Glycémie à jeun', short: 'Glycémie', unit: 'g/L', min: 0.6, max: 3, step: 0.01, def: null, opt: true, adv: true, lever: (p) => (p.hba1c == null && p.glucose != null && p.glucose > 1.0 ? 0.92 : null), att: 1, tau: 0.5, grade: 'A', refs: ['erfc2011'], help: 'Utilisée seulement si l\'HbA1c est inconnue.' });
  add({ id: 'diabetes', dom: 'clin', label: 'Diabète diagnostiqué', short: 'Diabète', kind: 'bool', def: false, lever: null, att: 1, tau: 0, grade: 'A', refs: ['erfc2011'] });
  function glyc(p) {
    let a = p.hba1c;
    if (a == null && p.glucose != null) a = (p.glucose * 100 + 46.7) / 28.7;
    if (a == null) return p.diabetes ? O(ln(1.8), ln(2.0), 0, ln(1.6), ln(1.2), ln(1.4)) : O();
    if (p.diabetes) a = Math.max(a, 6.5);
    const o = {}; OUTCOMES.forEach((k) => (o[k] = K.hba1c[k] ? K.hba1c[k](a) : 0)); return o;
  }

  add({ id: 'rhr', dom: 'clin', label: 'Fréquence cardiaque au repos', short: 'FC repos', unit: 'bpm', min: 38, max: 120, step: 1, def: null, opt: true, adv: true,
    lever: null, att: 1, tau: 0.5, grade: 'B', refs: ['zhang2016'], formula: 'ln(1,09) par 10 bpm au-dessus de 60 ; poids 0,5 si VO2max connue (chevauchement).',
    effects: [['+10 bpm', 'Mortalité', 'RR 1,09 (1,07–1,12)', 'zhang2016'], ['> 80 vs plus bas', 'Mortalité', 'RR 1,45 (1,34–1,57)', 'zhang2016']],
    lhr: (v, p) => { const w = p.vo2max != null ? 0.5 : 1, x = Math.max(0, v - 60) / 10; return O(w * ln(1.09) * x, w * ln(1.08) * x, 0, 0, 0, 0); } });

  add({ id: 'cvd_hist', dom: 'clin', label: 'Antécédent cardiovasculaire', short: 'Antécédent CV', kind: 'bool', def: false, lever: null, att: 1, tau: 0, grade: 'A', refs: ['erfc2015'],
    help: 'Infarctus, AVC, angor, artériopathie.', formula: 'Mortalité ln(2,0), MCV ln(2,5), démence ln(1,3), dépression ln(1,5).',
    effects: [['Infarctus ou AVC', 'Mortalité', 'HR ~2', 'erfc2015']],
    lhr: (v) => (v ? O(ln(2.0), ln(2.5), 0, ln(1.3), 0, ln(1.5)) : O()) });

  // ——— Esprit & liens ———
  add({ id: 'stress', dom: 'mind', label: 'Stress perçu', short: 'Stress', unit: '/10', min: 0, max: 10, step: 1, def: 5,
    help: 'Le mois dernier, à quel point vous êtes-vous senti·e dépassé·e ? (≈ PSS-10 ÷ 4)', lever: (p) => Math.min(p.stress, 3), att: 2, tau: 0.5, grade: 'C', refs: ['russ2012', 'santosa2021', 'franks2021'],
    formula: 'Rampe de 3 à 10 : mortalité jusqu\'à ln(1,35), coronaropathie/AVC ln(1,27), démence ln(1,44), dépression ln(2,0). Domaine psychosocial × 0,6.',
    effects: [['Détresse GHQ 7–12 vs 0', 'Mortalité', 'HR 1,94', 'russ2012'], ['Stress élevé (PURE)', 'Coronaropathie', 'HR 1,24 (1,08–1,42)', 'santosa2021'], ['Stress élevé (PURE)', 'AVC', 'HR 1,30 (1,09–1,56)', 'santosa2021'], ['Stress perçu élevé', 'Démence', 'HR 1,44 (1,07–1,95)', 'franks2021']],
    lhr: (v) => { const r = ramp(v, 3, 10); return O(r * 0.3, r * ln(1.27), r * ln(1.15), r * ln(1.44), 0, r * ln(2.0)); } });

  add({ id: 'phq', dom: 'mind', label: 'Humeur dépressive (PHQ-9)', short: 'Humeur', unit: '/27', min: 0, max: 27, step: 1, def: 4,
    help: 'Score PHQ-9. ≥ 10 : parlez-en à un·e professionnel·le. En cas de détresse : 3114 (France).', lever: (p) => Math.min(p.phq, 4), att: 2, tau: 0.5, grade: 'B', refs: ['cuijpers2014', 'livingston2020'],
    formula: 'Rampe de 4 à 14 (prolongée jusqu\'à 1,3×) : mortalité ln(1,52), MCV ln(1,30), démence ln(1,6), DT2 ln(1,3).',
    effects: [['Dépression', 'Mortalité', 'RR 1,52 (1,45–1,59) ajusté', 'cuijpers2014'], ['Dépression', 'Démence', 'RR ~1,9', 'livingston2020']],
    lhr: (v) => { const r = clamp((v - 4) / 10, 0, 1.3); return O(r * ln(1.52), r * ln(1.3), r * ln(1.3), r * ln(1.6), r * ln(1.1), ln(3) * ramp(v, 5, 15)); } });

  add({ id: 'lonely', dom: 'mind', label: 'Sentiment de solitude', short: 'Solitude', unit: '/10', min: 0, max: 10, step: 1, def: 3,
    help: '0 = jamais seul·e, 10 = seul·e en permanence.', lever: (p) => Math.min(p.lonely, 2), att: 2, tau: 0.5, grade: 'B', refs: ['wang2023', 'ricouribe2018', 'valtorta2016'],
    formula: 'Rampe de 3 à 8 (prolongée 1,4×) : mortalité ln(1,18), MCV ln(1,17), démence ln(1,42), dépression ln(2,0).',
    effects: [['Solitude', 'Mortalité', 'HR 1,14 (1,08–1,20)', 'wang2023'], ['Solitude', 'Mortalité', 'HR 1,22 (1,10–1,35)', 'ricouribe2018'], ['Isolement/solitude', 'MCV', 'HR 1,17 (1,10–1,25)', 'valtorta2016'], ['Solitude', 'Démence', 'RR 1,42 (1,26–1,60)', 'matrice']],
    lhr: (v) => { const r = clamp((v - 3) / 5, 0, 1.4); return O(r * ln(1.18), r * ln(1.17), 0, r * ln(1.42), 0, r * ln(2.0)); } });

  add({ id: 'social', dom: 'mind', label: 'Liens sociaux', short: 'Liens', unit: '/10', min: 0, max: 10, step: 1, def: 5,
    help: 'Proches sur qui compter, contacts réguliers, activités de groupe. 0 = isolé·e.', lever: (p) => Math.max(p.social, 7), att: 2, tau: 0.5, grade: 'B', refs: ['wang2023', 'holtlunstad2010', 'shen2022'],
    formula: '0 → 1,32 (isolement) ; 5 → 1,00 ; 8 → 0,85 ; 10 → 0,80.',
    effects: [['Isolement social', 'Mortalité', 'HR 1,32 (1,26–1,39)', 'wang2023'], ['Relations fortes', 'Survie', 'OR 1,50', 'holtlunstad2010'], ['Isolement', 'Démence', 'HR 1,26 (1,15–1,37)', 'shen2022']],
    lhr: (v) => { const o = O(); Object.keys(K.social).forEach((k) => (o[k] = K.social[k](v))); return o; } });

  add({ id: 'ls', dom: 'mind', label: 'Satisfaction de vie', short: 'Satisfaction', unit: '/10', min: 0, max: 10, step: 1, def: 7,
    help: 'Dans l\'ensemble, êtes-vous satisfait·e de votre vie ?', lever: null, att: 2, tau: 0.5, grade: 'C', refs: ['martinmaria2017', 'zaninotto2019'],
    formula: 'ln(0,86) par écart-type (≈ 2 points) au-dessus de 7.', effects: [['+1 ET', 'Mortalité', 'HR 0,86 (0,84–0,88)', 'martinmaria2017'], ['Haut vs bas (ELSA)', 'EV sans incapacité (F, 50 ans)', '+10,6 ans', 'zaninotto2019'], ['Faible vs haute', 'MCV', 'HR 1,84 (1,63–2,07)', 'matrice']],
    lhr: (v) => { const z = (v - 7) / 2; return O(ln(0.86) * z, ln(0.8) * z, 0, 0, 0, ln(0.6) * z); } });

  add({ id: 'optimism', dom: 'mind', label: 'Optimisme', short: 'Optimisme', unit: '/10', min: 0, max: 10, step: 1, def: 6, lever: null, att: 2, tau: 0.5, grade: 'C', refs: ['rozanski2019'],
    formula: 'Mortalité ln(0,86) × (x − 5)/10 ; événements CV ln(0,65) × (x − 5)/10 ; démence ln(0,85) × (x − 5)/4.',
    effects: [['Haut vs bas', 'Mortalité', 'RR 0,86 (0,80–0,92)', 'rozanski2019'], ['Haut vs bas', 'Événements CV', 'RR 0,65 (0,51–0,78)', 'rozanski2019']],
    lhr: (v) => O(ln(0.86) * (v - 5) / 10, ln(0.65) * (v - 5) / 10, 0, ln(0.85) * (v - 5) / 4, 0, ln(0.8) * (v - 5) / 5) });

  add({ id: 'purpose', dom: 'mind', label: 'Sens / but dans la vie', short: 'Sens', unit: '/10', min: 0, max: 10, step: 1, def: 6, lever: null, att: 2, tau: 0.5, grade: 'C', refs: ['cohen2016'],
    formula: 'Mortalité ln(0,83) × (x − 5)/10 ; démence ln(0,81) × (x − 5)/10.', effects: [['Haut vs bas', 'Mortalité', 'RR 0,83 (0,75–0,92)', 'cohen2016'], ['Sens de la vie', 'Démence', 'HR 0,81 (0,78–0,85)', 'matrice']],
    lhr: (v) => O(ln(0.83) * (v - 5) / 10, ln(0.83) * (v - 5) / 10, 0, ln(0.81) * (v - 5) / 10, 0, ln(0.8) * (v - 5) / 10) });

  add({ id: 'meditation', dom: 'mind', label: 'Méditation / pleine conscience', short: 'Méditation', unit: 'min/sem', min: 0, max: 420, step: 10, def: 0, lever: null, wlever: 70, tau: 0.25, grade: 'C', refs: ['khoury2015'],
    formula: 'Aucun effet sur la mortalité modélisé. Stress : −1,2 point à 150 min/sem (MBSR, d ≈ 0,5).', effects: [['MBSR', 'Stress', 'Hedges g ≈ 0,5', 'khoury2015']] });
  add({ id: 'nature', dom: 'mind', label: 'Temps dans la nature', short: 'Nature', unit: 'min/sem', min: 0, max: 900, step: 10, def: 60, lever: null, wlever: 120, tau: 0.25, grade: 'C', refs: ['white2019'],
    formula: 'Bien-être : +0,2 point à ≥ 120 min/sem. Aucun effet sur la mortalité modélisé.', effects: [['≥ 120 min/sem', 'Bonne santé / bien-être', 'OR ~1,2–1,6', 'white2019']] });

  // ——— Contexte ———
  add({ id: 'edu', dom: 'ctx', label: 'Années d\'études', short: 'Études', unit: 'ans', min: 5, max: 22, step: 1, def: 13, lever: null, att: 0, tau: 1, grade: 'B', refs: ['balaj2024', 'livingston2020'],
    help: 'Depuis l\'entrée à l\'école primaire (bac = 12).',
    formula: 'Mortalité : ln(1 − r) × (années − 12), r = 2,9 % (< 50 ans), 1,9 % (50–69), 0,8 % (≥ 70). Démence : ln(1,6) si études < 12 ans (proportionnel).',
    effects: [['+1 année', 'Mortalité adulte', '−1,9 % (1,8–2,0)', 'balaj2024'], ['18–49 ans', 'Mortalité', '−2,9 % par année', 'balaj2024'], ['Faible éducation', 'Démence', 'RR 1,6', 'livingston2020']],
    lhr: (v, p) => { const a = age(p), r = a < 50 ? 0.029 : a < 70 ? 0.019 : 0.008; return O(ln(1 - r) * (v - 12), ln(1 - r) * (v - 12), 0, ln(1.6) * clamp((12 - v) / 6, 0, 1), 0, ln(1.2) * clamp((12 - v) / 6, 0, 1)); } });

  add({ id: 'income', dom: 'ctx', label: 'Position de revenu', short: 'Revenu', unit: 'centile', min: 1, max: 99, step: 1, def: 50, lever: null, att: 2, tau: 1, grade: 'B', refs: ['stringhini2017', 'killingsworth2023'],
    help: '50 = revenu médian de votre pays.', formula: 'Mortalité −0,0029 × (centile − 50) (bas vs haut : HR 1,26 entièrement ajusté).',
    effects: [['SSE bas vs haut', 'Mortalité', 'HR 1,42 (1,38–1,45) ; 1,26 ajusté', 'stringhini2017']],
    lhr: (v) => O(-0.0029 * (v - 50), -0.0025 * (v - 50), -0.003 * (v - 50), 0, 0, ln(1.5) * clamp((50 - v) / 45, 0, 1)) });

  add({ id: 'pm25', dom: 'ctx', label: 'Pollution de l\'air (PM2,5)', short: 'PM2,5', unit: 'µg/m³', min: 2, max: 60, step: 1, def: 10, lever: null, att: 2, tau: 1, grade: 'B', refs: ['chenhoek2020'],
    help: 'Moyenne annuelle de votre commune (OMS : ≤ 5). Paris ~ 11–13, campagne ~ 6–8.', formula: 'ln(1,08) par 10 µg/m³ au-dessus de 5.',
    effects: [['+10 µg/m³', 'Mortalité', 'RR 1,08 (1,06–1,09)', 'chenhoek2020']],
    lhr: (v) => { const x = Math.max(0, v - 5) / 10; return O(ln(1.08) * x, ln(1.11) * x, ln(1.1) * x, ln(1.1) * x, ln(1.05) * x, 0); } });

  add({ id: 'parents', dom: 'ctx', label: 'Longévité parentale', short: 'Parents', unit: 'ans', min: 40, max: 105, step: 1, def: null, opt: true, adv: true, lever: null, att: 2, tau: 0, grade: 'B', refs: ['pilling2016'],
    help: 'Âge atteint par le parent ayant vécu le plus longtemps (ou son âge actuel).', formula: 'ln(0,83) par décennie au-delà de 82 ans (borné 60–100). Non modifiable.',
    effects: [['+1 décennie au-delà de 70 ans', 'Mortalité', '−17 %', 'pilling2016'], ['+1 décennie', 'Mortalité cardiaque', '−20 %', 'pilling2016']],
    lhr: (v) => { const x = (clamp(v, 60, 100) - 82) / 10; return O(ln(0.83) * x, ln(0.8) * x, 0, 0, 0, 0); } });

  LS.VARS = V;
  LS.VAR = Object.fromEntries(V.map((v) => [v.id, v]));
  LS.OUTCOMES = OUTCOMES;
  LS.util = { clamp, ramp, curve, bmiOf, expectedVO2, expectedGrip, bmiNadir };

  /* ---------- Pays (espérance de vie à la naissance, HALE / EV) ---------- */
  LS.COUNTRIES = {
    FR: { label: 'France', e0: { M: 80.3, F: 85.9 }, hale: { M: 0.897, F: 0.871 }, src: 'INSEE 2025 ; OMS HALE 2021' },
    BE: { label: 'Belgique', e0: { M: 80.1, F: 84.3 }, hale: { M: 0.89, F: 0.87 }, src: 'Statbel 2024 (approx.)' },
    CH: { label: 'Suisse', e0: { M: 82.2, F: 85.8 }, hale: { M: 0.89, F: 0.87 }, src: 'OFS 2024 (approx.)' },
    CA: { label: 'Canada', e0: { M: 79.5, F: 84.0 }, hale: { M: 0.89, F: 0.87 }, src: 'Statistique Canada 2023 (approx.)' },
    QC: { label: 'Québec', e0: { M: 81.0, F: 84.7 }, hale: { M: 0.89, F: 0.87 }, src: 'ISQ 2024 (approx.)' },
    UK: { label: 'Royaume-Uni', e0: { M: 78.8, F: 82.8 }, hale: { M: 0.88, F: 0.86 }, src: 'ONS 2021–23 (approx.)' },
    US: { label: 'États-Unis', e0: { M: 76.5, F: 81.4 }, hale: { M: 0.86, F: 0.85 }, src: 'CDC 2024 (approx.)' }
  };

  /* ---------- Archétypes de population (MASTER §3.4) ---------- */
  const base = { mvpa: 120, steps: 6000, strength: 0, sitting: 8, vo2max: null, grip: null, sleep: 6.9, insomnia: 1, shift: false,
    smoke: 'never', cpd: 10, quit_years: 10, alcohol: 7, cannabis: 0, stim: 0, opioids: 0,
    fv: 3, wg: 1, nuts: 1, meat: 7, ssb: 3, upf: 33, fish: 1, coffee: 2, bmi: 26, waist: null,
    sbp: 128, ldl: 1.3, hdl: 0.55, tg: 1.2, hba1c: 5.5, glucose: 0.95, rhr: 70, diabetes: false, cvd_hist: false,
    stress: 5, phq: 4, lonely: 3, social: 5, ls: 7, optimism: 6, purpose: 6, meditation: 0, nature: 60,
    edu: 13, income: 50, pm25: 10, parents: 82 };
  LS.ARCHETYPES = [
    { w: 0.25, label: 'Sain', v: Object.assign({}, base, { mvpa: 260, steps: 9000, strength: 60, sitting: 6.5, sleep: 7.3, insomnia: 0, alcohol: 3, fv: 5, wg: 3, nuts: 4, meat: 3, ssb: 0, upf: 18, fish: 2, bmi: 23, sbp: 118, ldl: 1.15, hba1c: 5.3, rhr: 62, stress: 4, phq: 2, lonely: 2, social: 7, ls: 8, edu: 15, income: 65 }) },
    { w: 0.52, label: 'Moyen', v: Object.assign({}, base, { smoke: 'former', quit_years: 12, cpd: 10 }) },
    { w: 0.18, label: 'Fumeur moyen', v: Object.assign({}, base, { smoke: 'current', cpd: 12, alcohol: 10, mvpa: 80, fv: 2, upf: 38, edu: 12, income: 40 }) },
    { w: 0.05, label: 'À risque', v: Object.assign({}, base, { smoke: 'current', cpd: 15, bmi: 31, mvpa: 30, steps: 4000, sitting: 10, sleep: 6.2, insomnia: 2, alcohol: 18, fv: 1, wg: 0, nuts: 0, meat: 12, ssb: 10, upf: 50, fish: 0, sbp: 140, ldl: 1.5, hba1c: 5.9, rhr: 76, stress: 7, phq: 8, lonely: 5, social: 3, ls: 5, optimism: 4, purpose: 4, edu: 10, income: 25 }) }
  ];
  LS.BASE_PROFILE = base;

  /* ---------- Profil par défaut ---------- */
  LS.defaultValues = function () {
    const o = {};
    V.forEach((v) => (o[v.id] = v.def));
    return o;
  };
})(typeof window !== 'undefined' ? window : globalThis);
