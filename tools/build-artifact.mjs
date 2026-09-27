// Construit des versions mono-fichier de l'app :
//   dist/lifespan.html            → contenu pour une page hébergée qui fournit déjà <html>/<head>/<body>
//   dist/lifespan-standalone.html → document HTML complet, à ouvrir ou partager tel quel
// Usage : node tools/build-artifact.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = join(root, 'app');
const html = readFileSync(join(app, 'index.html'), 'utf8');
const css = readFileSync(join(app, 'css', 'styles.css'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => readFileSync(join(app, m[1]), 'utf8'));
const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
const meta = html.match(/<meta name="description"[^>]*>/)[0];
const fonts = [...html.matchAll(/<link rel="(?:preconnect|stylesheet)" href="https:\/\/fonts[^>]*>/g)].map((m) => m[0]).join('\n');
const bodyInner = html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script src="[^"]+"><\/script>\s*/g, '');
const js = scripts.map((s) => `<script>\n${s.replace(/<\/script/gi, '<\/script')}\n</script>`).join('\n');
const icon = 'data:image/svg+xml;base64,' + Buffer.from(readFileSync(join(app, 'assets', 'icon.svg'))).toString('base64');

const fragment = `${title}\n${meta}\n${fonts}\n<style>\n${css}\n</style>\n${bodyInner.trim()}\n${js}\n`;
const standalone = `<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<link rel="icon" href="${icon}">\n${fragment.replace(bodyInner.trim(), '').replace(js, '')}</head>\n<body>\n${bodyInner.trim()}\n${js}\n</body>\n</html>\n`;
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'lifespan.html'), fragment);
writeFileSync(join(root, 'dist', 'lifespan-standalone.html'), standalone);
console.log('dist/lifespan.html', (fragment.length / 1024).toFixed(0) + ' Ko');
console.log('dist/lifespan-standalone.html', (standalone.length / 1024).toFixed(0) + ' Ko');
