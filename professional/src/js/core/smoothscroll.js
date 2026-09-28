/* smoothscroll.js — the ScrollSmoother instance. design.md §9.1, §2.3, §9.7.

   Created only under full motion (§10.1: reduced = native scrolling). It is
   always created inside a gsap.context() — ScrollSmoother registers itself with
   the active context, and its kill() restores the wrapper/content inline styles,
   the body height and normalizeScroll, so a context revert returns the page to
   native scrolling with nothing left behind. */

import { gsap, ScrollSmoother, ScrollTrigger, T, ease } from './easings.js';

let smoother = null;

/* §9.7 needs the smoother's own focus hook, not a second focusin listener (the
   plugin already installs one, and two would fight over the scroll position).
   The handler is settable so the WORKS pin (checkpoint 8) can plug in without
   recreating the smoother. Returning false cancels the built-in scrollTo. */
let focusHandler = () => undefined;
export function setFocusIn(fn) { focusHandler = fn ?? (() => undefined); }

/* Every scroll the page makes for the reader — a focus, an anchor, a hash —
   glides; none of them jumps (owner's decision, 8b). Under the smoother that
   is its own smooth scrollTo. On a touch device ScrollSmoother does not smooth
   (§9.1 sets no smoothTouch), so its "smooth" scrollTo is instant: there the
   scroll position itself is tweened over the smoother's 1.2 s (10τ), eased
   mask ≈ expo.out, the smoother's own feel. `target` is a scroll position or an
   element. */
let glideTween = null;
export function glide(target, position = 'top top') {
  if (!smoother) return;
  glideTween?.kill();
  if (ScrollTrigger.isTouch !== 1) {
    smoother.scrollTo(target, true, position);
    return;
  }
  const s = { y: smoother.scrollTop() };
  const y = typeof target === 'number' ? target : smoother.offset(target, position);
  glideTween = gsap.to(s, {
    y, duration: 10 * T, ease: ease.mask,
    onUpdate: () => smoother.scrollTop(s.y),
  });
}

/* Every other focus. The plugin's own fallback centres an off-screen focused
   element with an instant scrollTo(el, false, 'center center'); this is the
   same target, glided — no focus move on the page jumps (owner's decision,
   8b). */
function glideTo(_, e) {
  if (!ScrollTrigger.isInViewport(e.target)) glide(e.target, 'center center');
  return false;
}

/* §9.7 deep links: an element inside the pinned WORKS track has no scroll
   position of its own (the track moves by transform), so its owner can map a
   hash target to one. fn(el) returns a scroll position, or null for "not
   mine" — then the element form runs as usual. */
let hashTarget = () => null;
export function setHashTarget(fn) { hashTarget = fn ?? (() => null); }

function jump(target, smooth, position) {
  const y = hashTarget(target);
  smoother.wrapper().scrollTop = 0;
  const to = typeof y === 'number' ? y : target;
  if (smooth) glide(to, position);
  else smoother.scrollTo(to, false, position ?? 'top top');
}

// The element an anchor jump is about to focus: its scroll is already in hand,
// so the smoother's own "centre the focused element" must not override it.
let jumpTarget = null;

export function createSmoother() {
  smoother = ScrollSmoother.create({
    wrapper: '#smooth-wrapper', content: '#smooth-content',
    smooth: 1.2, normalizeScroll: true, ignoreMobileResize: true,
    effects: false,            // parallax is driven explicitly (§3.7), one module owns the depths
    onFocusIn: (self, e) => (e.target === jumpTarget ? false : focusHandler(self, e) ?? glideTo(self, e)),
  });
  return smoother;
}

/* The context revert may already have killed it; kill() is only safe to run on
   the live main instance. */
export function killSmoother() {
  if (smoother && ScrollSmoother.get() === smoother) smoother.kill();
  smoother = null;
}

export const getSmoother = () => smoother;

/* §2.3 — replaceState does not re-run the fragment scroll, and native
   anchor-jump is unreliable against a transformed document, so boot resolves the
   hash explicitly. getElementById rather than a selector: a malformed hash must
   not throw. */
const targetOf = (hash) => {
  const id = decodeURIComponent(hash.slice(1));
  return (id && document.getElementById(id)) || null;
};

/* Instant at load (there is no earlier view to travel from); glided for a
   hashchange once the page is in view. */
export function scrollToHash(hash = location.hash, smooth = false) {
  const target = targetOf(hash);
  if (!target) return;
  if (smoother) {
    jump(target, smooth);
  } else {
    target.scrollIntoView();
  }
}

/* In-page anchors under the smoother. Native fragment navigation measures the
   *transformed* content and scrolls the nearest scroll container — which is the
   overflow:hidden #smooth-wrapper, not the window (verified: a nav click left
   the wrapper at scrollTop 2606 with the smoother still at 0, a desync the
   wheel cannot recover, and the skip link, whose target is above, did not move
   at all). So while the smoother exists, same-page anchor clicks are resolved
   through it; with it absent (reduced motion) the browser's own jump is left
   alone. Fragment semantics are kept by hand: a history entry, and focus moved
   to the target (tabindex -1 for the duration if it is not focusable) so the
   skip link still moves the keyboard. */
function focusTarget(target) {
  if (target.tabIndex < 0 && !target.hasAttribute('tabindex')) {
    target.setAttribute('tabindex', '-1');
    target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
  }
  jumpTarget = target;
  target.focus({ preventScroll: true });
  jumpTarget = null;
}

function onAnchorClick(e) {
  if (!smoother || e.defaultPrevented || e.button !== 0
      || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest?.('a[href^="#"]');
  const target = a && targetOf(a.hash);
  if (!target) return;
  e.preventDefault();
  if (location.hash !== a.hash) history.pushState(null, '', a.hash);
  jump(target, true, 'top top');
  focusTarget(target);
}

/* Anything else that scrolls the wrapper (a hash typed into the URL, back/
   forward between fragments, find-in-page) — fold the offset back into the
   smoother so the two never disagree. The browser scrolled the wrapper by the
   target's transformed distance, so adding it to the current position lands on
   the same place. */
function onWrapperScroll(e) {
  if (!smoother || e.target !== smoother.wrapper()) return;
  const d = e.target.scrollTop;
  if (!d) return;
  e.target.scrollTop = 0;
  smoother.scrollTop(smoother.scrollTop() + d);
}

let anchorsBound = false;
export function bindAnchors() {
  if (anchorsBound) return;
  anchorsBound = true;
  document.addEventListener('click', onAnchorClick);
  document.addEventListener('scroll', onWrapperScroll, { capture: true, passive: true });
  window.addEventListener('hashchange', () => { if (smoother) scrollToHash(location.hash, true); });
}
