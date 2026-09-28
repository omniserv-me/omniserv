/* stage.js — the WebGL stage. design.md §7.1 (renderer, camera, world mapping),
   §7.7 (tier parameters), §9.1 ("one clock", boot step 1's tier probe), §10.1
   (reduced motion, errata E1), §10.2 (tiers), §12.7 (first frame after LCP,
   8τ fade-in).

   Loaded by main.js as its own chunk at idle after `load`, which pulls `three`
   in behind it: the hero is readable long before the stage exists (§12.7).

   Renderer vs antialias. `antialias` is fixed at context creation, but the tier
   that decides it (§8.1: off at HIGH, where the composer's MSAA target supplies
   it; on at MED/LOW) comes from a probe that needs a renderer. So:
     - a forced tier (§10.2's rules, known without rendering) builds the right
       renderer first time — forced NONE builds none;
     - otherwise the renderer is built for HIGH (antialias off) on the real
       canvas, the probe renders the real chain on it while the canvas is still
       at opacity 0, and a MED/LOW result replaces the canvas with a fresh clone
       and builds again with antialias on. Only an unforced, slow device pays
       the second build, once, before anything is visible.

   Reduced motion (errata E1, 6a): the chain is drawn but never animated. No
   ticker callback; the frame is redrawn only on scroll and resize, so the
   readability guard (§7.6) keeps dimming links as copy scrolls past them.

   The movement states (§7.5) are gl/movements.js, installed into the chain's
   registered context (sections/chain.js) once the stage exists. */

import { WebGLRenderer, PerspectiveCamera, Scene, NoToneMapping, SRGBColorSpace, MathUtils } from 'three';
import { gsap, ScrollTrigger, T, ease } from '../core/easings.js';
import { velocity, motion } from '../core/signals.js';
import { getSmoother } from '../core/smoothscroll.js';
import { TIERS, forcedTier, probe, setTier } from '../core/tiers.js';
import { pointerOffset } from '../core/depth.js';
import { measureCopy, copyRects } from '../util/rect.js';
import { setChainBuilder } from '../sections/chain.js';
import { createChain } from './chain.js';
import { createLattice } from './lattice.js';
import { movements } from './movements.js';

const FOV = 32;
const CAM_Z = 10;
/* §7.1 — visible world height at z = 0, ≈ 5.735. Fixed by FOV and distance, so
   every §7 length given as a fraction of H scales with the viewport. */
export const H = 2 * CAM_Z * Math.tan(MathUtils.degToRad(FOV / 2));

let stage = null;

function createRenderer(canvas, antialias) {
  const renderer = new WebGLRenderer({
    canvas, alpha: true, antialias,
    powerPreference: 'high-performance',
  });
  renderer.setClearAlpha(0);                  // CSS ground shows through
  renderer.toneMapping = NoToneMapping;       // stark: clipping happens in the metal pass (§8)
  renderer.outputColorSpace = SRGBColorSpace;
  return renderer;
}

