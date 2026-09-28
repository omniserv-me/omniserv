/* about.js — Movement 02, DOSSIER. design.md §9.5, §3.7, §6.4.

   Four reveals, each on its own `top 72%` trigger — the section header's
   threshold — so every block arrives as it reaches the same line, whether the
   plate sits beside the copy (> 900 px) or below it:

     header       sections/header.js (index, rule, heading chars, heading depth)
     body         the three paragraphs, 102° wipe, 8τ each, 1τ stagger
     principles   bracketing hairlines, then the items left to right
     plate        frame, chamfer, rows, leaders, values, one sheen

   Plus the plate's §3.7 depth (n = 1): 5.66 px pointer, ±22.63 px scroll.
   Body copy never parallaxes.

   Nothing is hidden in CSS (as 5b's hero): each fromTo sets its own from-state
   when built, so a dead chunk leaves DOSSIER complete. Each reveal is a
   once-per-page event — a rebuild after one has started (motion toggle,
   breakpoint) leaves that block authored rather than replaying it. Reduced
   motion builds nothing: the authored page is already the final state. */

import { gsap, T, ease } from '../core/easings.js';
import { register } from '../core/registry.js';
import { pointerParallax, scrollParallax } from '../core/depth.js';
import { sectionHeader } from './header.js';

const section = document.querySelector('#dossier');
const q = (s) => section.querySelector(s);
const qa = (s) => [...section.querySelectorAll(s)];

sectionHeader(q('.head'));

const played = new Set();   // block names whose reveal has started
const START = 'top 72%';

/* A reveal on its own trigger, built only until it has played. */
function reveal(name, trigger, build) {
  if (played.has(name)) return;
  build(gsap.timeline({ scrollTrigger: { trigger, start: START }, onStart: () => played.add(name) }));
}

/* The 102° wipe (§9.5) on elements that get .wipe for its duration only, so
   a settled paragraph holds no mask layer and no will-change (§9.1). Shared
   with sections/projects.js (the card body, §9.7). */
export function wipe(els, vars) {
  els.forEach((el) => el.classList.add('wipe'));
  return gsap.fromTo(els, { '--wipe': '100%' }, {
    '--wipe': '0%', ease: ease.mask, ...vars,
    onStart() { els.forEach((el) => { el.style.willChange = 'mask-position'; }); },
    onComplete() { els.forEach((el) => { el.style.willChange = ''; el.classList.remove('wipe'); }); },
  });
}

function full() {
  const copy = q('.dossier__copy');
  const paras = qa('.dossier__copy > p');
  const principles = q('.principles');
  const plate = q('.plate');

  // ── Body: three paragraphs, 8τ each, 1τ stagger.
  reveal('body', copy, (tl) => tl.add(wipe(paras, { duration: 8 * T, stagger: 1 * T })));

  // ── Principles: the bracketing hairlines (.principles::before/::after, drawn
  // by --rule) 3τ, then the items 2τ at 0.5τ stagger, left to right.
  reveal('principles', principles, (tl) => tl
    .fromTo(principles, { '--rule': 0 }, { '--rule': 1, duration: 3 * T, ease: ease.mask })
    .fromTo(principles.querySelectorAll('li'), { opacity: 0 },
      { opacity: 1, duration: 2 * T, ease: ease.glyph, stagger: 0.5 * T }));

  // ── Fact plate — §9.5's table.
  reveal('plate', plate, (tl) => {
    // Four segments, clockwise from top-left, sequential, 2τ each = 8τ.
    // DrawSVG measures each <path> by getTotalLength() — 100 in the viewBox's
    // units, which pathLength="100" states too, so its maths is whole percent.
    plate.querySelectorAll('.plate__frame path').forEach((p, i) => {
      tl.fromTo(p, { drawSVG: '0 0' }, { drawSVG: '0 100%', duration: 2 * T, ease: ease.mask }, i * 2 * T);
    });
    // The bevel (errata E36): drawn as the top edge reaches it, handing over to
    // the right edge, so the stroke turns the cut corner. The top edge is
    // clipped where the bevel starts, and its draw is eased, so the handover
    // is the moment its eased progress reaches that point, not a share of 2τ.
    // Written as the dash itself (errata E37): the bevel's real length is
    // 24√2 ≈ 33.94, DrawSVG ignores its pathLength="100", and its draw stopped
    // at 34 %. (The frame's paths are exactly 100 long, so DrawSVG is right.)
    const bevel = (plate.offsetWidth - 24) / plate.offsetWidth;
    const f = gsap.parseEase(ease.mask);
    let lo = 0, hi = 1;
    for (let k = 0; k < 20; k++) { const m = (lo + hi) / 2; if (f(m) < bevel) lo = m; else hi = m; }
    tl.fromTo(plate.querySelector('.chamfer path'), { strokeDasharray: '0 100' },
      { strokeDasharray: '100 0', duration: 1 * T, ease: ease.mask }, lo * 2 * T);

    // Rows from 8τ, 1τ apart: label and leader at once, the value a beat later.
    qa('.plate__row').forEach((row, i) => {
      const at = 8 * T + i * T;
      tl.fromTo(row.querySelector('.plate__label'), { opacity: 0 },
        { opacity: 1, duration: 1 * T, ease: ease.glyph }, at)
        .fromTo(row.querySelector('.plate__leader'), { scaleX: 0 },
          { scaleX: 1, duration: 3 * T, ease: ease.mask }, at)
        .add(wipe([row.querySelector('.plate__value')], { duration: 3 * T }), at + T);
    });

    // One sheen sweep, at the capped opacity .plate::before carries (errata E35).
    tl.fromTo(plate, { '--sheen-x': '-120%' }, { '--sheen-x': '220%', duration: 8 * T, ease: ease.metal }, 8 * T);
  });

  // ── The plate's depth, §3.7 n = 1. Body copy never parallaxes.
  const unbind = [pointerParallax(plate, 'plate'), scrollParallax(plate, 'plate')];

  return () => {
    unbind.forEach((f) => f());
    for (const el of qa('.wipe')) { el.classList.remove('wipe'); el.style.willChange = ''; }
  };
}

register({
  name: 'about',
  // No saveStyles selectors (errata E27); no staticStates — nothing is hidden,
  // so reduced motion is the authored page.
  desktopFull: full,
  mobileFull: full,
});
