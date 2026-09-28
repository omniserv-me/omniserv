/* metal.js — the metal pass. design.md §8.2 (shader), §8.3 (why these four),
   §8.4 (exposure flash), §7.7 / errata E16 (HIGH only).

   Four operations in one full-screen pass, between the RenderPass and the
   OutputPass (§8.1): chromatic shear along the scroll axis, the brushed-metal
   streak on bright pixels, the hard specular clip, and an ordered dither that
   removes banding from the dark silver ramps. Deliberately not bloom.

   It exists only at HIGH (errata E16): MED and LOW drop the composer and render
   directly, so uStreak is 1.0 whenever this pass runs.

   The uniforms are live references, not copies:
     uExposure  — the stage's own { value } (§8.4), tweened by stage.flash()
     uAxis      — signals.axis each frame: (0,1), or (1,0) in the WORKS pin
     uVelocity  — signals.velocity each frame, already signed and clamped
     uResolution — the drawing buffer, set by the composer's setSize() */

import { ShaderMaterial, Vector2 } from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// §8.2, verbatim.
const fragmentShader = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2  uResolution;
uniform vec2  uAxis;       // scroll axis: (0,1) vertical, (1,0) during the pinned track
uniform float uVelocity;   // smoothed, signed, clamped to [-1, 1]
uniform float uExposure;   // 1.0; 1.25 for 2τ on the LINK snap (§9.8)
uniform float uStreak;     // 1.0 HIGH, 0.0 off
varying vec2 vUv;

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// Ordered 4x4 Bayer, computed analytically — no dynamic matrix indexing,
// which is not portable on GLSL ES 1.0 hardware.
float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
#define bayer4(a) (bayer2(0.5 * (a)) * 0.25 + bayer2(a))

void main() {
  vec2  px = 1.0 / uResolution;
  float a  = texture2D(tDiffuse, vUv).a;

  // 1 — chromatic shear along the scroll axis, <= 2.5 px at |v| = 1
  vec2 sh = uAxis * uVelocity * 2.5 * px;
  vec3 c = vec3(texture2D(tDiffuse, vUv + sh).r,
                texture2D(tDiffuse, vUv     ).g,
                texture2D(tDiffuse, vUv - sh).b);

  // 2 — anisotropic brush streak, bright pixels only  (brushed metal)
  if (uStreak > 0.0) {
    vec3 s = c * 0.40;
    s += texture2D(tDiffuse, vUv + vec2(-2.0 * px.x, 0.0)).rgb * 0.10;
    s += texture2D(tDiffuse, vUv + vec2(-1.0 * px.x, 0.0)).rgb * 0.20;
    s += texture2D(tDiffuse, vUv + vec2( 1.0 * px.x, 0.0)).rgb * 0.20;
    s += texture2D(tDiffuse, vUv + vec2( 2.0 * px.x, 0.0)).rgb * 0.10;
    c = mix(c, s, smoothstep(0.70, 1.00, luma(c)) * uStreak);
  }

  // 3 — hard specular clip. Stark, not bloomed: the top 8% goes to pure white and stops.
  c *= uExposure;
  c  = clamp(mix(c, vec3(1.0), smoothstep(0.92, 1.00, luma(c))), 0.0, 1.0);

  // 4 — ordered dither at 1.5/255: kills banding in the dark silver ramps
  c += (bayer4(gl_FragCoord.xy) - 0.5) * (1.5 / 255.0);

  // Guard: the canvas is premultiplied-alpha over CSS, so dithering fully
  // transparent pixels would paint faint noise over the page ground.
  c *= step(0.0001, a);

  gl_FragColor = vec4(c, a);
}`;

/** The §8.2 pass. `exposure` is the stage's { value } (§8.4), bound by
 *  reference; call update(axis, velocity) once per frame before rendering. */
export function createMetalPass(exposure, streak) {
  const material = new ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      uResolution: { value: new Vector2(1, 1) },
      uAxis: { value: new Vector2(0, 1) },
      uVelocity: { value: 0 },
      uExposure: exposure,
      uStreak: { value: streak },
    },
    vertexShader,
    fragmentShader,
  });
  const pass = new ShaderPass(material);
  const u = material.uniforms;
  // The composer calls this with the drawing-buffer size on addPass and resize.
  pass.setSize = (w, h) => u.uResolution.value.set(w, h);
  pass.update = (axis, velocity) => {
    u.uAxis.value.set(axis[0], axis[1]);
    u.uVelocity.value = velocity;
  };
  return pass;
}
