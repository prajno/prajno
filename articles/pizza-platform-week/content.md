---
title: "Three products, one week"
subtitle: "The platform got an SDK and a registry, trivia got pub rounds and a question catalog, and Battleship got a server with no client yet — while the test suite ran from 312 to 463 to keep up."
date: 2026-08-13
description: The fourth Pizza dispatch — platform, existing game, and new-game scaffolding advancing in parallel, six ADRs in four days, and the testing gaps that moving faster shook loose.
---

<header class="hero" id="top">
  <p class="eyebrow">Field notes · The same private repo, the week after the quality sprint · August 2026</p>
  <h1>Three products, one <span class="brand">week</span></h1>
  <p class="lede">
    <a href="../pizza-quality-sprint/">The quality sprint</a> spent four days making the ground
    boring so the next stretch could build on it. This is that stretch, and it built in three
    directions at once: the platform grew a real SDK, a module registry, and an event spine;
    trivia — the game people can actually play — picked up pub rounds and a question catalog;
    and Battleship arrived as a server with no client, on purpose. The test suite ran from
    <strong>312 to 463</strong> to keep up, because moving faster kept finding spots where
    coverage was thinner than it looked — and each one got fixed the same week it surfaced.
  </p>
  <div class="statgrid">
    <div class="stat"><div class="n">3</div><div class="l">tracks · platform, trivia, battleship</div></div>
    <div class="stat"><div class="n">6</div><div class="l">ADRs · 3 days</div></div>
    <div class="stat"><div class="n">463</div><div class="l">tests · was 312</div></div>
    <div class="stat"><div class="n">32</div><div class="l">PRs merged · Aug 10–12</div></div>
    <div class="stat"><div class="n">2</div><div class="l">game modules · 1 playable</div></div>
    <div class="stat"><div class="n">1</div><div class="l">new round style · pub recap</div></div>
  </div>
  <p class="hero-note">Set in Pizza's own design tokens, like every dispatch before it.</p>
</header>

<p class="eyebrow">The week</p>

## Faster, on purpose

Monday didn't open with code. It opened with a question the repo had earned the right to ask out loud: should a party-game platform really be hand-rolling its own realtime stack, or just paying a managed service? A short retro walked the defect history since July, sorted it by layer, and came back with a clear answer — the realtime core isn't where the pain lives. The biggest single source of trouble was deploy plumbing a managed transport would never have touched, and the two pieces the project genuinely did reinvent — reconnect plumbing and wire validation — are by now sunk, hardened assets.

