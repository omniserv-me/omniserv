/* hero.js — Movement 01, IDENTITY. design.md §9.4, §3.7, §6.3.

   Four pieces, all inside the registered branch:
     entrance     the §9.4 table as one master timeline, resting at 21τ
     scroll-out   one scrubbed timeline, every tween linear (§9.2, errata E4)
     breathing    a travelling sine through the name's wdth after 4 s of quiet
     parallax     name (depth 0) and portrait (depth 2) through core/depth.js

   The name's characters come from the split rig: onSplit('name') builds their
   rise and width morph as a paused timeline, which the master drives by time,
   so a re-split (SplitText restores the returned timeline's progress) stays in
   step with everything else.

   Three things move the same characters' width — the entrance (62→100), the
   scroll-out (→62) and breathing (±3) — so they never write it themselves.
   Each owns one input to writeWidth(), which makes the one write pass (§5.4).

   The hero must be readable before any JS runs (§6.3, §12.7): nothing is
   hidden in CSS except the decorative role hairline. The entrance sets its own
   from-states when it is built. Until CAST exists (checkpoint 10) the entrance
   plays at boot; 10 calls holdEntrance() before boot and playEntrance() at
   CAST t = 5τ. */

import { gsap, T, ease } from '../core/easings.js';
import { register } from '../core/registry.js';
import { onSplit } from '../core/split.js';
import { pointerParallax } from '../core/depth.js';

const hero = document.querySelector('#identity');
const q = (s) => hero.querySelector(s);
const qa = (s) => [...hero.querySelectorAll(s)];

const W_IN = 62;        // §9.4 — the name expands from, and compresses back to, 62
const QUIET = 4000;     // ms without input before breathing starts
const INPUT = ['pointermove', 'wheel', 'touchstart', 'keydown', 'scroll'];

/* The width composer. enter[i] — entrance, out — scroll-out, amp/t — breathing. */
const name = { chars: [], enter: [], out: 0, amp: 0, t: 0, tl: null };

function writeWidth() {
  const { chars, enter, out, amp, t } = name;
  for (let i = 0; i < chars.length; i++) {
    // §9.4 idle breathing (errata E3): ±3 units, 6 s period, phase i × 0.08 s.
    const breath = amp && 3 * amp * Math.sin((2 * Math.PI * (t - 0.08 * i)) / 6);
    const w = (enter[i].wdth + breath) * (1 - out) + W_IN * out;
    chars[i].style.fontVariationSettings = `"wdth" ${w.toFixed(1)}`;
  }
}

/* Name chars, rows 2–3 of the entrance: each line rises from its mask and
   expands, line 2 two beats after line 1. Paused — the master drives it. */
onSplit('name', (self, el) => {
  // Each char paints its own slice of the gradient sheet (motion.css), measured
  // here at rest, before the chars move.
  const top = el.getBoundingClientRect().top;
  el.style.setProperty('--sheet-h', `${el.offsetHeight}px`);
  for (const c of self.chars) c.style.setProperty('--sheet-y', `${(top - c.getBoundingClientRect().top).toFixed(1)}px`);
  name.chars = self.chars;
  name.enter = self.chars.map(() => ({ wdth: W_IN }));
  const tl = gsap.timeline({ paused: true });
  self.lines.forEach((line, k) => {
    const idx = self.chars.flatMap((c, i) => (line.contains(c) ? [i] : []));
    const at = k * 2 * T;
    tl.fromTo(idx.map((i) => self.chars[i]), { yPercent: 100 },
      { yPercent: 0, duration: 5 * T, ease: ease.glyph, stagger: 0.5 * T }, at);
    tl.to(idx.map((i) => name.enter[i]),
      { wdth: 100, duration: 5 * T, ease: ease.glyph, stagger: 0.5 * T, onUpdate: writeWidth }, at);
  });
  writeWidth();
  name.tl = tl;
  return tl;
});

