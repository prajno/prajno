---
title: "The night every check lied: a deploy retro"
subtitle: "A trivia pool took 21 hours to reach its URL. The code was fine the whole time — every check in the deploy chain was reporting something other than what it claimed to test."
date: 2026-08-02
description: A follow-up to the Pizza MVP case study — six latent deploy defects with one shape, the retro that mapped them, and the tests that now guard the guards.
---

<header class="hero" id="top">
  <p class="eyebrow">Retro · The same private repo, one long night later · August 2026</p>
  <h1>The night every check <span class="brand">lied</span></h1>
  <p class="lede">
    Two weeks after <a href="../pizza-mvp/">Pizza's fourteen-day MVP</a> shipped, a chat skill generated
    a themed trivia pool and handed back a play link. Getting that link to actually work took
    <strong>21 hours and six deploys that shipped nothing</strong> — five red, and one that
    reported success — while the correct game code sat on the box the entire time. This is the story of the best debugging night the project ever had: six latent
    defects with one shape, a retrospective reconstructed from primary artifacts, and a prevention
    backlog that ended with the deploy pipeline tested as seriously as the product.
  </p>
  <div class="statgrid">
    <div class="stat"><div class="n">21h</div><div class="l">link → playable</div></div>
    <div class="stat"><div class="n">209s</div><div class="l">CI compute, all six failures</div></div>
    <div class="stat"><div class="n">6</div><div class="l">defects · one shape</div></div>
    <div class="stat"><div class="n">17</div><div class="l">PRs in the arc</div></div>
    <div class="stat"><div class="n">205</div><div class="l">tests · was 182</div></div>
    <div class="stat"><div class="n">135</div><div class="l">review agents fanned out</div></div>
  </div>
  <p class="hero-note">Set in Pizza's own design tokens, like the case study before it — the retro wears the product too.</p>
</header>

<p class="eyebrow">The evening</p>

## A skill, a pool, a link

The night started as a demo of the pleasant kind. Pizza's `/new-trivia-game` skill turns "I'm ready to play trivia" into a validated, content-addressed question pool: pick topics in chat (wine regions, Bravo shows, and cars — a genuinely chaotic committee decision), and the skill writes the questions, validates them with the same loader the server runs at startup, names the file by its content hash, opens a PR, and hands back a play link keyed to that hash.

The generation half worked beautifully. It even caught a real design trap on the way: the first draft put every correct answer at index 0, and since the platform ships options in authored order — no shuffle — "always pick the first one" would have been a winning strategy by round three. The pool went out with answers spread evenly, the PR merged, and the link went to the group chat.

The link served the default geography questions instead.

<p class="eyebrow">The incident</p>

## A deploy that reported success and shipped nothing

The investigation found something better than a bug: a **false green**. A deploy run from earlier that morning showed a passing checkmark on every step — and had deployed nothing at all. The deploy script had rsynced files to the box, hit a "not provisioned" branch that printed instructions *and then fell through*, and exited 0. The workflow's post-deploy smoke then ran a full bot game against the server and passed — because the eight-day-old process answering the socket played a perfectly good game of the *old* questions.

That green checkmark did more damage than any red one could. Nobody debugs a passing deploy. The box served stale code for a week while a scheduled monitor blessed it with a hundred consecutive healthy probes, because the monitor asked only one question — *does <code>/healthz</code> answer?* — and an out-of-date server answers it just as happily as a current one.

The fix for that specific hole was quick: the fall-through became a hard failure, and the server gained an open `/version` endpoint reporting the commit it was built from, asserted after every deploy. But the interesting part of the night was what fixing it revealed.

<p class="eyebrow">Six defects, one shape</p>

## Every check was answering a different question

Each fix peeled back the next defect. Six in total, and lined up they were not six different mistakes — they were one mistake, six times: **a check reporting a proxy for the thing it claimed to test, and failing open.**

| The check | What it claimed | What it actually measured |
| --- | --- | --- |
| `ssh …; exit 0` | the code shipped | the ssh session ended |
| `systemctl enable --now` | the new build is running | the unit is enabled and not stopped |
| `list-unit-files \| grep -q` | the unit exists | pipe scheduling — see below |
| `/healthz` 200, for 8 days | the demo works | a socket answered |
| smoke `overall: PASS` | the deploy is good | *some* process played a game |
| `/version` == expected | these bytes are running | a stamp file written before the build |

