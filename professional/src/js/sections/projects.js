/* projects.js — Movement 04, WORKS. design.md §6.6, §9.7, §7.5 (WORKS row).

   Above 900 px the section pins and vertical scroll drives the track's x 1:1
   (D px of scroll for D px of travel). The viewport, CP3's native horizontal
   scroller, is clipped and made full-bleed while the pin owns x (errata E41,
   motion.css), so D is the track's overflow of the window's layout width.
   The pin also:
     - sets signals.axis to [1, 0] while active (§8.3);
     - drives the chain's phase with the track's travel (§7.5), through
       sections/chain.js, so cards and links move locked together;
     - shifts the card bodies' guard rects with the track (util/rect.js).
   At ≤ 900 px there is no pin: CP3's vertical stack, and the chain stays
   vertical on its own (gl/movements.js scrubs `h` on desktop only).

   Card entrances (§9.7's table) are once per page, each a paused timeline
   built with the branch, so its from-states apply at build and nothing is
   hidden in CSS (as 5b's hero and 7a's DOSSIER). Pinned, a card plays as its
   left edge passes 78 % of the viewport, on the track's containerAnimation. A
   card already inside that line when the track is at rest (01 and 02 at
   1440 px) would otherwise wait, invisible, until the pin starts — so it also
   listens on its vertical position, and plays there if it is in view. Under
   900 px cards play on their vertical position only.

   The title chars come from the split rig: onSplit('title') builds their row
   paused, and the card's timeline starts it at 1τ. The chamfer draws as a
   dash in pathLength units, not DrawSVG (errata E37). Depth §3.7 n = 1: the
   pointer everywhere; scroll only when unpinned, since a scroll parallax
   inside the pin would drift a card ±22.6 px vertically while it travels
   horizontally.

   Focus (E7), hover, readout, deep links and the reduced / LOW branches are
   checkpoint 8b's; the pin's onUpdate is where the readout goes. */

import { gsap, ScrollTrigger, T, ease } from '../core/easings.js';
import { register } from '../core/registry.js';
import { onSplit, widthTween } from '../core/split.js';
import { axis } from '../core/signals.js';
import { pointerParallax, scrollParallax } from '../core/depth.js';
import { shiftCopy } from '../util/rect.js';
import { scramble } from '../util/scramble.js';
import { driveChain } from './chain.js';
import { sectionHeader } from './header.js';
import { wipe } from './about.js';

const section = document.querySelector('#works');
const viewport = section.querySelector('[data-works-viewport]');
const track = section.querySelector('[data-track]');
const cards = [...track.querySelectorAll('[data-card]')];

sectionHeader(section.querySelector('.head'), { scroll: false });

const LINE = 0.78;           // §9.7: a card enters as it crosses 78 % of the viewport
const played = new Set();    // cards whose entrance has started
const titles = new Map();    // title element → { tl, self }: its chars' row, and the split that owns it
const owner = new Map();     // title element → the SplitText live when its card started

/* §9.7 title row: chars rise from their line masks and compress 88 → 100.
   Built paused unless its card is already playing, so an autoSplit re-split
   mid-entrance resumes where SplitText restores it. A new split of a card
   that has played builds nothing: the title rests authored (7a's rule). */
onSplit('title', (self, el) => {
  const card = el.closest('[data-card]');
  if (played.has(card) && owner.get(el) !== self) { titles.delete(el); return undefined; }
  const { chars } = self;
  const tl = gsap.timeline({
    paused: !played.has(card),
    onStart() { chars.forEach((c) => { c.style.willChange = 'transform'; }); },
    onComplete() { chars.forEach((c) => { c.style.willChange = ''; }); },
  })
    .fromTo(chars, { yPercent: 100 }, { yPercent: 0, duration: 5 * T, ease: ease.glyph, stagger: 0.5 * T }, 0)
    .add(widthTween(chars, { from: 88, to: 100, duration: 5 * T, ease: ease.glyph, stagger: 0.5 * T }), 0);
  titles.set(el, { tl, self });
  return tl;
});

