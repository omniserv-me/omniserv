/* rect.js — document-space rect cache for the readability guard. design.md §7.6.

   The guard needs every [data-copy] box on every frame, but the smoother moves
   the content every frame, so a getBoundingClientRect() per frame would force
   layout each time. Instead each box is measured once in *document* space by
   walking offsetTop/offsetLeft — layout values, which transforms (the smoother,
   parallax) do not touch — and converted per frame with the one scroll value
   already in hand: screenY = docY − scrollTop.

   Re-measured on load, on every ScrollTrigger refresh (fonts, resize, pin
   spacers) and on resize. */

let rects = [];

function docOffset(el) {
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
    rects.push({ x, y, w: el.offsetWidth, h: el.offsetHeight });
  }
  return rects;
}

export const copyRects = () => rects;
