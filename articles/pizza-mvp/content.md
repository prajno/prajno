---
title: "Spec first, ship fast: building Pizza with Claude Code"
subtitle: Fourteen days from an empty repo to a deployed MVP — the build log of a spec-first, AI-paired side project.
date: 2026-07-27
description: A case study in agentic development — thirteen ADRs before the code, specs that read like tests, a bot for QA, and a one-click deploy.
image: images/host-round-mockup.png
---

<header class="hero" id="top">
  <p class="eyebrow">Case study · A private repo, shown by its process · July 2026</p>
  <h1>Spec first, ship fast: building <span class="brand">Pizza</span> with Claude Code</h1>
  <p class="lede">
    Pizza is a multiplayer, AI-hosted party-game platform — one shared screen, every player's phone
    is the controller. This is the build log of its v0.1: <strong>fourteen days from an empty repo to a
    deployed, live-demoed MVP</strong>, built pair-style with Claude Code on a foundation of thirteen
    architecture decision records, a sixteen-issue ordered backlog, and a test suite that grew from
    54 to 166 along the way.
  </p>
  <div class="statgrid">
    <div class="stat"><div class="n">14</div><div class="l">days to MVP</div></div>
    <div class="stat"><div class="n">13</div><div class="l">ADRs · 9 pre-code</div></div>
    <div class="stat"><div class="n">30</div><div class="l">pull requests</div></div>
    <div class="stat"><div class="n">166</div><div class="l">tests · node:test</div></div>
    <div class="stat"><div class="n">8.4k</div><div class="l">lines of strict TS</div></div>
    <div class="stat"><div class="n">1</div><div class="l">live demo box</div></div>
  </div>
  <p class="hero-note">This page is set in Pizza's own design tokens (docs/ui-spec.md) — the case study wears the product.</p>
</header>

<p class="eyebrow">The product</p>

## A game platform that happens to start with trivia

The Jackbox model: a host opens a room on the big screen, a QR code and a four-letter room code appear, and everyone joins from their own phone — no app, no accounts, no install. The server is a Node WebSocket relay and the single source of truth; clients render state and emit input, nothing more.

The deliberate twist is in the name of the repo: **Pizza is the platform, trivia is a module**. The platform core never knows which game it is serving — game rounds cross the wire as opaque payloads owned by the module. And although the product is "AI-hosted," **v0.1 contains zero AI on purpose**: the roadmap introduces one concern at a time — a deterministic game loop first, Claude calling *in* via a custom MCP server at v0.3, the app calling *out* for AI grading at v0.4.