export async function initStage() {
  if (stage) return stage;
  let canvas = document.getElementById('stage');
  if (!canvas) return null;

  const none = () => {
    canvas.remove();                          // §10.3: the CSS fallback takes over (11a)
    setTier('NONE');
    return null;
  };

  const forced = forcedTier();
  if (forced === 'NONE') return none();

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, innerWidth / innerHeight, 0.1, 200);
  camera.position.z = CAM_Z;
  const chain = createChain(scene, H);
  const lattice = createLattice(scene, H, chain.mat);

  let tier = forced ?? 'HIGH';
  let renderer;
  let envRT;
  const build = (t) => {
    renderer = createRenderer(canvas, TIERS[t].antialias);
    envRT = chain.bakeEnv(renderer);
    applyTier(t);
  };
  const applyTier = (t) => {
    renderer.setPixelRatio(Math.min(devicePixelRatio, TIERS[t].dpr));
    renderer.setSize(innerWidth, innerHeight, false);   // CSS owns the canvas box
    chain.setTier(TIERS[t]);
    lattice.setTier(TIERS[t]);
  };

  measureCopy();
  const vw = () => innerWidth;
  const vh = () => innerHeight;
  const frameVars = {
    dt: 0, time: 0, v: 0, scrollY: 0, scrollTop: 0, W: 0, vw: 0, vh: 0, unitsPerPx: 0,
    fore: [0, 0], mid: [0, 0], camera, rects: null, still: false,
  };
  /* §3.7: the chain's pointer parallax through the one depth module, CSS px
     (y down) → world units (y up). Frozen at rest under reduced motion. */
  const toWorld = (layer, out, still) => {
    if (still) { out[0] = out[1] = 0; return; }
    pointerOffset(layer, out);
    out[0] *= frameVars.unitsPerPx;
    out[1] *= -frameVars.unitsPerPx;
  };

  function draw(dt, time, still) {
    const o = frameVars;
    o.dt = Math.min(dt, 1 / 30);                // never integrate a long frame (§7.2)
    o.time = time;
    o.v = still ? 0 : velocity.value;
    o.scrollY = window.scrollY;
    o.scrollTop = getSmoother()?.scrollTop() ?? window.scrollY;
    o.vw = vw();
    o.vh = vh();
    o.W = H * camera.aspect;
    o.unitsPerPx = H / o.vh;
    o.rects = copyRects(o.scrollTop);
    o.still = still;
    toWorld('chainFore', o.fore, still);
    toWorld('chainMid', o.mid, still);
    chain.update(o);
    lattice.update(o, chain.state.branch);
    renderer.render(scene, camera);
    if (import.meta.env.DEV && renderer.info.render.calls > 3) {
      console.warn(`stage: ${renderer.info.render.calls} draw calls (§7.7 budget ≤ 3)`);
    }
  }

  try {
    build(tier);
    if (!forced) {
      const probed = await probe(() => draw(1 / 60, gsap.ticker.time, false));
      if (probed === 'NONE') {
        renderer.dispose();
        return none();
      }
      if (probed !== 'HIGH') {
        envRT.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        const fresh = canvas.cloneNode(false);
        canvas.replaceWith(fresh);
        canvas = fresh;
        build(probed);
      }
      tier = probed;
    }
  } catch {
    renderer?.dispose();
    return none();
  }
  setTier(tier);

  /* §9.1 "one clock": the render loop is a ticker callback. */
  gsap.ticker.lagSmoothing(500, 33);
  const frame = (time, deltaTime) => draw(deltaTime / 1000, time, false);

  // Reduced motion: one coalesced redraw per ticker frame that saw a scroll.
  let pending = false;
  const redrawStill = () => { pending = false; draw(0, gsap.ticker.time, true); };
  const requestStill = () => {
    if (pending) return;
    pending = true;
    gsap.ticker.add(redrawStill, true);
  };

  let mode = null;
  const setMode = (m) => {
    if (m === mode) return;
    mode = m;
    if (m === 'full') {
      window.removeEventListener('scroll', requestStill);
      gsap.ticker.add(frame);
    } else {
      gsap.ticker.remove(frame);
      chain.still();
      window.addEventListener('scroll', requestStill, { passive: true });
      requestStill();
    }
  };

  const onResize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
    measureCopy();
    if (mode !== 'full') requestStill();
  };
  window.addEventListener('resize', onResize);
  ScrollTrigger.addEventListener('refresh', () => {
    measureCopy();
    if (mode !== 'full') requestStill();
  });

  stage = {
    get renderer() { return renderer; },
    get canvas() { return canvas; },
    get tier() { return tier; },
    get mode() { return mode; },
    scene, camera, chain, lattice, H,
    /* Redraw once under reduced motion (after a gsap.set on chain.state).
       Under full motion the ticker already redraws every frame. */
    redraw() { if (mode !== 'full') requestStill(); },
    /** §7.5 LATTICE — [{ x, y }] root-node centres in document px (7b). */
    setBranchRoots: lattice.setRoots,
    /** §7.5 WORKS — the pinned track's travel in px, or null (8a). */
    drive: chain.drive,
    /** §9.8 — the loop's final link seats; returns the timeline (9b). */
    snapFinalLink: () => (mode === 'full' ? chain.snapFinalLink() : null),
  };

  /* §7.5 — the movement states, before the first visible frame, so the
     IDENTITY entrance starts from its offset rather than from rest. */
  setChainBuilder(movements(stage), chain.drive);

  /* §12.7 — the first frame is rendered before the canvas is shown, then it
     fades in over 8τ (a crossfade: metal). Reduced motion shows it at once. */
  draw(0, gsap.ticker.time, motion.value !== 'full');
  if (motion.value === 'full') {
    gsap.to(canvas, { opacity: 1, duration: 8 * T, ease: ease.metal });
  } else {
    gsap.set(canvas, { opacity: 1 });
  }
  motion.subscribe(setMode);
  return stage;
}

export const getStage = () => stage;
