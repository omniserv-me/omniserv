/* movements.js — the chain's per-movement states. design.md §7.5.

   Installed by gl/stage.js through sections/chain.js, which runs it inside the
   chain's registered context: every trigger here is reverted with it.

   | Boundary            | Knob                                  | How                               |
   | load at IDENTITY    | ex, ey: from the top-left → 0         | 13τ mask, once per page load      |
   | IDENTITY → DOSSIER  | x +0.26 → −0.28, bow −1 → +1          | scrubbed, ease none (errata E15)  |
   | DOSSIER ↔ LATTICE   | branch 0 ↔ 1 (gl/lattice.js), while   | 8τ metal crossfade on toggle;     |
   |                     | the roots are on screen               |                                   |
   |                     |                                       | none at s ≤ 640 px (errata E9)    |
   | LATTICE → WORKS     | h 0 → 1, horizontal at y = −0.40·H    | scrubbed, > 900 px only (§9.7)    |
   | WORKS → LINK        | loop 0 → 1; loopY the §3.7 parallax   | scrubbed                          |
   | colophon            | the loop idles                        | —                                 |

   Every scrub starts where the last one ended, so the chain migrates and never
   cuts. Reduced motion (§10.1) creates no scrubs: each section's state is set
   on crossing and the frame redrawn. */

import { gsap, ScrollTrigger, T, ease } from '../core/easings.js';
import { getSmoother } from '../core/smoothscroll.js';
import { amplitude } from '../core/depth.js';
import { docOffset } from '../util/rect.js';

let entered = false;

/* The root nodes, document px: each cluster's first node. In 7b's graph that
   node is the cluster's lattice root (sections/stack.js positions it on
   `refreshInit`, before this runs on `refresh`); with the graph off it is the
   top of CP3's column. Offsets, so the growth's scale never moves the root. */
function clusterRoots() {
  return [...document.querySelectorAll('[data-cluster]')].map((c) => {
    const n = c.querySelector('.node');
    if (!n?.offsetParent) return null;
    const [x, y] = docOffset(n);
    return { x: x + n.offsetWidth / 2, y: y + n.offsetHeight / 2 };
  });
}

export function movements(stage) {
  const { chain, lattice } = stage;
  const state = chain.state;

  const feedRoots = () => lattice.setRoots(clusterRoots());

  function full(desktop) {
    const scrub = (trigger, from, to, start, end) => gsap.fromTo(state, from, {
      ...to, ease: 'none', scrollTrigger: { trigger, start, end, scrub: true },
    });

    /* §7.5 IDENTITY: the full spine enters from the top-left, bowing at full
       A₀ — once per page load, and only when the page opens on IDENTITY.
       Checkpoint 10 moves its start to CAST. */
    const y = getSmoother()?.scrollTop() ?? window.scrollY;
    if (!entered && y < innerHeight / 2) {
      gsap.fromTo(state, { ex: -0.35, ey: 1.0 }, { ex: 0, ey: 0, duration: 13 * T, ease: ease.mask });
    }
    entered = true;

    scrub('#dossier', { x: 0.26, bow: -1 }, { x: -0.28, bow: 1 }, 'top bottom', 'top top');
    if (desktop) scrub('#works', { h: 0 }, { h: 1 }, 'top bottom', 'top top');
    scrub('#link', { loop: 0 }, { loop: 1 }, 'top bottom', 'top center');

    /* §3.7: the loop is the one chain state tied to a section, so it takes the
       foreground layer's scroll parallax (×4) as LINK crosses the view. */
    const a = amplitude('chainFore', 'scroll');
    scrub('#link', { loopY: a }, { loopY: -a }, 'top bottom', 'bottom top');

    /* The branch: a timed crossfade (8τ metal), not a scrub — so metal is legal. */
    const mm = gsap.matchMedia();
    mm.add('(min-width: 641px)', () => {
      let tween = null;
      const fade = (on) => {
        tween?.kill();
        tween = gsap.to(state, { branch: on ? 1 : 0, duration: 8 * T, ease: ease.metal });
      };
      /* While the roots are on screen: the node grid's top edge is where they
         sit, so the branches hand back to the spine before they have
         shortened off the top. */
      const st = ScrollTrigger.create({
        trigger: '[data-lattice]', start: 'top 80%', end: 'top 10%',
        onToggle: (self) => fade(self.isActive),
      });
      if (st.isActive) state.branch = 1;
      return () => { tween?.kill(); state.branch = 0; };
    });
  }

  /* §10.1: no scrubs, no crossfades — each section's state, set on crossing. */
  function reduced() {
    const small = window.matchMedia('(max-width: 640px)');
    let ready = false;
    /* Each trigger only reports crossing its start; whether the reader is past
       it is read off the scroll, so a state holds to the end of the page. */
    const at = (trigger, start) =>
      ScrollTrigger.create({ trigger, start, onToggle: apply, onRefresh: apply });
    const past = (t) => t.scroll() >= t.start;
    const d = at('#dossier', 'top center');
    const l = at('[data-lattice]', 'top 80%');
    const lEnd = at('[data-lattice]', 'top 10%');
    const k = at('#link', 'top center');
    ready = true;
    function apply() {
      if (!ready) return;             // the triggers' own creation-time refresh
      gsap.set(state, {
        x: past(d) ? -0.28 : 0.26,
        bow: past(d) ? 1 : -1,
        branch: past(l) && !past(lEnd) && !small.matches ? 1 : 0,
        loop: past(k) ? 1 : 0,
        h: 0,
      });
      stage.redraw();
    }
    apply();
  }

  return (branch) => {
    feedRoots();
    ScrollTrigger.addEventListener('refresh', feedRoots);
    if (branch === 'reduced') reduced();
    else full(branch === 'desktop');
    return () => {
      ScrollTrigger.removeEventListener('refresh', feedRoots);
      chain.rest();
      stage.redraw();
    };
  };
}