<div class="demo" id="demoRoot">
  <div class="tv" aria-label="Host screen walkthrough">
    <div class="frame on" data-step="0">
      <div class="brandline"><span><span class="pz">PIZZA</span> trivia</span><span class="livepill"><i></i>live</span></div>
      <div class="center">
        <div class="scanline">Scan to join — or enter the code</div>
        <div class="lobbyrow">
          <div class="qr"><canvas width="25" height="25"></canvas></div>
          <div class="roomcode">PVPE</div>
        </div>
        <div class="pills">
          <span class="pill"><i></i>Ada</span><span class="pill"><i></i>Bex</span><span class="pill"><i></i>Prajno</span>
        </div>
        <div class="waiting">3 players in</div>
        <div class="startbtn">Start game</div>
      </div>
    </div>
    <div class="frame" data-step="1">
      <div class="brandline"><span><span class="pz">PIZZA</span> trivia</span><span class="livepill"><i></i>live</span></div>
      <div class="roundline">Round 1 <span class="ring" style="--p:92%"><b>116</b></span></div>
      <div class="prompt">What is the capital of France?</div>
      <div class="opts">
        <div class="opt" style="--c:#17c0c9"><span class="chip">A</span>Paris</div>
        <div class="opt" style="--c:#3e7bfa"><span class="chip">B</span>Berlin</div>
        <div class="opt" style="--c:#9b6bf5"><span class="chip">C</span>Madrid</div>
        <div class="opt" style="--c:#f9a63a"><span class="chip">D</span>Rome</div>
      </div>
    </div>
    <div class="frame" data-step="2">
      <div class="brandline"><span><span class="pz">PIZZA</span> trivia</span><span class="livepill"><i></i>live</span></div>
      <div class="roundline">Round 1 <span class="ring" style="--p:62%"><b>78</b></span></div>
      <div class="prompt">What is the capital of France?</div>
      <div class="opts">
        <div class="opt" style="--c:#17c0c9"><span class="chip">A</span>Paris</div>
        <div class="opt" style="--c:#3e7bfa"><span class="chip">B</span>Berlin</div>
        <div class="opt" style="--c:#9b6bf5"><span class="chip">C</span>Madrid</div>
        <div class="opt" style="--c:#f9a63a"><span class="chip">D</span>Rome</div>
      </div>
    </div>
    <div class="frame" data-step="3">
      <div class="brandline"><span><span class="pz">PIZZA</span> trivia</span><span class="livepill"><i></i>live</span></div>
      <div class="finalhead">ROUND 1 · THE ANSWER IS</div>
      <div class="opts" style="margin-top:2cqw">
        <div class="opt win" style="--c:#17c0c9"><span class="chip">A</span>Paris</div>
        <div class="opt dim" style="--c:#3e7bfa"><span class="chip">B</span>Berlin</div>
        <div class="opt dim" style="--c:#9b6bf5"><span class="chip">C</span>Madrid</div>
        <div class="opt dim" style="--c:#f9a63a"><span class="chip">D</span>Rome</div>
      </div>
      <div class="tally"><b>2</b> correct&nbsp;&nbsp;<b>1</b> missed</div>
    </div>
    <div class="frame" data-step="4">
      <div class="brandline"><span><span class="pz">PIZZA</span> trivia</span><span class="livepill"><i></i>live</span></div>
      <div class="finalhead">FINAL RESULTS</div>
      <div class="winner">🏆 <em>Prajno</em> wins</div>
      <div class="rows">
        <div class="row first"><span class="rk">1</span>Prajno 🥇<span class="sc">2</span></div>
        <div class="row"><span class="rk">2</span>Bex<span class="sc">1</span></div>
        <div class="row"><span class="rk">3</span>Ada<span class="sc">0</span></div>
      </div>
    </div>
  </div>
  <div class="phone" aria-label="Player phone walkthrough">
    <div class="frame on" data-step="0">
      <div class="pbrand"><span class="pz">PIZZA</span> trivia</div>
      <div class="ph1">Join the game</div>
      <div class="psub">Get the code from the big screen</div>
      <div class="plabel">Room code</div>
      <div class="pfield code">PVPE</div>
      <div class="plabel">Your name</div>
      <div class="pfield">Prajno</div>
      <div class="pfoot go">Join</div>
    </div>
    <div class="frame" data-step="1">
      <div class="ptop"><span>Round 1</span><b>1:43</b></div>
      <div class="pbar" style="--w:82%"><i></i></div>
      <div class="pq">What is the capital of France?</div>
      <div class="popt" style="--c:#17c0c9"><span class="chip">A</span>Paris</div>
      <div class="popt" style="--c:#3e7bfa"><span class="chip">B</span>Berlin</div>
      <div class="popt" style="--c:#9b6bf5"><span class="chip">C</span>Madrid</div>
      <div class="popt" style="--c:#f9a63a"><span class="chip">D</span>Rome</div>
      <div class="pfoot">Pick an answer</div>
    </div>
    <div class="frame" data-step="2">
      <div class="ptop"><span>Round 1</span><b>1:18</b></div>
      <div class="pbar" style="--w:58%"><i></i></div>
      <div class="pq">What is the capital of France?</div>
      <div class="popt sel" style="--c:#17c0c9"><span class="chip">A</span>Paris</div>
      <div class="popt" style="--c:#3e7bfa"><span class="chip">B</span>Berlin</div>
      <div class="popt" style="--c:#9b6bf5"><span class="chip">C</span>Madrid</div>
      <div class="popt" style="--c:#f9a63a"><span class="chip">D</span>Rome</div>
      <div class="pfoot go">Lock it in</div>
    </div>
    <div class="frame" data-step="3">
      <div class="pcenter">
        <div class="pbadge">✓</div>
        <div class="presult">Correct!</div>
        <div class="ppts"><b>+1</b> point</div>
        <div class="pans"><span class="chip">A</span>Answer:&nbsp;<b>Paris</b></div>
      </div>
      <div class="pwait" style="text-align:center">Next round starting…</div>
    </div>
    <div class="frame" data-step="4">
      <div class="pcenter">
        <div class="pbadge trophy">🏆</div>
        <div class="presult">You came 1st</div>
        <div class="ppts"><b>2</b> points · you won! 🎉</div>
        <div class="psub">Full standings are on the big screen.</div>
      </div>
      <div class="pwait" style="text-align:center">Thanks for playing!</div>
    </div>
  </div>
</div>

<div class="demo-controls" id="demoControls" role="group" aria-label="Demo steps" hidden>
  <button data-go="0">1 · Lobby</button>
  <button data-go="1">2 · Round</button>
  <button data-go="2">3 · Lock in</button>
  <button data-go="3">4 · Reveal</button>
  <button data-go="4">5 · Winner</button>
  <button id="demoPlay" aria-pressed="true">⏸ pause</button>
</div>

<p class="demo-cap">
  Not a video — a recreation of the real v0.1 screens in the product's own CSS. Every state was
  verified against a live game played while producing this page: the simulated-player bots Ada and
  Bex joined room PVPE over real WebSockets, and lost.
</p>

<p class="eyebrow">The process</p>

## Fourteen days, in the order it actually happened

The sequence below is reconstructed from the merge history — and the order is the story. Architecture was decided and reviewed as documents before any code existed; every feature landed as a PR closing a pre-specified issue; reviews produced tracked issues rather than vibes; and shipping produced new decisions, recorded as new ADRs.

