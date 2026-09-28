/* tiers.js — the quality tier. design.md §10.2 (probe, forced rules), §7.7
   (per-tier parameters), §9.1 boot step 1.

   Imported only by gl/stage.js, so it rides in the stage's lazy chunk and costs
   the entry nothing: the probe needs a renderer anyway, and it runs after first
   paint by definition. Until it reports, signals.tier is null and the colophon
   reads "—".

   forcedTier() answers what can be known without rendering a frame; probe()
   measures the rest. Reduced motion does not force NONE (errata E1, 6a): the
   chain is still drawn, just never animated, so the tier still decides DPR and
   tessellation. */

import { gsap } from './easings.js';
import { tier as tierSignal } from './signals.js';
import { coarseQuery } from '../util/prefers.js';

/* §7.7. post = the composer and its metal pass (§8.1), HIGH only (errata
   E16): MED and LOW render directly. msaa is the composer target's samples;
   antialias is the renderer's own flag, on wherever there is no composer to
   supply it (§8.1). streak is the metal pass's uStreak.
   segments = the torus's [radial, tubular] tessellation. Every tier keeps the
   full link count (errata E32, 6a; E34, 6b): fewer links cannot both interlock
   and span a curve, so the tier cuts triangles per link instead. */
export const TIERS = {
  HIGH: { dpr: 2,   segments: [12, 48], clearcoat: true,  post: true,  msaa: 4, streak: 1, antialias: false },
  MED:  { dpr: 1.5, segments: [10, 32], clearcoat: false, post: false, msaa: 0, streak: 0, antialias: true },
  LOW:  { dpr: 1,   segments: [8, 24],  clearcoat: false, post: false, msaa: 0, streak: 0, antialias: true },
};

export function hasWebGL2() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

/* §10.2's forced rules. `undefined < 4` is false, so deviceMemory's absence
   (Firefox, Safari, iOS) is treated as "assume low" explicitly. Returns null
   when nothing forces a tier and the probe must decide. */
export function forcedTier() {
  if (!hasWebGL2()) return 'NONE';
  if ((navigator.hardwareConcurrency ?? 8) <= 4) return 'LOW';
  const mem = navigator.deviceMemory;
  if (coarseQuery.matches && (mem === undefined || mem < 4)) return 'LOW';
  return null;
}

/* §10.2's probe: 30 frames on the one clock (§9.1), the first 5 discarded,
   median frame time of the rest. renderFrame() draws the real chain, so the
   measurement includes its GPU cost. Resolves 'NONE' if a frame throws. */
export function probe(renderFrame, frames = 30, discard = 5) {
  return new Promise((resolve) => {
    const times = [];
    let last = 0;
    const tick = () => {
      const now = performance.now();
      try {
        renderFrame();
      } catch {
        gsap.ticker.remove(tick);
        resolve('NONE');
        return;
      }
      if (last) times.push(now - last);
      last = now;
      if (times.length < frames) return;
      gsap.ticker.remove(tick);
      const kept = times.slice(discard).sort((a, b) => a - b);
      const median = kept[kept.length >> 1];
      resolve(median <= 18 ? 'HIGH' : median <= 28 ? 'MED' : 'LOW');
    };
    gsap.ticker.add(tick);
  });
}

export function setTier(t) { tierSignal.set(t); }
