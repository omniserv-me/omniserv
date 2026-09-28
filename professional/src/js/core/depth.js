/* depth.js — the parallax depths. design.md §3.7, §9.1 ("one module owns the
   depths and applies them to both"), §9.4 (pointer parallax).

   Amplitudes are 4px · √2ⁿ by layer. Pointer parallax uses them directly,
   inverted against the pointer; scroll parallax multiplies them by 4. The DOM
   and the WebGL stage read the same numbers from here:

     pointerParallax(el, 'heading')        DOM, pointer         (5b hero, 7a headings)
     scrollParallax(el, 'plate', vars)     DOM, scrubbed scroll (7a plate, 8a cards)
     pointerOffset('chainFore', out)       px offset, per frame (6b chain, 10 background)

   The DOM binders own the element's CSS `translate` property and nothing
   else — pointer and scroll are summed into one write — so GSAP's x/y/
   transform stay free for the element's own choreography (the hero name's
   scroll-out y, a card's entrance) and never fight the parallax. Both return a
   cleanup; call them inside a registered branch and return the cleanup from
   it, and gsap.context runs it on revert (checkpoint 4's rule). Never under
   reduced motion — staticStates binds nothing. */

import { gsap } from './easings.js';
import { pointer } from './signals.js';

export const DEPTH = {
  heading: 0, plate: 1, card: 1, portrait: 2, chainFore: 3, chainMid: 4, background: 5,
};

/** §3.7 amplitude in px: 4·√2ⁿ, ×4 for scroll. */
export const amplitude = (layer, mode = 'pointer') =>
  4 * Math.SQRT2 ** DEPTH[layer] * (mode === 'scroll' ? 4 : 1);

/** The layer's pointer offset in px, inverted against the pointer (NDC y is
 *  up, CSS y is down). The signal is already lerped at 0.08, so no second lerp. */
export function pointerOffset(layer, out = [0, 0]) {
  const a = amplitude(layer);
  const [x, y] = pointer.value;
  out[0] = -x * a;
  out[1] = y * a;
  return out;
}

const bound = new Map();   // el → { layer, scroll, sy }: pointer layer, scroll bound?, scroll offset

function write(el) {
  const s = bound.get(el);
  const [x, y] = s.layer ? pointerOffset(s.layer) : [0, 0];
  el.style.translate = `${x.toFixed(2)}px ${(y + s.sy).toFixed(2)}px`;
}

function bind(el, patch) {
  const s = bound.get(el) ?? { layer: null, scroll: false, sy: 0 };
  bound.set(el, Object.assign(s, patch));
  return () => {
    if (patch.layer) s.layer = null; else Object.assign(s, { scroll: false, sy: 0 });
    if (s.layer || s.scroll) return write(el);
    bound.delete(el);
    el.style.translate = '';
  };
}

/** Pointer parallax for one element. Writes only when the pointer moves. */
export function pointerParallax(el, layer) {
  const release = bind(el, { layer });
  const off = pointer.subscribe(() => write(el));
  return () => { off(); release(); };
}

/** Scrubbed scroll parallax, y from +4a to −4a as the element crosses the
 *  viewport. Linear — scrubs are always `none` (§9.2). */
export function scrollParallax(el, layer, vars = {}) {
  const a = amplitude(layer, 'scroll');
  const release = bind(el, { scroll: true, sy: a });
  const s = bound.get(el);
  const tween = gsap.to(s, {
    sy: -a,
    ease: 'none',
    onUpdate: () => write(el),
    scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true, ...vars },
  });
  return () => { tween.scrollTrigger?.kill(); tween.kill(); release(); };
}