<div class="timeline">
  <div class="tl tl-doc">
    <div class="d">Jul 09 · day 1</div>
    <h3>Eight ADRs before a line of code</h3>
    <p>The repo's second commit is ADR-0001…0008: server authority &amp; answer secrecy, no UI framework, platform-first repo, files over a database, outbound-only connections, a worker-ready bus, gh CLI over a GitHub MCP server, and the platform/game seam.</p>
  </div>
  <div class="tl tl-doc">
    <div class="d">Jul 10 · day 2</div>
    <h3>The paper foundation, then the first code</h3>
    <p>CLAUDE.md, PRD, roadmap, and Mermaid diagrams land (ADR-0009); then the scaffold — a runnable <em>empty</em> dev setup; then ADR-0010 (testing strategy) before the first feature. Shared wire contracts follow, plus a written convention: <code>npm run verify</code> green before any PR.</p>
  </div>
  <div class="tl">
    <div class="d">Jul 11 · day 3</div>
    <h3>Server core</h3>
    <p>Question pool with a validating loader, WebSocket relay bootstrap with typed routing, the <code>GameStateStore</code> interface, and room lifecycle — create, join, rejoin, roster, host-disconnect grace.</p>
  </div>
  <div class="tl">
    <div class="d">Jul 12 · day 4</div>
    <h3>The game exists</h3>
    <p>The <code>GameModule</code> seam and round engine (with WS tests asserting no <code>answerIndex</code> on the wire from day one), round-end reveal + leaderboard, and a file-backed store with atomic writes.</p>
  </div>
  <div class="tl tl-test">
    <div class="d">Jul 13 · day 5</div>
    <h3>Review waves</h3>
    <p>A multi-agent architecture review lands as two PRs: a same-day hardening pass (two latent bugs, including a process-killing timer exception) and a four-commit batch — tests → flake fix → god-object decomposition → read validation — "so the refactor lands on a hardened, non-flaky suite."</p>
  </div>
  <div class="tl">
    <div class="d">Jul 14 · day 6</div>
    <h3>The seam repair</h3>
    <p>Building the client bus exposed a trivia-shaped wire protocol — a latent seam violation. ADR-0011 lands with the fix in the same PR: generic round envelopes, modules own <code>record / content / action / reveal</code>, verified by grep.</p>
  </div>
  <div class="tl tl-doc">
    <div class="d">Jul 15–16 · days 7–8</div>
    <h3>Design before build, then the clients</h3>
    <p>WS transport with reconnect; then the UI spec + standalone HTML mockups merge at 20:02 — and the host screen implementation follows at 22:56, the player phone the next morning. Design beat code to main by three hours.</p>
  </div>
  <div class="tl tl-test">
    <div class="d">Jul 16–17 · days 8–9</div>
    <h3>Solo-testable end to end</h3>
    <p>One port serves client + WebSocket (a phone needs only a URL); Tailscale Funnel docs; and the simulated-player bot — the E2E harness that plays full games and <em>fails if a correct answer ever leaks early</em>.</p>
  </div>
  <div class="tl tl-ship">
    <div class="d">Jul 20–21 · days 12–13</div>
    <h3>Ship it</h3>
    <p>VPS demo deploy: Caddy auto-HTTPS, Basic Auth on the host page, a HOST_SECRET token gating <code>createRoom</code> over the socket (ADR-0012). A pre-merge adversarial review found 7 issues including a blocker that would have failed every deploy.</p>
  </div>
  <div class="tl tl-ship">
    <div class="d">Jul 23 · two weeks to the day</div>
    <h3>Operate &amp; steer</h3>
    <p>Milestones reordered by ADR-0013 (platform breadth before AI grading); the reveal-pacing bug found in live play gets fixed; CI runs the same verify gate as local; <code>npm run smoke</code> + <code>/healthz</code>; and Deploy / Ops / Monitor become GitHub Actions.</p>
  </div>
</div>

<p class="eyebrow">Decisions first</p>

## An immutable decision ledger

Nine ADRs predate all code; ten predate all feature code. Each is four sections — Status, Context, Decision, Consequences — and none has ever been edited to change a decision. A changed mind gets a **new numbered record** that names exactly what it extends or reverses, so the ledger reads chronologically: day-one bets, a mid-build course correction, what shipping changed, and a priority shift — with every earlier rationale preserved verbatim, including the reversed ones.

