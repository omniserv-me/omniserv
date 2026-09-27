/* registry.js — the context registry and matchMedia branches. design.md §9.1
   (teardown), §9.10 (motion toggle mechanics), §10.1 (motion resolution).

   Every movement registers once, before boot():

     register({
       name: 'hero',
       selectors: ['.hero__name', …],    // everything it animates → saveStyles
       desktopFull() {…},                // (prefers full) and (min-width: 901px)
       mobileFull() {…},                 // (prefers full) and (max-width: 900px)
       staticStates() {…},               // reduced: gsap.set to final states only
     });

   Each branch runs inside its own gsap.context(), held here. Toggling motion
   reverts every context, flips the stored preference and rebuilds in the other
   mode — no reload — and saveStyles guarantees the DOM is back in its authored
   state before the rebuild.

   Why one conditions handler instead of §9.1's three literal mm.add() queries:
   §10.1 lets a stored toggle override the OS preference in both directions, and
   a media query cannot see localStorage. So the queries decide width and report
   the OS preference, resolveMotion() applies the override, and the handler
   dispatches to the same three branches §9.1 names. matchMedia still owns
   reversion: a breakpoint or OS-preference change reverts and re-runs it. */

import { gsap, ScrollTrigger } from './easings.js';
import { motion, trackVelocity } from './signals.js';
import { createSmoother, killSmoother, getSmoother } from './smoothscroll.js';
import { resolveMotion, storeMotion } from '../util/prefers.js';

const CONDITIONS = {
  desktop: '(min-width: 901px)',
  mobile: '(max-width: 900px)',
  osReduced: '(prefers-reduced-motion: reduce)',
};

const movements = [];
const contexts = new Map();   // movement name → its live gsap.context()
let mm = null;

export function register(movement) {
  if (mm) throw new Error(`registry: "${movement.name}" registered after boot()`);
  movements.push(movement);
}

export const getContexts = () => contexts;

function build() {
  mm = gsap.matchMedia();
  mm.add(CONDITIONS, (self) => {
    const { desktop, osReduced } = self.conditions;
    const mode = resolveMotion(osReduced);
    motion.set(mode);
    document.documentElement.dataset.motion = mode;

    if (mode === 'full') createSmoother();
    trackVelocity();   // after the smoother, so it binds to the live scroller

    const branch = mode === 'reduced' ? 'staticStates' : desktop ? 'desktopFull' : 'mobileFull';
    for (const m of movements) {
      contexts.set(m.name, gsap.context(() => m[branch]?.()));
    }

    return () => {
      contexts.forEach((ctx) => ctx.revert());
      contexts.clear();
      killSmoother();
    };
  });
}

export function boot() {
  const selectors = movements.flatMap((m) => m.selectors ?? []);
  if (selectors.length) ScrollTrigger.saveStyles(selectors.join(','));
  build();
}

export function setMotion(mode) {
  // Hold the reader's place: the smoother and native scroll share window.scrollY,
  // but killing or creating the smoother changes the body height for a moment.
  const y = getSmoother()?.scrollTop() ?? window.scrollY;
  storeMotion(mode);
  mm.revert();
  build();
  ScrollTrigger.refresh();
  const smoother = getSmoother();
  if (smoother) smoother.scrollTop(y);
  else window.scrollTo(0, y);
}
