/* main.js — entry and boot sequence. design.md §9.1, §2.3.

   §9.1's order, which is the difference between a clean load and a visibly
   reflowing headline:
     1. read stored motion preference, run the tier probe
     2. await document.fonts.ready — before any split
     3. create splits
     4. build timelines inside gsap.context() scopes, one per movement
     5. ScrollTrigger.refresh()
     6. dismiss the veil
   Steps not yet built are marked with the checkpoint that owns them. */

import { ScrollTrigger } from './core/easings.js';
import './core/split.js';   // registers the splits first, so they precede every movement's context
import { motion, startSignals } from './core/signals.js';
import { boot as bootRegistry } from './core/registry.js';
import { scrollToHash, bindAnchors } from './core/smoothscroll.js';
import { resolveMotion } from './util/prefers.js';
import { initFooter } from './sections/footer.js';
import { loadLate } from './core/lazy.js';

/* §2.3 — legacy anchors. Applied before ScrollTrigger initialises; step 5 then
   resolves the (possibly rewritten) hash, since replaceState does not scroll. */
const LEGACY = { about: 'dossier', stack: 'lattice', projects: 'works', socials: 'link' };
const h = location.hash.slice(1);
if (LEGACY[h]) history.replaceState(null, '', '#' + LEGACY[h]);

async function main() {
  // 1. Motion preference. The registry re-resolves it inside matchMedia (so a
  //    live OS change is honoured); this early read is for the tier probe.
  //    Tier probe — checkpoint 6 (tiers.js).
  motion.set(resolveMotion());

  // 2. Fonts gate.
  await document.fonts.ready;

  // 3–4. Signals, colophon, then every registered context: the splits first
  //      (core/split.js registers at import), then each movement's timelines.
  startSignals();
  initFooter();
  bootRegistry();
  bindAnchors();

  // 5.
  ScrollTrigger.refresh();
  scrollToHash(location.hash);

  // 6. Veil — §9.3.

  // Flip + MorphSVG (§12.7) at idle after the load event — a dynamic import
  // started earlier is waited on by `load` (verified: rIC alone fired first).
  // Both motion modes: the nav indicator is feedback and survives reduced
  // motion (§10.1). A failure only costs the animation; every consumer degrades
  // to static until late() resolves.
  const idle = window.requestIdleCallback ?? ((f) => setTimeout(f, 200));
  const prefetch = () => idle(() => loadLate().catch(() => {}));
  if (document.readyState === 'complete') prefetch();
  else window.addEventListener('load', prefetch, { once: true });

  if (new URLSearchParams(location.search).has('debug')) {
    import('./util/debug.js').then((m) => m.mountDebug());
  }
}

main();
