/* nav.js — the navigation rail. design.md §9.9, §6.2, §10.1.

   Three parts, built identically in every branch (reduced included):

     shrink      a class toggle past 80 px of scroll; CSS transitions the
                 height, ground, blur and bottom hairline (2τ metal)
     indicator   one trigger per section; on a change the indicator is moved
                 into the active item and Flip animates the difference (3τ
                 mask, errata E3). Until the late chunk lands — and for its
                 first placement — it is a plain appendChild. In IDENTITY it
                 goes back to `.rail__nav`, where CSS hides it. §10.1: feedback,
                 not decoration, so it moves under reduced motion too.
     panel       the ≤ 900 px menu: --sweep 0 → 1 over 5τ mask, items rise with
                 a weight settle (errata E40), close reverses at 3τ. While open
                 the page is inert, focus cycles the toggle + panel, Escape
                 closes and returns focus, and scroll is locked (the smoother
                 paused; native overflow under reduced motion, which has none).
                 Reduced motion opens and closes instantly.

   Nothing is hidden in CSS beyond CP3's collapsed panel, so a dead chunk
   leaves the rail as authored. */

import { gsap, ScrollTrigger, T, ease } from '../core/easings.js';
import { register } from '../core/registry.js';
import { getSmoother } from '../core/smoothscroll.js';
import { late } from '../core/lazy.js';

const rail = document.querySelector('[data-rail]');
const nav = rail.querySelector('.rail__nav');
const indicator = rail.querySelector('[data-indicator]');
const toggle = rail.querySelector('[data-nav-toggle]');
const panel = document.querySelector('[data-nav-panel]');
const wrapper = document.querySelector('#smooth-wrapper');

/* Section → its rail item, in page order. */
const items = [...nav.querySelectorAll('li')]
  .map((li) => ({ li, section: document.querySelector(li.querySelector('a').hash) }))
  .filter((i) => i.section);

/* ── Indicator ─────────────────────────────────────────────────────────── */

let flip = null;

function place(li) {
  const home = li ?? nav;
  if (indicator.parentElement === home) return;
  const Flip = late()?.Flip;
  // From hidden (first placement, back from IDENTITY) or to hidden there is no
  // previous box to animate from; without Flip it is a plain move.
  const animate = Flip && li && indicator.parentElement !== nav;
  const state = animate && Flip.getState(indicator);   // mid-flight included
  settle();
  home.appendChild(indicator);
  if (!animate) return;
  flip = Flip.from(state, { duration: 3 * T, ease: ease.mask });
}

/* A Flip interrupted mid-way leaves its inline transform and size behind;
   finishing it first lets Flip clean up after itself. */
function settle() {
  flip?.progress(1).kill();
  flip = null;
}

function indicate() {
  // Declared first: on a rebuild (breakpoint, motion toggle) ScrollTrigger.create
  // fires onToggle synchronously, before the map below returns.
  let pending = false;
  // Each trigger runs from its section's top reaching mid-screen to the end of
  // the page; the active item is the last one started. Only the starts are
  // measured, so the ranges cannot leave a gap: an `endTrigger` at the next
  // section was not offset by the WORKS pin spacer and dropped the indicator
  // for most of the pin's travel.
  const triggers = items.map(({ li, section }) => ScrollTrigger.create({
    trigger: section, start: 'top center', end: 'max',
    onToggle: () => schedule(),
    li,
  }));
  // A jump across several sections toggles several triggers in one update;
  // resolving once after all of them keeps it one Flip to the final item.
  function schedule() {
    if (pending) return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      const active = triggers.findLast((t) => t.isActive);
      place(active ? active.vars.li : null);
    });
  }
  return () => {
    settle();
    nav.appendChild(indicator);
  };
}

/* ── Panel ─────────────────────────────────────────────────────────────── */

function menu(animate) {
  if (!toggle || !panel) return () => {};
  const links = [...panel.querySelectorAll('nav a')];
  const stops = () => [toggle, ...panel.querySelectorAll('a[href], button')];

  const tl = gsap.timeline({
    paused: true,
    onReverseComplete: hide,
  })
    .fromTo(panel, { '--sweep': 0 }, { '--sweep': 1, duration: 5 * T, ease: ease.mask }, 0)
    .fromTo(links, { y: 24, fontWeight: 300 },
      { y: 0, fontWeight: 400, duration: 1 * T, stagger: 1 * T, ease: ease.glyph }, 1 * T);

  let open = false;

  function hide() {
    panel.classList.remove('is-open');
    panel.inert = true;
  }

  function lock(on) {
    const smoother = getSmoother();
    if (smoother) smoother.paused(on);
    else document.documentElement.style.overflow = on ? 'hidden' : '';
    wrapper.inert = on;
  }

  function show() {
    if (open) return;
    open = true;
    panel.classList.add('is-open');
    panel.inert = false;
    toggle.setAttribute('aria-expanded', 'true');
    lock(true);
    if (animate) tl.timeScale(1).play();
    else tl.progress(1);
    links[0]?.focus();
  }

  function close({ restoreFocus = false, instant = !animate } = {}) {
    if (!open) return;
    open = false;
    toggle.setAttribute('aria-expanded', 'false');
    lock(false);
    if (instant) { tl.pause().progress(0); hide(); }
    else tl.timeScale(5 / 3).reverse();   // 5τ open, 3τ close
    if (restoreFocus) toggle.focus();
  }

  const onToggle = () => (open ? close() : show());

  function onKey(e) {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close({ restoreFocus: true });
    } else if (e.key === 'Tab') {
      const list = stops();
      const i = list.indexOf(document.activeElement);
      const next = e.shiftKey ? (i <= 0 ? list.length - 1 : i - 1) : (i === list.length - 1 || i < 0 ? 0 : i + 1);
      e.preventDefault();
      list[next].focus();
    }
  }

  // Before the document-level anchor handler (core/smoothscroll.js): the
  // smoother is unpaused and the page un-inerted by the time it jumps.
  const onPanelClick = (e) => { if (e.target.closest('a')) close(); };

  toggle.addEventListener('click', onToggle);
  document.addEventListener('keydown', onKey);
  panel.addEventListener('click', onPanelClick);

  return () => {
    close({ instant: true });
    toggle.removeEventListener('click', onToggle);
    document.removeEventListener('keydown', onKey);
    panel.removeEventListener('click', onPanelClick);
  };
}

/* ── Branches ──────────────────────────────────────────────────────────── */

function build(animate) {
  // §9.9's shrink, as written: a class toggle survives refresh() mid-way.
  ScrollTrigger.create({
    start: 'top -80', end: 99999,
    toggleClass: { targets: rail, className: 'is-compact' },
  });
  const offIndicator = indicate();
  const offMenu = menu(animate);
  return () => { offMenu(); offIndicator(); };
}

register({
  name: 'nav',
  desktopFull: () => build(true),
  mobileFull: () => build(true),
  staticStates: () => build(false),
});
