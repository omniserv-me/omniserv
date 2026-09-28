/* split.js — the split rig. design.md §9.1 (boot step 3), §9.4 (split
   configuration), §5.4 (width axis), §10.4 (split text, re-split safety).

   Splits the three kinds of kinetic type the markup marks with data-split:

     name     the hero name (§9.4)      — its builder is checkpoint 5b's
     heading  the four section headings — 7a's section-header helper
     title    the four card titles      — 8a's card entrance

   This module creates the splits and nothing else; the choreography arrives
   through onSplit(kind, builder), registered before boot() like any movement:

     onSplit('name', (self, el) => buildHeroTimeline(self));

   The builder must *return* its timeline. autoSplit re-splits when fonts load
   or the element's width changes, and SplitText then reverts the returned
   animation, restores its progress and calls the builder again on the new
   pieces — which is what makes a re-split leak-free (§10.4). SplitText records
   the gsap.context() it was created in and re-runs every split inside it, so
   ScrollTriggers a builder creates stay inside the registered branch
   (checkpoint 4's rule), re-splits included.

   The tagline's data-split="lines" is deliberately not split: §9.4 reveals it
   with the 102° wipe on the whole element, and §9.5 reserves per-line masks
   for headings. */

import { gsap, SplitText } from './easings.js';
import { register } from './registry.js';

const KINDS = ['name', 'heading', 'title'];

/* §9.4's configuration, minus onSplit (per element) and plus `words`.
   §9.4 writes type: 'lines,chars', but without word wrappers every char is a
   separate inline-block with a break opportunity after it, so the hero name's
   max-width: min-content collapses to one character per line (measured: 16
   lines). Words are wrapped and kept whole by motion.css. */
const CONFIG = {
  type: 'lines,words,chars',
  mask: 'lines',          // overflow-clip wrappers (.line-mask), so chars can rise from below the line box
  autoSplit: true,        // defaults to false — must be set
  aria: 'auto',           // aria-label on the element, aria-hidden on the pieces
  linesClass: 'line',
  wordsClass: 'word',
  charsClass: 'char',
};

const builders = new Map();   // kind → (self, el) => animation
let live = [];

/** Register the choreography for one kind of split. Call before boot(). */
export function onSplit(kind, builder) {
  if (!KINDS.includes(kind)) throw new Error(`split: unknown kind "${kind}"`);
  builders.set(kind, builder);
}

/** Live SplitText instances, for debugging — empty under reduced motion. */
export const getSplits = () => live;

function createSplits() {
  const selector = KINDS.map((k) => `[data-split="${k}"]`).join(',');
  // One instance per element, so each heading and card title keeps its own
  // timeline and its own trigger.
  live = [...document.querySelectorAll(selector)].map((el) => {
    const kind = el.dataset.split;
    const html = el.innerHTML;   // every re-split starts from this same markup
    return SplitText.create(el, {
      ...CONFIG,
      onSplit(self) {
        rekern(self, el, html);
        return builders.get(kind)?.(self, el);
      },
    });
  });
  // The context reverts the instances (and so the DOM) on its own; this only
  // drops the references.
  return () => { live = []; };
}

/* Kerning compensation — the "no visible reflow" half of the split.
   Each char is its own inline-block, so the font's pair kerning between
   neighbours is lost: measured before this fix, the hero name's chars moved by
   up to 8 px at 128 px, STACK's by 4.5 px. An invisible, unsplit probe of the
   original markup gives the kerned gap between neighbours inside each word;
   the difference is written back as an em margin on the left char, so the
   split text rests exactly where the authored text did and scales with it.
   (Mid-morph, at another wdth, the margin is only approximately right — it
   is exact at rest, which is what can be seen to jump.) One read pass, one
   write pass per split. */
function rekern(self, el, html) {
  const probe = el.cloneNode(false);
  for (const a of ['id', 'aria-label', 'data-split']) probe.removeAttribute(a);
  probe.setAttribute('aria-hidden', 'true');
  probe.innerHTML = html;
  Object.assign(probe.style, {
    position: 'absolute', left: '0', top: '0', visibility: 'hidden',
    whiteSpace: 'nowrap', maxWidth: 'none', width: 'max-content',
  });
  el.before(probe);
  const kerned = [];   // left edge of every non-space character, in order
  const walker = document.createTreeWalker(probe, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    for (let i = 0; i < n.length; i++) {
      if (/\s/.test(n.data[i])) continue;
      range.setStart(n, i); range.setEnd(n, i + 1);
      kerned.push(range.getBoundingClientRect().left);
    }
  }
  probe.remove();

  const { chars } = self;
  if (kerned.length !== chars.length) return;   // non-ASCII segmentation — leave unkerned
  const split = chars.map((c) => c.getBoundingClientRect().left);
  const em = parseFloat(getComputedStyle(el).fontSize);
  for (let i = 0; i < chars.length - 1; i++) {
    if (chars[i].parentNode !== chars[i + 1].parentNode) continue;   // across words
    const d = (kerned[i + 1] - kerned[i]) - (split[i + 1] - split[i]);
    if (Math.abs(d) > 0.01) chars[i].style.marginRight = `${(d / em).toFixed(4)}em`;
  }
}

/* Registered here, at import, so the splits' context is created before every
   movement's. main.js imports this module ahead of any section. Reduced motion
   gets no splits at all: final states need no pieces, and the authored text is
   the most robust thing to leave for assistive tech and for layout. */
register({
  name: 'splits',
  desktopFull: createSplits,
  mobileFull: createSplits,
});

/** §5.4 mechanism 2 — per-character width in one tween.
 *
 *  Tweens an array of proxies (staggerable), and writes every character's
 *  font-variation-settings in a single onUpdate rather than through the CSS
 *  plugin 40 times a frame. `from` is applied immediately, so the chars hold
 *  it while the tween waits for its place on a timeline.
 *
 *    tl.add(widthTween(self.chars, { from: 62, to: 100, duration: 5 * T,
 *                                    ease: ease.glyph, stagger: 0.5 * T }), 1 * T);
 *
 *  Never combine with a letter-spacing tween on the same element (§5.4). */
export function widthTween(chars, { from, to, onUpdate, ...vars }) {
  const proxies = chars.map(() => ({ wdth: from }));
  const write = () => {
    for (let i = 0; i < chars.length; i++) {
      chars[i].style.fontVariationSettings = `"wdth" ${proxies[i].wdth.toFixed(1)}`;
    }
  };
  write();
  return gsap.to(proxies, {
    wdth: to,
    ...vars,
    onUpdate() {
      write();
      onUpdate?.call(this);
    },
  });
}
