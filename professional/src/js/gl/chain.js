/* chain.js — the spine. design.md §7.2 (catenary, sag, phase spring, ripples),
   §7.3 (links, orientation, the degenerate-tangent guard), §7.4 (material,
   environment, lights), §7.5 (the movement states' geometry), §7.6 (the
   readability guard), §3.7 (chain parallax).

   Owns the geometry, material, lights and per-frame instance update. The stage
   (gl/stage.js) owns the renderer, camera and clock, and calls update() once per
   frame. gl/movements.js drives `state` from scroll; the LATTICE branch is its
   own mesh (gl/lattice.js), sharing the material and the guard.

   Links are a conveyor on a fixed pitch (errata E34, 6b): link i sits at arc
   position mod(i + phase, POOL) · SPACING and is drawn only while that lies on
   the curve, so every curve — the vertical spine, the horizontal WORKS run,
   the LINK loop — carries ceil(length / SPACING) links, all interlocked. */

import {
  CatmullRomCurve3, Vector3, Quaternion, Matrix4,
  TorusGeometry, InstancedMesh, InstancedBufferAttribute, DynamicDrawUsage,
  MeshPhysicalMaterial, DirectionalLight, PMREMGenerator,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap, T as BEAT, ease } from '../core/easings.js';

/* §7.3 — outer diameter 4.4 % of H, pitch 0.72 diameters. The pool covers the
   longest curve: the horizontal run at W + 2 diameters needs 96 up to ≈ 2.9:1
   (errata E34). */
export const POOL = 96;
export const DIAM = 0.044;            // × H
export const SPACING = 0.72 * DIAM;   // × H
const OUTER = 1.28;                   // TorusGeometry(0.5, 0.14) outer diameter

/* §7.5 LINK, errata E33 (6b): 34 links at §7.3's pitch close a circle of
   radius 34·SPACING/2π ≈ 0.171·H — the spec's 0.17·H, interlocked. */
export const LOOP_LINKS = 34;
const LOOP_LEN = LOOP_LINKS * SPACING;          // × H
const LOOP_R = LOOP_LEN / (2 * Math.PI);        // × H
const LOOP_X = 0.30;                            // × W
const LOOP_OMEGA = 0.12;                        // rad/s

/* §7.5 WORKS */
const HORIZ_Y = -0.40;                          // × H

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
   (1 − p)², i.e. 1 − power2.out(p), computed here rather than tweened. It is
   applied along the in-plane normal, so it stays lateral on the horizontal run. */
const RIPPLE_LIFE = 1.2;
const RIPPLE_MAX = 3;
const RIPPLE_DV = 600;                // px/s swing that spawns one
const V_SCALE = 2400;                 // §9.1: velocity is normalised ÷ 2400 px/s
const V_EPS = 20;                     // px/s below which the direction is "none"

/* §7.3, errata E29 (6a): every curve on this page lies in the xy-plane, so the
   camera axis is never parallel to the tangent. The fallback only guards a
   curve that might one day tilt out of that plane. */
const UP = new Vector3(0, 0, 1);
const UP_FALLBACK = new Vector3(1, 0, 0);
const Z_AXIS = new Vector3(0, 0, 1);