<div class="cardgrid cards3">
  <div class="card"><span class="k">ADR-0001</span><p><strong>Server authority; answer keys never cross the wire.</strong> Any key reaching a client is readable in the network tab — the game becomes cheatable.</p></div>
  <div class="card"><span class="k">ADR-0002</span><p><strong>Vanilla TypeScript, no UI framework.</strong> Clients render server state and emit input; a reconciler earns nothing here.</p></div>
  <div class="card"><span class="k">ADR-0003</span><p><strong>Platform-first repo; games are modules.</strong> "If code wouldn't serve a hypothetical second game, it's in the wrong folder."</p></div>
  <div class="card"><span class="k">ADR-0004</span><p><strong>Files over a database.</strong> JSON at laptop scale, behind a <code>GameStateStore</code> interface so SQLite later is an implementation, not a rewrite.</p></div>
  <div class="card"><span class="k">ADR-0005</span><p><strong>Outbound-only WebSockets.</strong> Clients dial out, keyed by a room code; anything needing reachable clients "dies on firewalls."</p></div>
  <div class="card"><span class="k">ADR-0006</span><p><strong>RxJS bus behind a worker-ready interface.</strong> Message-passing only, so the future Web Worker move is a swap, not a refactor.</p></div>
  <div class="card"><span class="k">ADR-0007</span><p><strong>gh CLI; build our own MCP server instead.</strong> "Consuming someone else's MCP server teaches nothing about designing one."</p></div>
  <div class="card"><span class="k">ADR-0008</span><p><strong>A minimal GameModule seam, proven later by a stub.</strong> "Over-generalizing before a second game exists is how you build the wrong abstraction."</p></div>
  <div class="card"><span class="k">ADR-0009</span><p><strong>Mermaid diagrams in markdown.</strong> Diagrams diff as text and update in the same PR as the architecture change.</p></div>
  <div class="card"><span class="k">ADR-0010</span><p><strong>Test invariants and logic first; a headless bot for E2E.</strong> Browser E2E over a realtime WS loop is the flakiest layer — "not where the risk lives."</p></div>
  <div class="card"><span class="k">ADR-0011</span><p><strong>Generic round protocol.</strong> Written mid-build when trivia types leaked into the wire; modules now own round payloads, opaque to the platform.</p></div>
  <div class="card"><span class="k">ADR-0012</span><p><strong>Demo VPS with layered access control.</strong> The privileged action to gate isn't the host <em>page</em> — it's <code>createRoom</code> over the socket.</p></div>
  <div class="card"><span class="k">ADR-0013</span><p><strong>Reorder milestones: platform before AI.</strong> A pure scheduling ADR that openly reverses ADR-0008's timing — "the one reversal of stated reasoning, made deliberately."</p></div>
</div>

<blockquote class="pull">
  <p>"The immutable ADRs keep their original numbers on purpose. Per the ADR-immutability rule, they are not edited; this ADR is the single source of truth for the remap."</p>
  <cite>ADR-0013 — changing the plan without rewriting history</cite>
</blockquote>

<p class="eyebrow">The unit of work</p>

## Issues you can hand to an agent

Every feature is one GitHub issue with the same five-part shape — and the shape is what makes AI-paired development controllable: **Context** cites the ADRs, **Goal** is one sentence, **Acceptance criteria** are checkable (often literally executable), **Out of scope** names where each deferral lands, and **Notes for Claude** speaks directly to the pair programmer.

<div class="issue" aria-label="Issue 8, abridged">
  <div class="ihead">
    <span class="inum">#8</span>
    <span class="ititle">Round engine + GameModule seam: serve wire payload, collect, MC-score, advance</span>
    <span class="ilabel">feat</span><span class="ilabel">area: platform</span><span class="ilabel">milestone: v0.1</span>
  </div>
  <dl>
    <dt>Acceptance criteria <span style="text-transform:none;letter-spacing:0">(abridged)</span></dt>
    <dd><ul>
      <li><span class="tick">✓</span> An automated test asserts <strong>no answer field appears on any client-bound payload</strong> produced by the loop (ADR-0001) — promote the informal "check" to a real test.</li>
      <li><span class="tick">✓</span> A WS-level integration test drives a full round over a real socket.</li>
    </ul></dd>
    <dt>Out of scope</dt>
    <dd>Reveal / leaderboard broadcast — that's #9. Free-text scoring — v0.4.</dd>
    <dt>Notes for Claude</dt>
    <dd>"This is the biggest issue in the batch — <strong>if it gets unwieldy, split the GameModule interface into its own tiny PR first</strong>, then the loop."</dd>
  </dl>
</div>

<div class="cardgrid cards3">
  <div class="card">
    <span class="k">Bugs become issues</span>
    <p>#52 opens: <em>"Found during #15's live end-to-end run."</em> The reveal rendered for one frame before the leaderboard — "the quiz-show money moment never lands." Filed with a fix sketch and a written justification for deferring; fixed on day 14.</p>
  </div>
  <div class="card">
    <span class="k">Ideas get parked, not built</span>
    <p>#29 (host accounts) is stamped <em>"Status: post-MVP — captured, not scheduled."</em> Accounts are a PRD non-goal, so step 1 would be a superseding ADR. #54 and #55 are fully specified future features left deliberately open.</p>
  </div>
  <div class="card">
    <span class="k">Honest division of labor</span>
    <p>#21's CI checklist tags one item <code>[Manual, Praj]</code> — enabling branch protection is a repo setting, "not doable from code." The human work is in the spec too.</p>
  </div>
</div>

<p class="eyebrow">Architecture</p>

## Diagrams that live in the repo

Per ADR-0009, every diagram is Mermaid in markdown — one per file, reviewed in the same PR as the change it depicts. These four are pre-rendered from the repo's own sources.

![System overview diagram: clients, the relay server, AI tooling, and JSON data files, with the question pool as the shared seam](images/system-overview.svg "docs/diagrams/system-overview.md — the whole system in one glance. The AI paths exist in the architecture from day one but carry no v0.1 traffic.")

