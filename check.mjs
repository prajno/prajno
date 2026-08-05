// The pre-PR gate: `npm run check`.
//
//   1. build       — the whole site renders without error
//   2. structure   — the markdown is shaped the way the renderer expects
//   3. links       — every local href/src in dist/ resolves to a real file
//   4. layout      — structural diff of each page against the base ref
//
// External links are listed, not fetched, unless you pass --external. Keeping the default
// offline makes the gate fast and deterministic; the manual read of those links is a
// CLAUDE.md step, not something a 200 response can vouch for.
import { execFile } from 'node:child_process';
import { access, readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import {
  articlesDir, build, dist, parseFrontMatter, readArticles, renderMarkdown, root, siteDir,
} from './build.mjs';

const run = promisify(execFile);
const BASE = process.env.BASE_REF ?? 'main';
const CHECK_EXTERNAL = process.argv.includes('--external');

const problems = [];
const notes = [];
const fail = (where, message) => problems.push(`${where}: ${message}`);
// Each section reports only what it found, so nothing is printed twice.
let reported = 0;
const sinceLastSection = () => problems.slice(reported);
const markReported = () => { reported = problems.length; };

const heading = (text) => console.log(`\n\x1b[1m${text}\x1b[0m`);
const ok = (text) => console.log(`  \x1b[32m✓\x1b[0m ${text}`);
const bad = (text) => console.log(`  \x1b[31m✗\x1b[0m ${text}`);
const info = (text) => console.log(`  \x1b[2m·\x1b[0m ${text}`);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

// ---------------------------------------------------------------- 1. build

heading('build');
let articles;
try {
  articles = await build();
  ok(`dist/ built — home + ${articles.length} article(s)`);
} catch (error) {
  bad(`build failed: ${error.message}`);
  fail('build', error.message);
  console.log('\nBuild failed, so the rest of the gate cannot run.');
  process.exit(1);
}

// ------------------------------------------------------------ 2. structure

heading('markdown structure');

// An image inline in a sentence silently renders as a bare <img> — no <figure>, no
// caption. Every image must sit alone on its own line, outside a code fence.
function imagesOnOwnLine(label, body, offset) {
  let fenced = false;
  body.split(/\r?\n/).forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced || !/!\[[^\]]*\]\(/.test(line)) return;
    // Greedy to the last `)` — captions legitimately contain parentheses.
    if (!/^\s*!\[[^\]]*\]\(.*\)\s*$/.test(line)) {
      fail(label, `line ${index + 1 + offset}: image is not alone on its line, so it renders without a caption`);
    }
  });
}

