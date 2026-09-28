/* footer.js — colophon wiring. design.md §6.8, §9.10, §10.1, §10.2.

   The year (script.js:2's one surviving job), the persisted motion toggle, the
   tier readout, the toggle's 1τ label crossfade, and §9.10's reveal: the top
   hairline draws (8τ mask, origin left, via --rule), then the rows rise in,
   2τ at 1τ stagger. The reveal is once per page and hides nothing in CSS (as
   7a); `clamp()` keeps its start reachable, since the colophon ends the page
   and its top may never climb to the 72 % line. Reduced motion builds nothing. */

import { gsap, T, ease } from '../core/easings.js';
import { motion, tier } from '../core/signals.js';
import { register, setMotion } from '../core/registry.js';

let revealed = false;

function reveal() {
  const foot = document.getElementById('colophon');
  if (revealed || !foot) return;
  gsap.timeline({
    scrollTrigger: { trigger: foot, start: 'clamp(top 72%)' },
    onStart: () => { revealed = true; },
  })
    .fromTo(foot, { '--rule': 0 }, { '--rule': 1, duration: 8 * T, ease: ease.mask, clearProps: '--rule' })
    .fromTo(foot.querySelectorAll('p'), { opacity: 0, y: 8 }, {
      opacity: 1, y: 0, duration: 2 * T, ease: ease.glyph, stagger: 1 * T, clearProps: 'opacity,transform',
    });
}

register({ name: 'colophon', desktopFull: reveal, mobileFull: reveal });

export function initFooter() {
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  const toggle = document.querySelector('[data-motion-toggle]');
  const state = document.querySelector('[data-motion-state]');
  if (toggle && state) {
    // Follows the signal, not the click, so an OS preference change (which
    // re-runs matchMedia) is reflected too.
    motion.subscribe((mode) => {
      toggle.setAttribute('aria-pressed', String(mode === 'full'));
      state.textContent = mode === 'full' ? 'on' : 'off';
    });

    toggle.addEventListener('click', () => {
      setMotion(motion.value === 'full' ? 'reduced' : 'full');
      // §9.10: label swap, 1τ crossfade. The label has already swapped via the
      // subscription above; fade the new one in. The button keeps focus — the
      // rebuild never touches the colophon's DOM.
      gsap.fromTo(state, { opacity: 0 }, { opacity: 1, duration: 1 * T, ease: ease.metal,
        clearProps: 'opacity' });
    });
  }

  const tierOut = document.querySelector('[data-tier]');
  if (tierOut) tier.subscribe((t) => { tierOut.textContent = t ?? '—'; });
}