![Answer-secrecy trust boundary diagram: the answer key stays inside the server; blocked edges show it never crossing to host or phone](images/answer-secrecy.svg "docs/diagrams/answer-secrecy-boundary.md — the core invariant made visible: the answer key structurally never crosses the trust boundary (ADR-0001).")

![Room join sequence diagram: host creates a room, phone dials out to join, lobby view carries no answer keys, host starts the game](images/room-join.svg "docs/diagrams/room-join-sequence.md — the join handshake. Phones always dial out (ADR-0005), and even the lobby view carries no keys: secrecy starts at join, not at round start.")

![Demo deployment diagram: Caddy with auto-HTTPS and Basic Auth in front of the one-port Node app on an always-on VPS](images/demo-deployment.svg "docs/diagrams/demo-deployment.md — the live demo in production shape: three numbered access controls compose so a bare visitor can neither host nor play (ADR-0012).")

<p class="eyebrow">The invariant</p>

## Cheating is a compile error

The headline engineering idea: answer secrecy isn't a code-review guideline, it's **structural**. The server-only `QuestionRecord` carries the key; the client-bound `QuestionWire` declares the key's field as `never`, so a record is not even *assignable* to the wire type — and `toWire()` is the only sanctioned projection between them.

<pre class="code"><span class="cm">// src/games/trivia/question.ts — the wire type cannot carry the key</span>
<span class="kw">export interface</span> QuestionWire {
  <span class="kw">readonly</span> id: QuestionId;
  <span class="kw">readonly</span> category: string;
  <span class="kw">readonly</span> difficulty: Difficulty;
  <span class="kw">readonly</span> prompt: string;
  <span class="kw">readonly</span> options: <span class="kw">readonly</span> string[];
  <span class="kw">readonly</span> answerIndex?: <span class="never">never</span>;
}

<span class="kw">export function</span> toWire(record: QuestionRecord): QuestionWire {
  <span class="kw">const</span> { id, category, difficulty, prompt, options } = record;
  <span class="kw">return</span> { id, category, difficulty, prompt, options };
}</pre>

And the guard guards itself. The test suite uses `@ts-expect-error` as a compile-time regression test: if the `never` protection ever weakens, these directives become unused and `npm run typecheck` fails.

<pre class="code"><span class="cm">// src/games/trivia/question.test.ts — a test that runs in the type system</span>
test(<span class="kw">'a QuestionWire cannot carry the answer key (compile-time)'</span>, () => {
  <span class="cm">// @ts-expect-error — a full record (with answerIndex) is not assignable to a wire.</span>
  <span class="kw">const</span> fromRecord: QuestionWire = record;
  <span class="cm">// @ts-expect-error — answerIndex cannot be added to a wire object.</span>
  <span class="kw">const</span> smuggled: QuestionWire = { ...toWire(record), answerIndex: 0 };
  assert.ok(fromRecord &amp;&amp; smuggled);
});</pre>

The same invariant is then enforced at four independent layers — colored here like the game's own answer identities:

<div class="cardgrid cards2">
  <div class="card accent-a"><span class="k">A · Compile time</span><p>The <code>never</code>-typed field plus <code>@ts-expect-error</code> regression tests. Branded nominal ids (<code>Brand&lt;T, B&gt;</code> via a <code>unique symbol</code>) keep a <code>RoomCode</code> from ever standing in for a <code>PlayerId</code> — zero runtime cost.</p></div>
  <div class="card accent-b"><span class="k">B · Unit &amp; module tests</span><p>"toWire strips the answer key" and "contentFor strips the answer key (ADR-0001)" — the projection functions are tested directly, at both the trivia edge and the module seam.</p></div>
  <div class="card accent-c"><span class="k">C · Wire integration</span><p>WS tests drive a full 3-question game over real sockets and assert <code>Object.hasOwn(wire, 'answerIndex') === false</code> on live frames — the reveal exists in exactly one message, <code>roundResult</code>.</p></div>
  <div class="card accent-d"><span class="k">D · The bot, in production</span><p>The simulated-player bot deep-scans every pre-reveal frame for four spellings of the key and exits non-zero on a leak — locally in <code>npm run smoke</code>, and against the <em>live</em> box after every deploy.</p></div>
</div>

### The seam that got repaired in public

The platform/game boundary got its own stress test on day 6. Building the client bus exposed that the wire protocol was trivia-shaped and the "game-agnostic" round engine was reading `answerIndex` directly — a latent violation of the seam ADR. The response is the pattern worth showcasing: stop, write ADR-0011, and land the repair *with* the decision in one PR — generic envelopes, module-owned payloads, trivia types relocated out of shared code, and the diff verified by grep: *"no game type or wire field survives in src/shared | server | platform | client."*