The crown jewel was the provisioned-box guard, which is worth spelling out because it is the purest specimen of the species you will ever see:

```bash
systemctl list-unit-files | grep -q '^pizza.service'
```

Under `set -o pipefail`, `grep -q` exits the instant it matches. That kills `systemctl` mid-write with SIGPIPE, and the pipeline reports exit 141. **Finding the unit made the test fail.** Measured on the box, same command, same user:

```text
without pipefail : exit 0     ← how every by-hand check ran
with    pipefail : exit 141   ← how the deploy actually ran it
```

The guard had carried this from its very first commit — it and its `set -euo pipefail` shipped together — and whether it passed came down to a scheduling race it won for weeks and then started losing. The box it called "not provisioned" was provisioned the entire time.

<p class="eyebrow">The trap</p>

## Acting on a lying check makes things worse

The most expensive lesson of the night wasn't a shell quirk. It was this: the false "not provisioned" verdict came bundled with its own printed remediation — *re-run the provisioning script* — and following it created **two brand-new defects**. The re-provision handed the app directory to the wrong user (silently cutting CI off, surfacing two runs later as an unrelated-looking sudo error) and regenerated the server's env file from a fixed list of keys, silently deleting the game-length setting. The live demo became a twelve-minute trivia marathon, and the post-deploy smoke — whose duration tracked that setting — started timing out on deploys that were otherwise perfect.

Two of the six failed cycles were self-inflicted, spent fixing a problem that did not exist. And the contradiction was visible *before* the damage: the running process had been started by systemd, which is only possible if the unit the guard couldn't find existed. The wrong move was resolving that contradiction in the guard's favor — inventing a world where the unit file had been deleted — instead of suspecting the guard.

That principle is now written into the project's working agreements, stated generally: **a check's verdict loses to a direct observation.** When they disagree, the default hypothesis is a broken check, not a world in exactly the exotic state that makes the check right. Corroborate the same proposition by a different mechanism before acting — especially when the verdict helpfully prints its own fix.

<p class="eyebrow">Write it down</p>

## A retro reconstructed from artifacts, not memory

Once the pool finally played, the session's last act was a retrospective — now a first-class artifact in the repo under `docs/retros/`, sitting alongside the ADRs for the same reason ADRs exist: so future sessions inherit conclusions instead of re-deriving them.

The interesting choice was *how* it was written. After a night of confidently wrong diagnoses, the retro was deliberately **not** written from memory. A fan-out of agents reconstructed the timeline from primary sources — CI logs, `git log -S`, PR and issue bodies, the live box's state — across four independent lenses, with every claim carrying its evidence and every prevention proposal put through a hard critic before earning a place. The method promptly justified itself: the reconstruction surfaced two factual errors in the working narrative (a wrong question count, a wrong PR attribution) that got corrected before anything was committed.

The retro's most useful section may be the least flattering one: **residual holes** — the things the night's fixes deliberately did *not* solve. Pinning the smoke to a tiny fixture pool made deploys fast and deterministic, but it also made the smoke insensitive to the exact config drift that broke it; one assertion had quietly become vacuous. Writing down what a fix *doesn't* cover is what turned the retro into a backlog instead of a victory lap.

<p class="eyebrow">The backlog</p>

## Fifteen checkboxes: making every check test what it claims

The retro's prevention items became a single milestone issue — fifteen checkboxes, ordered by value-for-effort, each traceable to a specific defect. All fifteen shipped across eight PRs. The through-line: every guard gets the treatment the product's own invariants get, including tests that prove the check *can* fail.

