/* preloader.js — Movement 00, CAST. design.md §9.3, §7.5 (CAST row), §9.1
   boot step 6, errata E17.

   Existence rule (§9.3, invariant I1): #cast is injected here and is never in
   the served HTML. It is created only if document.readyState !== 'complete'
   when this module runs, and a hard 3 s timeout removes it whatever has or has
   not loaded. With JS off there is no veil, and nothing covers the page.

   Once per tab session (errata E48). The entry is a deferred module, so it
   always runs at 'interactive' and the readyState rule alone would show CAST
   on every warm reload. A sessionStorage flag keeps it to the first load in a
   tab; later loads skip it and the hero plays at boot. Storage that throws
   counts as "not seen", so CAST still shows (and still self-removes).

   The link is inline SVG in the veil, never the WebGL stage (errata E17): the
   stage and its `three` chunk load at idle after `load` (§12.7, "the hero must
   be readable before the stage exists"), which is exactly when CAST ends. So
   CAST looks the same at every tier, NONE included, and never waits on the
   tier probe. Its "roughness 0.60 → 0.12" is a gloss layer — the silver
   sheet's specular flip — whose opacity is bound to progress: it polishes as
   it loads.

   Progress (§9.3, PMREM replaced by `load` — errata E17):
     document.fonts.ready  0.50
     window `load`         0.30
     assets/me.jpg decode  0.20

   Exit (§9.3's 8τ table) starts once main.js has booted (step 6) and progress
   is 1, or at 3 s − 8τ at the latest, so the timeout never cuts it short. The
   hero entrance starts at exit 5τ through onReveal. Reduced motion (errata
   E17): no spin, no link scale, no aperture — the counter and hairline fade,
   then the veil, 2τ each (metal); the hero is already at rest. */

import { gsap, ScrollTrigger, T, ease } from '../core/easings.js';
import { resolveMotion } from '../util/prefers.js';

const SEEN = 'cast';
const TIMEOUT = 3000;   // ms — §9.3's hard cap
const SPIN = 0.6;       // rad/s — §7.5's CAST row
const EXIT = 8 * T;

const MARKUP = `
  <svg class="cast__mask" aria-hidden="true">
    <defs><mask id="castMask">
      <rect width="100%" height="100%" fill="#fff"/>
      <rect data-hole x="50%" y="50%" width="0" height="0" rx="0" fill="#000"/>
    </mask></defs>
    <rect class="cast__veil" width="100%" height="100%" mask="url(#castMask)"/>
  </svg>
  <svg class="cast__link" viewBox="0 0 96 64" aria-hidden="true">
    <defs><linearGradient id="castGloss" x1="0.396" y1="0.011" x2="0.604" y2="0.989">
      <stop offset="0"    style="stop-color: var(--silver-light)"/>
      <stop offset="0.38" style="stop-color: var(--silver-shadow)"/>
      <stop offset="0.52" style="stop-color: var(--chrome)"/>
      <stop offset="0.63" style="stop-color: #8A9199"/>
      <stop offset="1"    style="stop-color: var(--steel)"/>
    </linearGradient></defs>
    <rect class="cast__matte" x="6" y="6" width="84" height="52" rx="26"/>
    <rect class="cast__gloss" x="6" y="6" width="84" height="52" rx="26"/>
  </svg>
  <div class="cast__meter">
    <span class="cast__count">000</span>
    <span class="cast__line"></span>
  </div>`;

/** Injects the veil and starts it. Returns null when the page has already
 *  loaded or this tab has seen CAST (no CAST), otherwise { onReveal, booted() }. */
