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

   Interaction (8b):
     focus       the smoother's onFocusIn hook (errata E7), never a second
                 focusin listener: keyboard focus on any card glides the pin
                 so the card rests where card 01 does, and cancels
                 the smoother's own scrollTo. Pointer focus (a click) moves
                 nothing — the card is already under the pointer.
     deep links  #work-01…04 (errata E44) resolve to the same pin position,
                 through the smoother's hash hook.
     readout     written in the pin's onUpdate, never tweened.
     hover       lift, border and tag borders are CSS (components.css); the
                 pointer-following sheen is --sheen-x, lerped at 0.1 on the
                 ticker, at E35's 0.22 cap (errata E42), not at LOW or NONE;
                 the chain tether (errata E43) is gl/tether.js, HIGH only.
                 Linked cards only (§6.6).
   Reduced motion binds none of it: the vertical stack is CSS keyed off
   <html data-motion="reduced">, and the authored readout stays. */

import { gsap, ScrollTrigger, T, ease } from '../core/easings.js';
import { register } from '../core/registry.js';
import { onSplit, widthTween } from '../core/split.js';
import { axis, tier } from '../core/signals.js';
import { setFocusIn, setHashTarget, getSmoother, glide } from '../core/smoothscroll.js';
import { pointerParallax, scrollParallax } from '../core/depth.js';
import { shiftCopy } from '../util/rect.js';
import { scramble } from '../util/scramble.js';
import { driveChain, tetherChain } from './chain.js';
import { sectionHeader } from './header.js';
import { wipe } from './about.js';

const section = document.querySelector('#works');
const viewport = section.querySelector('[data-works-viewport]');
const track = section.querySelector('[data-track]');
const cards = [...track.querySelectorAll('[data-card]')];
const bar = section.querySelector('[data-progress-bar]');
const label = section.querySelector('[data-progress-label]');
const LABEL = label.textContent;
const linked = [...track.querySelectorAll('.card__link')];

const cardOf = (el) => {
  const item = el?.closest?.('.card__link, .card__stop, [data-card]');
  const card = item && (item.matches('[data-card]') ? item : item.querySelector('[data-card]'));
  return card && track.contains(card) ? card : null;
};
const itemOf = (card) => card.closest('.card__link, .card__stop') ?? card;

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

/* §9.7 readout — straight from the pin's progress, never tweened (a scrubbed
   value smoothed twice visibly lags the cards). */
let shown = '';
function readout(p) {
  bar.style.transform = `scaleX(${p})`;
  const text = `${String(Math.round(p * 3) + 1).padStart(2, '0')} / 04`;
  if (text !== shown) label.textContent = shown = text;
}

/* §9.7 hover on the linked cards: the sheen follows the pointer's x, lerp 0.1
   per frame, on the ticker only while a card is hovered. The band is 180 % of
   the card wide, so its centre sits at fraction f for background-position
   (0.9 − f) / 0.8. .works--sheen gates it off at LOW and NONE (§9.7's LOW
   row). `tether(card)` starts the pinned branch's chain tether, or null. */