<div class="cardgrid">
  <div class="card accent-a"><h3><span class="pin">◆</span>A lint for the bug class, not the bug</h3><p>A repo-specific shell lint now bans pipelines into short-circuiting readers in any pipefail script — the SIGPIPE trap, caught at author time. Its test is two-polarity: the lint must <em>fail</em> on the exact historical file that caused the incident (naming the guilty line) and <em>pass</em> on the current tree. A check that has never been seen failing is not a check.</p></div>
  <div class="card accent-b"><h3><span class="pin">◆</span>The stamp travels with the bytes</h3><p>The build itself now emits the commit stamp into the artifact as its last step, and the server reads it from beside its own compiled module. Whatever code a process loads, it reports <em>that</em> code's commit — proven by rebuilding with one stamp, planting a decoy in the old location, and watching the right one win.</p></div>
  <div class="card accent-c"><h3><span class="pin">◆</span>Monitoring that can tell stale from down</h3><p>Every deploy uploads the shipped commit as an artifact; the scheduled monitor now compares the live <code>/version</code> against it in a second job, separate from the health probe — so "down" and "up but wrong build" notify distinguishably. The eight-day blind spot is structurally closed.</p></div>
  <div class="card accent-d"><h3><span class="pin">◆</span>Failures report observations, not guesses</h3><p>The bot's timeout used to ask "is the server running?" — wrong twice in one night. It now reports what it saw: rounds completed, last message type, elapsed. A test literally asserts the message <em>does not</em> speculate about the cause. The host screen got the same medicine: a refused room now renders actionable copy instead of an eternal spinner.</p></div>
  <div class="card accent-a"><h3><span class="pin">◆</span>Config drift has its own detector</h3><p>The commit check is structurally blind to env-file drift, so the server now reports its effective game settings on an open JSON endpoint and deploys assert them against stated intent. The payload admits finite numbers only — a secret is <em>unrepresentable</em>, and the test feeds it a whole parsed env file, secrets included, to prove it.</p></div>
  <div class="card accent-b"><h3><span class="pin">◆</span>Diagnosis executes the real check</h3><p>A new read-only <code>diagnose</code> operation streams from the repo checkout and <em>runs the same precondition functions the deploy gates on</em> — because reproducing a check's inputs by hand is how the SIGPIPE bug hid. It runs to completion on broken boxes by design, and prints secrets' key names only, never values.</p></div>
</div>

The fifteenth checkbox was the big one: `setup.sh`, the provisioning script, had claimed *"Idempotent — safe to re-run"* in its header since its first commit. The second time it ever ran on a live box, that claim failed three ways at once. It is now enforced by CI: a harness provisions a throwaway runner **twice** against real systemd — no mocks, since a fake `systemctl` only exhibits the missing semantic if its author already knew the bug — recreating the exact incident shape between runs, and asserts the three survivors: the service PID moved, the directory kept its owner, and every stated setting survived regeneration.

```text
==> RUN 2: the box is LIVE and CI-owned — the exact incident shape
✅ (a) service restarted onto the second run's build (PID 3330 → 3992)
✅ (b) /opt/pizza still owned by the pre-existing owner (deploy)
✅ (c) QUESTIONS_PER_GAME=7 survived regeneration
✅ (c) ROUND_MS=20000 survived regeneration
```

A comment that says "idempotent" is a wish. A CI job that runs it twice is a fact.

<p class="eyebrow">The shipping log</p>

## Eight PRs, in the order they landed

