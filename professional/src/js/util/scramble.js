/* scramble.js — the card index scramble. design.md §9.7.

   The index settles like a mechanical readout: random characters from the
   charset, written at most 12 times a second (per-frame scrambling reads as
   noise), each position locking to its authored character in turn, left to
   right. Driven by one ease: 'none' tween on a progress value, so it sits on a
   timeline like any other row. The element is mono with tabular-nums (§5.3),
   so the header never jitters. The authored text is restored on complete, and
   on revert. */

import { gsap } from '../core/easings.js';

const CHARSET = '0123456789/\\|—';
const STEP = 1 / 12;   // s between writes

export function scramble(el, { duration, ...vars }) {
  const text = el.textContent;
  const p = { t: 0 };
  let last = -Infinity;
  const write = (t) => {
    const settled = Math.floor(t * text.length);
    let s = text.slice(0, settled);
    for (let i = settled; i < text.length; i++) s += CHARSET[Math.floor(Math.random() * CHARSET.length)];
    el.textContent = s;
  };
  // A to(), not a fromTo(): nothing is written until the tween first renders,
  // so a paused entrance leaves the authored index in place.
  return gsap.to(p, {
    t: 1, duration, ease: 'none', ...vars,
    onUpdate() {
      const now = this.time();
      if (Math.abs(now - last) < STEP && p.t < 1) return;
      last = now;
      write(p.t);
    },
    onComplete() { el.textContent = text; },
    onReverseComplete() { el.textContent = text; },
    onInterrupt() { el.textContent = text; },
  });
}
