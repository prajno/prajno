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

await build();
const clients = new Set();

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);

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
    res.end(`<h1>404</h1><p>Nothing at <code>${path}</code>.</p>${RELOAD}`);
  }
});

server.listen(port, () => console.log(`prajno.com -> http://localhost:${port}`));

// Watch the directories, not the files: editors save by rename, which drops a per-file
// watch after the first edit.
let last = 0;
async function watchTree(dir) {
  for await (const event of watch(dir, { recursive: true })) {
    if (Date.now() - last < 50) continue; // one save fires several events
    last = Date.now();
    try {
      await build();
      console.log(`rebuilt (${relative(process.cwd(), join(dir, event.filename ?? ''))})`);
      for (const client of clients) client.write('data: reload\n\n');
    } catch (error) {
      console.error(`build failed: ${error.message}`);
    }
  }
}

await Promise.all([watchTree(siteDir), watchTree(articlesDir)]);
