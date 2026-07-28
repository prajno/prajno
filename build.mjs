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

export function renderPage({ template, data, contentHtml, url, image }) {
  return template
    .replace(/\{\{title\}\}/g, escape(data.title ?? 'Untitled'))
    .replace('{{meta}}', metaTags({ data, url, image }))
    .replace('{{subtitle}}', data.subtitle ? `<p class="subtitle">${escape(data.subtitle)}</p>` : '')
    .replace('{{content}}', contentHtml);
}

export function renderMarkdown(body) {
  return figures(marked.parse(body, { async: false }));
}

// Every article, newest first. `draft: true` keeps one out of the build entirely.
export async function readArticles() {
  const entries = await readdir(articlesDir, { withFileTypes: true });
  const articles = [];
  for (const entry of entries.filter((e) => e.isDirectory())) {
    const source = await readFile(join(articlesDir, entry.name, 'content.md'), 'utf8');
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

function articleList(articles) {
  const items = articles.map(({ slug, data }) => {
    const date = data.date
      ? `\n    <time datetime="${escape(data.date)}">${formatDate(data.date)}</time>`
      : '';
    const summary = data.subtitle ? `\n    <p class="summary">${escape(data.subtitle)}</p>` : '';
    return `  <li>\n    <a href="articles/${slug}/">${escape(data.title)}</a>${summary}${date}\n  </li>`;
  });
  return `<ul class="articles">\n${items.join('\n')}\n</ul>`;
}

// First image referenced by an article, as an absolute URL — the og:image for that page.
function firstImage(article) {
  const match = article.body.match(/!\[[^\]]*\]\(([^)\s"]+)/);
  return match ? `${SITE_URL}/articles/${article.slug}/${match[1]}` : undefined;
}

export async function build() {
  const template = await readFile(join(siteDir, 'template.html'), 'utf8');
  const articles = await readArticles();

  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  for (const article of articles) {
    const out = join(dist, 'articles', article.slug);
    await mkdir(out, { recursive: true });
    await writeFile(
      join(out, 'index.html'),
      renderPage({
        template,
        data: article.data,
        contentHtml: renderMarkdown(article.body),
        url: `${SITE_URL}/articles/${article.slug}/`,
        image: firstImage(article),
      }),
    );
    await cp(join(article.dir, 'images'), join(out, 'images'), { recursive: true }).catch(() => {});
  }

  const home = parseFrontMatter(await readFile(join(siteDir, 'index.md'), 'utf8'));
  // marked wraps the bare placeholder in a <p>; swap the whole paragraph out so the
  // generated <ul> isn't nested inside one.
  const homeHtml = renderMarkdown(home.body).replace(
    /<p>\{\{articles\}\}<\/p>|\{\{articles\}\}/,
    articleList(articles),
  );
  await writeFile(
    join(dist, 'index.html'),
    renderPage({ template, data: home.data, contentHtml: homeHtml, url: `${SITE_URL}/` }),
  );

  // Backstop for the custom domain configured in Settings -> Pages.
  await writeFile(join(dist, 'CNAME'), `${DOMAIN}\n`);

  return articles;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const articles = await build();
  console.log(`built dist/ — home + ${articles.length} article(s): ${articles.map((a) => a.slug).join(', ')}`);
}
