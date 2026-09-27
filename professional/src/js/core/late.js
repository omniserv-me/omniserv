/* late.js — the plugins the page needs only after the first section change.
   Never imported statically: core/lazy.js loads it at idle, so Vite emits it as
   its own chunk (design.md §12.7).

   Flip      — the nav indicator (§9.9); its first placement at boot is static.
   MorphSVG  — the LINK glyph (§9.8), in the last movement. */

import { gsap } from './easings.js';
import { Flip } from 'gsap/Flip';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';

gsap.registerPlugin(Flip, MorphSVGPlugin);

export { Flip, MorphSVGPlugin };