<pre class="code"><span class="cm">// src/shared/messages.ts — the platform relays payloads it cannot read</span>
<span class="kw">export type</span> ServerMessage&lt;Content = <span class="kw">unknown</span>, Reveal = <span class="kw">unknown</span>&gt; =
  | { <span class="kw">readonly</span> type: <span class="kw">'roundStarted'</span>; <span class="kw">readonly</span> roundIndex: number;
      <span class="kw">readonly</span> content: Content; <span class="kw">readonly</span> deadline: number }
  | { <span class="kw">readonly</span> type: <span class="kw">'roundResult'</span>;  <span class="kw">readonly</span> roundIndex: number;
      <span class="kw">readonly</span> results: <span class="kw">readonly</span> PlayerRoundResult[]; <span class="kw">readonly</span> reveal: Reveal }
  <span class="cm">// … the reveal exists in exactly one message, by construction</span></pre>

<blockquote class="pull">
  <p>"Left in place, every client would be built against a trivia-shaped protocol, cementing the leak exactly where it is most expensive to undo. […] The lint rule that forbids the platform from importing <code>src/games/*</code> now has nothing to hide."</p>
  <cite>ADR-0011 — generic round protocol, written mid-build</cite>
</blockquote>

The proof that the platform is genuinely generic is also a test: the room lifecycle runs against a `StubGameModule` with deliberately non-trivia payload types.

<p class="eyebrow">Design</p>

## The mockups merged three hours before the code

Before either client screen was built, issue #46 produced a UI spec and two standalone HTML mockup galleries — checked into the repo, openable by double-click, covering **every state including the edges**: 6 host frames and 11 phone frames, join errors and reconnect banners included. The commit log is the receipt: spec and mockups merged at 20:02 on July 15; the host screen landed at 22:56; the player phone at 00:08. Because the mockups used the exact design tokens of the planned app, "the CSS ports directly" — a head start, not throwaway.

<div class="swatches" aria-label="Design tokens">
  <span class="sw"><i style="background:#141021"></i><span>--ground</span></span>
  <span class="sw"><i style="background:#ff3d81"></i><span>--brand</span></span>
  <span class="sw"><i style="background:#17c0c9"></i><span>--opt-a</span></span>
  <span class="sw"><i style="background:#3e7bfa"></i><span>--opt-b</span></span>
  <span class="sw"><i style="background:#9b6bf5"></i><span>--opt-c</span></span>
  <span class="sw"><i style="background:#f9a63a"></i><span>--opt-d</span></span>
  <span class="sw"><i style="background:#37d67a"></i><span>--correct</span></span>
  <span class="sw"><i style="background:#ff5470"></i><span>--wrong</span></span>
</div>

The system is "quiz-show broadcast": a chosen plum-ink ground (not flat black), one magenta accent spent sparingly, and four **colour + letter** answer identities that match across host and phone — so "I picked the teal one, B" reads across a room. The letter is the primary channel, which makes the coding colourblind-safe; sans-vs-mono *is* the type system (mono for machine values, sans for prose); dark is primary, light fully designed.

<blockquote class="pull">
  <p>"Semantic green/red appear only as a ring, badge, or check — never as a card fill — so they never collide with an option's identity colour. At reveal, the correct card keeps its own colour and gains a green ring + check; the others dim."</p>
  <cite>docs/ui-spec.md — the colour rule</cite>
</blockquote>

Even secrecy shows up in the design layer: the host's mid-round view renders a payload that structurally contains no key, so *"the host structurally cannot show an answer mid-round."* And each mockup ends with a "Decisions I made — and the open questions for you" panel; the spec's decision table records the product owner's ✓ on each call and one explicit ✗ (per-answer vote counts — not in the wire payload, not MVP).

<p class="eyebrow">Quality loop</p>

## Reviews that produce commits, tests that guard themselves

Quality ran as a loop, not a phase. A multi-agent architecture review on day 5 split its findings by cost: the cheap, high-value fixes shipped the same day as a hardening pass — including two latent bugs, one of which (an uncaught exception inside a `setTimeout` tick) would have taken *every room in the process* down. The bigger findings became tracked issues, landing next as four independently-green commits ordered *tests → flake fix → refactor → validation*, "so the refactor lands on a hardened, non-flaky suite."

<div class="cardgrid cards3">
  <div class="card">
    <span class="k">The gate can't drift</span>
    <p><code>npm run verify</code> = typecheck + lint + test + build, green before any PR. CI runs <em>the same four npm scripts</em> on every PR to main — same commands, so local and CI are one gate by construction.</p>
  </div>
  <div class="card">
    <span class="k">Flakes are bugs</span>
    <p>Sleep-as-synchronization was systematically replaced with awaited signals — tests wait for the actual <code>roomClosed</code> or <code>gameOver</code> frame, with timeouts. "Ran the suite 3× clean" is in the PR body.</p>
  </div>
  <div class="card">
    <span class="k">Test the checker</span>
    <p>The bot's answer-leak scanner is itself unit-tested — it provably catches a planted <code>answerIndex</code> — and its pass rule has a <code>seatedPlayers &gt; 0</code> backstop against green-while-nothing-ran.</p>
  </div>
</div>