export function startCast() {
  if (document.readyState === 'complete') return null;
  try {
    if (sessionStorage.getItem(SEEN)) return null;
    sessionStorage.setItem(SEEN, '1');
  } catch { /* no storage: show it, as on a first load */ }
  const reduced = resolveMotion() === 'reduced';

  const cast = document.createElement('div');
  cast.id = 'cast';
  cast.setAttribute('aria-hidden', 'true');
  cast.innerHTML = MARKUP;
  document.body.append(cast);

  const q = (s) => cast.querySelector(s);
  const link = q('.cast__link');
  const gloss = q('.cast__gloss');
  const count = q('.cast__count');
  const line = q('.cast__line');
  const hole = q('[data-hole]');

  const api = { onReveal: null, booted: () => { isBooted = true; maybeExit(); } };
  let isBooted = false;
  let exiting = null;
  let gone = false;

  // ── Progress: bound directly, no tween on the bar (§9.3) ───────────────
  let progress = 0;
  const shown = { n: 0 };
  const write = () => {
    line.style.transform = `scaleX(${progress})`;
    gloss.style.opacity = progress;   // roughness 0.60 → 0.12, as gloss 0 → 1
    const n = Math.round(progress * 100);
    if (reduced) {
      count.textContent = String(n).padStart(3, '0');
    } else {
      gsap.to(shown, {
        n, duration: 2 * T, ease: ease.glyph, overwrite: true,
        snap: { n: 1 },
        onUpdate: () => { count.textContent = String(shown.n).padStart(3, '0'); },
      });
    }
  };
  const source = (weight, promise) => promise.catch(() => {}).then(() => {
    progress = Math.min(1, progress + weight);
    write();
    maybeExit();
  });
  const portrait = document.querySelector('#identity .aperture img');
  source(0.5, document.fonts.ready);
  source(0.3, new Promise((r) => window.addEventListener('load', r, { once: true })));
  source(0.2, portrait?.decode?.() ?? Promise.resolve());
  write();

  // ── Spin: ω = 0.6 rad/s on the one clock (§9.1), not an eased tween ────
  const t0 = gsap.ticker.time;
  const spin = () => gsap.set(link, { rotation: ((gsap.ticker.time - t0) * SPIN * 180) / Math.PI });
  if (!reduced) gsap.ticker.add(spin);

  // ── Removal: the 8τ row, and the hard cap ──────────────────────────────
  const remove = () => {
    if (gone) return;
    gone = true;
    gsap.ticker.remove(spin);
    clearTimeout(late);
    clearTimeout(hard);
    exiting?.kill();
    gsap.killTweensOf(shown);
    cast.remove();
    reveal();   // a cut-short exit still starts the hero
    ScrollTrigger.refresh();
  };
  let revealed = false;
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    api.onReveal?.();
  };

  const exit = () => {
    if (exiting || gone) return;
    gsap.killTweensOf(shown);
    count.textContent = String(Math.round(progress * 100)).padStart(3, '0');
    const meter = [count, line];
    if (reduced) {
      exiting = gsap.timeline({ onComplete: remove })
        .add(reveal, 0)
        .to(meter, { opacity: 0, duration: 2 * T, ease: ease.metal }, 0)
        .to(cast, { opacity: 0, duration: 2 * T, ease: ease.metal }, 2 * T);
      return;
    }
    const vw = innerWidth;
    const vh = innerHeight;
    const w = 1.1 * vw;
    const h = 1.1 * vh;
    gsap.set(hole, { attr: { x: vw / 2, y: vh / 2, width: 0, height: 0, rx: 0 } });
    link.style.willChange = 'transform';
    exiting = gsap.timeline()
      .to(meter, { opacity: 0, filter: 'blur(6px)', duration: 2 * T, ease: ease.metal }, 0)
      .to(link, { scale: 14, duration: 8 * T, ease: ease.mask }, 1 * T)
      .to(hole, {
        attr: { x: (vw - w) / 2, y: (vh - h) / 2, width: w, height: h, rx: h / 2 },
        duration: 8 * T, ease: ease.mask,
      }, 1 * T)
      .add(reveal, 5 * T)
      .to(cast, { opacity: 0, duration: 2 * T, ease: ease.metal }, 6 * T)
      // §9.3: removed at 8τ, while the link's and hole's last τ is still in
      // flight — by then the mask ease is past 0.99 and the veil is at 0.
      .add(remove, 8 * T);
  };

  function maybeExit() {
    if (isBooted && progress >= 1) exit();
  }
  // The exit must finish inside the cap: start it by 3 s − 8τ at the latest.
  const late = setTimeout(exit, TIMEOUT - EXIT * 1000);
  const hard = setTimeout(remove, TIMEOUT);

  return api;
}