let held = false;
let master = null;
let entered = false;   // the entrance is a page-load event: rebuilds skip to rest

export function holdEntrance() { held = true; master?.pause(); }
export function playEntrance() { held = false; master?.play(); }

function full() {
  const meta = q('.meta');
  const h1 = q('.hero__name');
  const role = q('.hero__role');
  const tagline = q('.hero__tagline');
  const aperture = q('.aperture');
  const portrait = q('.hero__portrait');

  let out = null;
  const breathe = breathing(() => out?.scrollTrigger.progress < 1);

  // ── Entrance — §9.4's table, row for row. A "—" ease is glyph (errata E-ease).
  // It is a page-load event: a rebuild after it has played (motion toggle,
  // breakpoint) builds no timeline — the authored page is already the rest
  // state, so only the hairline and the split chars need putting there.
  if (entered) {
    gsap.set(q('.hero__rule'), { scaleX: 1 });
    name.tl?.progress(1);
    breathe.arm();
  } else {
    tagline.classList.add('wipe');
    master = gsap.timeline({
      paused: held,
      defaults: { ease: ease.glyph },   // the type rows, and every "—"
      onUpdate() { name.tl?.time(Math.max(0, this.time() - T)); },   // name chars from 1τ
      onComplete() { entered = true; breathe.arm(); },
    })
      .fromTo(meta, { '--in': 0, y: 8 }, { '--in': 1, y: 0, duration: 3 * T }, 0)
      // Held on one line while tracked out: at 0.6em it would wrap at ≤ 390 px
    // and push everything below it down for the length of the tween.
    .fromTo(role, { letterSpacing: '0.6em', '--in': 0, whiteSpace: 'nowrap' }, {
      letterSpacing: '0.18em', '--in': 1, duration: 8 * T,
      onComplete() { role.style.whiteSpace = ''; },
    }, 5 * T)
      .fromTo(q('.hero__rule'), { scaleX: 0 }, { scaleX: 1, duration: 8 * T, ease: ease.mask }, 5 * T)
      .fromTo(tagline, { '--wipe': '100%', y: 12 }, {
        '--wipe': '0%', y: 0, duration: 5 * T, ease: ease.mask,
        onStart() { tagline.style.willChange = 'mask-position'; },
        onComplete() { tagline.style.willChange = ''; tagline.classList.remove('wipe'); },
      }, 6 * T)
      .fromTo(aperture, { '--ap-in': 0 }, { '--ap-in': 1, duration: 8 * T, ease: ease.mask }, 8 * T)
      .fromTo(q('.aperture img'), { scale: 1.18 }, { scale: 1, duration: 13 * T }, 8 * T)
      .fromTo(qa('.hero__actions .btn'), { '--sy': 0 },
        { '--sy': 1, duration: 3 * T, ease: ease.chain, stagger: 1 * T }, 8 * T)
      .fromTo(qa('.btn__label'), { opacity: 0 },
        { opacity: 1, duration: 2 * T, stagger: 1 * T }, 9 * T)
      // §9.4's drawSVG '0 0' → '0 100', written as the dash itself (errata E25):
      // DrawSVG measures a <rect> as sharp corners and ignores pathLength="100",
      // so its lengths are in the wrong units and the ring appeared whole at 9 %.
      .fromTo(q('.aperture__ring rect'), { strokeDasharray: '0 100' },
        { strokeDasharray: '100 0', duration: 8 * T, ease: ease.mask }, 10 * T)
      .fromTo(q('.hero__cue'), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 3 * T }, 13 * T);
  }

  // ── Scroll-out — scrubbed, so linear throughout (§9.2, errata E4). The
  // name compresses and lifts across the whole section and the aperture shuts
  // to a 2 px slit. Text fades only while the viewport's top edge is cutting
  // through it (errata E26), so nothing rests on screen below the dim floor.
  const secH = () => hero.offsetHeight;
  out = gsap.timeline({
    defaults: { ease: 'none', immediateRender: false },
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true },
  })
    .to(name, { out: 1, duration: 1, onUpdate: writeWidth }, 0)
    .fromTo(h1, { y: 0 }, { y: () => -0.12 * innerHeight, duration: 1 }, 0)
    .fromTo(aperture, { '--ap-out': 1 }, { '--ap-out': () => 2 / aperture.offsetHeight, duration: 1 }, 0);
  // Each element's exit, from its untransformed offset; the name also rises
  // 12vh over the section, so it crosses the edge k times faster.
  const top = (el) => { let y = 0; for (; el; el = el.offsetParent) y += el.offsetTop; return y; };
  [[meta, '--out', 0], [role, '--out', 0], [tagline, '--out', 0], [h1, 'opacity', 0.06]].forEach(([el, prop, to]) => {
    const k = () => (el === h1 ? 1 + (0.12 * innerHeight) / secH() : 1);
    const at = (edge) => () => `top+=${(top(el) - top(hero) + edge * el.offsetHeight) / k()} top`;
    gsap.fromTo(el, { [prop]: 1 }, {
      [prop]: to, ease: 'none', immediateRender: false,
      scrollTrigger: { trigger: hero, start: at(0), end: at(1), scrub: 0.6, invalidateOnRefresh: true },
    });
  });

  const unbind = [pointerParallax(h1, 'heading'), pointerParallax(portrait, 'portrait')];

  return () => {
    breathe.stop();
    unbind.forEach((f) => f());
    tagline.classList.remove('wipe');
    tagline.style.willChange = '';
    master = null;
  };
}

