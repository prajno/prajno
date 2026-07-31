// Builds the whole site into dist/ — exactly what GitHub Pages serves.
//
//   site/index.md               -> dist/index.html
//   site/template.html             shared shell for every page
//   articles/<slug>/content.md  -> dist/articles/<slug>/index.html
//   articles/<slug>/images/     -> dist/articles/<slug>/images/
//
// In an article, a standalone image paragraph becomes a captioned <figure>; the caption
// is the markdown title:  ![alt text](images/foo.png "The caption.")
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

export const root = dirname(fileURLToPath(import.meta.url));
export const dist = join(root, 'dist');
export const articlesDir = join(root, 'articles');
export const siteDir = join(root, 'site');

export const SITE_URL = 'https://prajno.com';
export const DOMAIN = 'prajno.com';

// `offset` is how many lines the front matter took, so callers can report file line numbers.
export function parseFrontMatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return { data: {}, body: text, offset: 0 };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].trim().replace(/^(['"])([\s\S]*)\1$/, '$2');
  }
  return { data, body: text.slice(match[0].length), offset: match[0].split(/\r?\n/).length - 1 };
}

// A paragraph holding nothing but an image becomes a figure; its title becomes the caption.
function figures(html) {
  return html.replace(/<p>(<img\s[^>]*>)<\/p>/g, (_, img) => {
    const caption = img.match(/\stitle="([^"]*)"/);
    const cleaned = img.replace(/\stitle="[^"]*"/, '');
    return `<figure>\n  ${cleaned}${caption ? `\n  <figcaption>${caption[1]}</figcaption>` : ''}\n</figure>`;
  });
}

const escape = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Front matter -> description + Open Graph / Twitter tags, so shared links render properly.
function metaTags({ data, url, image }) {
  const description = data.description ?? data.subtitle;
  const tags = [];
  if (description) tags.push(`<meta name="description" content="${escape(description)}">`);
  tags.push(`<meta property="og:type" content="${data.date ? 'article' : 'website'}">`);
  tags.push(`<meta property="og:title" content="${escape(data.title)}">`);
  if (description) tags.push(`<meta property="og:description" content="${escape(description)}">`);
  if (url) tags.push(`<meta property="og:url" content="${escape(url)}">`);
  if (image) {
    tags.push(`<meta property="og:image" content="${escape(image)}">`);
    tags.push('<meta name="twitter:card" content="summary_large_image">');
  } else {
    tags.push('<meta name="twitter:card" content="summary">');
  }
  return tags.join('\n');
}

// The header wordmark. A title ending in a short lowercase suffix after a dot (PRAJNO.com)
// splits into name + accent dot + case-preserved suffix; anything else keeps the plain
// brand-dot treatment. Case comes straight from front matter.
function brandMark(title) {
  const m = String(title).match(/^(.*)\.([a-z0-9]{1,4})$/);
  if (m) return `${escape(m[1])}<span class="dot">.</span><span class="tld">${escape(m[2])}</span>`;
  return `${escape(title)}<span class="dot">.</span>`;
}

export function renderPage({ template, data, contentHtml, url, image, nav, rootPath = '' }) {
  // Function replacers throughout: a plain replacement STRING interprets $&, $`, $' — so
  // e.g. a $` inside a code fence would splice the whole template head into the article.
  return template
    .replace(/\{\{title\}\}/g, () => escape(data.title ?? 'Untitled'))
    .replace('{{brand}}', () => brandMark(data.title ?? 'Untitled'))
    .replace('{{meta}}', () => metaTags({ data, url, image }))
    .replace('{{subtitle}}', () =>
      data.subtitle ? `<p class="subtitle">${escape(data.subtitle)}</p>` : '')
    .replace('{{nav}}', () => nav ?? '')
    // {{root}} makes shared-template asset URLs (fonts) depth-correct: '' on the home
    // page, '../../' on article pages — relative either way, per the Pages-staging rule.
    .replace(/\{\{root\}\}/g, () => rootPath)
    .replace('{{content}}', () => contentHtml);
}

export function renderMarkdown(body) {
  return figures(marked.parse(body, { async: false }));
}

