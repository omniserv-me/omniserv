/* rect.js — document-space rect cache for the readability guard. design.md §7.6.

   The guard needs every [data-copy] box on every frame, but the smoother moves
   the content every frame, so a getBoundingClientRect() per frame would force
   layout each time. Instead each box is measured once in *document* space by
   walking offsetTop/offsetLeft — layout values, which transforms (the smoother,
   parallax) do not touch — and converted per frame with the one scroll value
   already in hand: screenY = docY − scrollTop.

   Re-measured on load, on every ScrollTrigger refresh (fonts, resize, pin
   spacers) and on resize.

   One exception to "layout values are enough": the WORKS track (8a) moves its
   cards by transform, and its pin holds them still while the document scrolls.
   Its owner registers a shift for everything inside it, applied per frame from
   the same scroll value.

   Everything else that moves copy by transform — the depth module's scroll
   parallax (CSS `translate`: headings ±16 px, plate ±23 px) and GSAP's `y`
   (the hero name's scroll-out rise, up to 12vh) — is read back per frame from
   the inline styles those writers set, on the element and its ancestors. That
   is a string read, not a layout read. Without it the dim sat up to 94 px off
   the text it guards (errata E49, 11b). */

let rects = [];
const shifts = new Map();   // root element → (scrollTop) => [dx, dy]

/** Offset every [data-copy] box inside `root` by fn(scrollTop) → [dx, dy] px,
 *  per frame. Returns the unregister function. */
export function shiftCopy(root, fn) {
  shifts.set(root, fn);
  measureCopy();
  return () => { shifts.delete(root); measureCopy(); };
}

export function docOffset(el) {
  let x = 0;
  let y = 0;
  for (let n = el; n; n = n.offsetParent) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return [x, y];
}

export function measureCopy(selector = '[data-copy]') {
  rects = [];
  const content = document.getElementById('smooth-content');
  for (const el of document.querySelectorAll(selector)) {
    if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;   // display: none
    const [x, y] = docOffset(el);
    let shift = null;
    for (const [root, fn] of shifts) if (root.contains(el)) shift = fn;
    const chain = [];   // the element and its ancestors, whose inline transforms move it
    if (!shift) for (let n = el; n && n !== content && n !== document.body; n = n.parentElement) chain.push(n);
    rects.push({ x, y, x0: x, y0: y, w: el.offsetWidth, h: el.offsetHeight, shift, chain });
  }
  return rects;
}

const NUM = /-?[\d.]+(?:e-?\d+)?/g;
/* The translation in an inline `translate` ("12px 4px") and in GSAP's inline
   `transform` ("translate(0px, -94px)", or translate3d). Scale and rotation
   are ignored: no guarded copy is scaled or rotated at rest. */
function inlineShift(chain) {
  let dx = 0;
  let dy = 0;
  for (const n of chain) {
    const { translate, transform } = n.style;
    if (translate && translate !== 'none') {
      const [tx = 0, ty = 0] = (translate.match(NUM) || []).map(Number);
      dx += tx;
      dy += ty;
    }
    if (transform && transform !== 'none') {
      const m = /translate(?:3d)?\(([^)]*)\)/.exec(transform);
      if (m) {
        const [tx = 0, ty = 0] = (m[1].match(NUM) || []).map(Number);
        dx += tx;
        dy += ty;
      }
    }
  }
  return [dx, dy];
}

/** The boxes for this frame, with any registered or inline shift applied. */
export function copyRects(scrollTop = 0) {
  for (const r of rects) {
    const [dx, dy] = r.shift ? r.shift(scrollTop) : inlineShift(r.chain);
    r.x = r.x0 + dx;
    r.y = r.y0 + dy;
  }
  return rects;
}
