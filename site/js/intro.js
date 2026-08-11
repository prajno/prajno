/* prajno.com — the home page's terminal cold-open, and the control that replays it.
 *
 * The sequence is a list of BEATS played in order. Every beat knows how to play forwards
 * and backwards, which is the whole trick: the replay control plays the list backwards at
 * speed — the page comes apart, the wordmark un-types, the greeting comes back and un-types
 * — and then plays it forwards again, exactly as on a cold load.
 *
 *   hold(ms)          a pause
 *   type(spec)        characters appearing; backwards, being deleted
 *   erase(spec)       the same, the other way round
 *   swapMarkup        the typed line hands over to the real wordmark markup
 *   assemble          .pin — header flies up, subtitle and article list cascade in
 *
 * Only the typing lives here. Everything that moves in CSS (the header, the subtitle, the
 * list) is a transition between root classes — .intro / .boot / .pin / .rewind, documented
 * in site/template.html — so this file just flips classes and waits out the result.
 *
 * Who runs it: the head script in site/template.html arms .home (top-level home page, JS,
 * motion allowed) and .intro (that visitor hasn't been here in the last hour) before first
 * paint. Without .home this file does nothing at all.
 */
(function () {
  "use strict";

  const root = document.documentElement;
  const header = document.querySelector(".site-header");
  const h1 = header && header.querySelector("h1");
  if (!root.classList.contains("home") || !h1) return;

  // ————— timings —————
  const TYPE_MS = 120;        // ~100 wpm
  const ERASE_MS = 45;        // backspace is quicker than typing
  const REWIND_RATE = 3;      // the rewind runs this much faster than playback
  const CASCADE_MS = 1550;    // .pin -> the last row of the list has landed
  const UNCASCADE_MS = 1100;  // .rewind -> the header is back in mid-viewport
  const SCROLL_MS = 320;      // a replay starts from the top of the page
  const REPLAY_FADE_MS = 700; // how long the finished page waits before offering a replay

  const GREETING = "Welcome to my website...";
  const FORWARD = 1;
  const BACKWARD = -1;
  const MONO = "term";        // the greeting types in the label face, the wordmark doesn't

  // ————— the two things that get typed —————
  // The wordmark is captured character by character, each tagged with the class of the span
  // it lives in (the accent dot, the lowercase tld), so the title types out already wearing
  // its styling and the swap back to the static markup is invisible.
  const escapeChar = (ch) => ch.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const plainChars = (text) => Array.from(text, (ch) => ({ ch, cls: "" }));
  const styledChars = (node) =>
    Array.from(node.childNodes).flatMap((child) =>
      Array.from(child.textContent, (ch) => ({
        ch,
        cls: child.nodeType === Node.ELEMENT_NODE ? child.className : "",
      })));

  const WORDMARK_HTML = h1.innerHTML;
  const WORDMARK = styledChars(h1);
  const TITLE = h1.textContent.trim();
  const WELCOME = plainChars(GREETING);

  // ————— the terminal line —————
  // A single <span> holding `spec.slice(0, count)`, plus a blinking cursor. It stays mounted
  // for the whole sequence; because it renders exactly the markup the wordmark does, handing
  // back to the static title at the end doesn't move a pixel.
  let line = null;
  let cursor = null;

  function mount() {
    if (line) return;
    line = document.createElement("span");
    line.setAttribute("aria-hidden", "true");
    cursor = document.createElement("span");
    cursor.className = "type-cursor";
    cursor.textContent = "_";
    cursor.setAttribute("aria-hidden", "true");
    h1.setAttribute("aria-label", TITLE);   // screen readers get the real title throughout
    h1.textContent = "";
    h1.append(line, cursor);
    root.classList.add("boot");             // the header's contents may show now
  }

  function unmount() {
    if (!line) return;
    line = null;
    cursor = null;
    h1.classList.remove(MONO);
    if (!h1.className) h1.removeAttribute("class"); // leave the markup as the build wrote it
    h1.innerHTML = WORDMARK_HTML;
    h1.removeAttribute("aria-label");
  }

  function paint(spec, count) {
    if (!line) return;
    line.innerHTML = spec.slice(0, count)
      .map((cell) => (cell.cls
        ? `<span class="${cell.cls}">${escapeChar(cell.ch)}</span>`
        : escapeChar(cell.ch)))
      .join("");
  }

  // ————— a run —————
  // One playthrough, in one direction. Everything that waits waits through the run, so the
  // first real interaction can cut every pending timer at once: a visitor who has started
  // scrolling wants the finished page, not the rest of the show.
  function createRun(rate) {
    const pending = new Set();
    const run = {
      rate,
      skipped: false,
      skip() {
        run.skipped = true;
        pending.forEach((cancel) => cancel());
      },
      // The rewind plays quicker, so anything this file times itself is scaled by the rate…
      wait(ms) { return run.pause(ms / run.rate); },
      // …but a CSS transition takes as long as the stylesheet says it does. Waiting one out
      // is a real-time wait, whichever direction we're going.
      pause(ms) {
        return new Promise((resolve) => {
          if (run.skipped || ms <= 0) return resolve();
          const cancel = () => { clearTimeout(timer); pending.delete(cancel); resolve(); };
          const timer = setTimeout(cancel, ms);
          pending.add(cancel);
        });
      },
      // Walk the character count from `from` to `to`, painting each step.
      async stream(spec, from, to, ms, face) {
        h1.classList.toggle(MONO, face === MONO);
        const step = to > from ? 1 : -1;
        paint(spec, from);
        for (let count = from; count !== to && !run.skipped; ) {
          count += step;
          paint(spec, count);
          if (count !== to) await run.wait(ms + Math.random() * 40 - 20); // human-ish rhythm
        }
      },
    };
    return run;
  }

  // ————— the beats —————
  const beat = (forward, backward) => ({ forward, backward });
  const hold = (ms) => beat((run) => run.wait(ms), (run) => run.wait(ms));
  const type = (spec, face) => beat(
    (run) => run.stream(spec, 0, spec.length, TYPE_MS, face),
    (run) => run.stream(spec, spec.length, 0, ERASE_MS, face),
  );
  const erase = (spec, face) => beat(
    (run) => run.stream(spec, spec.length, 0, ERASE_MS, face),
    (run) => run.stream(spec, 0, spec.length, TYPE_MS, face),
  );

  // The typed line bows out and the real wordmark takes over — identical rendering, so
  // nothing jumps. Backwards, the line comes back at full length to be un-typed.
  const swapMarkup = beat(
    () => { unmount(); },
    (run) => { mount(); paint(WORDMARK, WORDMARK.length); return run.wait(160); },
  );

  // The page assembles itself: the header flies up to its pinned position, the subtitle and
  // the article list cascade in behind it. Backwards, it comes apart — the list leaves in
  // the order it arrived, last row first, and the header drops back to mid-viewport.
  const assemble = beat(
    (run) => { root.classList.add("pin"); return run.pause(CASCADE_MS); },
    (run) => {
      root.classList.add("rewind");
      root.classList.remove("pin");
      return run.pause(UNCASCADE_MS);
    },
  );

  const TIMELINE = [
    hold(350),
    type(WELCOME, MONO),
    hold(1000),                 // let the cursor blink a beat
    erase(WELCOME, MONO),
    hold(180),
    type(WORDMARK),             // the title types in the display face
    hold(720),
    swapMarkup,
    assemble,
  ];

  // ————— playing it —————
  let running = null;

  // The end of the road in both directions: the finished, pinned page. A skip lands here.
  function settle() {
    root.classList.remove("rewind");
    unmount();
    root.classList.add("boot", "pin");
    dispatchEvent(new Event("prajno:settled")); // the accordion script re-measures the header
  }

  async function play(direction, rate) {
    const run = createRun(rate);
    running = run;
    const beats = direction === FORWARD ? TIMELINE : TIMELINE.slice().reverse();
    for (const step of beats) {
      if (run.skipped) break;
      await (direction === FORWARD ? step.forward : step.backward)(run);
    }
    running = null;
    return !run.skipped;
  }

  async function playIntro() {
    hideReplay();
    mount();
    if (!(await play(FORWARD, 1))) settle();
    else dispatchEvent(new Event("prajno:settled"));
    showReplay();
  }

  async function replayIntro() {
    hideReplay();
    dispatchEvent(new Event("prajno:replay"));  // an expanded article shouldn't rewind with the page
    window.scrollTo({ top: 0, behavior: "smooth" });
    // A visitor inside the cool-down hour has none of these classes yet. Adding them to an
    // already-settled page is inert — .pin *is* the settled state — so nothing flickers.
    root.classList.add("intro", "boot", "pin");
    await new Promise((resolve) => setTimeout(resolve, SCROLL_MS));
    const rewound = await play(BACKWARD, REWIND_RATE);
    root.classList.remove("rewind");
    if (!rewound) { settle(); showReplay(); return; }
    await playIntro();
  }

  // A visitor who clicks, types, or scrolls gets the finished page immediately — but the
  // click that asks for a replay obviously doesn't count as wanting out of it.
  ["pointerdown", "keydown", "wheel", "touchstart"].forEach((event) => {
    addEventListener(event, (e) => {
      if (!running) return;
      if (e.target instanceof Element && e.target.closest(".replay")) return;
      running.skip();
    }, { passive: true });
  });

  // ————— the replay control —————
  // Injected rather than templated: it is useless without JS, it only belongs on the home
  // page, and it is never offered to a visitor who asked for reduced motion (that visitor
  // never gets .home in the first place).
  const replay = document.createElement("button");
  replay.type = "button";
  replay.className = "replay";
  replay.title = "Replay intro";
  replay.setAttribute("aria-label", "Replay the intro animation");
  replay.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
  replay.addEventListener("click", replayIntro);
  header.querySelector(".inner").append(replay);

  function showReplay() { replay.classList.add("on"); }
  function hideReplay() { replay.classList.remove("on"); }

  if (root.classList.contains("intro")) playIntro();
  else setTimeout(showReplay, REPLAY_FADE_MS); // seen recently: the finished page, and a way back
})();
