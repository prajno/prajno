---
title: "Tripwires, refusals, and receipts: the quality sprint opening v0.2"
subtitle: "Four days after the deploy retro, before the platform grows: every past escape got a tripwire, every PR got an adversarial reviewer — and the most instructive pull request of the week was closed unmerged, on purpose."
date: 2026-08-06
description: The third Pizza dispatch — automated reviews on every PR, mutation-checked smoke legs, reconnection debt paid in three snapshots, and a security probe deliberately refused. Quality muscle, built before the big changes.
---

<header class="hero" id="top">
  <p class="eyebrow">Field notes · The same private repo, the four days after the retro · August 2026</p>
  <h1>Tripwires, refusals, and <span class="brand">receipts</span></h1>
  <p class="lede">
    <a href="../pizza-deploy-retro/">The deploy retro</a> ended with a promise: the pipeline gets
    tested as seriously as the product. The four days that followed cashed it — <strong>22
    substantive PRs</strong> that put an adversarial reviewer on every pull request, aimed a
    tripwire at every bug class that ever escaped, and paid down the reconnection debt standing
    between v0.1 and a second game module. Two features shipped too. But the artifact that best
    explains the week is a pull request that passed every review it got — and was closed
    unmerged anyway.
  </p>
  <div class="statgrid">
    <div class="stat"><div class="n">22</div><div class="l">substantive PRs · 4 days</div></div>
    <div class="stat"><div class="n">287</div><div class="l">tests · was 205</div></div>
    <div class="stat"><div class="n">3</div><div class="l">engine resync snapshots</div></div>
    <div class="stat"><div class="n">7.5s</div><div class="l">browser smoke in CI</div></div>
    <div class="stat"><div class="n">27s</div><div class="l">closed probe → filed rule</div></div>
    <div class="stat"><div class="n">0</div><div class="l">new prod-access secrets</div></div>
  </div>
  <p class="hero-note">Set in Pizza's own design tokens, like the case study and the retro before it.</p>
</header>

<p class="eyebrow">The setup</p>

## Sharpen the axe before the second tree

The roadmap's next milestone is deliberately unexciting: v0.2 is "polish + second-module stub" — reconnection robustness, richer host and phone UX, and a thin second game module that proves the platform/game seam holds with two real consumers. Still zero AI; the milestone reorder (ADR-0013) moved platform breadth *ahead* of the model-facing work on purpose.

