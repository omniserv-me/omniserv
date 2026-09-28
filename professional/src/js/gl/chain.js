/* chain.js — the spine. design.md §7.2 (catenary, sag, phase spring, ripples),
   §7.3 (links, orientation), §7.4 (material, environment, lights), §7.6 (the
   readability guard).

   Owns the geometry, material, lights and per-frame instance update. The stage
   (gl/stage.js) owns the renderer, camera and clock, and calls update() once per
   frame. Movement states (§7.5: DOSSIER's X, the LATTICE branch, WORKS'
   horizontal mode, the LINK loop) are checkpoint 6b's; they drive `state`. */

import {
  CatmullRomCurve3, Vector3, Quaternion, Matrix4,
  TorusGeometry, InstancedMesh, InstancedBufferAttribute, DynamicDrawUsage,
  MeshPhysicalMaterial, DirectionalLight, PMREMGenerator,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const LINKS = 51;              // §7.3: ceil(1.6·H / 0.0317·H), clamped [18, 51] — every tier (E32)
const OUTER = 1.28;                   // §7.3: TorusGeometry(0.5, 0.14) outer diameter

/* §7.2 */
const SAG_A = 1.9;
const COSH_A = Math.cosh(SAG_A);
export const sag = (t) => (Math.cosh(SAG_A * (2 * t - 1)) - COSH_A) / (1 - COSH_A);

const ZETA = 0.72;
const OMEGA = 14;
const LINK_VH = 0.12;                 // one link per 12 vh of scroll

/* Ripple on reversal (§7.2, errata E3/E31, 6a). Evaluated per link after the
   curve is sampled, k = the link's position along the chain in links from the
   top end: a 6-link wavelength cannot live in 9 control points. The envelope is
   (1 − p)², i.e. 1 − power2.out(p), computed here rather than tweened. */
const RIPPLE_LIFE = 1.2;
const RIPPLE_MAX = 3;
const RIPPLE_DV = 600;                // px/s swing that spawns one
const V_SCALE = 2400;                 // §9.1: velocity is normalised ÷ 2400 px/s
const V_EPS = 20;                     // px/s below which the direction is "none"

/* §7.3, errata E29 (6a): every curve on this page lies in the xy-plane, so the
   camera axis is never parallel to the tangent. The fallback only guards a
   curve 6b might one day tilt out of that plane. */
const UP = new Vector3(0, 0, 1);
const UP_FALLBACK = new Vector3(1, 0, 0);
const Z_AXIS = new Vector3(0, 0, 1);

const FEATHER = 24;                   // §7.6 px
const smoothstep = (e0, e1, x) => {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
};

export function createChain(scene, H) {
  /* §7.3 — 12×48 at HIGH (1152 tris); setTier() swaps in the tier's
     tessellation, sharing the one aDim attribute. */
  const dim = new InstancedBufferAttribute(new Float32Array(LINKS), 1).setUsage(DynamicDrawUsage);
  const torus = ([radial, tubular]) => {
    const g = new TorusGeometry(0.5, 0.14, radial, tubular);
    g.setAttribute('aDim', dim);
    return g;
  };
  const geo = torus([12, 48]);

  /* §7.4 */
  const mat = new MeshPhysicalMaterial({
    color: 0xC9CED4, metalness: 1.0, roughness: 0.18,
    envMapIntensity: 1.4, clearcoat: 0.30, clearcoatRoughness: 0.12,
  });

  /* §7.6 — links behind copy go matte and dark. Roughness is what does the
     work: a dimmed-but-glossy link still throws a highlight. */
  mat.customProgramCacheKey = () => 'chain-dim';
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aDim;\nvarying float vDim;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vDim = aDim;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vDim;')
      .replace('#include <color_fragment>',
               '#include <color_fragment>\n  diffuseColor.rgb *= mix(1.0, 0.42, vDim);')
      .replace('#include <roughnessmap_fragment>',
               '#include <roughnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, 0.62, vDim);');
  };

  const mesh = new InstancedMesh(geo, mat, LINKS);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = true;          // §7.7 — bounding sphere recomputed after each update
  scene.add(mesh);

  /* §7.4 lights. Directional: the table gives colour, intensity and a
     direction-giving position; a point light's inverse-square falloff at these
     distances would leave intensity 2.0 almost nothing. */
  for (const [color, intensity, x, y, z] of [
    [0xFFFFFF, 2.0, 4, 6, 8],        // key — upper right, in front
    [0x6C9BFF, 1.2, -7, 1, 2],       // rim — camera left, raking
    [0x1F5BFF, 0.4, 0, -6, 3],       // fill — from below, cool bounce
  ]) {
    const light = new DirectionalLight(color, intensity);
    light.position.set(x, y, z);
    scene.add(light);
  }

  /* §7.2 — 9 control points, rebuilt every frame (moved in place). */
  const pts = Array.from({ length: 9 }, () => new Vector3());
  const curve = new CatmullRomCurve3(pts);

  /* 6b drives these. x: lateral anchor as a fraction of visible world width
     (§7.5, IDENTITY = +0.26). bow: which way the sag points, −1 = toward screen
     centre; at IDENTITY that lays the on-screen bow in the gutter between
     tagline and portrait (§7.5's "runs the gutter"), where +1 would cross the
     portrait. */
  const state = { x: 0.26, bow: -1 };

  const count = LINKS;
  let phase = 0;
  let pvel = 0;
  let dir = 0;
  let peak = 0;
  const ripples = [];

  const p = new Vector3();
  const T = new Vector3();
  const N1 = new Vector3();
  const N2 = new Vector3();
  const v3 = new Vector3();
  const q = new Quaternion();
  const m = new Matrix4();
  const s = (0.044 * H) / OUTER;
  const SCALE = new Vector3(s, s, s);
  const A0 = 0.09 * H;
  const rippleAmp = 0.35 * 0.044 * H;

  /* Reversal detection. `v` is the smoothed, normalised signal, so it crosses
     zero gradually: the swing is the peak speed in the old direction plus the
     speed in the new one. A chain that has come fully to rest (v exactly 0)
     forgets its direction, so scrolling back later is not a "reversal". */
  function watchReversal(v, time) {
    if (v === 0) { dir = 0; peak = 0; return; }
    const px = v * V_SCALE;
    if (Math.abs(px) < V_EPS) return;
    const d = Math.sign(px);
    if (dir && d !== dir) {
      const dv = peak + Math.abs(px);
      if (dv > RIPPLE_DV) {
        if (ripples.length === RIPPLE_MAX) ripples.shift();   // oldest dropped
        ripples.push({ t0: time, amp: rippleAmp * Math.min(dv / 2000, 1) });
      }
      peak = 0;
    }
    dir = d;
    peak = Math.max(peak, Math.abs(px));
  }

  function ripple(k, time) {
    let x = 0;
    for (const r of ripples) {
      const age = time - r.t0;
      const env = (1 - age / RIPPLE_LIFE) ** 2;
      x += r.amp * Math.exp(-0.105 * k) * Math.sin(2 * Math.PI * (k / 6 - 8 * age)) * env;
    }
    return x;
  }

  /* One frame. `o`:
       dt        seconds, already clamped by the caller's clock
       time      seconds (ticker time)
       v         signals.velocity, normalised [−1, 1]
       scrollY   native scroll, px — the phase target (§7.2)
       scrollTop the content's rendered scroll, px — the guard's (§7.6)
       W         visible world width at z = 0
       vw, vh    viewport px
       camera    for projecting instances to px
       rects     document-space [data-copy] rects (util/rect.js)
       still     reduced motion (errata E1): no spring, sag response or ripples */
  function update(o) {
    const { dt, time, v, still } = o;

    if (!still) {
      const target = o.scrollY / (LINK_VH * o.vh);   // in links
      const k = OMEGA * OMEGA;
      const c = 2 * ZETA * OMEGA;
      pvel += (-k * (phase - target) - c * pvel) * dt;
      phase += pvel * dt;
      watchReversal(v, time);
      while (ripples.length && time - ripples[0].t0 >= RIPPLE_LIFE) ripples.shift();
    }

    const A = still ? A0 : A0 * (1 - Math.min(Math.abs(v), 1));
    const X = state.x * o.W;
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      pts[i].set(X + state.bow * A * sag(t), H * 0.8 + (-H * 1.6) * t, 0);
    }
    curve.updateArcLengths();

    const rects = o.rects;
    const linkR = 0.5 * 0.044 * o.vh;   // outer radius in px (§7.3: 4.4 % of viewport height)
    for (let i = 0; i < count; i++) {
      const u = ((((i + phase) / count) % 1) + 1) % 1;
      curve.getPointAt(u, p);
      curve.getTangentAt(u, T).normalize();
      if (ripples.length) p.x += ripple(u * count, time);

      N1.crossVectors(T, UP);
      if (N1.lengthSq() < 1e-10) N1.crossVectors(T, UP_FALLBACK);
      N1.normalize();
      const axis = (i % 2) ? N2.crossVectors(T, N1).normalize() : N1;   // torus local axis is +Z
      q.setFromUnitVectors(Z_AXIS, axis);
      m.compose(p, q, SCALE);
      mesh.setMatrixAt(i, m);

      /* §7.6 — the instance in px against every copy box, converted from
         document space with the one scroll value already in hand. Measured
         from the link's nearest edge, not its centre (each box grown by the
         link's on-screen radius): a link is behind copy as soon as any of it
         is, and at IDENTITY/DOSSIER the centres run a 24 px gutter while the
         40 px rings cover the ends of the lines on both sides. */
      v3.copy(p).project(o.camera);
      const sx = (v3.x + 1) * 0.5 * o.vw;
      const sy = (1 - v3.y) * 0.5 * o.vh;
      let d = 0;
      for (const r of rects) {
        const y = r.y - o.scrollTop;
        const inside = linkR + Math.min(sx - r.x, r.x + r.w - sx, sy - y, y + r.h - sy);
        if (inside > 0) d = Math.max(d, smoothstep(0, FEATHER, inside));
      }
      dim.array[i] = d;
    }
    mesh.instanceMatrix.needsUpdate = true;
    dim.needsUpdate = true;
    mesh.computeBoundingSphere();
  }

  /* §7.4 — procedural environment, baked once per renderer. Errata E30 (6a):
     RoomEnvironment's light panels carry their light in `emissive` (their
     `color` is black), so the tint goes there: the two far-left panels become
     --blue-lift, the rest stay white, the walls stay neutral. Blue speculars
     camera-left, white camera-right, and the smallest blue area (§4.4). */
  function bakeEnv(renderer) {
    const pmrem = new PMREMGenerator(renderer);
    const env = new RoomEnvironment();
    env.traverse((o) => {
      if (o.isMesh && o.material.emissive && o.position.x < -8) o.material.emissive.set(0x6C9BFF);
    });
    const rt = pmrem.fromScene(env, 0.04);
    env.dispose();
    pmrem.dispose();
    scene.environment = rt.texture;
    return rt;
  }

  function setTier(t) {
    const [radial, tubular] = t.segments;
    const p = mesh.geometry.parameters;
    if (p.radialSegments !== radial || p.tubularSegments !== tubular) {
      const old = mesh.geometry;
      mesh.geometry = torus(t.segments);
      old.dispose();
    }
    mat.clearcoat = t.clearcoat ? 0.30 : 0;
  }

  /* Reduced motion: freeze where it is. */
  function still() {
    pvel = 0;
    ripples.length = 0;
    dir = 0;
    peak = 0;
  }

  return {
    mesh, state, update, bakeEnv, setTier, still,
    get phase() { return phase; },
    get ripples() { return ripples.length; },
    get count() { return count; },
    get triangles() { return mesh.geometry.index.count / 3; },
    dims: () => Array.from(dim.array.subarray(0, count)),
  };
}
