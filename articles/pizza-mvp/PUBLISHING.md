# Publishing this article to Medium

This article also lives on the site at `prajno.com/articles/pizza-mvp/`. These are the extra
steps for cross-posting it to Medium, which is a manual paste — Medium's API closed to new
integrations in Jan 2025.

Two sources live in this folder, and only one of them is for Medium:

- `content.md` — the rich site version (own `template.html`, animated demo, pre-rendered
  diagrams). This is what the build publishes at `prajno.com/articles/pizza-mvp/`; its
  interactive parts don't survive Medium, so don't paste from it.
- `medium.md` — the Medium-shaped draft: linear prose, code as image screenshots
  (`images/`). The build ignores it; it exists only for this flow.

Also here in `images/`: the seven Medium figure PNGs plus the four pre-rendered SVG
diagrams the site version uses, and the raw smoke output the terminal shot was made from
(`smoke-output.txt`). Nothing in this folder links to the private Pizza repo.

## Steps

1. Render `medium.md` in any markdown preview (VS Code's is fine).
2. Select all the rendered article text and paste into a new Medium story
   (medium.com → Write). Headings, bold, italics, the pull quote, and the bullet
   list survive the paste. The images will NOT carry over — delete any stray
   caption lines the paste leaves behind. Enter the subtitle via the story's
   subtitle field.
3. At each figure position, click Medium's `+` → image, and upload the matching
   file from `images/`, then retype the caption:

   | Position (after…) | File | Caption |
   |---|---|---|
   | 2nd paragraph ("…before any code existed.") | `host-round-mockup.png` | A design mockup from the repo — the shipped screen uses the same CSS. |
   | "…no app, no accounts, no install" paragraph | `host-lobby.png` | The live lobby: scan, type a name, you're in. |
   | "Specs an agent can be handed" section | `issue-spec.png` | The issue template, abridged from the round-engine issue. |
   | "Make cheating a compile error", after 1st paragraph | `code-questionwire.png` | The wire type structurally cannot carry the answer. |
   | after the `@ts-expect-error` paragraph | `code-compile-test.png` | A unit test that runs in the type system. |
   | end of that section | `host-reveal-mockup.png` | The reveal — the one message in the whole protocol that's allowed to carry the answer. |
   | "A bot instead of a browser test suite", after `npm run smoke` paragraph | `smoke-terminal.png` | A real smoke run (output lightly trimmed). Bex remains the strongest random guesser I know. |

4. Medium uses the first image as the story preview — `host-round-mockup.png`
   makes a good cover.
5. Suggested tags: `AI Agents`, `Claude`, `Software Development`, `TypeScript`,
   `Side Project`.
   If you want a headline that leads with the thesis instead of the genre, an
   alternative: "Shipping an MVP with Claude Code: the boring documents did it".
6. Publish from your account as usual, and set the canonical link to
   `https://prajno.com/articles/pizza-mvp/` in the story settings, so the version on
   your own site is the one search engines credit.

## Notes

- The code images are verbatim from the repo (`src/games/trivia/question.ts` and
  `question.test.ts`); the terminal image is a styled rendering of the real
  `npm run smoke` output in `smoke-output.txt` (gateway noise elided, seat UUIDs
  shortened).
- The two "mockup" screenshots are from `docs/mockups/host-screen.html`, the
  design gallery checked into the repo before the screens were implemented. The
  lobby screenshot is the real app running locally.
- The Pizza repo itself stays private; nothing in this folder links to it.