<div class="chartcard">
  <h3>Tests across the v0.1 pull requests</h3>
  <div class="sub">npm test count reported in each PR body · node:test, zero test-framework dependencies</div>
  <svg viewBox="0 0 660 230" role="img" aria-label="Line chart: test count grows from 54 at PR 30 to 164 at PR 63">
    <g stroke="var(--hairline)" stroke-width="1">
      <line x1="52" y1="180" x2="640" y2="180"/>
      <line x1="52" y1="120" x2="640" y2="120"/>
      <line x1="52" y1="60" x2="640" y2="60"/>
    </g>
    <g fill="var(--muted)" font-family="ui-monospace, Menlo, monospace" font-size="11">
      <text x="44" y="184" text-anchor="end">0</text>
      <text x="44" y="124" text-anchor="end">80</text>
      <text x="44" y="64" text-anchor="end">160</text>
    </g>
    <polyline points="80,139.5 170,130.5 260,120.75 350,116.25 440,87 530,58.5 620,57" fill="none" stroke="var(--brand)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <g fill="var(--brand)" stroke="var(--surface)" stroke-width="2">
      <circle cx="80" cy="139.5" r="4.5"><title>PR #30 · round engine — 54 tests</title></circle>
      <circle cx="170" cy="130.5" r="4.5"><title>PR #33 · hardening pass — 66 tests</title></circle>
      <circle cx="260" cy="120.75" r="4.5"><title>PR #38 · review batch — 79 tests</title></circle>
      <circle cx="350" cy="116.25" r="4.5"><title>PR #43 · generic protocol — 85 tests</title></circle>
      <circle cx="440" cy="87" r="4.5"><title>PR #47 · UI spec — 124 tests</title></circle>
      <circle cx="530" cy="58.5" r="4.5"><title>PR #59 · demo deploy — 162 tests</title></circle>
      <circle cx="620" cy="57" r="4.5"><title>PR #63 · CI gate — 164 tests</title></circle>
    </g>
    <g fill="var(--text)" font-family="ui-monospace, Menlo, monospace" font-size="12" font-weight="700">
      <text x="80" y="128" text-anchor="middle">54</text>
      <text x="620" y="45" text-anchor="middle">164</text>
    </g>
    <g fill="var(--muted)" font-family="ui-monospace, Menlo, monospace" font-size="11">
      <text x="80" y="202" text-anchor="middle">#30</text>
      <text x="170" y="202" text-anchor="middle">#33</text>
      <text x="260" y="202" text-anchor="middle">#38</text>
      <text x="350" y="202" text-anchor="middle">#43</text>
      <text x="440" y="202" text-anchor="middle">#47</text>
      <text x="530" y="202" text-anchor="middle">#59</text>
      <text x="620" y="202" text-anchor="middle">#63</text>
      <text x="346" y="222" text-anchor="middle">pull request</text>
    </g>
  </svg>
  <details>
    <summary>View as table</summary>
    <table>
      <tr><th>PR</th><td>#30</td><td>#33</td><td>#38</td><td>#43</td><td>#47</td><td>#59</td><td>#63</td></tr>
      <tr><th>tests</th><td>54</td><td>66</td><td>79</td><td>85</td><td>124</td><td>162</td><td>164</td></tr>
    </table>
  </details>
</div>

The last ring of the loop is the smoke: `npm run smoke` boots the *built artifact* (`dist/main.js`), waits on `/healthz`, and has the bot play a full 3-player game with a mid-game reconnect — asserting the round loop *and* answer secrecy on the thing that actually ships, not just in-process tests.

<p class="eyebrow">Ship &amp; operate</p>

## A one-person devops loop with no laptop required

The deploy story keeps the architecture honest: ADR-0012 frames the VPS as "a remote always-on laptop" — clients still dial out, state is still files (which finally gain a durable disk). The security insight is where to put the gate: not on loading the host *page*, but on `createRoom` *over the WebSocket*, which a scripted socket could otherwise hit. Basic Auth guards the page; a `HOST_SECRET` token — injected only into the authenticated page — guards the privileged action; guests need only a room code.

<div class="cardgrid cards3">
  <div class="card">
    <span class="k">Deploy · a deliberate click</span>
    <p>Manual-dispatch only — "never auto-deploys on merge." The <code>ref</code> input means <em>deploying an older ref is the rollback</em>. After rsync + build + restart, <code>verify-live.sh</code> has the bot play a full game against the live <code>wss://</code> endpoint — a broken deploy fails the release on a product invariant, not just a ping.</p>
  </div>
  <div class="card">
    <span class="k">Ops · least privilege</span>
    <p>CI connects as a non-root <code>deploy</code> user: owns <code>/opt/pizza</code>, passwordless sudo for <em>exactly one command</em> (<code>systemctl restart pizza</code>), reads logs via group, cannot read the secrets file. The app itself runs in a hardened systemd sandbox (<code>ProtectSystem=strict</code>, nologin user).</p>
  </div>
  <div class="card">
    <span class="k">Monitor · zero side effects</span>
    <p>A 15-minute cron curls <code>/healthz</code> — no SSH, no secrets, and deliberately <em>no bot</em>, "so nothing accumulates in the state store." The same probe the smoke and the deploy verification already use.</p>
  </div>
</div>

