/* main.js — entry and boot sequence. design.md §9.1, §2.3.

   §9.1's order, which is the difference between a clean load and a visibly
   reflowing headline:
     1. read stored motion preference, run the tier probe
     2. await document.fonts.ready — before any split
     3. create splits
     4. build timelines inside gsap.context() scopes, one per movement
     5. ScrollTrigger.refresh()
     6. dismiss the veil */

import { ScrollTrigger } from './core/easings.js';
import './core/split.js';   // registers the splits first, so they precede every movement's context
import { motion, tier, startSignals } from './core/signals.js';
import { boot as bootRegistry } from './core/registry.js';
import { scrollToHash, bindAnchors } from './core/smoothscroll.js';
import { resolveMotion } from './util/prefers.js';
import { holdEntrance, playEntrance } from './sections/hero.js';
import './sections/chain.js';   // §7.5 — registers now; its build arrives with the stage chunk
import { initFooter } from './sections/footer.js';
import { loadLate } from './core/lazy.js';
import { startCast } from './sections/preloader.js';

/* §2.3 — legacy anchors. Applied before ScrollTrigger initialises; step 5 then
   resolves the (possibly rewritten) hash, since replaceState does not scroll. */
const LEGACY = { about: 'dossier', stack: 'lattice', projects: 'works', socials: 'link' };
const h = location.hash.slice(1);
if (LEGACY[h]) history.replaceState(null, '', '#' + LEGACY[h]);

/* §9.3 — CAST, as early as the entry can run: only while the page is still
   loading, gone within 3 s. It holds the hero entrance and starts it at its
   exit's 5τ; without it the entrance plays at boot. */
const cast = startCast();
if (cast) {
  holdEntrance();
  cast.onReveal = playEntrance;
}

async function main() {
  // 1. Motion preference. The registry re-resolves it inside matchMedia (so a
  //    live OS change is honoured). The tier probe runs after first paint, on
  //    the stage's own renderer (core/tiers.js, loaded with gl/stage.js below).
  motion.set(resolveMotion());

  // 2. Fonts gate. The sections chunk (DOSSIER onward, §12.7) is fetched
  //    alongside: its movements and heading builders must be registered before
  //    boot() builds and splits. A failed chunk costs only their choreography —
  //    none of them hides anything in CSS.
  const sections = import('./sections/index.js').catch(() => {});
  await Promise.all([document.fonts.ready, sections]);

  // 3–4. Signals, colophon, then every registered context: the splits first
  //      (core/split.js registers at import), then each movement's timelines —
  //      sections/hero.js (§9.4) and the sections chunk (§9.5 onward). The
  //      hero entrance is built paused while CAST holds it.
  startSignals();
  initFooter();
  bootRegistry();
  bindAnchors();

  // 5.
  ScrollTrigger.refresh();
  scrollToHash(location.hash);

  // 6. Veil — §9.3. It exits once progress reaches 1 too (or at its cap).
  cast?.booted();

  // Flip + MorphSVG (§12.7) at idle after the load event — a dynamic import
  // started earlier is waited on by `load` (verified: rIC alone fired first).
  // Both motion modes: the nav indicator is feedback and survives reduced
  // motion (§10.1). A failure only costs the animation; every consumer degrades
  // to static until late() resolves.
  //
  // The WebGL stage (§7, §12.7) the same way: its chunk pulls `three` in behind
  // it, the tier probe runs on it, and its first frame lands after LCP. A
  // failed chunk leaves the canvas transparent and reports NONE.
  const idle = window.requestIdleCallback ?? ((f) => setTimeout(f, 200));
  const prefetch = () => idle(() => {
    loadLate().catch(() => {});
    import('./gl/stage.js').then((m) => m.initStage()).catch(() => tier.set('NONE'));
  });
  if (document.readyState === 'complete') prefetch();
  else window.addEventListener('load', prefetch, { once: true });

  if (new URLSearchParams(location.search).has('debug')) {
    import('./util/debug.js').then((m) => m.mountDebug());
  }
}

main();