/* §9.7's card entrance table. Returns null for a card that has played. */
function entrance(card) {
  if (played.has(card)) return null;
  const q = (s) => card.querySelector(s);
  const title = q('[data-split="title"]');
  const kicker = q('.card__kicker');
  const tags = [...card.querySelectorAll('.tag')];
  const chamfer = q('.chamfer path');
  return gsap.timeline({
    paused: true,
    onStart() {
      played.add(card);
      owner.set(title, titles.get(title)?.self);
      // The card's CSS transform transition (the hover lift) would smear the
      // entrance's y, so only its border transitions while this plays.
      card.style.transitionProperty = 'border-color';
      card.style.willChange = 'transform, opacity';
    },
    onComplete() {
      // Rest authored: the hover lift is CSS, and an inline transform would
      // override it.
      gsap.set([card, kicker, ...tags, chamfer], { clearProps: 'transform,opacity,letterSpacing,strokeDasharray' });
      card.style.transitionProperty = '';
      card.style.willChange = '';
    },
  })
    .fromTo(card, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 5 * T, ease: ease.glyph }, 0)
    .add(scramble(q('.card__index'), { duration: 3 * T }), 0)
    .call(() => titles.get(title)?.tl.play(), null, 1 * T)
    .fromTo(kicker, { opacity: 0, letterSpacing: '0.3em' },
      { opacity: 1, letterSpacing: '0.14em', duration: 5 * T, ease: ease.glyph }, 3 * T)
    .add(wipe([q('.card__body')], { duration: 5 * T }), 4 * T)
    .fromTo(tags, { opacity: 0, scale: 0.6 },
      { opacity: 1, scale: 1, duration: 1 * T, ease: ease.chain, stagger: 0.5 * T }, 5 * T)
    // errata E37: the bevel is 24√2 long but pathLength="100"; DrawSVG would stop at 34 %.
    .fromTo(chamfer, { strokeDasharray: '0 100' },
      { strokeDasharray: '100 0', duration: 3 * T, ease: ease.mask }, 6 * T);
}

/* A card plays when its top crosses the 78 % line, if it is in view then. */
function vertical(card, tl, inView = () => true) {
  ScrollTrigger.create({
    trigger: card, start: `top ${LINE * 100}%`, once: true,
    onEnter: () => { if (inView()) tl.play(); },
  });
}

function cleanup(off) {
  off.forEach((f) => f());
  for (const el of section.querySelectorAll('.wipe')) { el.classList.remove('wipe'); el.style.willChange = ''; }
  cards.forEach((c) => { c.style.transitionProperty = ''; c.style.willChange = ''; });
}

function pinned() {
  const setBleed = () => section.style.setProperty('--bleed', `${document.documentElement.clientWidth}px`);
  setBleed();
  section.classList.add('is-pinned');
  viewport.scrollLeft = 0;
  ScrollTrigger.addEventListener('refreshInit', setBleed);

  const D = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
  const travel = gsap.to(track, { x: () => -D(), ease: 'none' });   // ease MUST be none
  const drive = (self) => driveChain(self.isActive ? self.progress * D() : null);
  const pin = ScrollTrigger.create({
    trigger: section, pin: section, start: 'top top',
    end: () => '+=' + D(), scrub: true, anticipatePin: 1,
    invalidateOnRefresh: true,        // recompute D on resize
    refreshPriority: 1,               // before any trigger below the pin
    animation: travel,
    onToggle(self) {
      axis.set(self.isActive ? [1, 0] : [0, 1]);   // §8.3
      drive(self);
    },
    onUpdate: drive,
  });

  cards.forEach((card) => {
    const tl = entrance(card);
    if (!tl) return;
    ScrollTrigger.create({
      trigger: card, containerAnimation: travel,
      start: `left ${LINE * 100}%`, end: `right ${100 - LINE * 100}%`, once: true,
      onEnter: () => tl.play(),
    });
    vertical(card, tl, () => card.getBoundingClientRect().left < LINE * viewport.clientWidth);
  });

  // The guard (§7.6): 1:1, so the track has travelled exactly as far as the
  // pin has held the section still.
  const off = [
    shiftCopy(viewport, (top) => {
      const d = Math.min(Math.max(top - pin.start, 0), pin.end - pin.start);
      return [-d, d];
    }),
    ...cards.map((c) => pointerParallax(c, 'card')),
  ];

  return () => {
    cleanup(off);
    ScrollTrigger.removeEventListener('refreshInit', setBleed);
    section.classList.remove('is-pinned');
    section.style.removeProperty('--bleed');
    axis.set([0, 1]);
    driveChain(null);
  };
}

function stacked() {
  cards.forEach((card) => {
    const tl = entrance(card);
    if (tl) vertical(card, tl);
  });
  const off = cards.flatMap((c) => [pointerParallax(c, 'card'), scrollParallax(c, 'card')]);
  return () => cleanup(off);
}

register({
  name: 'projects',
  // No saveStyles selectors (errata E27); no staticStates — nothing is hidden,
  // so reduced motion is the authored page (its §9.7 vertical stack is 8b's).
  desktopFull: pinned,
  mobileFull: stacked,
});
