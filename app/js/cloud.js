/* Lifespan — comptes en ligne avec chiffrement de bout en bout.
   - Authentification : Firebase Auth (API REST, e-mail + mot de passe).
   - Stockage : un document Firestore par personne (users/{uid}) qui ne contient QUE des données chiffrées.
   - Une clé de données aléatoire (AES-256) chiffre le profil. Elle est elle-même chiffrée :
       · par une clé dérivée du mot de passe (PBKDF2-SHA-256, 310 000 itérations),
       · et par une clé dérivée d'un code de récupération affiché une seule fois à l'inscription.
     Le serveur ne voit jamais ni le mot de passe, ni la clé, ni les données en clair.
   - Cache local chiffré pour un usage hors ligne ; synchronisation différée quand le réseau revient. */
(function (root) {
  const LS = (root.LS = root.LS || {});
  const cfg = root.LIFESPAN_CLOUD || {};
  const enabled = !!(cfg.apiKey && cfg.projectId);
  const SKEY = 'lifespan.session', CKEY = 'lifespan.acct.cache';
  const te = new TextEncoder(), td = new TextDecoder();
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } };
  const del = (k) => { try { localStorage.removeItem(k); } catch (e) { /* rien */ } };

  /* ---------- Cryptographie ---------- */
  const b64 = (buf) => { const a = new Uint8Array(buf); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
  const ub64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const rand = (n) => crypto.getRandomValues(new Uint8Array(n));
  async function kdf(secret, salt) {
    const base = await crypto.subtle.importKey('raw', te.encode(secret), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: ub64(salt), iterations: 310000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function enc(key, bytes) { const iv = rand(12); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes); return { iv: b64(iv), ct: b64(ct) }; }
  async function dec(key, iv, ct) { return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ub64(iv) }, key, ub64(ct))); }
  const importDek = (raw) => crypto.subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);
  const newDek = () => crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const rawDek = async (k) => new Uint8Array(await crypto.subtle.exportKey('raw', k));
  const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  function recoveryCode() {
    const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', r = rand(16);
    let s = ''; r.forEach((b, i) => { s += A[b % A.length]; if (i % 4 === 3 && i < 15) s += '-'; });
    return s;
  }

  /* ---------- Erreurs lisibles ---------- */
  const MSG = {
    EMAIL_EXISTS: 'Un compte existe déjà avec cet e-mail. Connecte-toi plutôt.',
    EMAIL_NOT_FOUND: 'E-mail ou mot de passe incorrect.',
    INVALID_PASSWORD: 'E-mail ou mot de passe incorrect.',
    INVALID_LOGIN_CREDENTIALS: 'E-mail ou mot de passe incorrect.',
    INVALID_EMAIL: 'Adresse e-mail invalide.',
    MISSING_PASSWORD: 'Entre ton mot de passe.',
    TOO_MANY_ATTEMPTS_TRY_LATER: 'Trop de tentatives. Réessaie dans quelques minutes.',
    USER_DISABLED: 'Ce compte a été désactivé.',
    CREDENTIAL_TOO_OLD_LOGIN_AGAIN: 'Pour des raisons de sécurité, reconnecte-toi puis recommence.',
    TOKEN_EXPIRED: 'Session expirée : reconnecte-toi.',
    OPERATION_NOT_ALLOWED: 'La connexion par e-mail n\'est pas activée dans Firebase (Authentication → Sign-in method).',
    NETWORK: 'Pas de connexion internet. Réessaie quand tu es en ligne.',
    NEED_RECOVERY: 'Ton mot de passe a changé depuis la dernière fois : entre ton code de récupération pour déverrouiller tes données.',
    BAD_RECOVERY: 'Code de récupération incorrect.',
    PERMISSION_DENIED: 'Accès refusé par le serveur : vérifie les règles Firestore.'
  };
  class CloudError extends Error { constructor(code) { const c = String(code || 'ERREUR').split(' ')[0].split(':')[0]; super(c.startsWith('WEAK_PASSWORD') ? 'Mot de passe trop faible : 8 caractères minimum conseillés (6 au strict minimum).' : MSG[c] || 'Erreur : ' + code); this.code = c; } }

  async function http(url, opts) {
    let r;
    try { r = await fetch(url, opts); } catch (e) { throw new CloudError('NETWORK'); }
    let j = null; try { j = await r.json(); } catch (e) { j = null; }
    if (!r.ok) {
      if (r.status === 404) return { __missing: true };
      const m = j && j.error ? j.error.message || j.error.status : 'HTTP ' + r.status;
      throw new CloudError(r.status === 403 && !/[A-Z_]{6,}/.test(m) ? 'PERMISSION_DENIED' : m);
    }
    return j || {};
  }
  const auth = (path, body) => http(`https://identitytoolkit.googleapis.com/v1/${path}?key=${cfg.apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  /* ---------- Session ---------- */
  let S = null, dek = null;
  try { S = JSON.parse(get(SKEY) || 'null'); } catch (e) { S = null; }
  const saveSession = () => { if (S) set(SKEY, JSON.stringify(S)); else del(SKEY); };
  function setTokens(j) {
    S = Object.assign(S || {}, { uid: j.localId || j.user_id || S.uid, email: j.email || S.email, idToken: j.idToken || j.id_token, refreshToken: j.refreshToken || j.refresh_token, exp: Date.now() + (parseInt(j.expiresIn || j.expires_in || '3600', 10) - 60) * 1000 });
    saveSession();
  }
  async function token() {
    if (!S) throw new CloudError('TOKEN_EXPIRED');
    if (Date.now() < S.exp) return S.idToken;
    const body = 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(S.refreshToken);
    const j = await http(`https://securetoken.googleapis.com/v1/token?key=${cfg.apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    setTokens(j);
    return S.idToken;
  }

  /* ---------- Firestore (REST) ---------- */
  const docUrl = () => `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/users/${S.uid}`;
  const toFields = (o) => { const f = {}; Object.keys(o).forEach((k) => (f[k] = typeof o[k] === 'number' ? { integerValue: String(Math.round(o[k])) } : { stringValue: String(o[k]) })); return f; };
  const fromFields = (f) => { const o = {}; Object.keys(f || {}).forEach((k) => (o[k] = f[k].integerValue != null ? Number(f[k].integerValue) : f[k].stringValue)); return o; };
  async function getDoc() { const j = await http(docUrl(), { headers: { Authorization: 'Bearer ' + (await token()) } }); return j.__missing ? null : fromFields(j.fields); }
  async function patchDoc(o, fields) {
    const mask = (fields || Object.keys(o)).map((k) => 'updateMask.fieldPaths=' + k).join('&');
    return http(docUrl() + '?' + mask, { method: 'PATCH', headers: { Authorization: 'Bearer ' + (await token()), 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: toFields(o) }) });
  }
  async function deleteDoc() { return http(docUrl(), { method: 'DELETE', headers: { Authorization: 'Bearer ' + (await token()) } }); }

  /* ---------- Cache local chiffré ---------- */
  async function writeCache(data, dirty) {
    const e = await enc(dek, te.encode(JSON.stringify(data)));
    const prev = readCacheMeta();
    set(CKEY, JSON.stringify({ uid: S.uid, iv: e.iv, ct: e.ct, updated: Date.now(), synced: dirty ? (prev && prev.uid === S.uid ? prev.synced : 0) : Date.now(), dirty: !!dirty }));
  }
  function readCacheMeta() { try { return JSON.parse(get(CKEY) || 'null'); } catch (e) { return null; } }

  /* ---------- Synchronisation ---------- */
  let pushTimer = null, pending = null, status = { state: 'idle', at: null, error: null };
  const listeners = [];
  const emit = () => listeners.forEach((f) => { try { f(status); } catch (e) { /* rien */ } });
  async function pushNow() {
    if (!pending || !dek || !S) return;
    const data = pending; pending = null;
    status = { state: 'saving', at: status.at, error: null }; emit();
    try {
      const e = await enc(dek, te.encode(JSON.stringify(data)));
      const now = Date.now();
      await patchDoc({ iv: e.iv, ct: e.ct, updated: now }, ['iv', 'ct', 'updated']);
      const m = readCacheMeta(); if (m) { m.synced = now; m.dirty = false; set(CKEY, JSON.stringify(m)); }
      status = { state: 'synced', at: now, error: null };
    } catch (err) {
      pending = pending || data;
      status = { state: 'offline', at: status.at, error: err.message };
    }
    emit();
  }

  const Cloud = {
    enabled, CloudError,
    session: () => (S ? { uid: S.uid, email: S.email, keep: S.keep !== false, hasKey: !!S.dek || !!dek } : null),
    status: () => status,
    onStatus: (f) => listeners.push(f),

    async signUp(email, password, data) {
      const j = await auth('accounts:signUp', { email, password, returnSecureToken: true });
      S = { keep: true }; setTokens(j);
      const key = await newDek(), raw = await rawDek(key);
      const salt = b64(rand(16)), rsalt = b64(rand(16)), code = recoveryCode();
      const w = await enc(await kdf(password, salt), raw), rw = await enc(await kdf(normCode(code), rsalt), raw);
      dek = key; S.dek = b64(raw); saveSession();
      const e = await enc(dek, te.encode(JSON.stringify(data)));
      await patchDoc({ v: 1, salt, wiv: w.iv, wct: w.ct, rsalt, riv: rw.iv, rct: rw.ct, iv: e.iv, ct: e.ct, updated: Date.now() });
      await writeCache(data, false);
      auth('accounts:sendOobCode', { requestType: 'VERIFY_EMAIL', idToken: S.idToken }).catch(() => {});
      status = { state: 'synced', at: Date.now(), error: null }; emit();
      return { recovery: code };
    },

    // Renvoie { data } ; lève NEED_RECOVERY si le mot de passe ne déchiffre plus la clé (après une réinitialisation)
    async signIn(email, password, keep) {
      const j = await auth('accounts:signInWithPassword', { email, password, returnSecureToken: true });
      S = { keep: keep !== false }; setTokens(j);
      const doc = await getDoc();
      if (!doc || !doc.wct) { S._pw = password; return { data: null }; }
      let raw;
      try { raw = await dec(await kdf(password, doc.salt), doc.wiv, doc.wct); }
      catch (e) { Cloud._pend = { password, doc }; throw new CloudError('NEED_RECOVERY'); }
      return Cloud._open(raw, doc);
    },
    async useRecovery(code) {
      const p = Cloud._pend; if (!p) throw new CloudError('TOKEN_EXPIRED');
      let raw;
      try { raw = await dec(await kdf(normCode(code), p.doc.rsalt), p.doc.riv, p.doc.rct); } catch (e) { throw new CloudError('BAD_RECOVERY'); }
      const salt = b64(rand(16)), w = await enc(await kdf(p.password, salt), raw);
      await patchDoc({ salt, wiv: w.iv, wct: w.ct }, ['salt', 'wiv', 'wct']);
      Cloud._pend = null;
      return Cloud._open(raw, p.doc);
    },
    async _open(raw, doc) {
      dek = await importDek(raw);
      if (S.keep) S.dek = b64(raw); else delete S.dek;
      saveSession();
      const data = JSON.parse(td.decode(await dec(dek, doc.iv, doc.ct)));
      await writeCache(data, false);
      status = { state: 'synced', at: Date.now(), error: null }; emit();
      return { data };
    },
    // Compte créé mais jamais initialisé (rare) : on crée le coffre avec le mot de passe mémorisé
    async initEmpty(data) {
      const password = S._pw; delete S._pw;
      const key = await newDek(), raw = await rawDek(key);
      const salt = b64(rand(16)), rsalt = b64(rand(16)), code = recoveryCode();
      const w = await enc(await kdf(password, salt), raw), rw = await enc(await kdf(normCode(code), rsalt), raw);
      dek = key; if (S.keep) S.dek = b64(raw); saveSession();
      const e = await enc(dek, te.encode(JSON.stringify(data)));
      await patchDoc({ v: 1, salt, wiv: w.iv, wct: w.ct, rsalt, riv: rw.iv, rct: rw.ct, iv: e.iv, ct: e.ct, updated: Date.now() });
      await writeCache(data, false);
      return { recovery: code };
    },

    // Ouverture rapide depuis le cache local (session mémorisée)
    async resume() {
      if (!S || !S.dek) return null;
      dek = await importDek(ub64(S.dek));
      const m = readCacheMeta();
      if (m && m.uid === S.uid) {
        try { const data = JSON.parse(td.decode(await dec(dek, m.iv, m.ct))); if (m.dirty) { pending = data; setTimeout(pushNow, 1500); } return { data, fromCache: true }; } catch (e) { /* cache illisible : on retélécharge */ }
      }
      const doc = await getDoc();
      if (!doc || !doc.ct) return { data: null };
      const data = JSON.parse(td.decode(await dec(dek, doc.iv, doc.ct)));
      await writeCache(data, false);
      return { data };
    },
    // Données plus récentes sur le serveur (autre appareil) ?
    async pullIfNewer() {
      if (!S || !dek) return null;
      const m = readCacheMeta();
      if (m && m.dirty) return null;
      const doc = await getDoc();
      if (!doc || !doc.ct || (m && doc.updated <= (m.synced || 0))) return null;
      const data = JSON.parse(td.decode(await dec(dek, doc.iv, doc.ct)));
      await writeCache(data, false);
      status = { state: 'synced', at: Date.now(), error: null }; emit();
      return data;
    },
    persist(data) {
      if (!dek || !S) return;
      writeCache(data, true).catch(() => {});
      pending = data;
      clearTimeout(pushTimer); pushTimer = setTimeout(pushNow, 1500);
    },
    flush: () => { clearTimeout(pushTimer); return pushNow(); },
    resetPassword: (email) => auth('accounts:sendOobCode', { requestType: 'PASSWORD_RESET', email }),
    async changePassword(current, next) {
      const j = await auth('accounts:signInWithPassword', { email: S.email, password: current, returnSecureToken: true }); setTokens(j);
      const doc = await getDoc();
      const raw = await dec(await kdf(current, doc.salt), doc.wiv, doc.wct);
      const u = await auth('accounts:update', { idToken: S.idToken, password: next, returnSecureToken: true }); setTokens(u);
      const salt = b64(rand(16)), w = await enc(await kdf(next, salt), raw);
      await patchDoc({ salt, wiv: w.iv, wct: w.ct }, ['salt', 'wiv', 'wct']);
    },
    async deleteAccount(password) {
      const j = await auth('accounts:signInWithPassword', { email: S.email, password, returnSecureToken: true }); setTokens(j);
      await deleteDoc();
      await auth('accounts:delete', { idToken: S.idToken });
      Cloud.signOut();
    },
    setKeep(keep) { if (!S) return; S.keep = keep; if (keep && dek) rawDek(dek).then((r) => { S.dek = b64(r); saveSession(); }); else { delete S.dek; saveSession(); } },
    signOut() { clearTimeout(pushTimer); pending = null; S = null; dek = null; del(SKEY); del(CKEY); status = { state: 'idle', at: null, error: null }; }
  };
  root.addEventListener && root.addEventListener('online', () => { if (pending) pushNow(); });
  LS.Cloud = Cloud;
})(window);
