# Publishing this article to Medium

This article also lives on the site at `prajno.com/articles/pizza-mvp/`. These are the extra
steps for cross-posting it to Medium, which is a manual paste — Medium's API closed to new
integrations in Jan 2025.

Everything the article needs is in this folder: the source (`content.md`), the seven images
(`images/`), and the raw smoke output the terminal shot was made from (`smoke-output.txt`).
Nothing here links to the private Pizza repo.

Authoring conventions — front matter, the standalone-image figure rule, `npm start` — are in
the repo-root `CLAUDE.md`. The built page is `dist/articles/pizza-mvp/index.html`; it is
generated, gitignored, and never edited by hand.

## Steps

1. Run `npm start` from the repo root and open
   <http://localhost:8765/articles/pizza-mvp/>.
2. Select all the article text (⌘A, ⌘C) and paste into a new Medium story
   (medium.com → Write). Headings, bold, italics, the pull quote, and the bullet
   list survive the paste. The images will NOT carry over — delete any stray
   caption lines the paste leaves behind. The subtitle line pastes as a plain
   paragraph: select it and apply Medium's small-T subtitle style (or delete it
   and re-enter it via the story's subtitle field).
3. At each figure position, click Medium's `+` → image, and upload the matching
   file from `images/`, then retype the caption:

   | Position (after…) | File | Caption |
   |---|---|---|
   | 3rd paragraph ("…before any code existed.") | `host-round-mockup.png` | A design mockup from the repo — the shipped screen uses the same CSS. |
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
