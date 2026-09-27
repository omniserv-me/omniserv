/* easings.js — plugin registration, the beat, and the six named easings.
   design.md §9.1 (plugins), §3.5 (beat grid), §9.2 (easings).

   Registration lives here rather than in main.js because ES imports hoist: this
   is the first module every other one imports, so it is evaluated before any
   code that touches a plugin — and CustomEase must be registered before the
   CustomEase.create() calls below. */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';
import { Flip } from 'gsap/Flip';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText,
                    CustomEase, Flip, DrawSVGPlugin, MorphSVGPlugin);

/* §3.5 — base beat τ. Durations are written as `5 * T`, never `0.6`, so the
   Fibonacci relationship stays visible in the source. */
export const T = 0.12;

/* §9.2 — five curves plus one built-in. Nothing else is used anywhere on the page.
   Scrubbed animations always use ease: 'none'. */
CustomEase.create('mask',     'M0,0 C0.16,1 0.3,1 1,1');      // ≈ expo.out  — wipes, apertures, draws
CustomEase.create('glyph',    'M0,0 C0.08,0.82 0.17,1 1,1');  // ≈ power4.out — all type
CustomEase.create('metal',    'M0,0 C0.5,0 0.5,1 1,1');       // symmetric   — sheens, exposure, blur
CustomEase.create('catenary', 'M0,0 C0.18,0.92 0.08,1 1,1');  // fast settle, long tail — chain relax
CustomEase.create('shut',     'M0,0 C0.7,0 0.84,0.06 1,1');   // ≈ expo.in   — apertures closing

export const ease = {
  mask: 'mask',
  glyph: 'glyph',
  metal: 'metal',
  catenary: 'catenary',
  shut: 'shut',
  chain: 'back.out(1.8)',   // anything that seats: tags, nodes, buttons, link snap
};

export { gsap, ScrollTrigger, ScrollSmoother, SplitText, CustomEase, Flip, DrawSVGPlugin, MorphSVGPlugin };
