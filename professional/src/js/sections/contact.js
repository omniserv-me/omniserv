/* contact.js — Movement 05, LINK. design.md §9.8, §6.7.

     header     sections/header.js (index, rule, heading chars, heading depth)
     rows       each row's hairline draws (scaleX 0→1 via --rule, 3τ mask,
                origin left, 1τ stagger) as its label and value fade in (2τ)
     glyph      hover / focus-visible morphs the open link into the closed
                one (MorphSVG, 3τ chain) — the page's thesis in one gesture
     snap       once per visit, as the loop closes: the final link seats and
                the stage flashes (errata E45; sections/chain.js → the stage)
     CTA        one 8τ sheen sweep as the Dossier CTA reaches the line; its
                hover repeats it (the .btn--metal rule, errata E47)

   The row's label, underline and value hover states are CSS transitions, so
   they have keyboard parity and work with JS dead. MorphSVG arrives with the
   late chunk (core/lazy.js): until then, and under reduced motion, CSS
   crossfades the two glyph paths; once it is here, .rows.is-morph retires
   the crossfade and the open path itself is morphed.

   Nothing is hidden in CSS (as 7a): each fromTo sets its own from-state when
   built, and a reveal is once per page. Reduced motion builds nothing. */

import { gsap, ScrollTrigger, T, ease } from '../core/easings.js';
import { register } from '../core/registry.js';
import { late } from '../core/lazy.js';
import { sectionHeader } from './header.js';
import { snapLoop } from './chain.js';

const section = document.querySelector('#link');
const q = (s) => section.querySelector(s);
const qa = (s) => [...section.querySelectorAll(s)];

sectionHeader(q('.head'));

const played = new Set();
const START = 'top 72%';

function reveal(name, trigger, build) {
  if (played.has(name)) return;
  build(gsap.timeline({ scrollTrigger: { trigger, start: START }, onStart: () => played.add(name) }));
}

/* §9.8 glyph. Hovered or keyboard-focused closes it; the two paths are
   authored with matched structure (4 cubics each), so shapeIndex 0 keeps
   MorphSVG from re-mapping start points — letting it guess is the wobble. */
function glyphs() {
  const rows = q('.rows');
  const off = qa('.row__link').map((link) => {
    const open = link.querySelector('.row__glyph-open');
    const closed = link.querySelector('.row__glyph-closed');
    const openD = open.getAttribute('d');
    let hover = false;
    let focus = false;
    let shut = false;
    const set = () => {
      const want = hover || focus;
      if (want === shut || !late()?.MorphSVGPlugin) return;
      shut = want;
      rows.classList.add('is-morph');
      gsap.to(open, {
        morphSVG: { shape: want ? closed : openD, shapeIndex: 0 },
        duration: 3 * T, ease: ease.chain, overwrite: true,
      });
    };
    const on = {
      pointerenter: () => { hover = true; set(); },
      pointerleave: () => { hover = false; set(); },
      focus: () => { focus = link.matches(':focus-visible'); set(); },
      blur: () => { focus = false; set(); },
    };
    Object.entries(on).forEach(([k, f]) => link.addEventListener(k, f));
    return () => {
      Object.entries(on).forEach(([k, f]) => link.removeEventListener(k, f));
      gsap.killTweensOf(open);
      open.setAttribute('d', openD);
    };
  });
  return () => {
    off.forEach((f) => f());
    rows.classList.remove('is-morph');
  };
}

function full() {
  // ── Rows: each hairline with its label and value, 1τ apart.
  const rows = qa('.row');
  reveal('rows', q('.rows'), (tl) => rows.forEach((row, i) => {
    const text = row.querySelectorAll('.row__label, .row__value');
    tl.fromTo(row, { '--rule': 0 }, {
      '--rule': 1, duration: 3 * T, ease: ease.mask, clearProps: '--rule',
    }, i * T)
      .fromTo(text, { opacity: 0 }, { opacity: 1, duration: 2 * T, ease: ease.glyph, clearProps: 'opacity' }, i * T);
  }));

  // ── Dossier CTA: one sweep as it reaches the reveal line (§9.8's "on
  // section enter" — the section's top is a screen above the CTA).
  const cta = q('.link__cta');
  reveal('cta', cta, (tl) => tl.fromTo(cta, { '--sheen-x': '-120%' }, {
    '--sheen-x': '220%', duration: 8 * T, ease: ease.metal, clearProps: '--sheen-x',
  }));

  // ── The loop snap (errata E45): as #link crosses `top center`, where §7.5's
  // loop scrub closes. sections/chain.js keeps it to once per visit.
  if (!played.has('snap')) {
    ScrollTrigger.create({
      trigger: section, start: 'top center', once: true,
      onEnter: () => { played.add('snap'); snapLoop(); },
    });
  }

  return glyphs();
}

register({
  name: 'link',
  desktopFull: full,
  mobileFull: full,
});