// Every h2 gets an id. A `<p class="eyebrow">Label</p>` island immediately before an
// `## Heading` marks a rail-nav section: the eyebrow is the short label, the heading the
// target. Articles without eyebrows simply produce an empty nav.
export function navigation(html) {
  const nav = [];
  const used = new Set();
  const slugify = (heading) =>
    heading
      .replace(/<[^>]+>/g, '')
      .replace(/&#?[a-z0-9]+;/gi, ' ') // named AND numeric entities (&#39; etc.)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  const withIds = html.replace(
    // The eyebrow's text must not cross tags ([^<]+), or a hero eyebrow far above the
    // first h2 would swallow everything in between as its "label".
    /(<p class="eyebrow">([^<]+)<\/p>\s*)?<h2>([\s\S]*?)<\/h2>/g,
    (match, _eyebrow, label, heading) => {
      let id = slugify(heading) || 'section';
      for (let n = 2; used.has(id); n += 1) id = `${slugify(heading) || 'section'}-${n}`;
      used.add(id);
      if (label) nav.push({ id, label: label.trim() });
      return match.replace('<h2>', () => `<h2 id="${id}">`);
    },
  );
  const links = nav.map(({ id, label }) => `<a href="#${id}">${label}</a>`).join('\n  ');
  return { html: withIds, navHtml: links };
}

// Every article, newest first. `draft: true` keeps one out of the build entirely.
export async function readArticles() {
  const entries = await readdir(articlesDir, { withFileTypes: true });
  const articles = [];
  for (const entry of entries.filter((e) => e.isDirectory())) {
    // A directory with no content.md isn't an article — a scratch folder shouldn't be able
    // to break the whole build.
    const source = await readFile(join(articlesDir, entry.name, 'content.md'), 'utf8').catch(() => null);
    if (source === null) continue;
    const { data, body, offset } = parseFrontMatter(source);
    if (String(data.draft) === 'true') continue;
    articles.push({ slug: entry.name, dir: join(articlesDir, entry.name), data, body, offset });
  }
  return articles.sort((a, b) => String(b.data.date ?? '').localeCompare(String(a.data.date ?? '')));
}

const formatDate = (date) =>
  date
    ? new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
      })
    : '';

const CHEVRON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg>`;

function articleMeta(data) {
  return [
    data.subtitle ? escape(data.subtitle) : '',
    data.source ? escape(data.source) : '',
    data.date ? `<time datetime="${escape(data.date)}">${formatDate(data.date)}</time>` : '',
    data.readtime ? escape(data.readtime) : '',
  ].filter(Boolean).join(' · ');
}

// Each local article renders as an accordion: a bar (chevron + toggle + open-in-new-window
// link) over an iframe of the article page. Collapsed shows a tinted fixed-height peek;
// the home page's script handles expand/collapse and forwards a collapsed click into the
// iframe. An article with `external:` in front matter renders as a card that links out —
// intro paragraphs + image, no expand/collapse.
function articleList(articles) {
  const items = articles.map((article) => {
    const { slug, data } = article;
    if (data.external) {
      const img = data.image
        ? `\n        <div class="ext-img"><img src="articles/${encodeURIComponent(slug)}/${escape(data.image)}" alt=""></div>`
        : '';
      return `  <article class="acc ext" data-slug="${escape(slug)}">
    <div class="acc-inner">
      <a class="acc-link" href="${escape(data.external)}" target="_blank" rel="noopener">
        <div class="acc-bar">
          <span class="acc-toggle" role="presentation">
            <span class="acc-title">${escape(data.title)}</span>
            <span class="acc-meta">${articleMeta(data)}</span>
          </span>
          <span class="acc-open"><span class="tip">open in new window</span>↗</span>
        </div>
        <div class="acc-panel">
          <div class="ext-body">
            <div>
