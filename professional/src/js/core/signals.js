/* signals.js — design.md §9.1. One module owns the signals; everything else reads.

   | Signal   | Source                               | Smoothing        | Range                      |
   | velocity | ScrollTrigger.getVelocity() onUpdate | EMA α 0.12       | ÷2400 px/s, [−1,1], signed |
   | pointer  | pointermove → NDC                    | lerp 0.08/frame  | [−1,1]²; (0,0) if coarse   |
   | axis     | active section                       | none             | [0,1], or [1,0] in the pin |
   | tier     | boot probe (§10.2)                   | —                | HIGH | MED | LOW | NONE    |
   | motion   | media query ∨ stored toggle (§10.1)  | —                | full | reduced             |

   Each signal is { value, set(v), subscribe(fn) }, so §9.7's
   `signals.axis.set([1, 0])` works as written. Per-frame consumers (the chain,
   the metal pass) read `.value` inside their ticker callback rather than
   subscribing. The signals are started once at boot and are never reverted by
   the motion toggle — they describe the visitor, not the choreography. */

import { gsap, ScrollTrigger } from './easings.js';
import { coarseQuery } from '../util/prefers.js';
import { lerp, clamp } from '../util/lerp.js';

function signal(initial) {
  const subs = new Set();
  return {
    value: initial,
    set(v) {
      if (Object.is(v, this.value)) return;
      this.value = v;
      subs.forEach((fn) => fn(v));
    },
    subscribe(fn) {
      subs.add(fn);
      fn(this.value);
      return () => subs.delete(fn);
    },
  };
}

export const velocity = signal(0);
export const pointer = signal([0, 0]);
export const axis = signal([0, 1]);
export const tier = signal(null);      // null until the §10.2 probe reports (checkpoint 6)
export const motion = signal('full');

const signals = { velocity, pointer, axis, tier, motion };
export default signals;

const VELOCITY_SCALE = 2400;   // px/s that reads as |v| = 1
const VELOCITY_ALPHA = 0.12;
const VELOCITY_STALE = 100;    // ms without an onUpdate = the scroll has stopped
const POINTER_LERP = 0.08;

let started = false;
let raw = 0;
let stamp = 0;

/* velocity's source trigger — created by the registry inside each motion mode,
   *after* the smoother, never at module level. A trigger that outlives the
   smoother stays bound to #smooth-wrapper (ScrollSmoother re-inits existing
   triggers onto its proxy), and scrollerProxy(wrapper) on kill does not remove
   the proxy entry: every later refresh then calls the dead smoother's
   scrollHeight, which rewrites body height and content overflow — and the
   signal reads a scroller that no longer moves. Built per mode, it binds to
   whichever scroller is live and is reverted with that mode's context.

   ScrollTrigger only calls onUpdate while the position changes, so the last
   reading would stick forever once scrolling stops. The raw value is therefore
   dropped to 0 once it goes stale, and the EMA runs every frame so the signal
   decays smoothly to rest instead of freezing mid-value. */
export function trackVelocity() {
  raw = 0;
  return ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      raw = self.getVelocity();
      stamp = performance.now();
    },
  });
}

export function startSignals() {
  if (started) return;
  started = true;

  /* pointer — target in NDC (y up, as three.js expects), lerped per frame. */
  let tx = 0;
  let ty = 0;
  window.addEventListener('pointermove', (e) => {
    if (coarseQuery.matches) return;
    tx = (e.clientX / window.innerWidth) * 2 - 1;
    ty = -((e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });
  coarseQuery.addEventListener('change', () => {
    if (coarseQuery.matches) { tx = 0; ty = 0; pointer.set([0, 0]); }
  });

  gsap.ticker.add(() => {
    if (performance.now() - stamp > VELOCITY_STALE) raw = 0;
    const target = clamp(raw / VELOCITY_SCALE, -1, 1);
    let v = lerp(velocity.value, target, VELOCITY_ALPHA);
    if (Math.abs(v) < 1e-4 && target === 0) v = 0;
    velocity.set(v);

    if (coarseQuery.matches) return;   // frozen at (0,0)
    const [px, py] = pointer.value;
    const nx = lerp(px, tx, POINTER_LERP);
    const ny = lerp(py, ty, POINTER_LERP);
    if (Math.abs(nx - px) > 1e-5 || Math.abs(ny - py) > 1e-5) pointer.set([nx, ny]);
  });
}
