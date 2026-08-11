# prajno.com — Claude Code project guide

This repo is the source of **prajno.com**: markdown in, static site out, deployed to GitHub
Pages by an Action. Merging to `main` publishes.

It is also the **GitHub profile repo** — `README.md` renders on the GitHub profile page and
is *not* part of the site. Don't rewrite it to describe the build.

**The repo is public**, and so is everything the build emits. Assume anything committed here
is permanently readable by anyone.

## How we work

- **Every PR has a tracking issue.** Before branching, open (or find) a GitHub issue that
  captures the work: Context, Goal, Acceptance criteria, Out of scope. Link it from the PR
  with `Closes #N`. The issue holds the requirements; the PR holds the change.
- **No merges to `main` without a PR.** Branch, open a PR, merge the PR. Never commit or
  push directly to `main` — `main` is the live site, and a push to it deploys.
- **View the site locally before merging.** Run `npm start` and actually look at every page
  the PR touches. A rendered-output change is not reviewable from a markdown diff, and
  GitHub Pages has no per-PR preview, so local is the only preview there is.
- **If a task is underspecified or needs a decision, stop and ask** rather than guessing.

## Before opening a PR — all five, every time

1. **`npm run check` is green.** It builds the site, verifies the markdown is shaped the way
   the renderer expects, resolves every local link and image, and diffs each page's layout
   against `main`. Run it before you open the PR, not after review comments.

2. **Check for sensitive information.** This is judgment, not a regex — read the diff:
   - Nothing from a private repo that isn't already public: source, paths, issue text,
     internal docs.
   - No keys, tokens, credentials, internal hostnames, VPS IPs, or Tailscale names.
   - No personal data in front matter or prose (addresses, phone numbers, private email).
   - **Screenshots count.** Look at what's actually in frame — a terminal title bar, a
     browser tab strip, a notification, a file path, an email address. Check images for
     EXIF/GPS before adding them.

3. **Verify links.** `npm run check` resolves every internal link and image, and lists the
   external ones. Open each external link and confirm it still resolves to what the text
   claims it does — a 200 response is not the same as the page still saying that thing.
   `npm run check -- --external` fetches them if you want the status codes too.

4. **Surface layout changes.** If an edit changes the rendered structure of a page — a
   heading added, removed, or renamed; a figure added, moved, or dropped; a list, blockquote,
   or code block appearing or disappearing — say so **explicitly in chat and in the PR
   description** before opening the PR. `npm run check` prints the structural diff for you.
   A layout change must never ride along unmentioned inside a "fix a typo" PR.

5. **Check the responsive viewports.** With `npm start` running, use devtools device
   emulation to view every page the PR touches at ~375px (phone), 640px, 768px (tablet),
   and 1024px+ (desktop). Watch text wrapping, image scaling, and clipped horizontal
   overflow — `body` has `overflow-x: hidden`, so overflow hides instead of scrolling;
   probe with `overflow-x: visible` if in doubt. The shared shell's breakpoint convention
   (Tailwind-style sm 640 / md 768, desktop-first `max-width` queries) lives in
   `site/template.html` — use those widths, not ad-hoc ones.

## Writing an article

One directory per article: `articles/<slug>/`, holding `content.md` and `images/`. The slug
is the URL — `articles/pizza-mvp/` serves at `prajno.com/articles/pizza-mvp/`.

Front matter is required; `title`, `subtitle`, and `date` all feed the home-page listing:

```markdown
---
title: The headline
subtitle: "The standfirst. Quote it if it contains a colon."
date: 2026-07-27
description: Optional. Falls back to the subtitle for meta/og tags.
draft: true    # optional — keeps the article out of the build entirely
archive: true  # optional — lists the article under the home page's Archive section
---
```

**An image must sit alone on its own line.** That is what turns it into a captioned
`<figure>`; the caption is the markdown title slot. An image inline in a sentence silently
renders as a bare `<img>` with no caption — `npm run check` fails on this.

```markdown
![alt text, which is required](images/host-lobby.png "The caption under the image.")
```

**Keep image paths relative.** An article's images live in its own directory
(`articles/<slug>/images/`), so only a relative `images/…` path resolves — on the article
page and inside the home-page accordion iframe alike; an absolute `/images/…` points at a
directory that doesn't exist. (The site serves from the root of `prajno.com`; the old
`prajno.github.io/prajno/` address redirects there.)