The tempting move after a retro is to sprint back to features and let the lessons cool. This stretch did the opposite, and it's worth saying plainly that it was a choice: before stacking a second module on the platform, spend the week making the ground it stands on boring. Twenty-five PRs merged (three of them dependabot), twenty-five issues opened, twenty-four closed — and four of the closures were among the oldest open items on the books: the architecture review's deferred findings (#39), mid-round reconnects (#49), the light theme's contrast failures (#50), and host-paced rounds (#54), all filed back in v0.1's build-out and all cleared in the same four days.

<p class="eyebrow">The reviewer</p>

## Every PR now argues with an adversary

The review system arrived the way good tools do: as the formalization of something that had just proven itself by hand. On one evening, ad-hoc adversarial passes over the three feature PRs in flight each produced a "review pass" commit — one caught a **HIGH wedge** (a paused game's leaderboard broadcast exactly once, so a host whose socket blipped could never advance it), another caught a contrast test asserting against the wrong backdrop ("passing test, failing screen"), a third wrapped the room GC's sweep in an error boundary. Three such commits landed inside six minutes. Less than an hour later, the practice became infrastructure: an automated Claude review wired to every PR to `main`, explicitly a complement and not a gate — *"verify stays the merge gate; this leaves review comments."*

The design decision worth stealing is where the review criteria live: in one document in the repo, read at run time by both the CI action and a local `npm run review` — "one review bar, two surfaces," so the two cannot drift apart. The bar is ordered (ADR invariants first, then real defects, then test honesty, then shell traps; style is the linters' job) and demands a concrete failure scenario and a `file:line` anchor per finding — and the local surface's instructions close with a line more review cultures should adopt: *"If the change is clean, say no findings plainly — don't manufacture nits to seem useful."* The local surface runs in plan mode — it can read everything and structurally cannot edit — so findings iterate before anything is pushed.

A review system is a check like any other, so it got the retro's treatment: watch it fail, then fix how it fails. Its first live local run — reviewing, of all things, the PR that codified the dependabot exemption — predicted the next red X before it ever happened: dependabot-triggered runs can't read the workflow's auth secret, so the reviewer would fail red on exactly the PRs it should wave through. Skip-by-actor fix, filed to merged in three minutes. Then the first big multi-file PR through the action exposed the quieter failure: at its initial 12-turn budget the reviewer ran out of thinking mid-review and exited empty-handed — *"the red X reflects a starved reviewer, not a finding."* The budget went to 50, and the sizing rationale is committed as a comment in the workflow itself: an honest pass of a 14-file PR needs ~20–25 turns, so 50 is twice the worst case, and the cap only catches what it exists for — a runaway loop. Eight minutes, issue to merge.

Once fed properly, the reviewer earned its keep in inline comments that became same-day commits: a resync ternary with "a silent fourth case that renders no `detail` element at all" (the fix shipped real copy — "Your answer was locked in before the reconnect" — plus a pinning test), a boot-reconciliation boundary that didn't cover directory-level failure and would have crash-looped every deploy restart, a smoke leg moved one port over ("a port apart costs nothing"), and two test mutants a reviewer refused to believe were covered — it was right, and killing them took a real integration test. It's also candid about its limits in a way worth copying: more than once it disclosed it couldn't execute the verify gate in its sandbox and had verified by static trace instead. A reviewer that says *how* it checked is auditable; one that just approves is a green checkmark with opinions. And the authors push back in the open, which is half the system working: pre-existing findings get filed as issues "rather than folded in here," and consciously accepted edges get written into the contracts doc rather than left in a PR body.

Working alongside agents earned its own hygiene fix, caught the same way. Parallel review sessions leave worktrees under `.claude/`, and one week of them dumped ~1,355 phantom lint errors and eleven spurious gitlinks into an unrelated PR. The fix — ignore the directory — then over-reached, and *its* review caught that too: blanket-ignoring `.claude/` would have silently hidden real repo content, the exact silent-failure class the review bar exists to flag. The ignore is now scoped to the worktrees alone.

<p class="eyebrow">The tripwires</p>

## Four escapes, four tripwires, three minutes

The retro's central table listed six checks that reported something other than what they claimed. This week built the inverse table: four verification PRs, merged within a three-minute window, each aimed at a specific way a real bug got past everything — or provably could have.

| The escape | Why nothing saw it | The tripwire now aimed at it |
| --- | --- | --- |
| a parser silently ate a field (#111) | tests raw-parse frames; the demo runs auto mode | a real browser plays a real round (#118) |
| prod-only config could only break on the box (#98) | the smoke booted a config production never runs | a prod-shape smoke leg |
| the rejoin-score check was vacuous (#95) | the assertion had reduced to `0 >= 0` | the target must score; `before > 0` required |
| a rollback silently swapped the questions (#97) | fallback to the default pool; no fault raised | a typed, loud refusal |

Each one is worth the sentence. The transport parser rebuilds messages from validated fields, and it silently stripped an optional one — so host-paced mode broke *only through the real client*, while the protocol-level bot, which raw-parses frames itself, "structurally cannot" see it; the one code path nobody was testing was the one every real user takes. `npm run smoke` deliberately booted in-memory with open hosting, so file-backed persistence and the secret gate on room creation could only fail in production; the new prod-shape leg boots the built artifact with a temp state dir and a throwaway secret, insists a wrong-token room creation fails for *exactly* the right reason, and reads the finished game back off disk while the server still runs — persistence engaged, not merely configured. The remote smoke's rejoin check had quietly become `0 >= 0` because a pinned pool and a seeded PRNG made the rejoin target's first guess deterministically wrong — "a rejoin that silently zeroed the seat's score would still PASS" — so the target now answers from the checkout's own pool files and must be holding points before it drops. And a room whose content-addressed question pool vanished in a rollback used to swap in the default pool mid-game — "the players see the game change subject; nothing sees a fault" — where it now refuses, loudly and typed. *"Refuse, don't delete."*

The through-line is the retro's hardest rule — *green you cannot see failing is not green* — graduated from principle to habit. Every one of these PRs documents deliberately breaking the thing it guards, and two of them paste the failing output verbatim. The Playwright PR reverts the parser fix:

```text
Error: expect(locator).toBeVisible() failed
Locator: getByRole('button', { name: 'Final results' })
```

— failing at exactly the symptom the original bug produced, then passing with the fix restored. The rejoin PR runs its two mutants and quotes the kill: *"Ada dropped with 0 points, so score preservation was NOT exercised."* The prod-shape leg goes further and turns drift itself into a test: a TypeScript test reads the persistence-check needle out of the shell script and asserts it against what the store actually writes, so the bash and the state format cannot wander apart silently.

The browser smoke's price tag is the best part: 7.5 seconds in CI — one spec, one Chromium, one real round through the built client — and it's deliberately kept out of the verify gate, so a browser download never slows the fast loop. (The spec and its config are still *typechecked* inside that gate, which costs nothing and catches the cheap mistakes without launching anything.)

<p class="eyebrow">The debt</p>

## Reconnection, paid down in snapshots

The oldest open bug in the repo was #49: a phone that blipped mid-round kept its seat and its score — the transport dutifully replayed the join — but landed on *"You're in! Waiting for the host to start…"* for the rest of a live round it could no longer answer. The data survived; the *screen* didn't.

The fix established the pattern the whole week then reused: the engine owns a snapshot of the live view, and a reattaching client gets it replayed — same round, same content through the same answer-stripping chokepoint as the original broadcast, and the **original absolute deadline**, because a rejoin never extends the clock. The adversarial review promptly proved the first cut wrong in both directions: a phantom tap whose frame died mid-reconnect produced a false "Answer locked in," and a reloaded player who *had* answered got a wrongly-open answer screen. So the snapshot grew a per-seat `acted` flag, and the client's answer lock now reconciles against server truth both ways — no fabricated "You picked," no false "Time's up." The core fix was roughly 31 lines of server code arriving with ~211 lines of tests and docs, which is about the right ratio for code whose whole job is honesty.

Then the same question was asked about process death. Production is file-backed and every deploy restarts the service — so what does a restart leave behind? Zombie rooms: files whose engine timers and host tokens died with the process, unable to ever finish, greeting their returning host with an `UNAUTHORIZED` nobody could ever get past. Boot reconciliation (#116) now deletes every non-finished room before the gateway accepts a single connection, inside a per-room error boundary so one corrupt file can't turn every deploy into a crash loop — and a host resuming a vanished room now gets `ROOM_NOT_FOUND`, the truth, instead of an accusation. The deploy docs state the contract outright: room files survive a restart, in-progress games do not, and "my game vanished after a deploy" is designed behavior, not data loss. A rejoin into a *finished* room, meanwhile, used to resurrect a dead lobby that the garbage collector then deleted out from under the player; it now gets the third snapshot sibling — final standings derived from persisted state alone, so a process that never ran the game can still serve its result.

Three snapshots — live round, host pause, game over — and at most one can be non-null, kept true structurally because each requires a distinct room status. The part I'd steal for any project, though, is smaller: PR #112 *accepted* two narrow reconnect edges as not worth their fix, and instead of leaving that verdict buried in a PR body, a sixteen-line docs PR moved both edges into the contracts file with their rationale — "repo rule says decisions live in the repo." Documented imperfection over invisible imperfection, every time.

<p class="eyebrow">The refusal</p>

## The best pull request never merged

The `/host` screen is guarded by Basic Auth at the proxy — the only access-control boundary on the box — and an issue noted, correctly, that it was verified by nothing. The obvious move: an automated probe. It was built, and built *well* — both polarities (no credentials → 401, credentials → 200), both matcher shapes, three textually distinct failure classes, six new tests driving the real script, 276 tests green. The automated review found no blocking findings. It met the bar.

Eighteen hours later it was closed unmerged, because its authenticated half needed the `/host` password stored in **plaintext as a repo secret** — the plaintext of a value the box deliberately keeps only as a bcrypt hash.

<blockquote class="pull">
  <p>"…would hand GitHub-side workflow code standing access to the prod box's host screen — an avoidable widening of the GitHub→prod trust surface, for an auth scheme that's being replaced anyway."</p>
  <cite>the closing comment on the probe PR — the boundary check is now two curl commands recorded right there, run by a human</cite>
</blockquote>

Twenty-seven seconds after the close, an issue existed to make the reasoning permanent — noting, honestly, that the concern had *passed two review layers without surfacing*. Twenty-seven minutes after that, the rule was in the project guide: **never add a credential to GitHub that CI doesn't strictly need.** Repo secrets are readable by any workflow code, so every secret is standing GitHub→prod access; the bar for one existing is "CI cannot function without it," and a check that would need a new credential becomes a credential-free variant or a documented manual step instead. Reviews are a net, not a guarantee — which is exactly why the catch gets written down where every future session inherits it.

The same trust-surface instinct ran through the rest of the week's hardening. The deploy workflows used to `ssh-keyscan` the box on every run — trust-on-every-use, with scan failures discarded into a later, confusing error. They now pin the host key from a repo *variable*, not a secret, because host public keys aren't secret and a variable stays auditable; unset fails loudly before the pin is ever written, a mismatch fails loudly by design, and the one-time capture is deliberately manual — "publishing a key into the deploy pipeline should be a human act." (The variable was set twenty seconds before the PR merged. The receipts write themselves.) Even that fix filed its own follow-up: the pinning block now exists byte-for-byte in two workflows, and the PR's review flagged the duplication — a security-sensitive block that exists twice drifts silently — so deduplicating it is tracked work, not a hope. And the config-drift lesson from the retro's 12-minute-trivia-marathon incident reached CI: the live server now reports its effective pacing mode, and the deploy asserts it against stated intent — *stated intent the check can't verify goes red; no stated intent is a loud skip.*

The week's credential ledger, for the record: one new secret — the review action's own auth token, which the review cannot run without, and which grants CI access to Claude, not to the box. New secrets with production access: zero.

<p class="eyebrow">The polish</p>

## Two features shipped anyway

This wasn't a features-frozen week, and the two that shipped are both quality work wearing a feature's clothes.

**Host-paced rounds.** The engine's between-rounds timer became a choice: in host mode the game pauses at the standings and moves only when the host says so — because a host running a room in person wants to hold on the reveal, read the answer aloud, let the room react, and advance when ready, Jackbox-style. There is deliberately no fallback timer: a present host holding the standings *is the feature*, and a vanished host was already the disconnect grace's job. The HIGH wedge from the review pass above — the once-only leaderboard broadcast — is what earned the pause its snapshot, and the reconnect arc its second sibling.

**A light theme that proves its own contrast.** The light theme's semantic text — error copy, "reconnecting," the answer lock — was landing at 2.7–3.3:1 against WCAG AA's 4.5:1 bar, the classic same-hue-tint trap. The fix added dedicated ink tokens, but the interesting part is the test that now guards them: it parses the theme's CSS, reimplements `color-mix()` and WCAG relative luminance, and asserts every ink clears 4.5:1 on the backdrop it *actually* composites over — plus a both-ways drift guard asserting the OS-preference and explicit-toggle theme blocks stay identical, so a token dropped from one fails loudly instead of silently keeping the other's value. A 62-agent adversarial pass then caught the test itself modeling the wrong backdrop — badges composite over the page gradient, not the card surface; real ratios 4.0–4.4:1, under the pin; *passing test, failing screen* — and the inks got darker again. The 32px badges legally qualify for WCAG's relaxed 3:1 large-text bar; they're held to 4.5:1 anyway, so no future size change can silently demote them.

<p class="eyebrow">The ledger</p>

## Deliberately not done

The retro's most useful section was its residual holes, so this dispatch keeps the habit. What the week explicitly did *not* fix, each tracked by number in the repo:

- **The freshest reconnect edge (#139)** — a stale host-socket close arriving after a successful resume can re-arm the termination grace and kill a live room. Found by the finished-room PR's own review; fix shape sketched; open.
- **Restart-resumable games (#136)** — boot reconciliation chose honest teardown; actually *resuming* a mid-round game across a restart is the deferred option (b), scoped in tiers, and the mid-round tier is the real work because no state file may ever hold an unrevealed answer.
- **Player rejoin is still a name match (#117)** — today, anyone holding the room code and a player's display name inherits that seat and score. Token-based rejoin is v0.2 work, and the issue's own title calls the current behavior what it is: a seat takeover.
- **The duplicated SSH block (#132)** — the host-key pin exists twice; a composite action collapses it to once.
- **The point of it all (#55, #44)** — the second game module and per-room selection, the seam-proving centerpiece of v0.2 ("you need ≥2 modules for a choice to mean anything"), plus the in-memory whole-app harness to drive it.

<p class="eyebrow">What's next</p>

## The second module lands on prepared ground

Each article in this series has ended one layer further out. The case study closed a quality loop around the *game*; the retro closed one around the *pipeline*; this stretch closed one around the *process* — the reviews, the smoke legs, the working agreements that decide what gets built at all. The order of operations was the point: the reconnection snapshots, the browser smoke, and the review bar all exist *before* the second game module that will lean on them, which is the cheapest any of it will ever be.

The platform still refuses to tell your phone the answer. Now it also refuses to pretend a restarted game never died, refuses to swap your questions mid-game, and — once — refused a perfectly good pull request, because the best security check of the week was the one that stayed a human act.

<footer class="article-foot">
  <p>
    Produced with Claude Code from the repository's own history — commits, PR and issue bodies,
    review threads, CI run logs, and the docs the week changed — and fact-checked against those
    sources before this page was written. The Pizza repo is private, so artifacts are referenced
    by number rather than linked, as in the case study and the retro before it. Test counts are
    the CI runner's own (the retro's 205 and this page's 287 are counted the same way).
  </p>
</footer>
