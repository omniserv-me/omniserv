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
   the same scroll value. */

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
  for (const el of document.querySelectorAll(selector)) {
    if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;   // display: none
    const [x, y] = docOffset(el);
    let shift = null;
    for (const [root, fn] of shifts) if (root.contains(el)) shift = fn;
    rects.push({ x, y, x0: x, y0: y, w: el.offsetWidth, h: el.offsetHeight, shift });
  }
  return rects;
}

/** The boxes for this frame, with any registered shift applied. */
export function copyRects(scrollTop = 0) {
  for (const r of rects) {
    if (!r.shift) continue;
    const [dx, dy] = r.shift(scrollTop);
    r.x = r.x0 + dx;
    r.y = r.y0 + dy;
  }
  return rects;
}
