/* Lifespan — préférences de l'appareil et traduction (français / anglais).
   Le code écrit l'interface en français ; en anglais, un observateur traduit le texte affiché
   à partir du dictionnaire (correspondances exactes puis motifs). Les formules et tableaux
   scientifiques détaillés restent en français. */
(function (root) {
  const LS = (root.LS = root.LS || {});
  const PKEY = 'lifespan.prefs';
  let prefs = {};
  try { prefs = JSON.parse(localStorage.getItem(PKEY) || '{}') || {}; } catch (e) { prefs = {}; }
  const nav = ((root.navigator && navigator.language) || 'fr').slice(0, 2).toLowerCase();
  prefs = Object.assign({ lang: nav === 'fr' ? 'fr' : 'en', theme: 'system', accent: 'signal', zoom: 1, motion: 'auto', wUnit: 'kg', hUnit: 'cm', lab: 'gl' }, prefs);
  const Prefs = {
    get: () => prefs,
    set(patch) { Object.assign(prefs, patch); try { localStorage.setItem(PKEY, JSON.stringify(prefs)); } catch (e) { /* rien */ } }
  };

  const EN = LS.I18N_EN || {};
  const PAT = LS.I18N_EN_PATTERNS || [];
  const lang = prefs.lang === 'en' ? 'en' : 'fr';
  function t(s) {
    if (lang === 'fr' || s == null) return s;
    const k = String(s);
    if (EN[k] != null) return EN[k];
    const trimmed = k.trim();
    if (EN[trimmed] != null) return k.replace(trimmed, EN[trimmed]);
    let out = trimmed, changed = false;
    for (const [re, rep] of PAT) { const n = out.replace(re, rep); if (n !== out) { out = n; changed = true; } }
    return changed ? k.replace(trimmed, out) : k;
  }
  const SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1 };
  function translate(node) {
    if (lang === 'fr' || !node) return;
    if (node.nodeType === 3) { const v = node.nodeValue; if (v && v.trim()) { const n = t(v); if (n !== v) node.nodeValue = n; } return; }
    if (node.nodeType !== 1 || SKIP[node.nodeName] || (node.closest && node.closest('[data-notr]'))) return;
    ['placeholder', 'aria-label', 'title'].forEach((a) => { const v = node.getAttribute && node.getAttribute(a); if (v) { const n = t(v); if (n !== v) node.setAttribute(a, n); } });
    const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: (n) => (n.nodeType === 1 && (SKIP[n.nodeName] || n.hasAttribute('data-notr')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
    });
    let n = w.nextNode();
    while (n) {
      if (n.nodeType === 3) { const v = n.nodeValue; if (v && v.trim()) { const r = t(v); if (r !== v) n.nodeValue = r; } }
      else ['placeholder', 'aria-label', 'title'].forEach((a) => { const v = n.getAttribute(a); if (v) { const r = t(v); if (r !== v) n.setAttribute(a, r); } });
      n = w.nextNode();
    }
  }
  function start() {
    document.documentElement.lang = lang;
    if (lang === 'fr') return;
    translate(document.body);
    new MutationObserver((muts) => muts.forEach((m) => {
      if (m.type === 'characterData') translate(m.target);
      else m.addedNodes.forEach(translate);
    })).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  LS.Prefs = Prefs;
  LS.i18n = { lang, t, translate, start, locale: lang === 'en' ? 'en-US' : 'fr-FR' };
})(window);