/* §9.4 idle breathing (errata E3): after QUIET ms with no input, and only
   while the hero is on screen, a ticker callback (the one clock, §9.1)
   advances t; amp ramps in over 8τ and out over 3τ on any input, so the name
   never jumps. Armed once the entrance has come to rest. */
function breathing(onScreen) {
  let timer = 0;
  let on = false;
  let ramp = null;
  let t0 = 0;
  const tick = () => { name.t = gsap.ticker.time - t0; writeWidth(); };
  const halt = () => {
    gsap.ticker.remove(tick);
    on = false;
    name.amp = 0;
  };
  const start = () => {
    if (!onScreen()) return schedule();
    on = true;
    t0 = gsap.ticker.time;
    gsap.ticker.add(tick);
    ramp = gsap.to(name, { amp: 1, duration: 8 * T, ease: ease.glyph });
  };
  const schedule = () => { clearTimeout(timer); timer = setTimeout(start, QUIET); };
  const input = () => {
    schedule();
    if (!on || ramp?.vars.amp === 0) return;
    ramp?.kill();
    ramp = gsap.to(name, { amp: 0, duration: 3 * T, ease: ease.glyph, onComplete() { halt(); writeWidth(); } });
  };
  return {
    arm() {
      INPUT.forEach((e) => window.addEventListener(e, input, { passive: true, capture: true }));
      schedule();
    },
    stop() {
      INPUT.forEach((e) => window.removeEventListener(e, input, { capture: true }));
      clearTimeout(timer);
      ramp?.kill();
      halt();
    },
  };
}

/* Reduced motion (§10.1): the authored page is already the final state —
   only the hairline, hidden by motion.css, needs setting. */
function staticStates() {
  gsap.set(q('.hero__rule'), { scaleX: 1 });
}

register({
  name: 'hero',
  // No saveStyles selectors (errata E27): ScrollTrigger restores every saved
  // style on *any* media-query change — its own (orientation: portrait) query
  // included — even when no context toggled, which wiped the rebuilt hero
  // after a 900 px crossing. The context's revert plus full()'s cleanup
  // already return every element to its authored state.
  desktopFull: full,
  mobileFull: full,
  staticStates,
});

export const getHero = () => ({ master, name });