function hover(tether = () => {}) {
  let active = null;
  let target = 0.5;
  let x = 0.5;
  const tick = () => {
    x += (target - x) * 0.1;
    active.style.setProperty('--sheen-x', `${(((0.9 - x) / 0.8) * 100).toFixed(2)}%`);
  };
  const enter = (e) => {
    const card = cardOf(e.currentTarget);
    if (active) active.classList.remove('is-sheen');
    const r = card.getBoundingClientRect();
    x = target = (e.clientX - r.left) / r.width;
    active = card;
    card.classList.add('is-sheen');
    gsap.ticker.add(tick);
    tether(card);
  };
  const move = (e) => {
    if (!active) return;
    const r = active.getBoundingClientRect();
    target = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
  };
  const leave = () => {
    if (!active) return;
    gsap.ticker.remove(tick);
    active.classList.remove('is-sheen');
    active.style.removeProperty('--sheen-x');
    active = null;
    tether(null);
  };
  linked.forEach((a) => {
    a.addEventListener('pointerenter', enter);
    a.addEventListener('pointermove', move);
    a.addEventListener('pointerleave', leave);
  });
  const offTier = tier.subscribe((t) => section.classList.toggle('works--sheen', t !== 'LOW' && t !== 'NONE'));
  return () => {
    leave();
    offTier();
    section.classList.remove('works--sheen');
    linked.forEach((a) => {
      a.removeEventListener('pointerenter', enter);
      a.removeEventListener('pointermove', move);
      a.removeEventListener('pointerleave', leave);
    });
  };
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
  const drive = (self) => {
    driveChain(self.isActive ? self.progress * D() : null);
    readout(self.progress);
  };
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

  readout(pin.progress);

  const entrances = new Map();
  cards.forEach((card) => {
    const tl = entrance(card);
    if (!tl) return;
    entrances.set(card, tl);
    ScrollTrigger.create({
      trigger: card, containerAnimation: travel,
      start: `left ${LINE * 100}%`, end: `right ${100 - LINE * 100}%`, once: true,
      onEnter: () => tl.play(),
    });
    vertical(card, tl, () => card.getBoundingClientRect().left < LINE * viewport.clientWidth);
  });

  /* The travel that rests a card where card 01 rests, and its pin position
     (1:1). Offsets are layout values, so the track's transform is ignored. Kept
     1 px inside the pin at both ends: exactly on pin.start or pin.end it reads
     inactive (reached from below / above), which would release the chain and
     flip signals.axis back to vertical. */
  const restX = (card) => Math.min(Math.max(itemOf(card).offsetLeft - itemOf(cards[0]).offsetLeft, 1), D() - 1);
  const at = (card) => pin.start + restX(card);

  /* The chain tether rides the card's left edge: measured once, then moved by
     the track's own x (GSAP's cache, no layout read per frame). */
  const tetherTo = (card) => {
    if (!card) { tetherChain(null); return; }
    const left = card.getBoundingClientRect().left;
    const x0 = gsap.getProperty(track, 'x');
    tetherChain(() => left + gsap.getProperty(track, 'x') - x0);
  };

  /* §9.7 keyboard focus (errata E7). Every card is a stop (the unlinked two
     through .card__stop). Keyboard focus glides the pin to the card — the
     smoother's own catch-up, so the track and chain travel there rather than
     cut (owner's decision, overriding §9.7's `smooth: false`) — and starts an
     entrance that has not played, so the card is never still at opacity 0 when
     the glide lands. Returning false cancels the smoother's
     own "centre the element" for every card focus, pointer ones included. */
  let focused = null;
  setFocusIn((self, e) => {
    const card = cardOf(e.target);
    if (!card) return undefined;
    if (e.target.matches(':focus-visible')) {
      glide(at(card));                    // the pin scrubs the track there, never cuts
      entrances.get(card)?.play();
      if (focused !== card && e.target.classList.contains('card__link')) {
        focused = card;
        tetherTo(card);
      }
    }
    return false;
  });
  // The tether's keyboard twin retracts on blur — not a scroll concern, so it
  // cannot race the smoother.
  const blur = (e) => {
    if (!focused || cardOf(e.relatedTarget) === focused) return;
    focused = null;
    tetherChain(null);
  };
  viewport.addEventListener('focusout', blur);

  // §9.7 deep links (errata E44): #work-0N names a card.
  setHashTarget((el) => (el.matches('[data-card]') && track.contains(el) ? at(el) : null));

  // The guard (§7.6): 1:1, so the track has travelled exactly as far as the
  // pin has held the section still.
  const off = [
    shiftCopy(viewport, (top) => {
      const d = Math.min(Math.max(top - pin.start, 0), pin.end - pin.start);
      return [-d, d];
    }),
    ...cards.map((c) => pointerParallax(c, 'card')),
    hover(tetherTo),
  ];

  return () => {
    cleanup(off);
    setFocusIn(null);
    setHashTarget(null);
    viewport.removeEventListener('focusout', blur);
    tetherChain(null);
    bar.style.transform = '';
    label.textContent = shown = LABEL;
    ScrollTrigger.removeEventListener('refreshInit', setBleed);
    section.classList.remove('is-pinned');
    section.style.removeProperty('--bleed');
    axis.set([0, 1]);
    driveChain(null);
  };
}

function stacked() {
  // #work-0N under the smoother: its element jump ignores scroll-margin-top,
  // so the stack applies the card's own margin (below the rail).
  setHashTarget((el) => (el.matches('[data-card]') && track.contains(el)
    ? getSmoother().offset(el, 'top top') - parseFloat(getComputedStyle(el).scrollMarginTop)
    : null));
  cards.forEach((card) => {
    const tl = entrance(card);
    if (tl) vertical(card, tl);
  });
  const off = [
    ...cards.flatMap((c) => [pointerParallax(c, 'card'), scrollParallax(c, 'card')]),
    hover(),
  ];
  return () => { cleanup(off); setHashTarget(null); };
}

/* Reduced motion: native scrolling, no smoother, so nothing else moves the
   view on focus, and the browser's own focus scroll leaves a card that is
   partly visible where it is (a card at the viewport's bottom edge took focus
   there). Bring the whole card in, instantly — reduced means no animation. */
function still() {
  // 'nearest' is a no-op for a card already wholly in view.
  const bring = (e) => cardOf(e.target) && itemOf(cardOf(e.target)).scrollIntoView({ block: 'nearest' });
  track.addEventListener('focusin', bring);
  return () => track.removeEventListener('focusin', bring);
}

register({
  name: 'projects',
  // No saveStyles selectors (errata E27). Nothing is hidden, so reduced motion
  // is the authored page: its §9.7 vertical stack is CSS (components.css,
  // html[data-motion="reduced"]); staticStates only keeps focus in view.
  desktopFull: pinned,
  mobileFull: stacked,
  staticStates: still,
});
