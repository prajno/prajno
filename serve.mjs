// Dev server: builds the site, serves dist/, and rebuilds + reloads the browser on every
// save under site/ or articles/. What you see here is byte-identical to what deploys.
// `npm start` -> http://localhost:8765
import { createServer } from 'node:http';
import { readFile, watch } from 'node:fs/promises';
import { extname, join, normalize, relative } from 'node:path';
import { build, dist, articlesDir, siteDir } from './build.mjs';

const port = Number(process.env.PORT ?? 8765);
const RELOAD = `<script>new EventSource('/__reload').onmessage = () => location.reload();</script>`;
const TYPES = { '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
                '.css': 'text/css', '.js': 'text/javascript', '.md': 'text/plain', '.txt': 'text/plain' };

const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

await build();
const clients = new Set();

// Nothing a request can contain may take the server down — a dev server that dies on a
// stray URL costs you the preview mid-edit.
const server = createServer(async (req, res) => {
  let path;
  try {
    path = decodeURIComponent(req.url.split('?')[0]);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Bad request URI');
  }

  try {
    if (path === '/__reload') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write('\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    let file = join(dist, normalize(path).replace(/^(\.\.[/\\])+/, ''));
    if (relative(dist, file).startsWith('..')) { res.writeHead(403); return res.end('Forbidden'); }
    if (path.endsWith('/')) file = join(file, 'index.html'); // /articles/foo/ -> that page

    try {
      const body = await readFile(file);
      const type = TYPES[extname(file)] ?? 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': `${type}${type.startsWith('text/') ? '; charset=utf-8' : ''}`,
                           'Cache-Control': 'no-store' });
      // Live reload is injected per request, so it never lands in dist/ or in a deploy.
      res.end(type === 'text/html' ? String(body).replace('</body>', `${RELOAD}\n</body>`) : body);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h1>404</h1><p>Nothing at <code>${escapeHtml(path)}</code>.</p>${RELOAD}`);
    }
  } catch (error) {
    console.error(`request failed (${path}): ${error.message}`);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Server error');
  }
});

server.listen(port, () => console.log(`prajno.com -> http://localhost:${port}`));

// Watch the directories, not the files: editors save by rename, which drops a per-file
// watch after the first edit. That same rename dance is why we ignore temp files and wait
// for a quiet moment before building — mid-save, the real file briefly doesn't exist.
const IGNORED = /(^|\/)(\.|~)|\.tmp\.|\.swp$|\.!\d+!/;
let timer;
let pending = '';

function scheduleBuild(label) {
  pending = label;
  clearTimeout(timer);
  timer = setTimeout(async () => {
    try {
      await build();
      console.log(`rebuilt (${pending})`);
      for (const client of clients) client.write('data: reload\n\n');
    } catch (error) {
      console.error(`build failed: ${error.message}`);
    }
  }, 150);
}

async function watchTree(dir) {
  for await (const event of watch(dir, { recursive: true })) {
    const name = event.filename ?? '';
    if (IGNORED.test(name)) continue;
    scheduleBuild(relative(process.cwd(), join(dir, name)));
  }
}

await Promise.all([watchTree(siteDir), watchTree(articlesDir)]);