The first six fixes shipped *during* the incident — mid-firefight patches (#73, #74, #78–#81) that each stopped one specific bleed. The prevention backlog was different work: eight deliberate PRs, landed the next day on clean ground, each one making a whole *class* of failure impossible rather than closing a single instance. In order:

| PR | What it made true |
| --- | --- |
| #84 | The SIGPIPE trap is caught at author time: a repo-specific shell lint, wired into the same `verify` gate as the product's tests — proven able to fail by running it against the exact historical file that caused the incident. The deploy script also now prints raw box observations before anything can fail. |
| #85 | Monitoring can tell *stale* from *down*: every deploy uploads its shipped commit as an artifact, and a second monitor job compares the live `/version` against it. Also fixed a subtle attestation bug where, on the documented rollback path, the workflow would have stamped and asserted the wrong commit — self-consistently. |
| #86 | The commit stamp travels with the bytes: emitted into the build artifact as the build's last act, read from beside the compiled module — so a process restarted onto old code reports *old* code, proven with a planted decoy stamp. |
| #87 | The two working agreements the night was missing — reproduce in the exact shell, *flags included*; a check's verdict loses to a direct observation — written into the project guide, with the operational detail moved to a debugging runbook. Closed the skill-handoff gap too. |
| #88 | Failures describe observations, not guesses: the bot's timeout reports rounds seen and last message instead of asking "is the server running?", and the host screen renders a refused room as actionable copy instead of an eternal spinner. |
| #89 | Config drift is detectable from outside: an open JSON endpoint reports the effective game settings, asserted against stated intent at deploy time — with a payload that structurally cannot carry a secret. |
| #90 | Diagnosis executes the real checks: the deploy gate's precondition functions moved to a shared library, and a read-only `diagnose` operation runs *them* — because reproducing a check's inputs by hand is exactly how the SIGPIPE bug stayed hidden. |
| #91 | The idempotence harness above — `setup.sh` run twice against real systemd on every change to the deploy scripts. Merging it closed the milestone. |

Two habits carried across all eight, and they were the retro talking: every check shipped alongside a demonstration that it *can* fail — the lint against the historical bug, the drift check against a planted mismatch, the harness against the incident's exact shape — and every failure message was rewritten to report what was observed rather than what the author guessed. The night's tuition, paid forward.

<p class="eyebrow">Skills</p>

## The skill grew a proof step

The `/new-trivia-game` skill that started the night got the final lesson folded back into it. Its old ending — deploy, then hand over the link — is exactly what produced a link to nowhere, because a deploy having run was never the same claim as *this pool being served*. The skill's handoff is now a verified sequence: the user dispatches the deploy, the simulated-player bot plays the new pool against production — pinned to its content hash, expecting a fragment from one of its own freshly written questions — and only a passing run releases the link.

That closed the loop in a satisfying way: the bot gained `--pool` and `--expect-prompt` flags as the night's first fix, the deploy smoke uses them pinned to a fixture pool, and the skill uses them pinned to *your* pool. One harness, three duties — and a skill that encodes an operational lesson is a lesson the next session cannot forget to apply.

<p class="eyebrow">The playbook</p>

## What this night taught, in six lines

<div class="cardgrid">
  <div class="card"><h3><span class="pin">◆</span>A check must test the thing it claims</h3><p>Not a proxy, not a consequence, not "something answered." Files on disk, a rebuilt artifact, and a live process are three different things — assert the one you mean.</p></div>
  <div class="card"><h3><span class="pin">◆</span>Green you cannot see failing is not green</h3><p>Every new guard shipped with its negative case exercised — the lint fails on the historical bug, the drift check fails on a planted mismatch, the harness red-flags an unmoved PID. Both polarities, every time.</p></div>
  <div class="card"><h3><span class="pin">◆</span>Reproduce in the exact shell, flags included</h3><p>The guard was "verified" as the right user in the wrong shell mode and gave the opposite answer. Identity <em>and</em> flags are the environment; the working agreement now names both.</p></div>
  <div class="card"><h3><span class="pin">◆</span>A verdict loses to a direct observation</h3><p>When a check contradicts something already observed, suspect the check — especially one that prints its own remediation. Acting on the false verdict was the only thing that created <em>new</em> defects all night.</p></div>
  <div class="card"><h3><span class="pin">◆</span>Capture evidence before repairing</h3><p>The re-provision overwrote the very files that would have proven the root cause. Diagnosis now runs before and after any repair, read-only, and its output is the attachment on the issue.</p></div>
  <div class="card"><h3><span class="pin">◆</span>Write the retro from artifacts</h3><p>Memory had already been wrong five times that night. Reconstructing from logs and history — with claims carrying evidence — caught two more errors before they fossilized into the record.</p></div>
</div>

<p class="eyebrow">What's next</p>

## The pipeline is now part of the product

The MVP case study ended with a quality loop for the *game*: specs that read like tests, a bot for QA, invariants enforced by the compiler. This night extended that loop to the delivery system itself — the deploy scripts now have their own lint, their own CI, their own end-to-end harness, and their own retro-driven backlog, exactly like the code they ship. The wine-Bravo-and-cars pool, for the record, plays great. The hard questions are the Portuguese wine valley and remembering which city launched the Housewives franchise — and the platform, true to its founding invariant, still refuses to tell your phone the answer.

<footer class="article-foot">
  <p>
    Produced with Claude Code from the repository's own history — CI run logs, commits, PR and issue
    bodies, and the retro document in <code>docs/retros/</code> — during and immediately after the
    session it describes. The Pizza repo is private, so artifacts are referenced by number rather
    than linked, as in the case study before it. The incident timeline and every quoted measurement (exit codes, PIDs, durations) come
    from the reconstructed retro, which was itself fact-checked against primary sources before this
    page was written.
  </p>
</footer>
