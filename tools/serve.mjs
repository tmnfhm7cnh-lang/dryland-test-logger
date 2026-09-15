/*
 * Static server for checking the app in a real browser.
 *
 *   node tools/serve.mjs [port]     default 8090
 *
 * tools/test.mjs runs the logic against a stub DOM, which cannot tell whether a button
 * repaints or a touch lands. This serves the real files so a browser can. No dependencies,
 * no build step — same rule as the rest of the app.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const PORT = Number(process.argv[2]) || 8090;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.css': 'text/css; charset=utf-8',
};

http
  .createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    const file = path.resolve(ROOT, '.' + (rel === '/' ? '/index.html' : rel));
    // path.resolve normalises the separators, so this also stops ../ escaping the folder.
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 ' + rel);
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`dryland-test-logger en http://localhost:${PORT}`));