const FEATHER = 24;                   // §7.6 px
const DIM_COLOUR = 0.42;              // §7.6 diffuse factor at full dim
const DIM_LIGHT = 0.06;               // errata E49: the whole lit colour at full dim
const smoothstep = (e0, e1, x) => {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

/* §7.6 — one instance in px against every copy box, converted from document
   space with the one scroll value already in hand. Measured from the link's
   nearest edge, not its centre (each box grown by the link's on-screen radius),
   and the feather runs *outside* the box (errata E49): a link is fully dimmed
   as soon as any of it touches copy, and fades over the 24 px before that. An
   inside feather never fully dimmed a link over a one-line label. Shared with
   gl/lattice.js. */
const v3 = new Vector3();
export function dimAt(p, o) {
  v3.copy(p).project(o.camera);
  const sx = (v3.x + 1) * 0.5 * o.vw;
  const sy = (1 - v3.y) * 0.5 * o.vh;
  const linkR = 0.5 * DIAM * o.vh;
  let d = 0;
  for (const r of o.rects) {
    const y = r.y - o.scrollTop;
    const inside = linkR + Math.min(sx - r.x, r.x + r.w - sx, sy - y, y + r.h - sy);
    if (inside > -FEATHER) d = Math.max(d, smoothstep(-FEATHER, 0, inside));
  }
  return d;
}

/* §7.3 orientation: the link's plane contains the tangent; consecutive links
   turn 90° about it. Writes the quaternion and returns the in-plane normal. */
const N2 = new Vector3();
export function orient(T, parity, N1, q) {
  N1.crossVectors(T, UP);
  if (N1.lengthSq() < 1e-10) N1.crossVectors(T, UP_FALLBACK);
  N1.normalize();
  const axis = parity ? N2.crossVectors(T, N1).normalize() : N1;   // torus local axis is +Z
  q.setFromUnitVectors(Z_AXIS, axis);
  return N1;
}

/* §7.3 — tessellation per tier, one aDim attribute per mesh. */
export function torus([radial, tubular], dim) {
  const g = new TorusGeometry(0.5, 0.14, radial, tubular);
  g.setAttribute('aDim', dim);
  return g;
}

export function createChain(scene, H) {
  const dim = new InstancedBufferAttribute(new Float32Array(POOL), 1).setUsage(DynamicDrawUsage);
  const geo = torus([12, 48], dim);

  /* §7.4 */
  const mat = new MeshPhysicalMaterial({
    color: 0xC9CED4, metalness: 1.0, roughness: 0.18,
    envMapIntensity: 1.4, clearcoat: 0.30, clearcoatRoughness: 0.12,
  });

  /* §7.6 — links behind copy go matte and dark. Roughness is what does the
     work: a dimmed-but-glossy link still throws a highlight. The clearcoat
     goes too, and the whole lit colour is scaled down (errata E49): neither the
     clearcoat nor a metal's grazing-angle Fresnel rim is scaled by the diffuse
     colour, and they left copy at ~1:1 over a "dimmed" link. */
  mat.customProgramCacheKey = () => 'chain-dim';
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aDim;\nvarying float vDim;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vDim = aDim;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vDim;')
      .replace('#include <color_fragment>',
               `#include <color_fragment>\n  diffuseColor.rgb *= mix(1.0, ${DIM_COLOUR.toFixed(2)}, vDim);`)
      .replace('#include <roughnessmap_fragment>',
               '#include <roughnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, 0.62, vDim);')
      .replace('#include <opaque_fragment>',
               `outgoingLight *= mix(1.0, ${DIM_LIGHT.toFixed(2)}, vDim);\n#include <opaque_fragment>`)
      .replace('#include <lights_physical_fragment>',
               '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\n  material.clearcoat *= 1.0 - vDim;\n#endif');
  };

  const mesh = new InstancedMesh(geo, mat, POOL);
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

  /* gl/movements.js drives these (§7.5):
       x, bow   lateral anchor as a fraction of visible world width, and which
                way the sag points (−1 = −x). The bow keeps "toward screen
                centre": at IDENTITY (+0.26) that lays the bow in the gutter
                between tagline and portrait, where +1 would cross the portrait.
       ex, ey   the IDENTITY entrance offset, × W and × H
       h        0 vertical → 1 horizontal at y = −0.40·H (WORKS)
       loop     0 open → 1 the closed LINK loop
       branch   0 spine → 1 the LATTICE branches (gl/lattice.js)
       loopY    the loop's scroll parallax, CSS px (§3.7)
       seat     scale of the loop's final link (§9.8's snap; `snap` itself is a
                reserved GSAP tween property, so a tween of it does nothing) */
  const REST = { x: 0.26, bow: -1, ex: 0, ey: 0, h: 0, loop: 0, branch: 0, loopY: 0, seat: 1 };
  const state = { ...REST };

  let phase = 0;
  let pvel = 0;
  let spin = 0;
  let offset = 0;             // scroll-target offset, so releasing the drive never jumps
  let drivePx = null;
  let driveOffset = 0;
  let driving = false;
  let dir = 0;
  let peak = 0;
  let snapIndex = -1;
  let visible = 0;
  let lastL = 0;              // the last frame's curve length, loop start and turn (for the snap)
  let lastSA = 0;
  let lastTurn = 0;
  const ripples = [];

  const pO = new Vector3();
  const tO = new Vector3();
  const pL = new Vector3();
  const tL = new Vector3();
  const p = new Vector3();
  const T = new Vector3();
  const N1 = new Vector3();
  const q = new Quaternion();
  const m = new Matrix4();
  const S = new Vector3();
  const s0 = (DIAM * H) / OUTER;
  const A0 = 0.09 * H;
  const rippleAmp = 0.35 * DIAM * H;
  const pitch = SPACING * H;
  const loopLen = LOOP_LEN * H;
  const loopR = LOOP_R * H;

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

  /* The phase (§7.2): a spring chasing one link per 12 vh of scroll — or, while
     8a's pin drives it (§7.5 WORKS), locked to the track's travel in px with no
     spring, so cards and links move together. Engaging and releasing each
     capture an offset, so neither jumps. The loop adds its own rotation. */
  function advance(o) {
    const { dt } = o;
    const target = o.scrollY / (LINK_VH * o.vh);
    if (drivePx !== null) {
      const k = o.unitsPerPx / (SPACING * H);
      if (!driving) { driving = true; driveOffset = phase - drivePx * k; }
      const next = driveOffset + drivePx * k;
      pvel = dt > 0 ? (next - phase) / dt : 0;
      phase = next;
    } else {
      if (driving) { driving = false; offset = phase - target; }
      const kk = OMEGA * OMEGA;
      const c = 2 * ZETA * OMEGA;
      pvel += (-kk * (phase - (target + offset)) - c * pvel) * dt;
      phase += pvel * dt;
    }
    spin += state.loop * (LOOP_OMEGA * loopR / pitch) * dt;   // ω·R per link pitch
  }

  /* One frame. `o`:
       dt        seconds, already clamped by the caller's clock
       time      seconds (ticker time)
       v         signals.velocity, normalised [−1, 1]
       scrollY   native scroll, px — the phase target (§7.2)
       scrollTop the content's rendered scroll, px — the guard's (§7.6)
       W         visible world width at z = 0
       vw, vh    viewport px; unitsPerPx = H / vh
       fore      the foreground layer's pointer offset, world units (§3.7)
       camera    for projecting instances to px
       rects     document-space [data-copy] rects (util/rect.js)
       still     reduced motion (errata E1): no spring, sag response or ripples */
  function update(o) {
    const { time, v, still, W } = o;

    if (!still) {
      advance(o);
      watchReversal(v, time);
      while (ripples.length && time - ripples[0].t0 >= RIPPLE_LIFE) ripples.shift();
    }

    const fade = 1 - state.branch;
    mesh.visible = fade > 0;
    if (!mesh.visible) return;

    /* The open curve in its own frame, turned clockwise by θ = h·90° (§7.5
       WORKS): the top end swings right, so links travel left with the track.
       The along-axis spans 1.6·H vertically and the visible width plus a
       diameter past each edge horizontally; the sag keeps "toward centre"
       vertically and hangs downward on the horizontal run. */
    const A = still ? A0 : A0 * (1 - Math.min(Math.abs(v), 1));
    const h = state.h;
    const th = h * Math.PI / 2;
    const ux = Math.sin(th), uy = Math.cos(th);            // along (t = 0 end)
    const nx = Math.cos(th), ny = -Math.sin(th);           // lateral
    const span = lerp(1.6 * H, W + 2 * DIAM * H, h);
    const bow = lerp(state.bow, 1, h);
    const cx = lerp((state.x + state.ex) * W, 0, h) + o.fore[0];
    const cy = lerp(state.ey * H, HORIZ_Y * H, h) + o.fore[1];
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const a = span * (0.5 - t);
      const l = bow * A * sag(t);
      pts[i].set(cx + a * ux + l * nx, cy + a * uy + l * ny, 0);
    }
    curve.updateArcLengths();
    const L = curve.getLength();

    /* §7.5 LINK: the stretch of the open chain nearest its middle coils onto a
       circle at X = +0.30; links outside it shrink away. 34 and POOL are both
       even, so the link leaving the seam and the one entering it share a pose
       and parity: the loop closes with no visible pop. sag is 0 on the loop. */
    const w = state.loop;
    const sA = (L - loopLen) / 2;
    const lx = LOOP_X * W + o.fore[0];
    const ly = -state.loopY * o.unitsPerPx + o.fore[1];

    visible = 0;
    const turn = phase + spin;
    for (let i = 0; i < POOL; i++) {
      const s = ((((i + turn) % POOL) + POOL) % POOL) * pitch;
      let scale = s < L ? 1 : 0;
      if (scale) {
        curve.getPointAt(s / L, pO);
        curve.getTangentAt(s / L, tO).normalize();
      } else {
        curve.getPointAt(1, pO);
        tO.set(0, -1, 0);
      }

      const ls = s - sA;
      if (w > 0 && ls >= 0 && ls < loopLen) {
        /* Clockwise from the loop top, so the spine's downward travel carries
           straight on round the circle. */
        const phi = Math.PI / 2 - ls / loopR;
        pL.set(lx + loopR * Math.cos(phi), ly + loopR * Math.sin(phi), 0);
        tL.set(Math.sin(phi), -Math.cos(phi), 0);
        p.lerpVectors(pO, pL, w);
        T.lerpVectors(tO, tL, w);
        /* §7.3's degenerate-tangent guard: where the open and loop tangents
           oppose (the loop's far side, mid-coil) the blend collapses to zero. */
        if (T.lengthSq() < 1e-8) T.copy(w < 0.5 ? tO : tL);
        T.normalize();
      } else {
        p.copy(pO);
        T.copy(tO);
        scale *= 1 - w;
      }

      orient(T, i % 2, N1, q);
      if (ripples.length && scale) p.addScaledVector(N1, ripple(s / pitch, time));

      if (i === snapIndex) scale *= state.seat;
      scale *= fade;
      if (scale > 0) visible++;
      S.setScalar(s0 * scale);
      m.compose(p, q, S);
      mesh.setMatrixAt(i, m);
      dim.array[i] = scale ? dimAt(p, o) : 0;
    }
    mesh.instanceMatrix.needsUpdate = true;
    dim.needsUpdate = true;
    mesh.computeBoundingSphere();

    lastL = L;
    lastSA = sA;
    lastTurn = turn;
  }

  /* §9.8's loop snap, for 9b to call once per visit: the link at the loop's
     seam seats, scale 1 → 1.14 → 1, 1τ + 1τ, ease.chain. */
  function snapFinalLink() {
    if (state.loop < 1) return null;
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < POOL; i++) {
      const s = ((((i + lastTurn) % POOL) + POOL) % POOL) * pitch;
      const ls = s - lastSA;
      if (ls < 0 || ls >= loopLen || s >= lastL) continue;
      const d = Math.min(ls, loopLen - ls);
      if (d < bestD) { bestD = d; best = i; }
    }
    snapIndex = best;
    state.seat = 1;
    return gsap.timeline({ onComplete() { snapIndex = -1; } })
      .to(state, { seat: 1.14, duration: BEAT, ease: ease.chain })
      .to(state, { seat: 1, duration: BEAT, ease: ease.chain });
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
    const gp = mesh.geometry.parameters;
    if (gp.radialSegments !== radial || gp.tubularSegments !== tubular) {
      const old = mesh.geometry;
      mesh.geometry = torus(t.segments, dim);
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
    mesh, mat, state, update, bakeEnv, setTier, still, snapFinalLink,
    /** Reset every movement knob (a branch's cleanup). */
    rest() { Object.assign(state, REST); snapIndex = -1; },
    /** §7.5 WORKS, for 8a: the track's travel in px (null releases it). */
    drive(px) { drivePx = px; },
    /** The open curve's y at world x, from this frame's control points — for
     *  the §9.7 tether (8b), on the horizontal run. */
    spineY(x) {
      for (let i = 0; i < 8; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const t = (x - a.x) / (b.x - a.x);
        if (t >= 0 && t <= 1) return lerp(a.y, b.y, t);
      }
      return pts[4].y;
    },
    get phase() { return phase + spin; },
    get ripples() { return ripples.length; },
    get count() { return visible; },
    get triangles() { return mesh.geometry.index.count / 3; },
    dims: () => Array.from(dim.array),
  };
}
