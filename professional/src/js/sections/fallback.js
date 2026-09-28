/* fallback.js — the tier-NONE fallback's position. design.md §10.3 (errata E19),
   §7.5 (the spine's X per movement).

   The layer itself is static markup and CSS (index.html .fallback, shown by
   html[data-tier="NONE"]). This only moves it to where the spine would run:
   X +0.26 through IDENTITY, −0.28 from DOSSIER (LATTICE and WORKS keep it — a
   static strip has no branch and no horizontal run), +0.30 from LINK on. Two
   start-only triggers, the state read off the scroll, as the chain's reduced
   branch does (gl/movements.js). A change dips the layer's opacity over 3τ
   (metal) and moves it at the trough; under reduced motion it just moves.
   The CSS leans the strip in by the chain's at-rest bow (≈ 0.08·H toward
   centre, tokens.css --spine-at): at 1440 the real spine's links run
   994–1059 px at IDENTITY, in the tagline–portrait gutter, not at X itself.

   NONE is known only after the stage chunk has probed, well after boot, so the
   build joins the live registered context late (the pattern of
   sections/chain.js) and is reverted with it. At every other tier nothing is
   built. */

import { gsap, ScrollTrigger, T, ease } from '../core/easings.js';
import { register, getContexts } from '../core/registry.js';
import { tier } from '../core/signals.js';

const X = { identity: 0.26, margin: -0.28, loop: 0.3 };
const layer = document.querySelector('.fallback');
const root = document.documentElement;
let mode = null;
let shown = false;

function build() {
  if (!layer || !mode || tier.value !== 'NONE') return;
  const reduced = mode === 'reduced';
  const place = (x) => {
    root.style.setProperty('--spine-x', x);
    root.style.setProperty('--spine-side', Math.sign(x));
  };
  let ready = false;
  let x = null;
  let tl = null;

  const at = (trigger) =>
    ScrollTrigger.create({ trigger, start: 'top center', onToggle: apply, onRefresh: apply });
  const past = (t) => t.scroll() >= t.start;
  const d = at('#dossier');
  const k = at('#link');
  ready = true;

  function apply() {
    if (!ready) return;                // the triggers' own creation-time refresh
    const next = past(k) ? X.loop : past(d) ? X.margin : X.identity;
    if (next === x) return;
    const first = x === null;
    x = next;
    tl?.kill();
    if (first || reduced) {
      place(x);
      return;
    }
    tl = gsap.timeline()
      .to(layer, { opacity: 0, duration: 1.5 * T, ease: ease.metal })
      .call(() => place(x))
      .to(layer, { opacity: 1, duration: 1.5 * T, ease: ease.metal });
  }
  apply();

  // First appearance: fade in over 8τ, as the canvas would have (§12.7).
  if (!shown && !reduced) gsap.fromTo(layer, { opacity: 0 }, { opacity: 1, duration: 8 * T, ease: ease.metal });
  shown = true;

  return () => {
    tl?.kill();
    gsap.killTweensOf(layer);
    gsap.set(layer, { clearProps: 'opacity' });
  };
}

const run = (m) => () => {
  mode = m;
  return build();
};

register({
  name: 'fallback',
  desktopFull: run('full'),
  mobileFull: run('full'),
  staticStates: run('reduced'),
});

tier.subscribe((t) => {
  if (t === 'NONE') getContexts().get('fallback')?.add(build);
});
