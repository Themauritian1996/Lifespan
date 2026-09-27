// Serveur local de Lifespan (sans cache). Usage : node tools/serve.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');
const port = Number(process.argv[2]) || 5173;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(root, path));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    const info = await stat(file).catch(() => null);
    if (!info || !info.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Introuvable'); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Content-Length': body.length });
    res.end(body);
  } catch (e) { res.writeHead(500).end(); }
}).listen(port, '127.0.0.1', () => {
  const url = `http://localhost:${port}`;
  console.log(`Lifespan est lancé : ${url}
Laisse cette fenêtre ouverte pendant l'utilisation. Ferme-la pour arrêter.`);
  if (process.argv.includes('--open')) exec(process.platform === 'win32' ? `start "" ${url}` : `open ${url} || xdg-open ${url}`);
}).on('error', (e) => {
  if (e.code === 'EADDRINUSE') { console.log(`Le port ${port} est déjà utilisé : Lifespan tourne peut-être déjà. Ouvre http://localhost:${port}`); if (process.argv.includes('--open')) exec(`start "" http://localhost:${port}`); }
  else console.error(e);
});
