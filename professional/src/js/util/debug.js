/* debug.js — the rig's debug overlay. Loaded only with ?debug, as its own chunk.

   Shows the five §9.1 signals live, plus the two counts that prove a motion
   toggle leaked nothing: live ScrollTriggers and the global timeline's
   children. Exposes window.__rig for console checks. */

import { gsap, ScrollTrigger } from '../core/easings.js';
import signals from '../core/signals.js';
import { getSmoother } from '../core/smoothscroll.js';
import { getContexts } from '../core/registry.js';
import { getSplits, onSplit } from '../core/split.js';
import { getHero } from '../sections/hero.js';

const fmt = (n) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(3);

export function mountDebug() {
  const el = document.createElement('pre');
  el.setAttribute('aria-hidden', 'true');
  el.dataset.debug = '';
  Object.assign(el.style, {
    position: 'fixed', right: '8px', bottom: '8px', zIndex: 100, margin: 0,
    padding: '8px 12px', font: '11px/1.5 var(--font-mono)', color: 'var(--silver-light)',
    background: 'color-mix(in srgb, var(--void) 88%, transparent)',
    border: '1px solid var(--hairline-strong)', pointerEvents: 'none', whiteSpace: 'pre',
  });
  document.body.append(el);

  const bar = (v) => {
    const n = Math.round(Math.abs(v) * 10);
    return v < 0 ? ' '.repeat(10 - n) + '█'.repeat(n) + '|' + ' '.repeat(10)
                 : ' '.repeat(10) + '|' + '█'.repeat(n) + ' '.repeat(10 - n);
  };

  gsap.ticker.add(() => {
    const { velocity, pointer, axis, tier, motion } = signals;
    el.textContent = [
      `velocity ${fmt(velocity.value)} ${bar(velocity.value)}`,
      `pointer  ${fmt(pointer.value[0])} ${fmt(pointer.value[1])}`,
      `axis     (${axis.value.join(', ')})`,
      `tier     ${tier.value ?? '—'}`,
      `motion   ${motion.value}`,
      `smoother ${getSmoother() ? 'on' : 'off'}  contexts ${getContexts().size}  splits ${getSplits().length}`,
      `triggers ${ScrollTrigger.getAll().length}  tweens ${gsap.globalTimeline.getChildren(true, true, true).length}`,
      stage ? `stage    ${stage.mode ?? '—'}  tris ${stage.chain.triangles}  calls ${stage.renderer.info.render.calls}  ripples ${stage.chain.ripples}` : 'stage    —',
    ].join('\n');
  });

  // The stage chunk is already loaded (or loading) by main.js; this shares it.
  let stage = null;
  const poll = () => import('../gl/stage.js').then((m) => {
    stage = m.getStage();
    window.__rig.stage = stage;
    if (!stage && signals.tier.value !== 'NONE') setTimeout(poll, 250);
  });
  poll();

  window.__rig = { signals, gsap, ScrollTrigger, getSmoother, getContexts, getSplits, onSplit, getHero };
}
