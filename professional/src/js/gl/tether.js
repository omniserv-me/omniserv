/* tether.js — the WORKS hover tether. design.md §9.7 (hover table), §7.7
   (tethers: HIGH only), errata E43 (8b).

   Three links rise from the horizontal spine at the hovered card's left edge,
   interlocked at §7.3's pitch, pointing at the card. They do not reach it —
   the spine runs ≈ 250 px below the cards at 1440×900 and three links span
   ≈ 85 — and stretching them to would hang them apart as loose rings (E32).

   No mesh of its own: during WORKS the LATTICE branch's InstancedMesh is idle
   (state.branch = 0), so the tether borrows its first three instances and the
   draw calls stay ≤ 3 (§7.7). lattice.update() rewrites every instance it
   owns whenever the branch is showing, so the two never overlap.

   Each link seats with scale 0→1, 1τ ease.chain, 0.5τ stagger, and retracts
   the same way. The stage runs it only at HIGH, under full motion. */

import { Vector3, Quaternion, Matrix4 } from 'three';
import { gsap, T as BEAT, ease } from '../core/easings.js';
import { DIAM, SPACING, orient, dimAt } from './chain.js';

const LINKS = 3;
const OUTER = 1.28;                   // TorusGeometry(0.5, 0.14) outer diameter

export function createTether(lattice, chain, H) {
  const { mesh } = lattice;
  const scales = Array.from({ length: LINKS }, () => ({ v: 0 }));
  let edge = null;                    // () => the card's left edge, viewport px
  let owned = false;                  // the pool's lattice matrices are cleared
  let tween = null;

  const p = new Vector3();
  const Tg = new Vector3(0, 1, 0);
  const N1 = new Vector3();
  const q = new Quaternion();
  const m = new Matrix4();
  const S = new Vector3();
  const ZERO = new Matrix4().makeScale(0, 0, 0);
  const s0 = (DIAM * H) / OUTER;
  const pitch = SPACING * H;

  /** §9.7 — seat on a card (fn → its left edge in px), or retract (null). */
  function to(fn) {
    tween?.kill();
    if (fn) {
      if (fn !== edge) scales.forEach((s) => { s.v = 0; });
      edge = fn;
      tween = gsap.to(scales, { v: 1, duration: BEAT, ease: ease.chain, stagger: 0.5 * BEAT });
    } else {
      tween = gsap.to([...scales].reverse(), {
        v: 0, duration: BEAT, ease: ease.chain, stagger: 0.5 * BEAT,
        onComplete() { edge = null; },
      });
    }
  }

  /* One frame, after the lattice's. `enabled` = HIGH, full motion. */
  function update(o, enabled) {
    const live = enabled && edge && chain.state.branch === 0 && chain.state.h > 0.5
      && scales.some((s) => s.v > 0);
    if (!live) {
      if (owned) { mesh.visible = false; owned = false; }
      return;
    }
    const dim = mesh.geometry.getAttribute('aDim');
    if (!owned) {
      for (let i = 0; i < mesh.count; i++) { mesh.setMatrixAt(i, ZERO); dim.array[i] = 0; }
      owned = true;
    }
    mesh.visible = true;
    const x = (edge() / o.vw - 0.5) * o.W;
    const y0 = chain.spineY(x);
    for (let j = 0; j < LINKS; j++) {
      p.set(x, y0 + (j + 1) * pitch, 0);
      orient(Tg, (j + 1) % 2, N1, q);
      S.setScalar(s0 * scales[j].v);
      m.compose(p, q, S);
      mesh.setMatrixAt(j, m);
      dim.array[j] = scales[j].v ? dimAt(p, o) : 0;
    }
    mesh.instanceMatrix.needsUpdate = true;
    dim.needsUpdate = true;
    mesh.computeBoundingSphere();
  }

  return {
    to, update,
    get count() { return owned ? scales.filter((s) => s.v > 0).length : 0; },
  };
}