<blockquote class="pull">
  <p>"This project is not re-inventing PubNub; it is building the part PubNub's customers still have to build after they pay."</p>
  <cite>the realtime retro, filed Monday morning — verdict: keep the stack, revisit at v0.3 (#156)</cite>
</blockquote>

Decision recorded, follow-up parked, and by early afternoon the first platform ADR was up. That's the whole retro story this time — no incident, no all-nighter, just a build-or-buy question answered on the record so the week could spend its energy building. From Monday afternoon on, three tracks ran in parallel: the platform itself, the game already running on it, and the skeleton of the game that comes next.

<p class="eyebrow">Platform</p>

## An SDK, a registry, and fences that hold

The platform work arrived the way this repo likes to arrive: decisions first. Six ADRs in three days, each naming which earlier decision it extends, amends, or supersedes — no silent contradictions.

<div class="cardgrid cards3">
  <div class="card"><span class="k">ADR-0015</span><p><strong>A lint-enforced game SDK.</strong> <code>src/sdk/</code> is now the only import surface between games and platform — a fence ESLint patrols in both directions.</p></div>
  <div class="card"><span class="k">ADR-0016</span><p><strong>Config-driven round rules.</strong> The engine is mechanism, the game is policy: a <code>GameDefinition</code> says how rounds close, who participates, which phases run.</p></div>
  <div class="card"><span class="k">ADR-0017</span><p><strong>Per-seat content.</strong> The secrecy boundary is server vs <em>each</em> client — <code>contentFor</code> renders a view per seat, because two fleets can't share a board.</p></div>
  <div class="card"><span class="k">ADR-0018</span><p><strong>A module registry.</strong> Games are registered once at boot and selected per room; an unknown module refuses loudly rather than ever deleting a room.</p></div>
  <div class="card"><span class="k">ADR-0019</span><p><strong>Deferred reveal.</strong> A reveal is now a predicate, not a boolean — a round can hold its answers and disclose them all at once as a recap.</p></div>
  <div class="card"><span class="k">ADR-0020</span><p><strong>An event spine.</strong> One append-only telemetry stream behind a sink interface — JSONL today, SQLite later; games emit only through a namespaced emitter.</p></div>
</div>

The theme running through all six is boundaries you can verify instead of boundaries you remember. Games could always only *see* the platform through interfaces; now the fence is mechanical — `src/games/**` can import only from the SDK, the platform can't reach into games, and ESLint fails the build on either trespass. The registry takes the stance the question pools took back in v0.1 — *refuse, don't delete*: a stored room whose module has left the registry gets a typed refusal and stays recoverable, because a rollback should restore your game, not discover it deleted. And the restructure that carried all of this — services, a reusable round runtime, the SDK barrels — landed as structure-only changes asserting zero behavior difference, which is a claim you can only make out loud with a test suite standing behind it.

The platform even absorbed the design system: `theme.css` moved out of trivia's directory into the shared client — a clean rename, 100% similarity — because tokens that style the game picker, the join shell, and whatever game mounts beneath them aren't trivia's property anymore. That game picker is real, too: the host's pre-game shell now selects a game per room, and the player's join shell mounts whichever module the room names.

<p class="eyebrow">Trivia</p>

## The game you can play got better

While the platform grew under it, trivia kept shipping like a product.

**Pub rounds.** ADR-0019's whole point. A pub-style round holds every reveal to the end and plays back one group recap at the round boundary — phones stay quiet mid-round, the results land all at once, and the room reacts together instead of one question at a time. Deferred reveal shipped as a predicate on the round rules, so it's configuration, not a fork of the engine — and the classic instant-reveal mode is exactly what it was before.

**A question catalog.** The question pools grew a runtime catalog — topics, labels, live counts — served by the platform and rendered in the host's pre-game shell. Question counts moved from free-text to a 1–10 dropdown, draws are randomized instead of first-N, and a count the pool can't satisfy is blocked in the form *and* refused by the server. The fence pattern again, one layer up.

**Rooms with addresses.** A room is now addressed by a stable id in the URL, so a reloaded host tab lands back in its own room, and a finished game gets an actual finished-game page instead of a dead lobby. Client-side room storage migrated to its third schema version in place — legacy entries upgrade on load and stay stable afterward.

<p class="eyebrow">Battleship</p>

## A server with no client (yet)

The second game module merged this week: Battleship — boards, volleys, last fleet standing — as a server module with its own wire-level integration tests and a README that is mostly a list of what it deliberately isn't yet. No ship placement, no client halves, no final-ranking polish; the client is filed as its own work (#163).

That sounds like half a feature, and it's the half that matters. Battleship exists to be the platform's second real consumer. It's why per-seat content is in the SDK at all — a trivia question goes to everyone, but a fleet grid goes only to its owner — and it's what turns the registry from a formality into a choice. The last dispatch put it plainly: *you need ≥2 modules for a choice to mean anything.* As of this week the host's pre-game screen lists both games — Battleship's card marked "coming soon," because the second option doesn't have a face yet.

<p class="eyebrow">QA</p>

## Speed shook the gaps loose

A restructure week is a stress test for a test suite, and the honest result is: the suite held, and it also grew by 151 tests — 312 to 463, 32 files to 44 — because moving faster kept exposing places where the coverage was thinner than the confidence.

The gates got wider, and hungrier. The review and verify gates now run on every PR, not only PRs targeting main — platform work happens on stacked branches, and stacked PRs skipping review was exactly the kind of quiet gap this process exists to close. The reviewer also outgrew its allowance again: the turn budget that went from 12 to 50 last dispatch went to 100 this week, for the boring reason that platform-sized PRs are bigger than feature-sized ones. And the reviews kept earning it — a mid-week multi-agent pass (find, then refute-by-default verify) over the pub-recap work caught a real reload gap in the recap window before it ever met a player, fixed in the same commit that swept the docs.

The receipts stay honest, just lighter this time:

- One PR got merged into a stale leftover branch instead of main. Merged PRs can't be reopened, so a second PR re-targeted the same commits at main — nine minutes later (#178 → #185). The price of speed, paid in full, plus a lesson about deleting merged branches.
- The docs sweep itself missed two paragraphs: the README still introduces trivia as the first and only wired-in game, and the SDK doc still points at the registry as future work — a week after the registry merged. Both are a grep away.
- Even the process got a cost pass: the project guide now routes subagent work by weight — the cheaper the task, the cheaper the model, with the strongest reserved for judgment-heavy passes — because an adversarial reviewer on every PR should be cheap enough to keep forever.

<p class="eyebrow">Loose ends</p>

## Still on the bench

Matter-of-fact, tracked by number, in the series tradition:

- **No version tag yet.** The v0.2 milestone stands at 36 issues closed, 6 open, and the repo has never cut a tag — `package.json` still says 0.1.0. The platform outran its own release ritual.
- **Telemetry is write-only.** The event spine records; nothing reads it back yet. The query seam and a dashboard are filed (#218, #219).
- **The bot drives the wire, not the client.** Teaching the smoke bot to play through the real browser client is open as #221.
- **Battleship has no face** (#163) — see above, on purpose, but still on the list.
- **Agent hygiene, round two.** 25 stale parallel-agent worktrees are parked under `.claude/`, correctly ignored since last dispatch's fix, still waiting for an actual sweep.

<p class="eyebrow">Next</p>

## v0.3 calls in

Every dispatch in this series has ended one layer further out — the game, the pipeline, the process, and now the platform itself. The next layer is the fun one: v0.3 is where Claude calls *in* — an MCP server over the question pool, with a generate-and-verify content pipeline behind it, exactly where the case study's roadmap said it would be. The platform is finally shaped for a caller like that: registered games, typed rules, per-seat views, and an event spine to watch it all happen.

The week's scoreboard reads well. The platform can register a second game, hide a fleet from the seat next to it, and write down its own history as it goes. It still doesn't have a version number. Some weeks you cut the release; this one built the thing worth releasing.

<footer class="article-foot">
  <p>
    Produced with Claude Code from the repository's own history — commits, PR and issue bodies,
    ADRs, review threads, and the retro that opened the week — and fact-checked against those
    sources before this page was written. The Pizza repo is private, so artifacts are referenced
    by number rather than linked, as in every dispatch before this one. Test counts at both ends
    of the 312 → 463 climb are counted the same way. One register note: this dispatch was
    deliberately steered lighter than its predecessors — fewer defect ledgers, more of what
    shipped — at the editor's request, and a steering note belongs in the record like everything
    else does.
  </p>
</footer>
