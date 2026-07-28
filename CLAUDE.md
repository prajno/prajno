# prajno.com — Claude Code project guide

This repo is the source of **prajno.com**: markdown in, static site out, deployed to GitHub
Pages by an Action. Merging to `main` publishes.

It is also the **GitHub profile repo** — `README.md` renders on the GitHub profile page and
is *not* part of the site. Don't rewrite it to describe the build.

**The repo is public**, and so is everything the build emits. Assume anything committed here
is permanently readable by anyone.

## How we work

- **No merges to `main` without a PR.** Branch, open a PR, merge the PR. Never commit or
  push directly to `main` — `main` is the live site, and a push to it deploys.
- **View the site locally before merging.** Run `npm start` and actually look at every page
  the PR touches. A rendered-output change is not reviewable from a markdown diff, and
  GitHub Pages has no per-PR preview, so local is the only preview there is.
- **If a task is underspecified or needs a decision, stop and ask** rather than guessing.

## Before opening a PR — all four, every time

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
---
```

**An image must sit alone on its own line.** That is what turns it into a captioned
`<figure>`; the caption is the markdown title slot. An image inline in a sentence silently
renders as a bare `<img>` with no caption — `npm run check` fails on this.

```markdown
![alt text, which is required](images/host-lobby.png "The caption under the image.")
```

**Keep image paths relative.** The site serves from `prajno.github.io/prajno/` until DNS for
the custom domain lands, and from the root of `prajno.com` after. Relative paths are correct
in both; an absolute `/images/…` breaks the first.

The home page is `site/index.md`. Its `{{articles}}` placeholder generates the article list
from front matter, so **publishing a new article never means editing the home page**.

## Architecture

- `site/template.html` — the one shared page shell and stylesheet. Every page uses it; there
  is no per-article template. Presentation changes go here.
- `build.mjs` — markdown → `dist/`. Front matter, the standalone-image → `<figure>`
  transform, the article listing, meta/Open Graph tags, and `dist/CNAME`.
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
