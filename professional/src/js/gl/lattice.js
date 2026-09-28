/* lattice.js — the LATTICE branch. design.md §7.5 (03 LATTICE), §3.7 (chain,
   mid layer).

   The spine splits into four short chains, one per cluster, each hanging from
   just above the viewport down to its cluster's root node. A second
   InstancedMesh sharing the chain's material (one more draw call, §7.7's ≤ 3),
   cross-faded against the spine by per-instance scale: the spine's material is
   opaque metal, so "fades out" is a scale too (gl/chain.js reads
   state.branch).

   The chains hang from their nodes: links are laid at §7.3's pitch from the
   root upward, so as the lattice scrolls up each chain shortens off the top of
   the screen, anchored where it terminates. No conveyor — the phase is the
   spine's. Roots arrive in document px through setRoots(): from CP3's columns
   now (gl/movements.js), from 7b's resolved lattice later. At `s` there is no
   branch at all (errata E9, 6b). */

import {
  CatmullRomCurve3, Vector3, Quaternion, Matrix4,
  InstancedMesh, InstancedBufferAttribute, DynamicDrawUsage,
} from 'three';
import { DIAM, SPACING, sag, torus, orient, dimAt } from './chain.js';

const BRANCHES = 4;
const PER = 36;                        // ≥ ceil((H + 2·DIAM) / SPACING): root clamped just below the screen
const POOL = BRANCHES * PER;
const FALLBACK_X = [-0.30, -0.10, 0.14, 0.32];   // §7.5, × W, used until a root is measured
const OUTER = 1.28;
const TAPER = 8;                       // links over which the mid-layer parallax fades to 0 at the root

export function createLattice(scene, H, mat) {
  const dim = new InstancedBufferAttribute(new Float32Array(POOL), 1).setUsage(DynamicDrawUsage);
  const mesh = new InstancedMesh(torus([12, 48], dim), mat, POOL);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = true;
  mesh.visible = false;
  scene.add(mesh);

  const curves = Array.from({ length: BRANCHES }, () =>
    new CatmullRomCurve3(Array.from({ length: 9 }, () => new Vector3())));
  let roots = null;                    // [{ x, y }] document px, root node centres

  const p = new Vector3();
  const T = new Vector3();
  const N1 = new Vector3();
  const q = new Quaternion();
  const m = new Matrix4();
  const S = new Vector3();
  const ZERO = new Matrix4().makeScale(0, 0, 0);
  const s0 = (DIAM * H) / OUTER;
  const pitch = SPACING * H;
  const A0 = 0.09 * H;
  const top = 0.5 * H + DIAM * H;      // just above the viewport
  const floor = -top;                  // a root below the screen is clamped just past its edge
  let visible = 0;

  /* One frame, after the chain's (the same `o`); `o.mid` is the mid layer's
     pointer offset in world units. */
  function update(o, weight) {
    mesh.visible = weight > 0;
    if (!mesh.visible) return;
    const A = o.still ? A0 : A0 * (1 - Math.min(Math.abs(o.v), 1));
    visible = 0;

    for (let b = 0; b < BRANCHES; b++) {
      const r = roots?.[b];
      const rx = r ? (r.x / o.vw - 0.5) * o.W : FALLBACK_X[b] * o.W;
      const ry = r ? Math.max((0.5 - (r.y - o.scrollTop) / o.vh) * H, floor) : 0;
      const len = top - ry;
      const base = b * PER;
      if (!(len > pitch)) {
        for (let j = 0; j < PER; j++) mesh.setMatrixAt(base + j, ZERO);
        continue;
      }

      /* Root (t = 0) up to the anchor (t = 1), bowed toward screen centre with
         the spine's catenary, its amplitude scaled to the chain's length. */
      const curve = curves[b];
      const bow = rx > 0 ? -1 : 1;
      const a = A * (len / (1.6 * H));
      curve.points.forEach((pt, i) => {
        const t = i / 8;
        pt.set(rx + bow * a * sag(t), ry + len * t, 0);
      });
      curve.updateArcLengths();
      const L = curve.getLength();

      for (let j = 0; j < PER; j++) {
        const s = j * pitch;
        if (s >= L) { mesh.setMatrixAt(base + j, ZERO); dim.array[base + j] = 0; continue; }
        curve.getPointAt(s / L, p);
        curve.getTangentAt(s / L, T).normalize();
        const k = Math.min(j / TAPER, 1);
        p.x += o.mid[0] * k;
        p.y += o.mid[1] * k;
        orient(T, j % 2, N1, q);
        S.setScalar(s0 * weight);
        m.compose(p, q, S);
        mesh.setMatrixAt(base + j, m);
        dim.array[base + j] = dimAt(p, o);
        visible++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    dim.needsUpdate = true;
    mesh.computeBoundingSphere();
  }

  function setTier(t) {
    const [radial, tubular] = t.segments;
    const gp = mesh.geometry.parameters;
    if (gp.radialSegments !== radial || gp.tubularSegments !== tubular) {
      const old = mesh.geometry;
      mesh.geometry = torus(t.segments, dim);
      old.dispose();
    }
  }

  return {
    mesh, update, setTier,
    /** §7.5 branch roots: [{ x, y }] in document px (node centres), or null. */
    setRoots(r) { roots = r; },
    get roots() { return roots; },
    get count() { return visible; },
    get triangles() { return mesh.geometry.index.count / 3; },
  };
}