for (const article of articles) {
  const label = `articles/${article.slug}/content.md`;
  if (!/^[a-z0-9-]+$/.test(article.slug)) {
    fail(`articles/${article.slug}/`, 'slug must be lowercase letters, digits, and dashes — it is the URL');
  }
  for (const field of ['title', 'subtitle', 'date']) {
    if (!article.data[field]) fail(label, `front matter is missing \`${field}\``);
  }
  if (article.data.date && !/^\d{4}-\d{2}-\d{2}$/.test(article.data.date)) {
    fail(label, `date "${article.data.date}" is not YYYY-MM-DD`);
  }
  // `draft:` / `archive:` activate only on the literal `true` — a near-miss (`yes`,
  // `ture`) silently files the article in the wrong place with no other symptom.
  for (const flag of ['draft', 'archive']) {
    if (flag in article.data && !['true', 'false'].includes(article.data[flag])) {
      fail(label, `front matter \`${flag}: ${article.data[flag]}\` does nothing — use \`true\`, or drop the line`);
    }
  }
  // The og:image never appears as an href/src, so the link pass below can't see it.
  if (article.data.image) {
    if (/^(https?:)?\/\//.test(article.data.image) || article.data.image.startsWith('/')) {
      fail(label, `front matter image "${article.data.image}" must be relative to the article directory`);
    } else {
      await access(join(articlesDir, article.slug, article.data.image)).catch(() =>
        fail(label, `front matter image "${article.data.image}" resolves to nothing`));
    }
  }
  imagesOnOwnLine(label, article.body, article.offset);

  // Captions are what turn an image into a <figure>; a bare image is nearly always a slip.
  const uncaptioned = [...article.body.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)];
  for (const [, src] of uncaptioned) notes.push(`${label}: \`${src}\` has no caption`);

  const noAlt = [...article.body.matchAll(/!\[\s*\]\(([^)\s"]+)/g)];
  for (const [, src] of noAlt) fail(label, `\`${src}\` has empty alt text`);
}

const home = parseFrontMatter(await readFile(join(siteDir, 'index.md'), 'utf8'));
if (!home.body.includes('{{articles}}')) {
  fail('site/index.md', 'the {{articles}} placeholder is gone, so the home page lists nothing');
}
if (!home.data.title) fail('site/index.md', 'front matter is missing `title`');
// Same guard the articles get: the og:image lives in a meta tag the link pass can't see.
if (home.data.image) {
  if (/^(https?:)?\/\//.test(home.data.image) || home.data.image.startsWith('/')) {
    fail('site/index.md', `front matter image "${home.data.image}" must be relative to site/`);
  } else {
    await access(join(siteDir, home.data.image)).catch(() =>
      fail('site/index.md', `front matter image "${home.data.image}" resolves to nothing`));
  }
}

const template = await readFile(join(siteDir, 'template.html'), 'utf8');
for (const slot of ['{{title}}', '{{meta}}', '{{subtitle}}', '{{content}}']) {
  if (!template.includes(slot)) fail('site/template.html', `the ${slot} slot is gone`);
}

// An article that ships its own template must still carry the slots the renderer fills.
for (const article of articles) {
  const own = await readFile(join(articlesDir, article.slug, 'template.html'), 'utf8').catch(() => null);
  if (!own) continue;
  for (const slot of ['{{title}}', '{{meta}}', '{{content}}']) {
    if (!own.includes(slot)) fail(`articles/${article.slug}/template.html`, `the ${slot} slot is gone`);
  }
  if (article.body.includes('class="eyebrow"') && !own.includes('{{nav}}')) {
    notes.push(`articles/${article.slug}/template.html: content has eyebrow sections but the template has no {{nav}} slot — the rail nav will be empty`);
  }
}

const structureProblems = sinceLastSection();
if (structureProblems.length) structureProblems.forEach((p) => bad(p));
else ok('front matter, image placement, and template slots all as the renderer expects');
notes.forEach((n) => info(n));
markReported();

// ---------------------------------------------------------------- 3. links

heading('links');
const pages = (await walk(dist)).filter((file) => file.endsWith('.html'));
const external = new Set();
let localCount = 0;

for (const page of pages) {
  const html = await readFile(page, 'utf8');
  const label = relative(root, page);
  // A template token in built output means a slot went unfilled — or substitution corrupted
  // the page (String.replace $-patterns can re-emit tokens).
  for (const [token] of html.matchAll(/\{\{[a-z]+\}\}/g)) {
    fail(label, `built page contains unreplaced template token ${token}`);
  }
  for (const [, url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:)?\/\//.test(url)) { external.add(url); continue; }
    if (url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('data:')) continue;
    localCount += 1;
    const clean = url.split(/[?#]/)[0];
    const target = clean.startsWith('/')
      ? join(dist, clean)
      : resolve(dirname(page), clean);
    const file = clean.endsWith('/') || !clean.split('/').pop().includes('.')
      ? join(target, 'index.html')
      : target;
    await access(file).catch(() => fail(label, `link "${url}" resolves to nothing (${relative(root, file)})`));
  }
}
const brokenLinks = sinceLastSection();
if (brokenLinks.length) brokenLinks.forEach((p) => bad(p));
else ok(`${localCount} local link(s)/image(s) all resolve`);
markReported();

if (external.size === 0) {
  info('no external links');
} else if (CHECK_EXTERNAL) {
  for (const url of external) {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' }).catch(() => null);
    if (response?.ok) ok(`${url} -> ${response.status}`);
    // Bot-blocking hosts (Medium, Cloudflare-fronted sites) 403 every non-browser fetch.
    // A permanent red would train ignoring this gate — warn, and leave the manual read
    // (the CLAUDE.md step) as the real check.
    else if (response?.status === 403) info(`${url} -> 403 (bot-blocked — open it in a browser yourself)`);
    else fail('external', `${url} -> ${response ? response.status : 'unreachable'}`);
  }
} else {
  info(`${external.size} external link(s) — open and read these yourself, or re-run with --external:`);
  [...external].forEach((url) => info(`    ${url}`));
}

// --------------------------------------------------------------- 4. layout

heading(`layout vs ${BASE}`);

// The shape of a page, independent of wording: headings in order, and how many of each
// block-level element. This is what a "just a typo fix" PR must not change.
function outline(html) {
  const lines = [];
  for (const [, level, text] of html.matchAll(/<h([12])[^>]*>([\s\S]*?)<\/h\1>/g)) {
    lines.push(`h${level}  ${text.replace(/<[^>]+>/g, '').trim()}`);
  }
  for (const tag of ['figure', 'blockquote', 'ul', 'ol', 'pre', 'table']) {
    const count = (html.match(new RegExp(`<${tag}[\\s>]`, 'g')) ?? []).length;
    if (count) lines.push(`${count}x <${tag}>`);
  }
  return lines;
}

async function fileAtBase(path) {
  return run('git', ['show', `${BASE}:${path}`], { cwd: root, maxBuffer: 10 << 20 })
    .then((result) => result.stdout)
    .catch(() => null);
}

const hasBase = await run('git', ['rev-parse', '--verify', `${BASE}^{commit}`], { cwd: root })
  .then(() => true)
  .catch(() => false);

if (!hasBase) {
  info(`no \`${BASE}\` ref to compare against — skipping`);
} else {
  const targets = [
    ...articles.map((a) => ({ label: `articles/${a.slug}`, path: `articles/${a.slug}/content.md`, body: a.body })),
    { label: 'home', path: 'site/index.md', body: home.body },
  ];
  let changed = 0;
  for (const target of targets) {
    const before = await fileAtBase(target.path);
    if (before === null) { info(`${target.label}: new since ${BASE}`); changed += 1; continue; }
    const wasOutline = outline(renderMarkdown(parseFrontMatter(before).body));
    const nowOutline = outline(renderMarkdown(target.body));
    const removed = wasOutline.filter((line) => !nowOutline.includes(line));
    const added = nowOutline.filter((line) => !wasOutline.includes(line));
    if (!removed.length && !added.length) { ok(`${target.label}: layout unchanged`); continue; }
    changed += 1;
    bad(`${target.label}: layout changed — surface this in the PR description`);
    removed.forEach((line) => console.log(`      \x1b[31m- ${line}\x1b[0m`));
    added.forEach((line) => console.log(`      \x1b[32m+ ${line}\x1b[0m`));
  }
  if (changed) {
    console.log(`\n  \x1b[33m${changed} page(s) changed shape.\x1b[0m Not a failure — but say so explicitly,`);
    console.log('  in chat and in the PR description, before opening the PR.');
  }
}

// ---------------------------------------------------------------- verdict

console.log('');
if (problems.length) {
  console.log(`\x1b[31m✗ check failed — ${problems.length} problem(s)\x1b[0m`);
  problems.forEach((p) => console.log(`  ${p}`));
  process.exit(1);
}
console.log('\x1b[32m✓ check passed\x1b[0m');
console.log('  Still yours to do: read the diff for anything sensitive, and open the external links.');