The home page is `site/index.md`. Its `{{articles}}` placeholder generates the article
accordions from front matter, so **publishing a new article never means editing the home
page**. The listing is split into two labeled sections: the ongoing series (every article
by default), then — after a gap — an **Archive** for articles flagged `archive: true`.
Both section labels live in `site/index.md` front matter (`articlesLabel:` /
`archiveLabel:`), falling back to "Writing" / "Archive" when unset.

Only `content.md` is built. Other markdown alongside it (e.g. `articles/pizza-mvp/medium.md`,
the Medium-shaped draft of the case study) is source material the build ignores. Rich
articles may pre-render diagrams to SVG under `images/` — commit the SVG, keep the Mermaid
source in the originating repo.

**External articles** (e.g. a Medium post): add `external: <url>` to front matter, plus
optional `source:` and `readtime:`. The body is the home-page card copy (an intro, a couple
of paragraphs); `image:` is the card image. No local page is generated — the card links out
in a new tab. `articles/angular-style-debt/` is one.

The site's design system ("Drafting Room": deep olive, chartreuse accent, Big Shoulders
Display / Archivo / IBM Plex Mono) lives in `site/template.html`; the fonts are self-hosted
in `site/fonts/` (OFL, latin subsets) and copied to `dist/fonts/` by the build. Shared-shell
pages reference them via the `{{root}}` token so paths stay relative at any depth.

## Architecture

- `site/template.html` — the shared page shell and stylesheet: the home page and any
  article that doesn't bring its own. It also carries the home page's accordion: each
  listed article renders as a full-width panel with an iframe peek of the article page —
  a click expands it (collapsing the others) under the sticky site header, and the same
  click is forwarded into the iframe. Presentation changes for shared pages go here.
  Responsive rules follow the viewport convention documented in the stylesheet:
  desktop-base with `max-width` queries at Tailwind-aligned widths — 767px (below md,
  structural) and 639px (below sm, compact phone spacing) — with display type fluid via
  `clamp()`. Nothing changes above 768px; per-article templates may keep their own
  scoped breakpoints (pizza-mvp uses 1080px).
- `site/js/intro.js` — the home page's terminal cold-open, loaded by the shared shell and
  copied to `dist/js/` by the build. The head script decides *whether* it runs (`.home` —
  top-level home page, motion allowed; `.intro` — not visited in the last hour) and the
  module plays it: a list of beats, each of which knows how to run forwards and backwards,
  so the replay control in the header can rewind the page and play it again. Everything
  that moves in CSS is a transition between the root classes `.intro` / `.boot` / `.pin` /
  `.rewind`, documented in the stylesheet — keyframe animations can't be reversed this way,
  so don't reintroduce them there. It talks to the accordion script through two events,
  `prajno:replay` and `prajno:settled`.
- **Per-article template override** — if `articles/<slug>/template.html` exists, that
  article is rendered with it instead of the shared shell, and its presentation (CSS/JS)
  lives entirely in that file, scoped to that page alone. The build fills `{{title}}`,
  `{{meta}}`, `{{content}}`, and `{{nav}}` — the nav is generated from `content.md`: a
  `<p class="eyebrow">Label</p>` line immediately before an `## Heading` becomes a rail
  link (eyebrow = label, heading = target). `articles/pizza-mvp/` is the one such article.
- `build.mjs` — markdown → `dist/`. Front matter, the standalone-image → `<figure>`
  transform, heading ids + nav extraction, the article accordion listing, meta/Open Graph
  tags (front-matter `image:` overrides the og:image), and `dist/CNAME`.
- `serve.mjs` — dev server on :8765. Builds `dist/`, serves it, rebuilds and reloads the
  browser on save. Live-reload is injected per request, so it never reaches a deploy.
- `check.mjs` — the pre-PR gate above.
- `.github/workflows/deploy-pages.yml` — build and deploy to Pages.

**`dist/` is generated and gitignored.** No compiled HTML is ever committed; the Action
builds from source on every deploy. If you find yourself hand-editing HTML, you're editing
the wrong file.

## Deploying

- **Publish** — merge to `main`. The workflow builds and deploys automatically.
- **Roll the whole site back** — Actions → *Deploy prajno.com* → Run workflow → pick an
  older tag. It builds and deploys that ref. Only tags cut *after* the workflow landed can
  be rollback targets, since `workflow_dispatch` needs the workflow file to exist in the ref.
- Tag releases you might want to roll back to.

## Commands

- `npm start` — build + serve at <http://localhost:8765>, rebuilding on save
- `npm run build` — build `dist/` once (what CI runs)
- `npm run check` — the pre-PR gate; `-- --external` also fetches external links
