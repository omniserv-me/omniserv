/* registry.js — the context registry and matchMedia branches. design.md §9.1
   (teardown), §9.10 (motion toggle mechanics), §10.1 (motion resolution).

   Every movement registers once, before boot():

     register({
       name: 'hero',
       desktopFull() {…},                // (prefers full) and (min-width: 901px)
       mobileFull() {…},                 // (prefers full) and (max-width: 900px)
       staticStates() {…},               // reduced: gsap.set to final states only
     });

   Each branch runs inside its own gsap.context(), held here. Toggling motion
   reverts every context, flips the stored preference and rebuilds in the other
   mode — no reload. Each branch restores what it wrote: its context's revert
   plus the cleanup it returns put the DOM back in its authored state before
   the rebuild. There is no ScrollTrigger.saveStyles(): ScrollTrigger restores
   every saved record on *any* media-query change, its own (orientation:
   portrait) query included, even when no context toggled — after a 900 px
   crossing into a portrait viewport it wiped the rebuilt hero.

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

/* §10.1 — the reader's place survives a rebuild. A raw px position does not:
   the WORKS pin adds ~D px of scroll under full motion and none under reduced
   (a toggle mid-pin landed in LINK), and a 900 px crossing reset it to 0.
   So the place is held as "this far through
   that section" — the fraction between its top and the next one's, in scroll
   px, pin spacer included — and resolved again against the rebuilt page. */
const PLACES = 'main section, #colophon';   // not main > section: the pin-spacer wraps #works

/* Measured from layout, never with smoother.offset(): that creates a throwaway
   ScrollTrigger, whose refresh reverts the WORKS pin — moving #works out of
   its pin-spacer and back, which drops keyboard focus from a card (11b; it
   ran 300 ms after every scroll, the focus glide's included). The pin-spacer
   stands in for a pinned section, and under the smoother both rects share the
   content's transform, so their difference is the layout offset. */
function startOf(el) {
  const box = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;
  const top = box.getBoundingClientRect().top;
  const y = getSmoother()
    ? top - document.getElementById('smooth-content').getBoundingClientRect().top
    : top + window.scrollY;
  return Math.min(y, ScrollTrigger.maxScroll(window));   // the colophon's top may never reach the top
}

function scrollPos() { return getSmoother()?.scrollTop() ?? window.scrollY; }

function place() {
  const els = [...document.querySelectorAll(PLACES)];
  const y = scrollPos();
  const max = ScrollTrigger.maxScroll(window);
  const starts = els.map(startOf);
  let i = starts.length - 1;
  while (i > 0 && starts[i] > y) i--;
  const end = i + 1 < starts.length ? starts[i + 1] : max;
  return { el: els[i], f: end > starts[i] ? (y - starts[i]) / (end - starts[i]) : 0, next: els[i + 1] };
}

function restore({ el, f, next }) {
  const start = startOf(el);
  const end = next ? startOf(next) : ScrollTrigger.maxScroll(window);
  const y = start + f * Math.max(end - start, 0);
  const smoother = getSmoother();
  if (smoother) smoother.scrollTop(y);
  else window.scrollTo(0, y);
}

let held = null;      // a place captured by setMotion(), which restores it itself
let pending = null;   // the place a media-driven rebuild restores
/* A media change can't capture its own place: by the time gsap.matchMedia
   reverts, the resize has already reset the scroll to 0 (measured at 1440 →
   800). So the place is recorded once scrolling has been still for 300 ms, and
   a media-driven rebuild restores the last one — on every refresh for the next
   second, since ScrollTrigger's own debounced resize refresh moves the scroll
   again after the first. */
let settled = null;
let restoring = null;
let settleId = 0;
let restoreId = 0;
function onScroll() {   // plain timers: nothing of the registry's own sits on the global timeline
  clearTimeout(settleId);
  settleId = setTimeout(() => { if (!restoring) settled = place(); }, 300);
}
function holdRestore() {
  clearTimeout(restoreId);
  restoreId = setTimeout(() => { restoring = null; onScroll(); }, 1000);
}
function onRefresh() {
  if (!restoring) return;
  restore(restoring);
  holdRestore();
}

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

    // A media change (breakpoint, OS preference) rebuilds on its own; its
    // place is restored once ScrollTrigger has re-measured the new layout.
    if (pending) {
      restoring = pending;
      pending = null;
      holdRestore();
    }

    return () => {
      if (!held) pending = settled;
      contexts.forEach((ctx) => ctx.revert());
      contexts.clear();
      killSmoother();
    };
  });
}

export function boot() {
  build();
  ScrollTrigger.addEventListener('refresh', onRefresh);
  window.addEventListener('scroll', onScroll, { passive: true });
}

export function setMotion(mode) {
  held = place();
  storeMotion(mode);
  mm.revert();
  build();
  ScrollTrigger.refresh();
  restore(held);
  held = null;
}
