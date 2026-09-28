/* chain.js — the chain's movement states, registered like every movement.
   design.md §7.5, §9.1 (teardown).

   The choreography itself lives in the stage chunk (gl/movements.js), which
   arrives at idle, after boot. Checkpoint 4's rule still holds, because
   ScrollTriggers are only ever created inside this registered context:
     - once the stage has installed its builder, each branch calls it directly;
     - if the stage lands after the branch has run, setChainBuilder() adds the
       build to the live context (gsap.context().add), so a motion toggle or a
       breakpoint change reverts it like any other movement.
   With no stage (tier NONE, or its chunk failed) nothing is ever built.

   The WORKS pin (sections/projects.js, 8a) drives the chain's phase through
   driveChain() here rather than importing the stage, which would pull the
   stage chunk — and three — into the sections chunk. The last value is held,
   so a stage that lands mid-pin picks it up. The hover tether (§9.7, 8b)
   travels the same way: tetherChain() holds the hovered card's left-edge
   reader, and the stage decides whether its tier draws one. */

import { register, getContexts } from '../core/registry.js';

let builder = null;
let branch = null;
let drive = null;
let drivePx = null;
let tether = null;
let tetherFn = null;

const run = (name) => () => {
  branch = name;
  return builder?.(name);
};

register({
  name: 'chain',
  desktopFull: run('desktop'),
  mobileFull: run('mobile'),
  staticStates: run('reduced'),
});

/** §7.5 WORKS — the pinned track's travel in px, or null to release (8a). */
export function driveChain(px) {
  drivePx = px;
  drive?.(px);
}

/** §9.7 hover tether — a function returning the card's left edge in viewport
 *  px, or null to retract it (8b). */
export function tetherChain(fn) {
  tetherFn = fn;
  tether?.(fn);
}

export function setChainBuilder(fn, driveFn, tetherTo) {
  builder = fn;
  drive = driveFn;
  tether = tetherTo;
  drive?.(drivePx);
  tether?.(tetherFn);
  const ctx = getContexts().get('chain');
  if (ctx && branch) ctx.add(() => fn(branch));
}
