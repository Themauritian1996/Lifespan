// Benchmarks de calibration — MASTER.md §4. Usage : node tests/calibrate.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'js');
const ctx = { console };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['model.js', 'engine.js']) vm.runInContext(readFileSync(join(dir, f), 'utf8'), ctx);
const LS = ctx.LS;

const mk = (sex, age, v = {}, height = sex === 'F' ? 164 : 177) => {
  const p = Object.assign({}, LS.defaultValues(), LS.BASE_PROFILE, v, { sex, height, country: 'FR', _age: age });
  p.weight = (v.bmi ?? p.bmi ?? 26) * (height / 100) ** 2;
  if (v.weight) p.weight = v.weight;
  ['vo2max', 'grip', 'waist', 'sbp', 'ldl', 'hdl', 'tg', 'hba1c', 'glucose', 'rhr', 'parents'].forEach((k) => { if (!(k in v)) p[k] = null; });
  return p;
};
const LE = (p) => LS.engine.core(p).leTotal;
const HALE = (p) => LS.engine.core(p).haleTotal;

const healthy5 = { smoke: 'never', bmi: 22, mvpa: 300, alcohol: 5, fv: 5, wg: 3, nuts: 5, meat: 3, ssb: 0, upf: 18, fish: 2 };
const unhealthy5 = { smoke: 'current', cpd: 15, bmi: 31, mvpa: 20, steps: 4000, alcohol: 20, fv: 1.5, wg: 0.5, nuts: 0, meat: 10, ssb: 7, upf: 50, fish: 0 };
const h8 = Object.assign({}, healthy5, { stress: 3, sleep: 7.5, insomnia: 0, social: 8, lonely: 1, opioids: 0, steps: 9000 });
const u8 = Object.assign({}, unhealthy5, { stress: 8, sleep: 5.5, insomnia: 2, social: 2, lonely: 7, opioids: 1, alcohol: 30 });

const rows = [];
const check = (id, label, val, lo, hi) => rows.push({ id, label, value: +val.toFixed(2), target: `${lo} … ${hi}`, ok: val >= lo && val <= hi ? 'OK' : 'FAIL' });

// B1 : population
for (const s of ['M', 'F']) {
  const pop = LS.engine.core(mk(s, 0.01, {}), { scale: 0 }).leTotal;
  check('B1', `EV pop. calibrée ${s} (naissance)`, pop, s === 'M' ? 79.8 : 85.4, s === 'M' ? 80.8 : 86.4);
  const avg = LE(mk(s, 40, { smoke: 'former', quit_years: 12 }));
  const popAt40 = LS.engine.core(mk(s, 40, {}), { scale: 0 }).leTotal;
  check('B1', `Profil « Moyen » ${s} à 40 ans vs population (${popAt40.toFixed(1)})`, avg - popAt40, -0.5, 3.0);
}
// B2 Li 2018
check('B2', 'Li 2018 : 5 vs 0 facteurs à 50 ans, H (+12,2)', LE(mk('M', 50, healthy5)) - LE(mk('M', 50, unhealthy5)), 9.2, 15.2);
check('B2', 'Li 2018 : 5 vs 0 facteurs à 50 ans, F (+14,0)', LE(mk('F', 50, healthy5)) - LE(mk('F', 50, unhealthy5)), 11, 17);
// B3 Nguyen 2024
check('B3', 'Nguyen 2024 : 8 vs 0 à 40 ans, H (+24)', LE(mk('M', 40, h8)) - LE(mk('M', 40, u8)), 19, 29);
check('B3', 'Nguyen 2024 : 8 vs 0 à 40 ans, F (+20,5)', LE(mk('F', 40, h8)) - LE(mk('F', 40, u8)), 15.5, 25.5);
// B4 tabac continu
check('B4', 'Fumeur 20/j continu vs jamais, H 25 ans (≥ 10)', LE(mk('M', 25, {})) - LE(mk('M', 25, { smoke: 'current', cpd: 20 })), 8, 13);
check('B4', 'Fumeur 20/j continu vs jamais, F 25 ans (≥ 10)', LE(mk('F', 25, {})) - LE(mk('F', 25, { smoke: 'current', cpd: 20 })), 8, 13);
// B5 activité
check('B5', 'MVPA 225 + 7 500 pas vs 0 + 4 000 pas, H 40 ans (+3,4)', LE(mk('M', 40, { mvpa: 225, steps: 7500 })) - LE(mk('M', 40, { mvpa: 0, steps: 4000 })), 1.9, 4.9);
// B6 alcool
check('B6', 'Alcool 45 verres/sem vs 5, H 40 ans (−4 à −5)', LE(mk('M', 40, { alcohol: 5 })) - LE(mk('M', 40, { alcohol: 45 })), 2.5, 6.5);
// B7 IMC
check('B7', 'IMC 35 vs 23, H 40 ans (3–7)', LE(mk('M', 40, { bmi: 23 })) - LE(mk('M', 40, { bmi: 35 })), 3, 7);
// B8 arrêt à 35 ans
check('B8', 'Arrêt à 35 ans (20/j) vs continuer, H (~9–10)', LE(mk('M', 35, { smoke: 'former', cpd: 20, quit_years: 0 })) - LE(mk('M', 35, { smoke: 'current', cpd: 20 })), 6.5, 12.5);

console.table(rows);
// Informations complémentaires
const p40 = mk('M', 40, {});
const ev = LS.engine.evaluate(p40);
console.log('Homme 40 ans valeurs de base :', { LE: ev.leTotal.toFixed(1), HALE: ev.haleTotal.toFixed(1), popLE: ev.popLeTotal.toFixed(1), popHALE: ev.popHaleTotal.toFixed(1), mort10: (ev.mort10 * 100).toFixed(2) + '%', riskAge: ev.riskAge.toFixed(1), score: ev.score });
console.log('HALE 5 vs 0 (Li 2020 cible +7,6 H / +10,7 F à 50 ans) :', (HALE(mk('M', 50, healthy5)) - HALE(mk('M', 50, unhealthy5))).toFixed(1), (HALE(mk('F', 50, healthy5)) - HALE(mk('F', 50, unhealthy5))).toFixed(1));
const t0 = Date.now(); const lv = LS.engine.levers(mk('M', 45, unhealthy5)); console.log('Leviers (ms) :', Date.now() - t0, lv.list.slice(0, 6).map((l) => l.id + ' +' + l.dLE.toFixed(2)).join(', '), '| tous : +' + lv.all.dLE.toFixed(1));
const fails = rows.filter((r) => r.ok === 'FAIL').length;
console.log(fails ? `${fails} benchmark(s) hors zone` : 'Tous les benchmarks sont dans la zone.');
process.exitCode = fails ? 1 : 0;