Underneath it all is one zero-config property: the client always dials `ws(s)://` on the page's own origin — nothing hardcoded — which is why localhost, LAN, Tailscale Funnel, and the Caddy-fronted VPS all run the identical build.

<blockquote class="pull">
  <p>"Sourcing (<code>. env</code>) would parameter-expand the values, and a bcrypt hash is full of <code>$</code> sequences — under <code>set -u</code> that aborts outright, and otherwise it silently mangles the hash. So read KEY=VALUE literally."</p>
  <cite>deploy/setup.sh — the kind of comment a pre-merge adversarial review leaves behind; this exact bug was the blocker that "would have failed 100%" of documented deploys, caught before anyone ran it</cite>
</blockquote>

<p class="eyebrow">The playbook</p>

## What made the AI pairing work

None of the above required heroics — it required a repeatable working agreement between a developer and an agent. These are the practices this repo actually demonstrates, each with its receipt.

<div class="play">
  <div class="card"><h3><span class="pin">◆</span>Write the constitution before the code</h3><p>Eight ADRs were the repo's second commit; CLAUDE.md turns them into standing orders ("YOU MUST NOT break these") every session inherits. The agent never has to guess the architecture — it's written down, with the why.</p></div>
  <div class="card"><h3><span class="pin">◆</span>The repo is the memory</h3><p>PRD, roadmap, ADRs, diagrams, specs — all in-repo, reviewable, and loadable on demand. Issues stay short because they reference ADRs for rationale. Any decision that would otherwise live in a chat gets written down.</p></div>
  <div class="card"><h3><span class="pin">◆</span>One issue at a time, specified to be checkable</h3><p>Context → Goal → Acceptance criteria → Out of scope → <em>Notes for Claude</em>. Criteria are often literally executable ("an automated test asserts…"). Underspecified? The rule is stop and ask, not guess.</p></div>
  <div class="card"><h3><span class="pin">◆</span>Make invariants structural — then test them anyway</h3><p>The answer key is unrepresentable on the wire type, the seam is lint-enforced, and both are <em>still</em> covered by unit, integration, and live-bot checks. Belt, suspenders, and a bot pulling on the trousers.</p></div>
  <div class="card"><h3><span class="pin">◆</span>Green before PR; CI is the same command</h3><p><code>npm run verify</code> locally, the identical four scripts in CI — a visible command, deliberately not a hidden pre-commit hook. Every PR body reports the gate green with the test count.</p></div>
  <div class="card"><h3><span class="pin">◆</span>Review adversarially, in waves</h3><p>Multi-agent architecture reviews found real bugs (a process-killing exception; a deploy that would have failed 100%). Cheap fixes ship immediately; expensive ones become tracked issues. Findings land in PR bodies and issues — repo-as-memory again.</p></div>
  <div class="card"><h3><span class="pin">◆</span>Bugs become issues, even mid-session</h3><p>"Found during #15's live end-to-end run" is the first line of a bug report, not a silent hotfix. The grace-timer gap (#27) and the reveal pacing (#52) both got specs, tests, and their own PRs.</p></div>
  <div class="card"><h3><span class="pin">◆</span>Park ideas with full specs; change plans with new ADRs</h3><p>Host accounts, host-paced rounds, the module registry — fully specified, deliberately unbuilt. When priorities really changed, ADR-0013 reordered milestones without editing history, naming the one piece of reasoning it reverses.</p></div>
  <div class="card"><h3><span class="pin">◆</span>Design lands before implementation</h3><p>UI spec + every-state mockups merged three hours before the first client screen, in the app's exact tokens — so implementation was a port, not an improvisation, and product decisions (✓/✗) were on record first.</p></div>
  <div class="card"><h3><span class="pin">◆</span>Prove it end to end with no humans in the room</h3><p>The definition of done was "a full game, solo": a simulated-player bot that joins, plays, reconnects, and polices secrecy — reused as the local smoke, the manual checklist, and the post-deploy verification against production.</p></div>
</div>

<p class="eyebrow">What's next</p>

## AI enters one concern at a time

v0.1 proved the loop with zero AI. The reordered roadmap (ADR-0013) now goes breadth-first: **v0.2** — polish, reconnection robustness, and a deliberately thin second game module to prove the seam with a real consumer; **v0.3** — Claude calls *in*: a custom MCP server over the question pool (`search_questions`, `add_verified_question`, `get_game_stats`) plus a generate→verify content pipeline; **v0.4** — the app calls *out*: free-text questions graded live by Claude, where answers travel up and the key still never travels down. The parked issues — host accounts, host-paced rounds, the module registry, Docker — are already specified and waiting their turn.

<footer class="article-foot">
  <p>
    Produced with Claude Code from the repository's own history — commits, ADRs, issue and PR bodies —
    with every screen re-verified against a live game during production. The Pizza repo is private, so
    artifacts are referenced by number rather than linked. Type is intentionally system sans + mono, per
    the product's own spec (no webfonts is a decision here, not an omission). Diagrams are pre-rendered
    from the repo's Mermaid sources, unmodified.
  </p>
</footer>
