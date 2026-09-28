/* header.js — the section-header reveal. design.md §9.5 (section header),
   §3.7 (headings, n = 0), §5.4 (width axis).

   One shape in all four sections (CP3's `.head`: index, rule, heading), so one
   helper. Each section declares its header at import, before boot():

     sectionHeader(document.querySelector('#dossier .head'));

   Two halves, because the heading's chars come from the split rig:

     reveal   onSplit('heading') builds index + rule + chars as one timeline on
              a `top 72%` trigger. It runs inside the splits' context, so the
              trigger lives in a registered branch, and a re-split restores its
              progress (core/split.js). Reduced motion has no splits, so the
              authored header is its final state.
     depth    a 'headers' movement binds §3.7's heading depth — 4 px pointer,
              16 px scroll — to the whole `.head`, so index, rule and heading
              move as one unit. Never under reduced motion.

   Nothing is hidden in CSS: every from-state is set when the timeline is
   built, so a dead chunk leaves the header readable (as 5b's hero). The reveal
   is a once-per-page event: a rebuild after it has started (motion toggle,
   breakpoint) builds nothing, and the header rests authored. */

import { gsap, T, ease } from '../core/easings.js';
import { register } from '../core/registry.js';
import { onSplit, widthTween } from '../core/split.js';
import { pointerParallax, scrollParallax } from '../core/depth.js';

const heads = new Map();     // heading element → { head, start, scroll }
const played = new Map();    // heading element → the SplitText whose reveal started

/** Declare one section header. Call at module level, before boot().
 *  `start` is the reveal's trigger position; `scroll: false` drops the scroll
 *  parallax (for a header inside a pinned section, 8a). */
export function sectionHeader(head, { start = 'top 72%', scroll = true } = {}) {
  const title = head?.querySelector('[data-split="heading"]');
  if (title) heads.set(title, { head, start, scroll });
}

/* §9.5's header table. The table has no t column, so all three rows start
   together on the trigger; a "—" ease is glyph (errata E-ease). */
onSplit('heading', (self, el) => {
  const h = heads.get(el);
  // A re-split of the same instance (autoSplit on a width change) rebuilds, and
  // SplitText restores the progress; a new instance (a branch rebuild after the
  // reveal has started) builds nothing, so the header rests authored.
  if (!h || (played.has(el) && played.get(el) !== self)) return undefined;
  const { head, start } = h;
  const chars = self.chars;
  return gsap.timeline({
    scrollTrigger: { trigger: head, start },
    onStart() { played.set(el, self); chars.forEach((c) => { c.style.willChange = 'transform'; }); },
    onComplete() { chars.forEach((c) => { c.style.willChange = ''; }); },
  })
    .fromTo(head.querySelector('.head__index'), { opacity: 0 }, { opacity: 1, duration: 2 * T, ease: ease.glyph }, 0)
    .fromTo(head.querySelector('.head__rule'), { scaleX: 0 }, { scaleX: 1, duration: 3 * T, ease: ease.mask }, 0)
    // The heading compresses into place (125 → 100) where the hero name expands
    // (62 → 100): opposite motions, never the same effect twice (§9.5).
    .fromTo(chars, { yPercent: 100 }, { yPercent: 0, duration: 5 * T, ease: ease.glyph, stagger: 0.5 * T }, 0)
    .add(widthTween(chars, { from: 125, to: 100, duration: 5 * T, ease: ease.glyph, stagger: 0.5 * T }), 0);
});

function depth() {
  const off = [];
  heads.forEach(({ head, scroll }) => {
    off.push(pointerParallax(head, 'heading'));
    if (scroll) off.push(scrollParallax(head, 'heading'));
  });
  return () => off.forEach((f) => f());
}

register({
  name: 'headers',
  desktopFull: depth,
  mobileFull: depth,
});