${renderMarkdown(article.body)}
              <p class="ext-more">Read on ${escape(data.source ?? 'the original site')} ↗</p>
            </div>${img}
          </div>
          <div class="acc-shield" aria-hidden="true"></div>
        </div>
      </a>
    </div>
  </article>`;
    }
    const href = `articles/${encodeURIComponent(slug)}/`;
    return `  <article class="acc" data-slug="${escape(slug)}">
    <div class="acc-inner">
      <div class="acc-bar">
        <button class="chev" type="button" aria-expanded="false" aria-label="Expand ${escape(data.title)}">${CHEVRON}</button>
        <button class="acc-toggle" type="button" aria-expanded="false">
          <span class="acc-title">${escape(data.title)}</span>
          <span class="acc-meta">${articleMeta(data)}</span>
        </button>
        <a class="acc-open" href="${href}" target="_blank" rel="noopener" aria-label="Open ${escape(data.title)} in a new window"><span class="tip">open in new window</span>↗</a>
      </div>
      <div class="acc-panel">
        <div class="acc-tilt"><iframe src="${href}" title="${escape(data.title)}" loading="lazy" tabindex="-1"></iframe></div>
        <div class="acc-shield" aria-hidden="true"></div>
      </div>
    </div>
  </article>`;
  });
  const label = `  <div class="list-label">Writing · ${String(articles.length).padStart(2, '0')}</div>`;
  return `<div class="articles">\n  <div class="inner">\n${label}\n${items.join('\n')}\n  </div>\n</div>`;
}

// The og:image for an article: an explicit `image:` in front matter wins, else the first
// image referenced in the body. Either way, made absolute.
function articleImage(article) {
  const path = article.data.image ?? article.body.match(/!\[[^\]]*\]\(([^)\s"]+)/)?.[1];
  if (!path) return undefined;
  if (/^(https?:)?\/\//.test(path)) return path; // already absolute
  return `${SITE_URL}/articles/${article.slug}/${path.replace(/^\//, '')}`;
}

export async function build() {
  const template = await readFile(join(siteDir, 'template.html'), 'utf8');
  const articles = await readArticles();

  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  for (const article of articles) {
    const out = join(dist, 'articles', article.slug);
    await mkdir(out, { recursive: true });
    await cp(join(article.dir, 'images'), join(out, 'images'), { recursive: true }).catch(() => {});
    // An external article (e.g. a Medium post) is card-only: its images ship for the home
    // page card, but no local page is generated — the card links out.
    if (article.data.external) continue;
    // An article may ship its own template.html — its presentation then lives entirely in
    // that file and touches no other page (the pizza-mvp case study does this).
    const ownTemplate = await readFile(join(article.dir, 'template.html'), 'utf8').catch(() => null);
    const { html: contentHtml, navHtml } = navigation(renderMarkdown(article.body));
    await writeFile(
      join(out, 'index.html'),
      renderPage({
        template: ownTemplate ?? template,
        data: article.data,
        contentHtml,
        url: `${SITE_URL}/articles/${article.slug}/`,
        image: articleImage(article),
        nav: navHtml,
        rootPath: '../../',
      }),
    );
  }

  const home = parseFrontMatter(await readFile(join(siteDir, 'index.md'), 'utf8'));
  // marked wraps the bare placeholder in a <p>; swap the whole paragraph out so the
  // generated <ul> isn't nested inside one.
  const homeHtml = renderMarkdown(home.body).replace(
    /<p>\{\{articles\}\}<\/p>|\{\{articles\}\}/,
    () => articleList(articles), // function replacer — see renderPage
  );
  // Front-matter image (site-root relative) -> the home page's og:image share card.
  const homeImage = home.data.image ? `${SITE_URL}/${home.data.image.replace(/^\//, '')}` : undefined;
  await writeFile(
    join(dist, 'index.html'),
    renderPage({ template, data: home.data, contentHtml: homeHtml, url: `${SITE_URL}/`, image: homeImage }),
  );
  // Static site assets referenced by the home page (the og card).
  if (home.data.image) {
    await cp(join(siteDir, home.data.image), join(dist, home.data.image)).catch(() => {});
  }

  // Self-hosted fonts for the shared shell.
  await cp(join(siteDir, 'fonts'), join(dist, 'fonts'), { recursive: true }).catch(() => {});

  // Favicon set — referenced {{root}}-relative from both page shells.
  for (const icon of ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png']) {
    await cp(join(siteDir, icon), join(dist, icon)).catch(() => {});
  }

  // Backstop for the custom domain configured in Settings -> Pages.
  await writeFile(join(dist, 'CNAME'), `${DOMAIN}\n`);

  return articles;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const articles = await build();
  console.log(`built dist/ — home + ${articles.length} article(s): ${articles.map((a) => a.slug).join(', ')}`);
}
