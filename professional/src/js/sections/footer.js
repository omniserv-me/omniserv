/* footer.js — colophon wiring. design.md §6.8, §9.10, §10.1, §10.2.

   The year (script.js:2's one surviving job), the persisted motion toggle, and
   the tier readout. The colophon's reveal (§9.10) is checkpoint 9's; nothing
   here animates except the toggle's 1τ label crossfade. */

import { gsap, T, ease } from '../core/easings.js';
import { motion, tier } from '../core/signals.js';
import { setMotion } from '../core/registry.js';

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
