# design.md — Portfolio refactor specification

**Subject:** `professional/` — the portfolio page served at `omniserv.me`
**Status:** specification, approved for implementation
**Date:** 2026-09-27
**Branch:** `refactor/webpage`

This document is the complete description of the page to be built. It is written so that
implementation is transcription rather than invention: every colour, ratio, duration, easing
and piece of copy is fixed here. Where a number is tunable, the tunable range is given.

Verified against the exact dependency versions this project will pin — `gsap@3.15.0`,
`three@0.186.1`, `vite@8.3.1`, Node 26 — on 2026-09-27. Every plugin and addon named below was
confirmed present in those packages; none is assumed.

---

## 1. Intent and non-goals

### 1.1 What this page is

A single-page portfolio for an AI & Infrastructure Engineer. It has to do two jobs at once:
state credentials clearly enough for a recruiter skimming for thirty seconds, and demonstrate
craft convincingly enough that the page itself is evidence. The second job is why the aesthetic
is aggressive; the first job is why it stays legible.

### 1.2 The aesthetic thesis

Five ideas, in priority order. When two conflict, the earlier one wins.

1. **Mathematical precision.** Nothing is placed by eye. Every dimension derives from the
   Lichtenberg ratio √2 (§3), every duration from a 0.12 s beat (§3.5), every easing from a
   named curve with explicit control points (§9.2). The precision is meant to be *felt* rather
   than noticed — rhythm, not decoration.
2. **Silver as a rendered material, not a colour.** Silver cannot be a hex value; it is a
   behaviour — a gradient with a specular flip that moves. In CSS it is a gradient token; in
   WebGL it is an actual metal with an environment map (§4.2, §7.4).
3. **Chain.** The structural motif and the page's spine. A chain is linear, directional,
   tensioned and *interlocked* — the same properties a hyperlink has. The page's chain obeys
   real physics: it hangs as a catenary when idle and snaps taut when scrolled (§7.2).
4. **Geometric masking.** Content is revealed by apertures, wipes and chamfers on exact angles
   (12°, 15°, 45°, 105°), never by generic fades. Reveals feel mechanical — shutters, not smoke.
5. **Kinetic typography.** Type animates its *letterforms*, not its position: the variable
   `wdth` axis is the primary animated property (§5.1). Words expand, compress and breathe.

### 1.3 The three readability invariants

These override any aesthetic decision, always:

- **I1 — Content exists before JavaScript.** Every word is in the served HTML. JavaScript adds
  the veil, the motion and the canvas; it never supplies content. The only text JS writes is the
  copyright year and the diagnostic tier readout. *(errata E6)*
- **I2 — No text animates below AA contrast.** Any element that is still on screen holds at
  least 4.5:1 against its background. Dim states have a hard floor (§4.3). Text may animate
  *from* invisible on entry; it may never *rest* below the floor.
- **I3 — The page works with JS or WebGL dead.** No-JS, no-WebGL, reduced-motion and low-power
  all resolve to complete, readable, styled pages (§10).

### 1.4 Non-goals

- **No scroll-jacked narrative beyond one section.** Exactly one pinned section (§6.5). *(errata E11)* The rest
  of the page scrolls natively.
- **No bloom, no glassmorphism, no gradient-mesh blobs.** These are what the current page does
  and what everything else does. Silver's drama comes from hard specular clipping (§8.3).
- **No audio, no cursor replacement, no custom scrollbar.**
- **No dark/light toggle.** The design is committed to a dark ground; silver needs it. The only
  user toggle is motion (§10.1).
- **No CMS, no framework.** Vanilla ES modules built by Vite.

---

## 2. Content inventory → new position

Nothing in the current site disappears without a recorded reason. Rows below cover every
user-visible string in `index.html` and every file in `professional/`.

### 2.1 Content that moves

| Current | Location now | New position |
|---|---|---|
| `Leo` wordmark | `index.html:15` | §6.2 nav — becomes a chain-link SVG mark plus `LEO` in mono |
| Nav: About / Stack / Projects / Socials | `index.html:17-20` | §6.2 nav — reindexed `02 ABOUT` `03 STACK` `04 WORK` `05 LINK` |
| `Resume` CTA → `files/Yesaulov_CV.pdf` | `index.html:22` | §6.2 nav, §6.3 hero, §6.7 contact — relabelled `DOSSIER` |
| Mobile nav toggle | `index.html:23` | §6.2 — full-screen panel on a 15° polygon sweep (§9.9) |
| `Hi — I'm Leonid Yesaulov` | `index.html:39` | §6.3 hero `<h1>` — the greeting is dropped, the name becomes the kinetic headline |
| `I build fast, reliable software and delightful user experiences.` | `index.html:40` | Retired as the tagline; its intent survives CV-aligned in §6.3. Recorded as a deliberate replacement, per decision 1 |
| `View Projects` button | `index.html:42` | §6.3 primary CTA → `SELECTED WORK` |
| `About me` button | `index.html:43` | §6.3 tertiary scroll cue → `02 ABOUT ↓` |
| `assets/me.jpg` portrait | `index.html:49` | §6.3 hero portrait in a stadium aperture; also the `og:image` source |
| About paragraph 1 (robust systems, clean UI, performance, readable code, testing, automation, collaboration) | `index.html:60` | §6.4 — split: the engineering claims fold into paragraph 1, the values become the mono **principles strip** so they read as a stated position rather than filler |
| `Favourite domains: data/AI, backend systems and developer tools.` | `index.html:61` | §6.4 paragraph 3, verbatim in substance |
| `Hobbys: arts (music, literature), bonsai gardens and tabletop games.` | `index.html:62` | §6.4 paragraph 3, second sentence (typo fixed) |
| `Quick facts` card: Location / Languages / Education | `index.html:66-71` | §6.4 **fact plate**, enriched with CEFR levels and the maths minor per decision 2 |
| 8 stack badges | `index.html:84-91` | §6.5 lattice — all 8 retained as nodes, joined by CV competencies in four clusters |
| Omniserv project card | `index.html:104-121` | §6.6 card `01`. The `Docker` and `GitHub Actions` tags commented out at `index.html:113-115` are **restored** |
| Portfolio Website card | `index.html:123-136` | §6.6 card `04`, rewritten to describe this build |
| Secure Memory Unit card | `index.html:138-148` | §6.6 card `03`, unchanged in substance |
| `reach out` mailto (`subject=New Offer`) | `index.html:100` | §6.7 — folded into row `03`'s single mailto; the intent subjects are retired |
| Socials: GitHub / LinkedIn / Email (`subject=Personal Inquiry`) | `index.html:162-164` | §6.7 rows `01`–`03`; row `03` is one mailto with placeholder subject and first line |
| `© <year> Leonid Yesaulov — Built with care.` | `index.html:172` | §6.8 colophon. Year still injected by JS; `Built with care` is replaced by the concrete build line |
| `files/Yesaulov_CV.pdf` | — | `public/files/Yesaulov_CV.pdf` — **the URL path must not change**, it may already be shared externally |
| `LICENSE.txt` (CC BY 3.0) | — | `public/LICENSE.txt`, linked from §6.8. Currently unreachable: `.dockerignore` excludes `*.txt` (§12.4) |
| `README.txt` | — | Becomes `README.md`, rewritten (§12.6); its "Part of Omniserv" line becomes colophon copy |
| `Caddyfile` / `Dockerfile` / `.dockerignore` | — | Amended per §12.3–12.5 |
| `docker-compose.yaml` | repo root | **Unchanged.** `build: ./professional/` and the `curl` healthcheck keep working (§12.3) |

### 2.2 Content retired on purpose

| Current | Why it goes |
|---|---|
| Three gradient blobs (`style.css:96-126`) | Generic 2021 glassmorphism; the exact thing this refactor exists to replace. Also broken — `style.css:300-327` repaints them solid black under 768px, so mobile users see three black rectangles behind blur |
| 2D canvas particle field (`script.js:16-67`) | O(n²) link-drawing over 80 particles every frame on the main thread, uncapped DPR, and the visual cliché of the decade. The WebGL chain stage replaces it |
| `.reveal` IntersectionObserver (`script.js:5-14`) | Replaced wholesale by GSAP ScrollTrigger |
| `body.theme-dark` class | Vestigial — there is no light theme and never was |
| `.accent` rule (`style.css:152-157`) | Sets `color` twice and relies on `-webkit-background-clip` without the standard property; the gradient text works by accident. Replaced by a proper silver-gradient text utility (§4.2) |
| Google Fonts `<link>` (`index.html:8-9`) | Fonts become self-hosted (§5.2) — removes a third-party request and, more importantly, the FOUT that makes SplitText measure the wrong glyph widths |
| `hidden: true` in `.blob-3` (`style.css:326`) | Not a CSS property. Dead line |
| `@notData` matcher (`Caddyfile:6`) | Declared, never referenced. Dead config (§12.5) |

---

### 2.3 Anchor migration

Every section id changes: `#about → #dossier`, `#stack → #lattice`, `#projects → #works`,
`#socials → #link`. The old ids may exist in bookmarks, in a LinkedIn profile link, or in a sent
email, so they cannot simply disappear.

Handled with a legacy-hash map in `main.js`, applied before the first paint and before
ScrollTrigger initialises:

```js
const LEGACY = { about: 'dossier', stack: 'lattice', projects: 'works', socials: 'link' };
const h = location.hash.slice(1);
if (LEGACY[h]) history.replaceState(null, '', '#' + LEGACY[h]);
```

`replaceState` rather than a redirect, so the back button is not polluted. Rewriting the hash is
not the same as scrolling to it: `replaceState` does not re-run the browser's fragment-scroll, and
the *original* incoming hash (e.g. `#about`) never matches an id once the rename ships, so nothing
auto-scrolls without help. Once `smoother` exists (§9.1), boot must explicitly resolve
`location.hash` — legacy-mapped or already-current — with `smoother.scrollTo(location.hash, false)`;
native anchor-jump is unreliable against a ScrollSmoother-transformed document, for the same reason
the WORKS pin needs its own `onFocusIn` handling (§9.7). The `#hero` → `#identity` rename needs no
entry: `#hero` was never linked from anywhere, including the old nav.

---

## 3. Design system — the √2 spine

### 3.1 Why √2

`files/Yesaulov_CV.pdf` is A4: 595.5 × 842.25 pt, a ratio of 1:√2. A4 is the one paper format
whose aspect ratio is preserved under halving — the Lichtenberg ratio. The CV is the document
this page exists to support, so the page inherits its geometry. Every scale below is a power of
√2, and the page states this openly in the colophon (§6.8). It is the organising conceit, and it
is the reason the layout feels regular without being obviously gridded.

### 3.2 Type scale

Base 16 px. Step size `2^(1/4) = 1.189207` — a quarter-octave, so four steps double and two
steps multiply by √2. Sizes are declared in `rem`; px values shown for reference.

| Token | Step | px | Use |
|---|---|---|---|
| `--t--2` | 16·2^(−2/4) | 11.31 | mono micro-labels, indices, telemetry |
| `--t--1` | 16·2^(−1/4) | 13.45 | mono labels, tags, captions |
| `--t-0` | 16 | 16.00 | body copy |
| `--t-1` | 16·2^(1/4) | 19.03 | lead paragraph, card body |
| `--t-2` | 16·2^(2/4) | 22.63 | card title (mobile), blockquote |
| `--t-3` | 16·2^(3/4) | 26.91 | card title |
| `--t-4` | 16·2 | 32.00 | section heading (mobile) |
| `--t-5` | 16·2^(5/4) | 38.06 *(errata E12)* | — |
| `--t-6` | 16·2^(6/4) | 45.25 | section heading |
| `--t-8` | 16·4 | 64.00 | hero name (mobile) |
| `--t-10` | 16·2^(10/4) | 90.51 | hero name (tablet) |
| `--t-12` | 16·8 | 128.00 | hero name (desktop) |

Fluid sizes interpolate between two adjacent scale steps with `clamp()` — never outside the
scale. Hero name: `clamp(var(--t-8), 11.2vw, var(--t-12))`. Section heading:
`clamp(var(--t-4), 5vw, var(--t-6))`.

Line heights are ratios, not lengths: `1.55` body, `1.35` lead, `1.05` display, `1.2` mono.

### 3.3 Spacing

Unit `u = 8px`. Only Fibonacci multiples of `u` are permitted, which yields a scale that grows
at roughly φ while staying on an 8 px grid:

| Token | ×u | px |
|---|---|---|
| `--s-1` | 1 | 8 |
| `--s-2` | 2 | 16 |
| `--s-3` | 3 | 24 |
| `--s-5` | 5 | 40 |
| `--s-8` | 8 | 64 |
| `--s-13` | 13 | 104 |
| `--s-21` | 21 | 168 |

Section vertical rhythm: `--s-21` desktop, `--s-13` tablet, `--s-8` mobile.

### 3.4 Grid and measure

- 12 columns, gutter `--s-3` (24 px), page margin `--s-5` (40 px) desktop / `--s-3` mobile.
- Container `max-width: 1280px`. A `--container-wide: 1568px` variant exists only for the
  pinned works track (§6.6).
- Body measure `66ch`, hard cap `--s-8 * 11 = 704px`. Never full-bleed body copy.
- Breakpoints: `s ≤ 640px`, `m 641–900px`, `l 901–1280px`, `xl > 1280px`. These three numbers
  match the existing CSS breakpoints so nothing regresses silently. *(errata E14)*
- **Asymmetry rule:** section content sits on columns 2–8 or 5–12, alternating down the page.
  The unused side is where the chain runs (§7.5). The layout's asymmetry exists to make room for
  the chain, which is why it never looks arbitrary.

### 3.5 The beat grid

The temporal counterpart to the spatial grid, and the single most load-bearing convention in this
document. Base beat **τ = 0.12 s**. Every *choreographed* duration in the page is a Fibonacci
multiple of τ. This governs animation timings; it does not extend to incidental constants like
the CAST safety timeout (§9.3) or the idle-breathing loop periods (§9.4) — those are engineering
and perceptual thresholds, not beats, and are exempt by design:

| Beats | Seconds | Use |
|---|---|---|
| 1τ | 0.12 | micro-states: hover, focus, tag pop |
| 2τ | 0.24 | small state changes: colour, blur, nav shrink |
| 3τ | 0.36 | component-level: card lift, glyph morph, indicator flip |
| 5τ | 0.60 | text line reveals, plate rows |
| 8τ | 0.96 | section entrances, aperture opens, sheen sweeps |
| 13τ | 1.56 | hero headline, lattice growth |
| 21τ | 2.52 | preloader exit ceiling only |

Staggers: **0.5τ (0.06 s)** between glyphs, **1τ (0.12 s)** between lines, list rows and cards.

Implementation: `--beat: 0.12s` in CSS, `export const T = 0.12` in `js/core/easings.js`, and
durations written as `5 * T` rather than `0.6` so the relationship stays visible in the source.

### 3.6 Fixed angles

Every non-orthogonal angle on the page comes from this list. No other angles are permitted.

| Angle | Use | Rationale |
|---|---|---|
| 12° | body-copy mask wipes (conceptual tilt) | shallow enough to read as a wipe, not a diagonal — see 102° below for the CSS-ready form |
| 15° | mobile nav panel sweep | 105° − 90°; shares the sheen angle's off-vertical tilt |
| 30° / 150° | lattice edge axes | triangular lattice; the only two axes plus vertical |
| 45° | card chamfer, corner cuts | the one angle that reads as a machined bevel |
| 102° | body-copy mask wipes, `linear-gradient()` form | 90° + 12°; the literal CSS angle for the row above |
| 105° | all specular sheen sweeps | 90° + 15°; off-vertical enough to travel visibly across a wide card |
| 168° | silver sheet gradient axis | near-vertical with a deliberate lean, so flat panels still catch a highlight |

### 3.7 Parallax depths

Amplitudes are `4px · √2^n`, assigned by depth layer. Pointer parallax uses these directly;
scroll parallax multiplies them by 4.

| Layer | n | Amplitude |
|---|---|---|
| body copy | — | 0 (never parallaxes) |
| headings | 0 | 4.00 px |
| fact plate, cards | 1 | 5.66 px |
| portrait | 2 | 8.00 px |
| chain (foreground links) | 3 | 11.31 px |
| chain (mid) | 4 | 16.00 px |
| background gradient sheet (`.ground`, §8.5; pointer only — it is fixed) | 5 | 22.63 px |

---

## 4. Colour — silver as a behaviour

### 4.1 Palette

Eleven tokens. Nothing outside this list appears anywhere in the CSS.

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#05070A` | page ground; blue-shifted black, never pure `#000` |
| `--void` | `#0A0D12` | recessed panels, nav ground |
| `--graphite` | `#171B21` | raised panels, card ground |
| `--steel` | `#3A4149` | borders on raised surfaces, gradient dark stop |
| `--silver-shadow` | `#6E757C` | hairlines, rules, gradient mid-dark — **no text under 24 px** (§4.3) |
| `--silver` | `#A8AEB5` | secondary copy, tags |
| `--silver-light` | `#C9CED4` | **body copy** |
| `--chrome` | `#E8EBEE` | headings, specular highlight stop |
| `--white` | `#FFFFFF` | specular clip only — the hottest 3 % of any highlight |
| `--blue` | `#1F5BFF` | strokes, active indicators, WebGL fill light |
| `--blue-lift` | `#6C9BFF` | blue **text**, links, focus rings, WebGL rim light |

Two blues because one blue cannot do both jobs: `--blue` is the stark vector accent and fails AA
as text; `--blue-lift` is the accessible variant (§4.3). Using `--blue` for a link is a bug.

### 4.2 Silver gradient tokens

Silver is never a flat fill. Four gradient tokens, each with a specular flip — a bright stop
immediately adjacent to a dark one, which is the only thing that reads as metal rather than grey.

```css
/* Panel/sheet metal — decorative surfaces only, never behind text (§4.3).
   Flip at 52 %. Angle 168° per §3.6. */
--silver-sheet: linear-gradient(168deg,
  #C9CED4 0%, #6E757C 38%, #E8EBEE 52%, #8A9199 63%, #3A4149 100%);

/* Text-bearing metal: the DOSSIER CTA and any filled button. Range-limited so
   --ink text holds 8.00:1 at the worst stop (§4.3). NOT interchangeable with --silver-sheet. */
--silver-fill: linear-gradient(168deg,
  #B4BAC0 0%, #E8EBEE 46%, #C9CED4 62%, #9DA4AB 100%);

/* Travelling highlight band. Animated via background-position (§9.4). (errata E21) */
--silver-sheen: linear-gradient(105deg,
  rgba(232,235,238,0) 42%, rgba(232,235,238,0.55) 50%, rgba(232,235,238,0) 58%);

/* Gradient text. MUST be paired with a solid fallback colour. */
--silver-text: linear-gradient(180deg, #E8EBEE 0%, #A8AEB5 54%, #6E757C 100%);

/* Hairlines. The page's primary structural device. */
--hairline:        rgba(168,174,181,0.22);
--hairline-strong: rgba(201,206,212,0.40);
--hairline-blue:   rgba(31,91,255,0.55);
```

The gradient-text utility replaces the broken `.accent` rule (§2.2). Correct form — solid colour
first so an unsupported browser gets readable text, and the standard property alongside the
prefixed one:

```css
.silver-type {
  color: var(--chrome);                    /* fallback, must come first */
  background-image: var(--silver-text);
  -webkit-background-clip: text;
  background-clip: text;
}
@supports (background-clip: text) or (-webkit-background-clip: text) {
  .silver-type { color: transparent; }
}
@media (forced-colors: active) {
  .silver-type { color: CanvasText; background-image: none; }
}
```

### 4.3 Contrast and the dim floor

All ratios below are computed WCAG 2.1 values, not estimates. `--ink` has relative luminance
0.0021; `--void` 0.0043; `--graphite` 0.0094. *(errata E12)*

**Against `--ink`** (the page ground):

| Token | Ratio | Permitted use |
|---|---|---|
| `--white` | 20.17:1 | specular only |
| `--chrome` | 16.85:1 | headings, any size |
| `--silver-light` | 12.74:1 | **body copy**; the only dimmable text token |
| `--silver` | 9.01:1 | secondary copy, small mono labels, tags |
| `--blue-lift` | 7.46:1 | links, blue text, focus rings |
| `--silver-shadow` | 4.32:1 | **hairlines and decorative rules; text only at ≥ 24 px** |
| `--blue` | 3.84:1 | **never text below 24 px bold.** Strokes, fills, indicators, specular |

**Against `--graphite`** (card and plate ground) — the case that actually constrains the design,
because every panel on the page is darker-on-darker than the page ground:

| Token | on `--void` | on `--graphite` | Small text (< 24 px)? |
|---|---|---|---|
| `--silver-light` | 12.29:1 | 10.91:1 | yes |
| `--silver` | 8.70:1 | 7.72:1 | yes |
| `--silver-shadow` | 4.17:1 | **3.70:1** | **no — fails AA on every ground** |

**Rule this produces, and it is not optional:** `--silver-shadow` is a *hairline* colour. It may
never carry small text, including the mono micro-labels it looks tempting for — a `--t--2` label in
`--silver-shadow` on a `--graphite` plate measures 3.70:1, which fails AA outright. Every mono label
at `--t--2` or `--t--1` uses `--silver` (7.72:1 on graphite). §5.3 assigns colours accordingly.

**Text on metal.** `--ink` text over `--silver-sheet` is unsafe: the sheet's dark stops measure
4.32:1 at 38 % and **1.95:1 at 100 %**, so the DOSSIER CTA — the page's single most important
control — would be illegible across part of its own fill. Text-bearing metal surfaces therefore use
a separate, range-limited token (§4.2, `--silver-fill`), whose worst stop is 8.00:1. `--silver-sheet`
is for surfaces with no text on them.

**The dim floor.** Several interactions dim non-focused elements (§9.6 lattice, §9.7 cards):

- The floor is `opacity: 0.60`, as a token `--dim-floor: 0.60`. No tween may target below it.
- **Only `--silver-light` text may be dimmed.** At 0.60 it composites to 4.95:1 on `--ink`,
  4.96:1 on `--void`, 4.72:1 on `--graphite` — AA on all three. `--silver` at the same opacity
  yields 3.62–3.78:1 and fails, so dimmable labels (lattice nodes, card tags) are
  `--silver-light`, not `--silver`.
- Elements animating *in* from `opacity: 0`, or *out* while leaving the viewport, are exempt —
  they are not resting.

This is invariant I2 made numeric.

### 4.4 Colour budget

Per viewport, at any scroll position: silver family ≥ 80 % of non-ground pixels; blue ≤ 5 %;
pure white ≤ 1 %. The blue budget is what keeps the accent stark. Two blue elements on screen
at once is the maximum; the active nav indicator counts as one.

---

## 5. Typography

### 5.1 Families

Three, each with one job.

| Role | Family | Axes | Fallback stack |
|---|---|---|---|
| Display / kinetic | **Archivo** variable | `wght` 100–900, `wdth` 62–125 | `"Archivo Variable", "Arial Narrow", Impact, system-ui, sans-serif` |
| Body | **Inter** variable | `wght` 100–900, `opsz` 14–32 | `"Inter Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| Mono / telemetry | **JetBrains Mono** variable | `wght` 100–800 | `"JetBrains Mono Variable", ui-monospace, "SF Mono", Menlo, Consolas, monospace` |

**Archivo is chosen for its `wdth` axis, not its shapes.** A 62–125 width range is what makes
genuine kinetic typography possible: letterforms narrow and widen while the baseline and cap
height hold. This is the page's signature move (§9.4) and it is not achievable with `scaleX`,
which distorts stroke weight. Inter is retained from the current site because it is the correct
choice for body copy and there is no reason to churn it. JetBrains Mono carries the technical
register — indices, coordinates, tier readouts.

**Verify at install time:** confirm the actual axis ranges in the downloaded `woff2` (Archivo's
`wdth` range has differed between releases). If `wdth` is narrower than 62–125, scale the
animation targets in §9.3 *(errata E11)* proportionally rather than clamping — the *relative* width travel is
what reads, not the absolute values.

### 5.2 Self-hosting

Fonts are self-hosted, replacing the Google Fonts `<link>` at `index.html:8-9`. Two reasons,
the second decisive:

1. Removes a third-party request from a self-hosted site.
2. **SplitText measures glyph boxes.** If a split runs before the real face loads, every line
   break and character offset is computed against the fallback metrics and the headline reflows
   visibly mid-animation. Self-hosting plus `document.fonts.ready` gating (§9.1) eliminates the
   race; `autoSplit: true` (§10.4) is the safety net, not the solution.

Setup:

- Variable `woff2` only, in `public/fonts/` with a version in the filename
  (`archivo-var-v1.woff2` etc.), deliberately unhashed — see §12.2 for why.
- `@font-face` with `font-display: swap`, and the full variable range declared:
  `font-weight: 100 900; font-stretch: 62% 125%;`
- `<link rel="preload" as="font" type="font/woff2" crossorigin>` for **Archivo only** — it
  carries the LCP element. Preloading all three delays the hero.
- Subset to printable ASCII + exactly the non-ASCII characters the page renders: `©` `°` `·` `×`
  `–` `—` `→` `↓` `↗` `√`. Full Latin-1 puts the three faces at ~167 KB, over §12.7's 140 KB;
  this set is ~117 KB. Re-subset when copy gains a character outside it — it would fall back per
  glyph. Keep digits tabular-capable for the mono face (`tnum` is kept in all three).

### 5.3 Roles

| Element | Family | Size | Weight | Tracking | Case | Colour |
|---|---|---|---|---|---|---|
| Hero name | Archivo | `clamp(--t-8, 11.2vw, --t-12)` | 800 | `-0.02em` | upper | `--silver-text` grad. |
| Hero role line | JetBrains Mono | `--t--1` | 500 | `0.18em` (animated from `0.6em`) | upper | `--silver` |
| Hero tagline | Inter | `--t-1` | 400 | `0` | sentence | `--silver-light` |
| Section index (`02`) | JetBrains Mono | `--t--2` | 600 | `0.22em` | — | `--silver` |
| Section heading | Archivo | `clamp(--t-4, 5vw, --t-6)` | 700 | `-0.015em` | upper | `--chrome` |
| Card title | Archivo | `--t-3` | 700 | `-0.01em` | upper | `--chrome` |
| Card kicker | JetBrains Mono | `--t--1` | 400 | `0.14em` | upper | `--silver` |
| Body | Inter | `--t-0` | 400 | `0` | sentence | `--silver-light` |
| Lead | Inter | `--t-1` | 380 | `-0.005em` | sentence | `--silver-light` |
| Tag / node label | JetBrains Mono | `--t--1` | 500 | `0.08em` | upper | `--silver-light` |
| Plate label | JetBrains Mono | `--t--2` | 600 | `0.18em` | upper | `--silver` |
| Plate value | Inter | `--t-0` | 450 | `0` | sentence | `--silver-light` |
| Telemetry | JetBrains Mono | `--t--2` | 400 | `0.12em` | upper | `--silver` |

Tag and node labels are `--silver-light` rather than `--silver` because they are the two things
the page dims on hover; only `--silver-light` survives the 0.60 dim floor at AA (§4.3).

`font-variant-numeric: tabular-nums` on every mono number so counters and indices do not jitter
while animating. This is mandatory for the scramble effect (§9.7) and the preloader counter
(§9.3) — without it the layout shifts on every frame.

### 5.4 Animating the width axis

Two mechanisms, in preference order:

1. **`font-stretch` as a percentage** — natively animatable, maps directly to `wdth`, and GSAP
   tweens it as an ordinary CSS property: `gsap.to(el, { fontStretch: "112%", duration: T })`.
   Use this wherever a single element's width animates.
2. **Proxy object + `onUpdate`** — required for per-character staggers, because writing 40
   individual `fontVariationSettings` strings per frame through the CSS plugin is wasteful:

```js
// One tween, one object, explicit writes. Used for headline reveals.
const state = { wdth: 62 };
gsap.to(state, {
  wdth: 100, duration: 5 * T, ease: "glyph",
  onUpdate() {
    const v = `"wdth" ${state.wdth.toFixed(1)}`;
    for (const c of chars) c.style.fontVariationSettings = v;
  }
});
```

For staggered per-character width, tween an array of objects and write in a single `onUpdate` on
the timeline rather than 40 concurrent tweens.

**Never animate `letter-spacing` and `wdth` on the same element simultaneously** — both change
advance width, the effects compound non-linearly, and the result reads as a glitch rather than a
morph. The hero role line animates tracking; the hero name animates width. Not both.

---

## 6. Page architecture — six movements

### 6.1 Overview

The page is one document read as six movements. The musical framing is not decoration: it is why
the beat grid (§3.5) exists, and it gives the chain a reason to change state at each boundary
(§7.5).

| # | Id | Name | Scroll extent | Chain state |
|---|---|---|---|---|
| 00 | `#cast` | CAST | overlay, 0 | single link, polishing |
| 01 | `#identity` | IDENTITY | 100vh | enters top-left, bowing |
| 02 | `#dossier` | DOSSIER | ~140vh | holds the left margin (cols 2–4) |
| 03 | `#lattice` | LATTICE | ~120vh | branches into four |
| 04 | `#works` | WORKS | pinned, ~310vh | horizontal, runs the track |
| 05 | `#link` | LINK | ~100vh | coils into a closed loop |
| — | `#colophon` | colophon | ~40vh | loop idles |

Total document height ≈ 810vh desktop. Section indices are shown on the page — `01`…`05` in mono
— because numbering the movements is both navigational aid and part of the register.

Global DOM shell. ScrollSmoother requires the wrapper/content pair, and the canvas sits fixed
*behind* content, outside the smoothed subtree so it is not transformed:

```html
<body>
  <a class="skip" href="#identity">Skip to content</a>
  <div class="ground" aria-hidden="true"></div>      <!-- fixed background ramp, z-index −1 (§8.5) -->
  <canvas id="stage" aria-hidden="true"></canvas>   <!-- fixed, z-index 0, pointer-events none -->
  <div class="grain" aria-hidden="true"></div>       <!-- static dither sheet, CSS only -->
  <header class="rail">…</header>                    <!-- fixed, z-index 40 -->
  <div id="smooth-wrapper">
    <div id="smooth-content">
      <main>
        <section id="identity">…</section>
        <section id="dossier">…</section>
        <section id="lattice">…</section>
        <section id="works">…</section>
        <section id="link">…</section>
      </main>
      <footer id="colophon">…</footer>
    </div>
  </div>
  <!-- #cast is injected by JS at runtime, never served (invariant I1) -->
</body>
```

Every `<section>` carries `aria-labelledby` pointing at its own heading. The canvas is
`aria-hidden` and `pointer-events: none` throughout.

---

### 6.2 Navigation rail

A fixed hairline bar. Not a card, not a pill, not frosted glass — a rule with content on it.

```
┌──────────────────────────────────────────────────────────────────────┐
│ ⬭ LEO      02 ABOUT   03 STACK   04 WORK   05 LINK      [ DOSSIER ] │
│ ──────────────────────────────────────▔▔▔▔▔▔───────────────────────── │
└──────────────────────────────────────────────────────────────────────┘
  chain-link mark        mono, uppercase        blue indicator    CTA
```

```html
<header class="rail" data-rail>
  <a class="rail__mark" href="#identity" aria-label="Leo — home">
    <svg class="rail__glyph" viewBox="0 0 24 16" aria-hidden="true"><!-- two interlocked links --></svg>
    <span>LEO</span>
  </a>
  <nav class="rail__nav" aria-label="Sections">
    <ul>
      <li><a href="#dossier"><i>02</i> About</a></li>
      <li><a href="#lattice"><i>03</i> Stack</a></li>
      <li><a href="#works"><i>04</i> Work</a></li>
      <li><a href="#link"><i>05</i> Link</a></li>
    </ul>
    <span class="rail__indicator" data-indicator aria-hidden="true"></span>
  </nav>
  <a class="rail__cta" href="/files/Yesaulov_CV.pdf" target="_blank" rel="noopener">
    Dossier <span aria-hidden="true">↓</span>
  </a>
  <button class="rail__toggle" data-nav-toggle aria-expanded="false" aria-controls="rail-panel">
    <span class="sr-only">Menu</span><svg aria-hidden="true"><!-- 3 hairlines --></svg>
  </button>
</header>
```

- Height 72 px → 56 px past 80 px of scroll (§9.9). Ground `--void` at 0.72 alpha with
  `backdrop-filter: blur(14px)`, faded in rather than present at rest.
- Bottom `1px solid var(--hairline)`, opacity 0 at top of page → 1 once scrolled.
- The `☰` character at `index.html:23` is replaced by three 1 px `--silver` hairlines of widths
  20/14/20 px — the glyph was a text character being used as an icon.
- Active indicator: a 2 px `--blue` bar under the active item, repositioned with **Flip** (§9.9).
- The `DOSSIER` CTA is the only filled element in the rail: `--silver-fill` ground, `--ink` text.
  `--silver-fill` and not `--silver-sheet`: the sheet's dark stops drop to 1.95:1 behind ink (§4.3).
  It is the page's single most important outbound action and gets the only metal fill in the chrome.

---

### 6.3 Movement 01 — IDENTITY

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  MUNICH, DE · 48.1375° N 11.5755° E                      ╲             │
│                                                           O  ← chain   │
│  L E O N I D                                             ╱             │
│  Y E S A U L O V                                        O              │
│                                                        ╱               │
│  A I   &   I N F R A S T R U C T U R E   E N G I N E E R               │
│  ──────────────────────────────────────────────          ╭───────╮     │
│                                                          │       │     │
│  Secure, scalable systems end to end — backend           │ ▓▓▓▓▓ │ ←  │
│  services, deployment lifecycles, and the                │ ▓▓▓▓▓ │  portrait
│  mathematics underneath.                                 │       │  in a
│                                                          ╰───────╯  stadium
│  ┌──────────────────┐  ┌─────────────────┐                 aperture   │
│  │ SELECTED WORK  → │  │ DOSSIER  ↓ PDF  │                            │
│  └──────────────────┘  └─────────────────┘                            │
│                                                                        │
│  02 ABOUT ↓                                                            │
└────────────────────────────────────────────────────────────────────────┘
   cols 2–8                                                    cols 9–12
```

```html
<section id="identity" aria-labelledby="identity-h">
  <p class="meta mono">Munich, DE <span aria-hidden="true">·</span> 48.1375° N 11.5755° E</p>

  <h1 id="identity-h" class="hero__name" data-split="name">Leonid Yesaulov</h1>

  <p class="hero__role mono" data-role>AI &amp; Infrastructure Engineer<span class="hero__rule" aria-hidden="true"></span></p>

  <p class="hero__tagline lead" data-split="lines">
    Secure, scalable systems end to end — backend services, deployment
    lifecycles, and the mathematics underneath.
  </p>

  <div class="hero__actions">
    <a class="btn btn--metal" href="#works"><span class="btn__label">Selected work <span aria-hidden="true">→</span></span></a>
    <a class="btn btn--ghost" href="/files/Yesaulov_CV.pdf" target="_blank" rel="noopener">
      <span class="btn__label">Dossier <span class="mono" aria-hidden="true">↓ PDF</span></span>
    </a>
  </div>

  <a class="hero__cue mono" href="#dossier"><i>02</i> About <span aria-hidden="true">↓</span></a>

  <figure class="hero__portrait" data-portrait>
    <div class="aperture">                       <!-- stadium clip-path -->
      <img src="/assets/me.jpg" width="762" height="762" alt="Leonid Yesaulov"
           fetchpriority="high" decoding="async">
    </div>
    <svg class="aperture__ring" viewBox="0 0 240 320" aria-hidden="true">
      <rect x="4" y="4" width="232" height="312" rx="116" pathLength="100"/>
    </svg>
  </figure>
</section>
```

**Copy, final:**

- Name: `Leonid Yesaulov` — rendered uppercase by CSS, set on two lines (`LEONID` / `YESAULOV`)
  so the width-axis animation has two staggered runs to work with. The greeting `Hi — I'm` is
  dropped: it costs a line of the largest type on the page to say nothing.
- Role: `AI & Infrastructure Engineer`
- Tagline: `Secure, scalable systems end to end — backend services, deployment lifecycles, and the mathematics underneath.`
- Meta line: `Munich, DE · 48.1375° N 11.5755° E` — Munich's actual coordinates. It is true, it is
  precise, and it sets the telemetry register in the first line the reader sees.
- CTAs: `Selected work →` and `Dossier ↓ PDF`; scroll cue `02 About ↓`. Each button's content is one
  `.btn__label` span (laid out exactly as the button's own flex row), so §9.4 can fade the label in
  after the button has seated.
- Role hairline: `.hero__rule`, an empty `aria-hidden` span inside the role line, absolutely
  positioned 1 px (`border-top`, `--hairline-strong`) under the text at the role's own width — the
  wireframe's rule under the role, drawn in by §9.4. It adds no row to the layout.

**The portrait aperture** is the design's tightest link between motif and layout. The shape is a
**stadium** — a rectangle capped by two semicircles, `border-radius: 116px` on a 232×312
box — which is precisely the inner void of a chain link. **Not** `50vh / 116px`: CSS's corner
overlap-correction computes a single shared scale factor from whichever edge is tightest and
applies it to both radius components together, so an oversized horizontal component silently
shrinks the vertical one too, flattening the cap into an ellipse instead of a true semicircle. A
single `116px` value — exactly half the 232px width — never triggers that correction on either
axis, and it matches the SVG ring's own `rx="116"` (SVG rect rounding clamps `rx`/`ry`
independently per axis, so it needs no such care). The portrait is framed by the negative
space of the page's central motif. `object-fit: cover`, `object-position: 50% 42%` to keep the
face in the upper third of the stadium. The ring around it is a single SVG `<rect>` with
`pathLength="100"` so the draw is in whole percent (§9.4). The draw tweens `stroke-dasharray`
itself, `'0 100' → '100 0'` in those units — not DrawSVG, which measures a `<rect>` as sharp corners
(2·232 + 2·312 = 1088) and ignores `pathLength`, so its lengths come out in the wrong units and the
ring would appear whole after ~9 % of its draw.

The hero is the LCP element. Text paints from HTML and CSS alone; the canvas fades in afterwards
(§12.7). No layout in this section depends on JavaScript.

---

### 6.4 Movement 02 — DOSSIER

Asymmetric, alternating from IDENTITY per §3.4: all content — copy, principles strip and fact
plate — sits on columns 5–12 (copy 5–9, fact plate nested at 10–12, within that same content
side); the chain runs through columns 2–4, now the unused side.

```
┌────────────────────────────────────────────────────────────────────────┐
│  ╲                                                                     │
│   O    02  ── A B O U T                                                │
│  ╱                                                                     │
│  O          I build and run the infrastructure other  ┌─────────────┐ │
│  ╲          systems sit on — the full deployment       │ LOCATION    │ │
│   O         lifecycle across cloud and self-hosted     │ Munich, DE  │ │
│  ╱          environments, and the backend services     │ ··········· │ │
│  O          on top of it.                              │ EDUCATION   │ │
│  ╲                                                      │ Informatics │ │
│   O         The foundation is mathematical. …          │ BSc, minor  │ │
│  ╱                                                      │ Mathematics │ │
│  O          Favourite domains: … Away from the         │ TUM · 24–27 │ │
│  ╲          terminal: …                                │ ··········· │ │
│              ┌──────────────────────────────────┐      │ LANGUAGES   │ │
│              │ PERFORMANCE · READABLE CODE ·    │      │ EN C1·DE C1 │ │
│              │ PRAGMATIC DECISIONS              │      │ ··········· │ │
│              │ TESTING · AUTOMATION · COLLAB.   │      │ CONTACT     │ │
│              └──────────────────────────────────┘      │ leo@omniserv│ │
│                     principles strip                   └─────────────┘ │
│  chain, cols 2–4              copy, cols 5–9         fact plate, 10–12 │
└────────────────────────────────────────────────────────────────────────┘
```

**Copy, final:**

> **Lead.** I build and run the infrastructure other systems sit on — the full deployment
> lifecycle across cloud and self-hosted environments, and the backend services on top of it.
>
> **P2.** The foundation is mathematical. I read Informatics with a minor in Mathematics at TUM,
> and what draws me to machine learning is the mathematics of it, applied to real infrastructure
> problems rather than benchmarks.
>
> **P3.** Favourite domains: data and AI, backend systems, developer tools. Away from the
> terminal: arts — music and literature — bonsai gardens, and tabletop games.

**Principles strip.** The values sentence from `index.html:60` becomes a designed element rather
than a clause nobody reads. Two mono rows in `--silver` (not `--silver-shadow` — these are small
mono labels, see §4.3), separated by `·`, bracketed by hairlines:

```
PERFORMANCE · READABLE CODE · PRAGMATIC DECISIONS
TESTING · AUTOMATION · COLLABORATION
```

**Fact plate.** A `<dl>` inside a hairline-bordered panel on `--graphite`, 24 px 45° chamfer on
the top-right corner (§3.6). Rows separated by dotted leaders — a 1 px `repeating-linear-gradient`
of `--hairline` dots at 4 px pitch, drawn L→R on entry (§9.5).

| Label | Value |
|---|---|
| `LOCATION` | Munich, Germany |
| `EDUCATION` | Informatics BSc, minor Mathematics — TUM, 2024–2027 (expected) |
| `LANGUAGES` | English C1 · German C1 · Russian native · Ukrainian native |
| `CONTACT` | leo@omniserv.me |
| `WEB` | omniserv.me |

CEFR levels and the Mathematics minor come from the CV (decision 2); the original three facts are
all retained. `EDUCATION` keeps the "(expected)" qualifier from `index.html:70` — it is honest and
it matters.

---

### 6.5 Movement 03 — LATTICE

The eight flat badges at `index.html:84-91` become a graph. The competencies are structurally
related — languages sit under runtimes, runtimes under orchestration — and a lattice shows that
where a tag cloud cannot. It is also the one place the chain's branching makes sense (§7.5).

```
┌────────────────────────────────────────────────────────────────────────┐
│  03  ── S T A C K                                                      │
│                                                                        │
│      BACKEND                        INFRA & DEVOPS                     │
│       ⬡ Python ─── ⬡ FastAPI         ⬡ Docker ─── ⬡ CI/CD              │
│        ╲           ╱      ╲           ╱     ╲       ╱     ╲            │
│         ⬡ Go ─── ⬡ gRPC    ⬡ SQL    ⬡ Traefik ⬡ Caddy  ⬡ Cloudflare   │
│        ╱     ╲       ╲      ╲         ╲       ╱       ╱                │
│     ⬡ Java   ⬡ C/C++  ⬡ MongoDB       ⬡ Linux (Arch, Debian)          │
│                                        ╱          ╲                    │
│                                    ⬡ AWS        ⬡ Google Cloud        │
│                                                                        │
│      FRONTEND                                    TOOLING               │
│       ⬡ Flutter/Dart ─── ⬡ HTML ─── ⬡ CSS ─── ⬡ JS    ⬡ Git ─── ⬡ Make│
└────────────────────────────────────────────────────────────────────────┘
        edges only on 30° / 150° / vertical axes (§3.6)
```

**Geometry.** Nodes sit on a triangular lattice: basis vectors at 30° and 150°, pitch 88 px
desktop (62 px tablet, 641–900 px). Every node's position is an integer linear combination of the
basis — no node is placed freehand. That alone does not fix the edge angles (`b₁ − b₂` is
horizontal), so edges are further restricted: every edge is `k·b₁`, `k·b₂` or `k·(b₁ + b₂)` for an
integer `k ≥ 1`, i.e. 30°, 150° or 90° only, never horizontal. The wireframe above gives the
topology — which node connects to which — not the geometry; its horizontal runs become zigzags.
One step along a basis vector (76 px across, 44 px down at 88 px) is narrower than most capsules,
so neighbours on the same axis are two or more steps apart: rows are two lattice units apart, and
nodes sharing a row two units apart. Where the axis rule leaves no room for a wireframe edge, the
nearest legal one stands in (Java hangs from C/C++, SQL from MongoDB, and Traefik–Caddy replaces
Docker–Caddy and Traefik–Linux).

Positions are authored once per cluster as lattice coordinates relative to the cluster's root (its
first node, which is also its topmost, so the §7.5 branch chain hanging into it crosses none of its
own nodes), in `js/sections/stack.js`, and resolved to pixels at runtime, so the lattice rescales
without redrawing. No edge leaves a cluster, so each cluster is its own lattice: the clusters are
packed a gutter apart, **four across** where their measured spans fit (≥ ~1280 px) and **2×2** as
the wireframe draws them otherwise, rows of clusters sharing a lattice row. In 2×2 the lower
clusters' branch chains pass behind the upper clusters (§7.5). Each cluster's label sits above its
root, starting clear of the chain's half-width. The positions are applied to CP3's column markup —
the DOM, and so the tab order, is unchanged.

**Node form.** A capsule — the chain-link stadium again, at small scale — 1 px `--hairline`
border on `--void`, mono label in `--silver` *(errata E5)*. Focusable `<button>` elements, not `<span>`, so the
hover behaviour has a keyboard equivalent.

**22 nodes in 4 clusters** — 8 backend, 8 infra/devops, 4 frontend, 2 tooling:

| Cluster | Nodes |
|---|---|
| `BACKEND` | Python · FastAPI · Go · gRPC · Java · C/C++ · SQL · MongoDB |
| `INFRA & DEVOPS` | Docker · CI/CD · Traefik · Caddy · AWS · Google Cloud · Linux (Arch, Debian) · Cloudflare |
| `FRONTEND` | Flutter/Dart · HTML · CSS · JavaScript |
| `TOOLING` | Git · Make |

All eight original badges are present. `Cloudflare` migrates in from the Omniserv card's tags;
the rest come from the CV's competencies block.

**Fallback.** The lattice is SVG, not WebGL — it must be readable at LOW tier and with WebGL
absent. On `s` breakpoints the lattice collapses to four labelled columns of capsules with no
edges: the graph structure is a desktop affordance, the grouping is the content.

---

### 6.6 Movement 04 — WORKS (pinned horizontal track)

The heaviest interaction on the page. Vertical scroll drives horizontal travel, which is where
the chain stops being decoration and becomes the conveyor the cards ride (§7.5).

```
┌──────────────────────────── pinned ───────────────────────────────────┐
│  04 ── W O R K                                        02 / 04         │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│                                                                       │
│   ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────│
│   │ 01          OMNISERV ⌐│  │ 02             uWeMe ⌐│  │ 03      SECU│
│   │ SELF-HOSTED · INFRA   │  │ STARTUP · MOBILE MVP  │  │ ACADEMIC · E│
│   │                       │  │ 06.2024 – 10.2024     │  │             │
│   │ Home server running…  │  │ Took an initial…      │  │ Monolithic …│
│   │                       │  │                       │  │             │
│   │ Python Docker GH-A    │  │ Golang Flutter/Dart   │  │ C/C++  Hardw│
│   │ Linux Cloudflare      │  │ TestFlight            │  │             │
│   │              github ↗ │  │                       │  │             │
│   └───────────────────────┘  └───────────────────────┘  └─────────────│
│    ══O══O══O══O══O══O══O══O══O══O══O══O══O══O══O══O══O══O══O══O══O══ │
└───────────────────────────────────────────────────────────────────────┘
   scroll ↓  ⇒  track travels ←        chain runs horizontally beneath
```

**Track geometry.** Four cards at `min(78vw, 720px)`, gap `--s-8` (64 px), leading pad `--s-5`,
trailing pad `50vw` so the last card can reach centre. Travel distance
`D = trackWidth − viewportWidth`; the pin's `end` is `"+=" + D`, giving a 1:1 px mapping between
vertical scroll and horizontal travel — the most predictable relationship available, and the one
that makes the chain's phase binding exact.

**Full-bleed while pinned.** `#works` is capped at `--container-wide` (1568 px), but while the pin
owns the track's `x` the viewport spans the whole window — its layout width,
`document.documentElement.clientWidth`, so a scrollbar never overflows the page — and the track's
leading pad grows by the same inset, so card 01 still starts on the header's left edge. Cards
travel in from the real screen edge, over a chain that spans it too (§7.5), and `viewportWidth` in
`D` is that window width. Below 1568 px the inset is the page margin, i.e. the unpinned geometry.
Unpinned (≤ 900 px, reduced motion, no JS) the viewport keeps the container width.

**Card form.** `--graphite` ground, 1 px `--hairline` border, 24 px 45° chamfer on the top-right
(the `⌐` in the wireframe), rendered with `clip-path: polygon(...)` in `px` so the chamfer is the
same physical size on every card regardless of width.

**Cards, final copy:**

**`01` OMNISERV** — kicker `SELF-HOSTED · INFRASTRUCTURE` — → `github.com/omniserv-me/omniserv`
> Home server running reliable automations, a secure VPN and always-on web capacity. Automated
> deployment and managed service lifecycles with Docker and CI/CD; local network routing, DNS
> resolution via Pi-hole, security protocols. Accounting and smart-home systems that digitalise
> day-to-day processes.

Tags: `Python` `Docker` `GitHub Actions` `Linux` `Cloudflare`
— the `Docker` and `GitHub Actions` tags commented out at `index.html:113-115` are restored; the
`ToDo` is resolved.

**`02` uWeMe** — kicker `STARTUP · MOBILE MVP · 06.2024 – 10.2024`
> Took an initial prototype to a functional MVP: stripped placeholders, resolved core bugs,
> engineered both ends — Flutter front, Golang back. Shipped into the Apple ecosystem through
> TestFlight.

Tags: `Golang` `Flutter/Dart` `TestFlight`
— new card, from the CV (decision 2). No public link; see §14.

**`03` SECURE MEMORY UNIT** — kicker `ACADEMIC · EMBEDDED SIMULATION`
> Monolithic SMU module: controller logic, latency simulation, parity checking and
> fault-injection tests.

Tags: `C/C++` `Hardware` — substance unchanged from `index.html:138-148`. No link; see §14.

**`04` THIS PAGE** — kicker `WEB · THE THING YOU ARE LOOKING AT` — → `github.com/leoyesaulov/professional`
> Silver, chain and kinetic type. GSAP over a three.js metal stage, laid out on a √2 grid and cut
> to a 0.12-second beat.

Tags: `GSAP` `three.js` `WebGL` `Vite`
— replaces "clean, responsive, animated single-page site", which will no longer be true.

**Progress readout.** Mono `02 / 04` plus a 2 px hairline bar, both bound directly to the pin's
progress with no tween — a scrubbed value must never be smoothed twice (§9.7).

**Linking.** The whole card is the link (`<a>` wrapping `<article>`), replacing the `a.mute`
pattern at `index.html:104`. Cards without a URL are `<article>` with no anchor and no hover
affordance (lift, border, sheen, tether) — an affordance that leads nowhere is worse than none.
They are still tab stops: every card is reachable by keyboard. Each sits in a
`<div class="card__stop" tabindex="0" role="group" aria-labelledby="work-0N-h">`, named by its
title. The ring is on the wrapper, not the article, because `.card`'s `clip-path` would clip the
article's own outline. The ring is its only affordance.
Each `<article>` carries an id after its index, `#work-01` … `#work-04`, so a card can be deep
linked (§9.7). The ids are numbered rather than slugged, so renaming a project never breaks a
shared URL.

---

### 6.7 Movement 05 — LINK

The section name is the pun the whole design rests on: a chain link and a hyperlink are the same
word, and this is where the chain closes into a loop (§7.5).

```
┌────────────────────────────────────────────────────────────────────────┐
│  05 ── L I N K                                                         │
│                                                    ╭───────────╮       │
│  01  GITHUB      leoyesaulov              ↗       │   O─O─O   │       │
│  ────────────────────────────────────────────     │  O       O │  ←   │
│  02  LINKEDIN    leonid-yesaulov          ↗       │   O─O─O   │  closed│
│  ────────────────────────────────────────────      ╰───────────╯  loop │
│  03  EMAIL       leo@omniserv.me          ↗                            │
│  ────────────────────────────────────────────                          │
│  04  WEB         omniserv.me              ↗                            │
│  ────────────────────────────────────────────                          │
│                                                                        │
│  ┌────────────────────────────────────────────┐                        │
│  │  DOSSIER  ↓   A4 · 1:√2 · PDF              │                        │
│  └────────────────────────────────────────────┘                        │
└────────────────────────────────────────────────────────────────────────┘
```

Rows are full-width, hairline-separated, 64 px tall (≥ 44 px touch target). Each carries a mono
index, a label, the handle, and a chain-link glyph that closes on hover (§9.8).

| # | Label | Value | Target |
|---|---|---|---|
| `01` | GITHUB | leoyesaulov | `https://github.com/leoyesaulov` |
| `02` | LINKEDIN | leonid-yesaulov | `https://www.linkedin.com/in/leonid-yesaulov-836b98217/` |
| `03` | EMAIL | leo@omniserv.me | `mailto:leo@omniserv.me?subject=%5BTopic%5D&body=Hi%20Leo%2C%0A%0A` |
| `04` | WEB | omniserv.me | `https://omniserv.me` |

**The email row is one link, like the other three**: the address itself is the `mailto:`, and it
carries the same glyph and underline. It pre-fills placeholders for the sender to overwrite, a
`[Topic]` subject and a `Hi Leo,` first line. The old site's two intents (`New Offer` from
`index.html:100` and `Personal Inquiry` from `index.html:164`) were first kept as two chips below
the row. The owner retired them on 2026-09-28, in checkpoint 8b's session.

Section lead, replacing "Find me online — happy to connect.":
> Four ways in. The first three are read daily.

**Dossier CTA**, the third and final placement: `DOSSIER ↓` with mono sub-label
`A4 · 1:√2 · PDF`. The sub-label states the page's own organising ratio (§3.1) at the moment the
reader is offered the document it came from. File size is deliberately *not* shown — see §14.

---

### 6.8 Colophon

```
────────────────────────────────────────────────────────────────────────
© 2026 Leonid Yesaulov            Part of Omniserv.
Text and design CC BY 3.0.        Built with GSAP and three.js.
√2 grid · 0.12 s beat.            MOTION [ ON | OFF ]   TIER · HIGH
```

Content, all of it re-homed or newly required:

- `© <span id="year"></span> Leonid Yesaulov` — the year is still written by JS
  (`script.js:2`), the one piece of that file that survives.
- `Part of Omniserv.` — from `README.txt`.
- `Text and design CC BY 3.0.` — links `/LICENSE.txt`, which requires the `.dockerignore` fix
  (§12.4). Today that link would 404.
- `Built with GSAP and three.js.` — replaces "Built with care", which said nothing. Named
  versions are not printed; they would go stale.
- `√2 grid · 0.12 s beat.` — the system, stated. Obscure to most readers, exact to the ones who
  notice.
- `MOTION [ ON | OFF ]` — the persisted motion toggle (§10.1). A real control, not decoration.
- `TIER · HIGH` — the render tier the quality probe selected (§10.2). Genuinely useful for
  debugging a report of "the animation is janky on my laptop", and it fits the register.

---

## 7. The chain — WebGL stage

The chain is the page's spine and its only WebGL object. Everything in this section lives in
`js/gl/`.

### 7.1 Stage setup

```js
// js/gl/stage.js
const renderer = new THREE.WebGLRenderer({
  canvas, alpha: true,
  antialias: false,                 // MSAA is supplied by the composer target instead (§8.1)
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(devicePixelRatio, tier.dpr));   // 2 / 1.5 / 1 by tier
renderer.setClearAlpha(0);                                      // CSS ground shows through
renderer.toneMapping   = THREE.NoToneMapping;   // stark: clipping happens in the metal pass
renderer.outputColorSpace = THREE.SRGBColorSpace;

const camera = new THREE.PerspectiveCamera(32, aspect, 0.1, 200);
camera.position.z = 10;
```

**World-to-viewport mapping.** Sizes below are given as fractions of viewport height so the chain
scales with the page. Convert once per resize:

```js
const H = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(32 / 2)); // ≈ 5.735 world units
const unitsPerPx = H / window.innerHeight;
```

`H` is the visible world height at the `z = 0` plane. A length given as `0.044·H` is 4.4 % of the
viewport height, whatever the device.

### 7.2 The curve: a real catenary

The spine is a `THREE.CatmullRomCurve3` rebuilt every frame from **9 control points**. Control
point `i` (`t = i/8`) sits at:

```
y_i = lerp(H * 0.8, -H * 0.8, t)          // spans 1.6 viewport heights, so ends are off-screen
x_i = X(movement) + A * sag(t)
z_i = 0
```

The ripple (below) is not part of the curve: it is added to each *link's* `x` after the link is
placed on the curve (§7.3), because its 6-link wavelength cannot be carried by 9 control points
spaced ≈ 6.3 links apart.

**`sag(t)` is the true hanging-chain profile**, not a sine approximation. A chain suspended
between two points follows `y = a·cosh(x/a)`. Normalised to 0 at both ends and 1 at the centre:

```
sag(t) = ( cosh( a·(2t − 1) ) − cosh(a) ) / ( 1 − cosh(a) )      a = 1.9
```

Check: `t = 0` → `(cosh(−a) − cosh a)/(1 − cosh a) = 0`; `t = 1` → `0`; `t = 0.5` →
`(1 − cosh a)/(1 − cosh a) = 1`. Tunable range `a ∈ [1.2, 2.6]` — higher `a` gives a deeper,
more localised bow. `a = 1.9` reads as a chain rather than a rope.

**Sag amplitude responds to scroll velocity.** This is the single detail that makes the chain feel
like an object rather than a texture:

```
A = A₀ · (1 − clamp(|v|, 0, 1))          A₀ = 0.09 · H
```

At rest the chain **bows outward by 9 % of viewport height**. Under fast scroll it **snaps taut**.
`v` is the smoothed, normalised scroll velocity from §9.1. Nothing tweens this — it is read
directly off the velocity signal every frame, which is why it feels physical instead of animated.

**Phase.** Scroll progress advances the links along the curve like a conveyor, one link per 12 vh
of scroll. The phase is not set directly; it chases its target through an **underdamped spring
(ζ = 0.72, ω = 14 rad/s)**, so the chain lags on acceleration and settles past its target on stop.
That lag is the chain's weight.

ζ is chosen from the overshoot it produces, `exp(−ζπ/√(1−ζ²))`, not by feel:

| ζ | Overshoot | Settle (2 % band) | Reads as |
|---|---|---|---|
| 0.55 | 12.6 % | 0.52 s | rubbery — too loose for metal |
| **0.72** | **3.8 %** | **0.40 s** | **a chain settling. Use this** |
| 0.85 | 0.6 % | 0.34 s | no visible settle at all — lag only |
| 1.00 | 0 % | 0.29 s | critically damped, inert |

At ω = 14 rad/s the settle time is `4/(ζω)`. Tune ζ, not ω: ω sets how *fast* the chain tracks
scroll, ζ sets whether it feels like metal.

```js
const target = scrollY / (0.12 * innerHeight);      // in links
const k = w * w, c = 2 * zeta * w;                  // w = 14, zeta = 0.72
dt = Math.min(dt, 1 / 30);                          // never integrate a long frame
vel  += (-k * (phase - target) - c * vel) * dt;
phase += vel * dt;
```

**Ripple on reversal.** When `sign(v)` flips and `|Δv| > 600 px/s`, spawn a travelling wave —
this is what a real chain does when you stop pulling it:

```
link.x += ripple(k, t)                     // per link, after sampling the curve
k      = u · N                             // the link's position along the chain, in links from the top end
ripple(k, t) = amp · exp(−0.105·k) · sin( 2π · (k/6 − 8·(t − t₀)) ) · env(t − t₀)
amp = 0.35 · linkOuterDiameter · min(|Δv| / 2000, 1)
env(τ) = (1 − τ / 1.2)²                    // 1.2 s lifetime; = 1 − power2.out, computed per frame, not tweened
```

`Δv` is measured on the smoothed signal, which crosses zero gradually: it is the peak speed in the
old direction plus the speed in the new one. A chain that has come fully to rest (`v` exactly 0)
forgets its direction, so scrolling back later is not a reversal.

`exp(−0.105k)` is a 0.9× decay per link; wavelength 6 links; temporal frequency 8 Hz — the wave
therefore propagates at wavelength × frequency = `6 × 8 = 48` links/s, not the 8 Hz term read in
isolation. At most 3 concurrent ripples, oldest dropped.

### 7.3 Links

```js
const geo = new THREE.TorusGeometry(0.5, 0.14, 12, 48);   // 1152 tris per link
```

Outer diameter `1.28`, aperture `0.72` — the same stadium proportion as the hero portrait (§6.3),
which is not a coincidence: the portrait frame and the link aperture are the same shape.

| Quantity | Value |
|---|---|
| Uniform scale `s` | `0.044·H / 1.28` → outer diameter = 4.4 % of viewport height |
| Arc spacing | `0.72 × outerDiameter` = `0.0317·H` — closer than one diameter, so links visibly interlock |
| Link count `N` | `ceil(length / spacing)` for **every** curve: the spacing is fixed and the count follows the curve. The vertical spine (1.6·H) carries ≈ 51. The horizontal WORKS run (visible width + a diameter past each edge, §7.5) carries more on wider screens: ≈ 54 at 16:10, 60 at 16:9, 78 at 21:9. The LINK loop carries 34. `H` is set only by the fixed FOV/camera distance (§7.1), not by `window.innerHeight` in px, so the vertical count is constant across viewport sizes. It is also constant across tiers: fewer links could not both interlock and span the curve, so the tier cuts tessellation instead (§7.7) |
| Instancing | one `THREE.InstancedMesh` of a **96-instance pool** (the horizontal run's count up to ≈ 2.9:1), `DynamicDrawUsage` on the matrix attribute. Link `i` sits at arc position `mod(i + phase, 96) · spacing` and is drawn only while that lies on the curve; unused instances are scaled to 0 |

**Orientation — alternating, as a real chain.** Each link's plane contains the curve tangent, and
consecutive links are rotated 90° about it:

```js
const UP = new THREE.Vector3(0, 0, 1);   // the camera axis: every curve here lies in the xy-plane
const u = ((i + phase) / N) % 1;
const p = curve.getPointAt(u);
const T = curve.getTangentAt(u).normalize();
const N1 = new THREE.Vector3().crossVectors(T, UP).normalize();      // even links
const N2 = new THREE.Vector3().crossVectors(T, N1).normalize();      // odd links, ⟂ to N1
const axis = (i % 2) ? N2 : N1;      // torus local axis is +Z
q.setFromUnitVectors(Z_AXIS, axis);
m.compose(p, q, SCALE); mesh.setMatrixAt(i, m);
```

`UP` is the camera axis `(0,0,1)`, not world-up: the spine is vertical, so world-up would be
parallel to the tangent at every bow apex, and `(1,0,0)` to the whole WORKS horizontal run. Even
links then read edge-on and odd links face-on. Every curve on the page (spine, branches, the
horizontal run, the LINK loop) lies in the xy-plane, so `T` is never parallel to `UP`; still guard
the degenerate case (cross product → zero vector) by falling back to `(1,0,0)` for that frame, in
case a curve is ever tilted out of the plane. The degenerate case that *does* occur is in the
coil into the loop (§7.5): each link's tangent is blended between the open curve and the loop, and
where the two oppose, on the loop's far side mid-coil, the blend collapses to zero. There the
link takes the nearer pose's tangent.

### 7.4 Material and light

```js
const mat = new THREE.MeshPhysicalMaterial({
  color: 0xC9CED4, metalness: 1.0, roughness: 0.18,
  envMapIntensity: 1.4, clearcoat: 0.30, clearcoatRoughness: 0.12,
});
```

**Environment — procedural, zero downloaded assets.** `RoomEnvironment` (confirmed present at
`three/addons/environments/RoomEnvironment.js` in 0.186.1, and its constructor takes no arguments)
is a scene of emissive boxes; `PMREMGenerator.fromScene` bakes it:

```js
const pmrem = new THREE.PMREMGenerator(renderer);
const env   = new RoomEnvironment();
// Tint the environment itself so reflections carry the palette (§4.4). The light panels carry
// their light in `emissive` × emissiveIntensity (their `color` is black), so the tint goes there:
// the two far-left panels (x ≈ −16) turn --blue-lift; the rest stay white, the walls neutral.
env.traverse(o => {
  if (o.isMesh && o.material.emissive && o.position.x < -8) o.material.emissive.set(0x6C9BFF);
});
scene.environment = pmrem.fromScene(env, 0.04).texture;
pmrem.dispose();
```

This is the trick that makes the palette work: **the blue and white accents live in the
reflections, not in the base colour.** The chain is silver; its left-hand speculars are
`--blue-lift`, its right-hand speculars are white. A metal object cannot be tinted blue without
looking like plastic, so the blue is put where metal actually shows colour.

Three lights on top, for directional definition the env map alone cannot give:

| Light | Colour | Intensity | Position |
|---|---|---|---|
| key | `#FFFFFF` | 2.0 | `(4, 6, 8)` — upper right, in front |
| rim | `#6C9BFF` | 1.2 | `(−7, 1, 2)` — camera left, raking |
| fill | `#1F5BFF` | 0.4 | `(0, −6, 3)` — from below, cool bounce |

No shadow maps. Nothing casts onto anything.

### 7.5 Per-movement choreography

`X` is the spine's lateral anchor as a fraction of visible world width (0 = centre). It is tweened,
along with the other movement states below: a scrubbed GSAP tween on a plain object per section
boundary, `ease: 'none'` like every scrub (§9.2), so the chain visibly migrates between movements
rather than cutting. Each scrub runs while its boundary crosses the viewport (the next section's
`top bottom → top top`; into LINK, `top bottom → top center`), and each starts where the previous
one ended. ScrollSmoother's own smoothing and the chain's spring-driven phase supply the weight a
curve would have. The bow keeps pointing toward screen centre, so it swings from −x to +x during
IDENTITY → DOSSIER.

| Movement | `X` | State |
|---|---|---|
| 00 CAST | — | not on the stage: CAST's link is inline SVG in the veil (§9.3), because the stage loads after `load` (§12.7). One link, centred, spinning at ω = 0.6 rad/s, polishing across progress |
| 01 IDENTITY | `+0.26` | full spine enters from the top-left, bowing at full `A₀`; runs the gutter between tagline and portrait |
| 02 DOSSIER | `−0.28` | migrates into the left margin (cols 2–4), vacated now that copy and fact plate both sit in the alternated content block on the right (§3.4, §6.4); the readability guard (§7.6) still applies if a link ever crosses behind copy |
| 03 LATTICE | branch | spine splits into **four** short chains at `X = −0.30, −0.10, +0.14, +0.32`, one per cluster, each terminating at its cluster root node. The actual root positions come from the lattice through a roots setter, and these X values are the fallback. Each chain hangs from just above the viewport to its root, with links laid from the root upward, so it shortens off the top as the lattice scrolls. The branch is active while the roots are on screen (the node grid's top edge from 80 % to 10 % of the viewport). Cross-faded over 8τ (`metal`, a timed crossfade, not a scrub) by animating a second `InstancedMesh`'s per-instance scale 0→1 while the primary's scales 1→0. **At `s` (≤ 640 px) there is no branch**: the lattice is plain columns there (§6.5), so the spine keeps its DOSSIER state through LATTICE |
| 04 WORKS | horizontal | the spine rotates (clockwise, a real rotation of the curve's frame) to horizontal at `y = −0.40·H` and runs the full visible width plus one link diameter past each edge, so it needs more links on wider screens (§7.3); **phase binds to the pin's horizontal progress instead of scrollY**, so cards and links travel locked together. Sag axis rotates with it — the chain now hangs *downward* in one catenary across the run. Only above 900 px; below it there is no pin and the chain stays vertical (§9.7) |
| 05 LINK | loop | coils into a **closed 34-link loop**, radius `34 · spacing / 2π ≈ 0.171·H`, so the links interlock at §7.3's pitch, centred at `X = +0.30`, rotating at ω = 0.12 rad/s. The stretch of the open chain nearest its middle maps onto the circle, from the loop top, clockwise; each link's pose is blended from the open curve to the circle as the scrub advances, and links outside that stretch shrink away. `sag` is forced to 0 |
| colophon | loop | loop idles, unchanged |

The loop closing at `05 LINK` is the page's ending: a chain that has run the whole document
becomes a closed link at the point the reader is asked to make contact. The final link's snap-shut
is choreographed in §9.8.

### 7.6 The readability guard

Invariant I2 requires that the chain never competes with text. A per-instance dim factor,
recomputed each frame, drives links passing behind copy to matte and dark.

```js
geo.setAttribute('aDim',
  new THREE.InstancedBufferAttribute(new Float32Array(N), 1).setUsage(THREE.DynamicDrawUsage));

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
```

Raising `roughnessFactor` is what does the work — a dimmed-but-glossy link still throws a
distracting highlight, while a matte one recedes. Dimming alone is not enough.

**Computing `aDim` without layout thrash.** Never call `getBoundingClientRect()` per frame; the
smoothed scroller moves content every frame and the reads would force layout each time.

1. On load and on `ScrollTrigger.refresh`, cache each `[data-copy]` element's rect in **document**
   space (`offsetTop`/`offsetLeft` walked once).
2. Each frame, convert to screen space with the single scroll value already in hand:
   `screenY = docY − smoother.scrollTop()`.
3. Project each instance's world position to pixels (`v.project(camera)` → NDC → px).
4. `aDim = smoothstep(0, 24, feather distance inside the rect)` — a 24 px feather so links fade
   rather than switch.
5. Write the attribute once, set `needsUpdate = true`.

### 7.7 Performance

≈ 51–78 links × 1152 tris ≈ 59–90 k triangles in one instanced draw call, plus the LATTICE branch's
second mesh (≤ 144 instances) while it is visible — negligible. The costs that matter are
pixel-bound, so they scale by tier (§10.2). Every tier keeps the full link count (§7.3); the
torus tessellation (`TorusGeometry(0.5, 0.14, radial, tubular)`) drops instead:

| Tier | DPR | Segments (tris/link) | MSAA | Post | Clearcoat | Tethers |
|---|---|---|---|---|---|---|
| HIGH | `min(dpr, 2)` | 12 × 48 (1152) | 4× | full | yes | yes |
| MED | `min(dpr, 1.5)` | 10 × 32 (640) | off | off | no | no |
| LOW | `1` | 8 × 24 (384) | off | off | no | no |
| NONE | — | canvas removed | — | — | — | — |

Post runs only at HIGH (§8.1): MED and LOW drop the composer and render directly with the
renderer's own antialias, so they have no streak, shear, clip or dither.

Also: `frustumCulled = true`; one shared geometry and material; the PMREM target built once and
the generator disposed immediately; `renderer.info.render.calls` asserted ≤ 3 in development.

---

## 8. Post-processing

Deliberately **not bloom**. Bloom makes metal look soft and wet; the brief asks for stark vector
contrast. Four operations, one pass.

### 8.1 Pass chain

`EffectComposer` in 0.186.1 allocates a `HalfFloatType` target by default, so `OutputPass` must
terminate the chain — it is what applies tone mapping and the sRGB conversion. Omitting it yields
a washed-out, too-dark image, which is the most common way this setup goes wrong.

```js
const rt = new THREE.WebGLRenderTarget(w * dpr, h * dpr,
  { type: THREE.HalfFloatType, samples: tier.msaa });     // MSAA lives here, not on the renderer
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(metalPass);        // §8.2
composer.addPass(new OutputPass()); // mandatory, last
```

`EffectComposer` bypasses the renderer's own antialiasing, which is why `antialias: false` in
§7.1 and `samples: 4` here. At MED and LOW the composer is dropped entirely and
`renderer.render()` is called directly with `antialias` back on — cheaper than a no-op pass chain.

### 8.2 The metal pass

```glsl
uniform sampler2D tDiffuse;
uniform vec2  uResolution;
uniform vec2  uAxis;       // scroll axis: (0,1) vertical, (1,0) during the pinned track
uniform float uVelocity;   // smoothed, signed, clamped to [-1, 1]
uniform float uExposure;   // 1.0; 1.25 for 2τ on the LINK snap (§9.8)
uniform float uStreak;     // 1.0 HIGH, 0.0 off — the pass exists only at HIGH (§8.1)
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
}
```

### 8.3 Why these four

- **Chromatic shear** is the velocity signal made visible. It is the only motion cue that scales
  continuously with scroll speed, and it costs two extra texture fetches.
- **The streak** is what separates "grey 3D object" from "brushed metal". Gating on
  `luma > 0.70` means only speculars smear; the body of each link stays sharp.
- **The hard clip** is the brief's "stark vector contrast", literally: highlights clip to pure
  white with no roll-off, the way a vector illustration would render them.
- **The dither** is not an effect, it is a fix. Dark silver gradients over a near-black ground band
  visibly on 8-bit displays; 1.5/255 of ordered noise removes it below the visibility threshold.

`uAxis` swaps to `(1, 0)` for the duration of the pinned WORKS track, so the shear follows the
direction the content actually moves. This is a two-line change that most implementations miss,
and it is very noticeable when wrong.

### 8.4 Exposure flash

`uExposure` rests at `1.0`. The only thing that moves it is the final link snapping shut in
`05 LINK` (§9.8): `1.0 → 1.25 → 1.0` over 2τ, `ease.metal`. One flash, once per visit. The stage
owns the value as `stage.exposure.value`, tweened by `stage.flash()` (never under reduced motion),
and the metal pass binds its uniform to it.

### 8.5 The CSS grain sheet

The canvas can only dither its own pixels. The CSS silver gradients behind it (`--silver-sheet` on
panels, the page's background ramp) band for the same reason and need the same fix.

**The background ramp** is `.ground` (§6.1): a `position: fixed` sheet behind the canvas
(`z-index: −1`), `inset: −24px` so its parallax never shows an edge, filled with
`--ground-ramp: linear-gradient(168deg, var(--void) 0%, var(--ink) 62%)` — palette only, on the
silver sheet's axis (§3.6). Text over it sits between §4.3's `--void` and `--ink` figures. It is
§3.7's depth-5 "background gradient sheet": pointer parallax at 22.63 px through the depth module,
and no scroll parallax, since a fixed sheet has nothing to scroll against. Hidden in forced
colours.

`.grain` from
§6.1 is a `position: fixed; inset: 0` element with a 64×64 base64 PNG of monochrome noise (1-bit, 644 B),
`background-repeat: repeat`, `opacity: 0.028`, `mix-blend-mode: overlay`, `pointer-events: none`,
`z-index: 1` — above the canvas, below content. Inline as a data URI; it is under 1 KB, and a
separate request for 900 bytes is worse than the base64 overhead.

---

## 9. Animation catalogue

Every animation on the page, with trigger, property, duration in beats, easing, stagger and
teardown. Durations are written as multiples of `T` (= 0.12 s, §3.5).

### 9.1 Global rig and signals

**Plugins.** All seven are in the single `gsap` package at 3.15.0, under the Standard "no charge"
license — verified, no separate install or licence step:

```js
gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText,
                    CustomEase, DrawSVGPlugin);          // core/easings.js — entry chunk
gsap.registerPlugin(Flip, MorphSVGPlugin);               // core/late.js   — lazy chunk
```

**Flip and MorphSVG load late.** Neither is needed before the first section change — Flip drives
only the nav indicator (§9.9), whose first placement at boot is static, and MorphSVG only the LINK
glyph (§9.8), in the last movement — so they live in their own chunk, fetched at idle after the
`load` event via `core/lazy.js` (`loadLate()`, memoised; `late()` is the synchronous check). Until
`late()` resolves, the indicator moves by plain `appendChild` and the glyph hover is a no-op: both
degrade to static feedback, which §10.1 already accepts. Owner decision, 2026-09-27 (§12.7).

**Smoother.**

```js
const smoother = ScrollSmoother.create({
  wrapper: '#smooth-wrapper', content: '#smooth-content',
  smooth: 1.2, normalizeScroll: true, ignoreMobileResize: true,
  effects: false,            // parallax is driven explicitly, see below
  onFocusIn,                 // required by the WORKS pin — see §9.7
});
```

`effects: false` is deliberate. `data-speed` attributes would duplicate the depth system in §3.7,
and the chain needs the *same numbers* the DOM uses — so one module owns the depths and applies
them to both.

**One clock.** The WebGL render loop is a GSAP ticker callback, never a second
`requestAnimationFrame`:

```js
gsap.ticker.add(render);
gsap.ticker.lagSmoothing(500, 33);
```

Two loops means two clocks, and DOM animation tears against WebGL by up to a frame. GSAP's ticker
is already running, so this is free.

**Signals** (`js/core/signals.js`) — one module owns them, everything else reads:

| Signal | Source | Smoothing | Range |
|---|---|---|---|
| `velocity` | `ScrollTrigger.getVelocity()` in an `onUpdate` | EMA, α = 0.12 | ÷ 2400 px/s, clamped `[−1, 1]`, signed |
| `pointer` | `pointermove` → NDC | lerp 0.08/frame | `[−1, 1]²`; frozen at `(0,0)` when `(pointer: coarse)` |
| `axis` | active section | none | `(0,1)`, or `(1,0)` while the WORKS pin is active |
| `tier` | boot probe (§10.2) | — | `HIGH \| MED \| LOW \| NONE` |
| `motion` | media query ∨ stored toggle | — | `full \| reduced` |

**Boot sequence.** Order matters; three of these steps are the difference between a clean load
and a visibly reflowing headline:

1. Read stored motion preference and run the tier probe.
2. `await document.fonts.ready` — **before any split.** SplitText measures glyph boxes; splitting
   against fallback metrics computes the wrong line breaks and the headline visibly reflows when
   Archivo arrives.
3. Create splits (§9.4).
4. Build timelines inside `gsap.context()` scopes, one per movement.
5. `ScrollTrigger.refresh()`.
6. Dismiss the veil (§9.3).

**Teardown.** *(errata E27)* `ScrollTrigger.saveStyles()` on every animated selector before any context is
created, and all breakpoint- or preference-dependent work inside `gsap.matchMedia()`:

```js
const mm = gsap.matchMedia();
mm.add('(prefers-reduced-motion: no-preference) and (min-width: 901px)', desktopFull);
mm.add('(prefers-reduced-motion: no-preference) and (max-width: 900px)', mobileFull);
mm.add('(prefers-reduced-motion: reduce)', staticStates);
```

**`will-change` hygiene.** Applied on timeline start, removed in `onComplete`. Never left standing
on 40 split characters — it is a per-element compositing layer and the memory cost is real.

### 9.2 Named easings

Three `CustomEase` curves plus one built-in. Nothing else is used anywhere on the page.

```js
CustomEase.create('mask',     'M0,0 C0.16,1 0.3,1 1,1');      // ≈ expo.out  — wipes, apertures, draws
CustomEase.create('glyph',    'M0,0 C0.08,0.82 0.17,1 1,1');  // ≈ power4.out — all type
CustomEase.create('metal',    'M0,0 C0.5,0 0.5,1 1,1');       // symmetric   — sheens, exposure, blur
// plus: 'back.out(1.8)' referred to as ease.chain — the snap of a link seating
```

| Easing | Used for |
|---|---|
| `mask` | clip/mask wipes, aperture opens, DrawSVG, hairline draws |
| `glyph` | every type animation: character rises, width morphs, tracking |
| `chain` = `back.out(1.8)` | anything that *seats*: tags, nodes, buttons, link snap |
| `metal` | sheen sweeps, exposure flash, blur, colour crossfades |

Scrubbed animations always use `ease: 'none'`, with no exception — every tween inside a scrubbed
timeline included. An eased scrub means the content lags the scroll non-linearly, which reads as
broken rather than smooth. (A fifth curve, `shut` ≈ expo.in for "apertures closing, hero exit", was
struck once the hero's scroll-out went linear: nothing else closed an aperture on a clock. A
`catenary` curve, "chain slack relaxation only", was struck for the same reason: the sag reads
velocity directly (§7.2) and the ripple envelope is a closed form, so nothing consumed it.)

**A "—" in an Ease column means `glyph`**, written out explicitly: every such row (button labels,
scroll cue, section index, plate row labels, node labels, colophon rows) animates type, and `glyph`
is "every type animation". `core/easings.js` sets `gsap.defaults({ ease: 'none' })`, so an omitted
ease is never GSAP's own `power1.out` (off this list) and a scrub is linear by construction.

**CSS forms**, for transitions (`tokens.css`): `--ease-mask: cubic-bezier(0.16, 1, 0.3, 1)`,
`--ease-glyph: cubic-bezier(0.08, 0.82, 0.17, 1)`, `--ease-metal: cubic-bezier(0.5, 0, 0.5, 1)`.
Colour, border and crossfade transitions use metal; transforms of type and lifts use glyph; draws
and wipes use mask. `back.out(1.8)` overshoots, which a cubic-bezier cannot express faithfully, so
seating stays in GSAP.

### 9.3 Movement 00 — CAST (preloader)

**Existence rule.** `#cast` is injected by JS and is never in the served HTML (invariant I1). It is
created only if `document.readyState !== 'complete'` when the module runs **and this tab has not
shown it yet** (a `sessionStorage` flag): the entry is a deferred module, which always runs at
`interactive`, so the readyState test alone would put CAST on every warm reload. Reloads and
re-visits in the same tab skip it and the hero entrance plays at boot; storage that throws counts
as "not seen". It is removed by a **hard 3 s timeout** regardless of what has or has not loaded. A
preloader that can outlive its own load event is a broken page.

**Content.** A mono counter `000`, a 1 px hairline, and a single spinning link (§7.5's CAST row),
drawn as **inline SVG in the veil, not by the WebGL stage**. The stage and its `three` chunk load at
idle after `load` (§12.7: the hero is readable before the stage exists), which is when CAST ends,
so CAST never waits on the stage or the tier probe and looks the same at every tier, `NONE`
included. The link is a 3:2 stadium stroked `--silver-shadow` (matte), under a second stroke in the
silver sheet's specular gradient whose opacity is bound to progress: the link's "roughness
0.60 → 0.12" is that gloss going 0 → 1. It rotates in the plane at ω = 0.6 rad/s on the GSAP ticker.

**Progress** is weighted across the three things actually worth waiting for, reported into one
value:

| Source | Weight |
|---|---|
| `document.fonts.ready` | 0.50 |
| the window `load` event | 0.30 |
| `assets/me.jpg` decode | 0.20 |

Counter: `gsap.to(counter, { textContent: 100 · progress, snap: { textContent: 1 }, ... })`, 2τ `glyph`, zero-padded to three digits, with
`tabular-nums` (§5.3) so digits never shift. Hairline: `scaleX` bound *directly* to progress,
`transformOrigin: left` — no tween, because a tween would let the bar lag behind reality. Link
gloss `0 → 1` across progress, bound the same way: it polishes as it loads.

**When it exits.** Once boot step 6 (§9.1) has run *and* progress is 1, or at 3 s − 8τ at the
latest, so the exit always completes inside the hard timeout.

**Exit, 8τ total:**

| t | Target | Change | Dur | Ease |
|---|---|---|---|---|
| 0 | counter, hairline | `opacity → 0`, `filter: blur(0 → 6px)` | 2τ | metal |
| 1τ | the link | `scale 1 → 14` | 8τ | mask |
| 1τ | aperture hole | stadium `0 → 110%` of viewport | 8τ | mask |
| 5τ | — | hero timeline (§9.4) starts, overlapping | — | — |
| 6τ | `#cast` | `opacity → 0` | 2τ | metal |
| 8τ | `#cast` | removed from DOM, then `ScrollTrigger.refresh()` | — | — |

The hero is revealed **through the link's own aperture** — the page's first frame is the motif
explaining itself.

**Reduced motion:** the link does not spin, scale or open an aperture. The counter and hairline
fade (2τ, metal), then `#cast` fades (2τ, metal) and is removed; the hero is already at rest
(§10.1), so it is simply there.

**Implementation caveat, important.** Do **not** implement the aperture as a `clip-path` on
`#smooth-content`. A clip-path there creates a containing block, breaks `position: fixed`
descendants, and interferes with ScrollTrigger pinning. Instead the aperture is an SVG mask on the
overlay itself:

```html
<svg class="cast__mask" aria-hidden="true">
  <defs><mask id="castMask">
    <rect width="100%" height="100%" fill="#fff"/>
    <rect data-hole x="50%" y="50%" width="0" height="0" rx="0" fill="#000"/>
  </mask></defs>
  <rect width="100%" height="100%" fill="var(--ink)" mask="url(#castMask)"/>
</svg>
```

Animate the hole's `x/y/width/height/rx` — a stadium (`rx = height/2`) growing from the centre.
The content underneath is never clipped or transformed, so nothing downstream breaks.

### 9.4 Movement 01 — IDENTITY

**Split configuration.** The `onSplit` return value is the correct pattern — GSAP reverts and
rebuilds the timeline automatically whenever `autoSplit` re-splits on a font load or resize:

```js
SplitText.create('[data-split="name"]', {
  type: 'lines,chars',
  mask: 'lines',          // overflow-hidden wrappers, so chars can rise from below the line box
  autoSplit: true,        // defaults to false — must be set
  aria: 'auto',           // 3.15 default: aria-label on the element, aria-hidden on the pieces
  linesClass: 'line', charsClass: 'char',
  onSplit: (self) => buildHeroTimeline(self),
});
```

**Per-character width morph.** Per §5.4, one tween over an array of proxies, one write pass:

```js
const proxies = chars.map(() => ({ wdth: 62 }));
gsap.to(proxies, {
  wdth: 100, duration: 5 * T, ease: 'glyph', stagger: 0.5 * T,
  onUpdate() {
    for (let i = 0; i < chars.length; i++)
      chars[i].style.fontVariationSettings = `"wdth" ${proxies[i].wdth.toFixed(1)}`;
  },
});
```

**Entrance timeline** (trigger: page load, after CAST; starts at CAST t = 5τ):

| t | Target | From → To | Dur | Ease | Stagger |
|---|---|---|---|---|---|
| 0 | meta line | `opacity 0→1`, `y 8→0` | 3τ | glyph | — |
| 1τ | name chars, line 1 | `y 100%→0`, `wdth 62→100` | 5τ | glyph | 0.5τ |
| 3τ | name chars, line 2 | same | 5τ | glyph | 0.5τ |
| 5τ | role line | `letter-spacing 0.6em→0.18em`, `opacity 0→1` | 8τ | glyph | — |
| 5τ | role hairline (`.hero__rule`, §6.3) | `scaleX 0→1`, origin left | 8τ | mask | — |
| 6τ | tagline | 102° mask wipe (§9.5), `y 12→0` | 5τ | mask | — |
| 8τ | portrait aperture | stadium hole `height 0→100%` | 8τ | mask | — |
| 8τ | portrait image | `scale 1.18→1` | 13τ | glyph | — |
| 8τ | buttons | `scaleY 0→1`, origin bottom | 3τ | chain | 1τ |
| 9τ | button labels | `opacity 0→1` | 2τ | — | 1τ |
| 10τ | aperture ring | `stroke-dasharray '0 100' → '100 0'` (§6.3) | 8τ | mask | — |
| 13τ | scroll cue | `opacity 0→1`, `y 6→0` | 3τ | — | — |

Wall clock ≈ 2.52 s to full rest — set by the portrait image tween (starts 8τ, runs 13τ, ends at
21τ), the longest row in the table above. The 13τ ceiling in §3.5 applies to a single tween, not
to a composed timeline.

**Idle breathing.** After 4 s with no scroll and no pointer movement, every character's `wdth`
oscillates **±3 units on a 6 s sine**, phase-offset `i × 0.08 s` — a slow travelling wave through
the name. It is a true sine computed per frame on the GSAP ticker (the one clock, §9.1), not an
eased tween, so it needs no curve from §9.2:

```js
wdth[i] = 100 + 3 · A · sin(2π · (t − 0.08·i) / 6)    // t in seconds since breathing began
```

The amplitude `A` ramps `0 → 1` over 8τ (`glyph`) when breathing starts and `→ 0` over 3τ on any
input, after which the ticker callback is removed, so the name never jumps. Armed once the entrance
has come to rest; restarted after another 4 s of quiet; only while the hero is on screen. Never
runs under reduced motion. This is the detail that makes the headline feel alive rather than
finished.

**Pointer parallax**, amplitudes straight from §3.7: name 4 px, portrait 8 px, chain 11.31 px,
background 22.63 px — all inverted relative to pointer direction, lerped at 0.08.

**Scroll-out** — `trigger: '#identity', start: 'top top', end: 'bottom top', scrub: 0.6`, every
tween linear (§9.2):

| Target | Change | Note |
|---|---|---|
| name chars | `wdth 100→62` | compresses as it leaves — the entrance, reversed |
| name | `y 0 → −12vh`, `opacity 1→0.06` | |
| portrait aperture | stadium `height 100% → 2px` | the aperture shuts |
| meta, role, tagline | `opacity → 0` while crossing the top edge | each over its own exit |

**Fades are bound to each element's own exit**, not to a share of the section's progress: an element
keeps full opacity while it is wholly on screen and fades only while the viewport's top edge is
cutting through it — its own scrubbed range, `top top → bottom top` of that element. The name's
`opacity 1→0.06` is bound the same way; since it also rises 12vh across the section, its range is
divided by `k = 1 + 0.12·vh / section height`. (A fade "by 40 % progress" was measured leaving the
role and tagline wholly on screen at 0.375 and at 0 at 1440×900.)

The name reaching `opacity 0.06` does **not** violate the dim floor (§4.3): the floor governs
elements *resting* on screen, and a fading element is always being clipped away by the viewport's
edge. Nothing wholly on screen rests below 0.60.

### 9.5 Movement 02 — DOSSIER

**Section header**, trigger `top 72%` on the header. The table has no t column: all three rows start
together on the trigger. The same reveal serves all four section headers (`sections/header.js`),
and it also carries the headings' §3.7 depth (n = 0) on the whole header, so index, rule and
heading move as one:

| Target | Change | Dur | Ease | Stagger |
|---|---|---|---|---|
| index `02` | `opacity 0→1` | 2τ | — | — |
| index rule | `scaleX 0→1`, origin left | 3τ | mask | — |
| heading chars | `y 100%→0`, `wdth 125→100` | 5τ | glyph | 0.5τ |

The heading **compresses** into place (125 → 100) where the hero **expanded** (62 → 100). Section
headings and the hero name are deliberately opposite motions, so they never read as the same
effect twice.

**The 102° mask wipe** — the page's standard body-copy reveal. A gradient mask, animated by
position. Chosen over per-line clip-paths because a paragraph is one element and one animated
property instead of eight:

```css
.wipe {
  --wipe: 100%;
  mask-image: linear-gradient(102deg, #000 0 45%, transparent 55%);  /* 90° + 12°, §3.6 */
  mask-size: 260% 100%;
  mask-position: var(--wipe) 0;
  will-change: mask-position;    /* removed onComplete */
}
```

`gsap.to(el, { '--wipe': '0%', duration: 8 * T, ease: 'mask' })`. Per-line masks
(`SplitText mask: 'lines'`) stay reserved for headings, where the element count is small.

**Body.** Three paragraphs, 102° wipe, 8τ each, 1τ stagger. **Principles strip:** bracketing
hairlines `scaleX 0→1` 3τ, then the mono items `opacity 0→1` 2τ at 0.5τ stagger, left to right.
The body, the strip and the plate each reveal on their own `top 72%` trigger, the header's line, so
each block arrives as it reaches the same height whether the plate sits beside the copy or, at
≤ 900 px, below it.

**Fact plate:**

| t | Target | Change | Dur | Ease |
|---|---|---|---|---|
| 0 | border | 4 DrawSVG segments, clockwise from top-left, sequential | 2τ each = 8τ | mask |
| ≈ 0.9τ | chamfer hairline | `stroke-dasharray '0 100' → '100 0'`, starting the moment the top edge's eased draw reaches the bevel | 1τ | mask |
| 8τ | row label | `opacity 0→1` | 1τ | — |
| 8τ | row leader | `scaleX 0→1`, origin left | 3τ | mask |
| 9τ | row value | 102° wipe | 3τ | mask |
| — | rows | stagger | 1τ | — |
| 8τ | plate | one sheen sweep, `background-position −120% → 220%`, at opacity 0.22 | 8τ | metal |

**The chamfer turns the corner.** The top edge is clipped where the 45° bevel starts, so the bevel
is drawn as the top edge reaches it, handing over to the right edge, and the stroke reads as one
line going round the cut. Its path is `M0 0 L24 24` with `pathLength="100"`, but its real length
is 24√2 ≈ 33.94, which DrawSVG measures and the browser does not, so its draw would stop at 34 %.
It tweens its dash in `pathLength` units instead, as the hero ring does (§6.3). The four frame
paths are exactly 100 long in their viewBox, so DrawSVG is right for them.

**The sheen passes behind text, so it is capped.** At the band's full 0.55 `--chrome` over
`--graphite`, the plate's text would drop to about 2:1 (I2). The sweep layer (`.plate::before`,
under the rows) runs at opacity 0.22, so the band peaks at 0.121 `--chrome`. There the weakest text
on the plate, the `--silver` labels, still measures 5.55:1; the two links rest at `--silver-light`
(§9.10's text links, 7.90:1), and even hovered to `--blue-lift` hold 4.63:1. The
image is 180 % of the plate wide. A larger-than-box image makes the percentage sweep run right to
left, and it keeps the whole band, which leans 15° across the plate's full height, off the plate
at both ends.

Drawing the border as four separate segments rather than one path is what makes it read as
*machined* — each edge arrives, turns a corner, and continues.

**Parallax.** Plate `y ±22.6 px` scrubbed (depth 1 × 4, §3.7) and 5.66 px pointer (depth 1).
Body copy never parallaxes.

### 9.6 Movement 03 — LATTICE

Header as §9.5. Then the graph grows like a circuit trace being etched.

**Growth**, trigger `top 68%`, total ≈ 13τ:

| Order | Target | Change | Dur | Ease |
|---|---|---|---|---|
| 1 | cluster label | `opacity 0→1`, `letter-spacing 0.4em→0.18em` | 5τ | glyph |
| 2 | edge | `stroke-dasharray '0 100' → '100 0'` | 2τ | mask |
| 3 | node (on its edge completing) | `scale 0→1`, origin = the edge's start point | 3τ | chain |
| 4 | node label | `opacity 0→1` | 1τ | — |

Edges are emitted in **BFS order from each cluster root**, stagger 0.5τ, the clusters in parallel:
edge `k` of a cluster starts at `3τ + k·0.5τ`, so the largest cluster (9 edges) rests at 13τ. Each
edge is drawn from the end BFS reached first. Every `<path>` carries `pathLength="100"`, and the
draw tweens `stroke-dasharray '0 100' → '100 0'` in those units, as the hero ring does (§6.3) — not
DrawSVG, which ignores `pathLength` and writes the dash in real px, so a long edge would appear
whole early in its draw. The root seats from its centre at 0, with its cluster label. Every other
node seats as the first edge reaching it completes, its `transformOrigin` set to that edge's start
point, so nodes appear to be *pushed out along the wire* rather than popping in place — the single
detail that makes the growth read as propagation. Edges are `--hairline-strong`, 1 px, one SVG
behind the nodes.

**Hover and focus** — identical behaviour for both, since nodes are `<button>` elements:

| Target | Change | Dur | Ease |
|---|---|---|---|
| the node | `scale 1→1.06` | 1τ | chain |
| incident edges | `stroke → --blue`, `stroke-width 1→2` | 1τ | metal |
| connected nodes | label `letter-spacing 0.08em→0.12em`, border → `--hairline-blue` | 1τ | glyph |
| every other node and edge | label and edge `opacity → 0.60` (the dim floor, §4.3), node border to 60 % | 2τ | metal |
| cluster readout | `textContent` swap to the hovered node's cluster | — | none |

Leave/blur reverses over 2τ. Node labels are JetBrains Mono, which has no `wdth` axis, so
connected labels track out rather than stretch. A dimmed node keeps its `--void` ground opaque —
dimming the whole capsule would let the branch chain behind it show through the label. Colour,
tracking and the dim are CSS transitions on classes (the destination's duration wins: in 1τ, out
2τ); the seat is the one tween, since `back.out` has no CSS form. The dim floor is the hard limit
here — non-focused labels stay readable at 4.6:1 *(errata E21)*, which is why this interaction is permitted at all.

**Optional, HIGH value:** arrow-key traversal between graph-adjacent nodes (←/→ within a cluster,
↑/↓ between clusters). It costs about 30 lines and makes the lattice feel like an instrument rather
than a picture. Not required for launch.

**Reduced motion / LOW tier:** edges render fully drawn, nodes at `scale: 1`, no growth. Hover
keeps only the colour change — no dimming, no scaling, no tracking, 1 px edges. A LOW result that
arrives before the growth has played cancels it.

### 9.7 Movement 04 — WORKS

**Pin.**

```js
const track = document.querySelector('[data-track]');
const viewport = document.querySelector('[data-works-viewport]');   // full-bleed while pinned (§6.6)
const D = () => track.scrollWidth - viewport.clientWidth;

const travel = gsap.to(track, { x: () => -D(), ease: 'none' });   // ease MUST be none
const pin = ScrollTrigger.create({
  trigger: '#works', pin: '#works', start: 'top top',
  end: () => '+=' + D(), scrub: true, anticipatePin: 1,
  invalidateOnRefresh: true,        // recompute D on resize
  animation: travel,
  onToggle: (self) => signals.axis.set(self.isActive ? [1, 0] : [0, 1]),   // §8.3
});
```

`invalidateOnRefresh` plus function-based `end` and `x` is what makes the pin survive a resize.
Hard-coded values here are the most common cause of a track that stops halfway down the page.

**Card triggers use `containerAnimation`** — the documented mechanism for triggering on horizontal
position inside a scrubbed track. Without it, every card fires at once, because vertically they all
occupy the same position:

```js
ScrollTrigger.create({
  trigger: card, containerAnimation: travel,
  start: 'left 78%', end: 'right 22%', once: true,
  onEnter: () => cardIn(card),
});
```

A card already inside the 78 % line with the track at rest (01 and 02 at 1440 px) would otherwise
wait, invisible, through the whole vertical approach until the pin starts. So each card also has a
vertical trigger (`top 78%`, `once`) that plays it if it is left of the line at that moment; the
horizontal trigger then finds it already played. The pin carries `refreshPriority: 1`, so it
refreshes before any trigger below it, whenever that trigger was created. Cards take §3.7's n = 1
pointer parallax everywhere, but scroll parallax only unpinned: inside the pin a scroll parallax
would drift a card ±22.6 px vertically while it travels horizontally. While pinned, the §7.6 guard
shifts the card bodies' cached rects by the pin's hold and the track's travel (both
`clamp(scrollTop − pin.start, 0, D)`), since both move them by transform.

**Card entrance:**

| t | Target | Change | Dur | Ease | Stagger |
|---|---|---|---|---|---|
| 0 | card | `opacity 0→1`, `y 24→0` | 5τ | glyph | — |
| 0 | index digits | scramble (below) | 3τ | none | — |
| 1τ | title chars | `y 100%→0` masked, `wdth 88→100` | 5τ | glyph | 0.5τ |
| 3τ | kicker | `opacity 0→1`, `letter-spacing 0.3em→0.14em` | 5τ | glyph | — |
| 4τ | body | 102° wipe | 5τ | mask | — |
| 5τ | tags | `scale 0.6→1`, `opacity 0→1` | 1τ | chain | 0.5τ |
| 6τ | chamfer hairline | `stroke-dasharray '0 100' → '100 0'`, in `pathLength` units (DrawSVG ignores `pathLength`, and the 24√2-long bevel would stop at 34 %) | 3τ | mask | — |

**Index scramble** (`js/util/scramble.js`): charset `0123456789/\|—`, duration 3τ, **quantised to
12 fps** rather than updated per frame. Per-frame scrambling reads as noise; 12 fps reads as a
mechanical readout settling. Driven by one `ease: 'none'` tween on a progress value, with the
`onUpdate` writing at most every 1/12 s. Requires `tabular-nums` (§5.3) or the card header jitters.

**Hover:**

| Target | Change | Dur | Ease | Stagger |
|---|---|---|---|---|
| card | `translate3d(0, −6px, 0)` | 1τ | glyph | — |
| border | `--hairline → --hairline-blue` | 2τ | metal | — |
| sheen (`::after`, `--silver-sheen`, opacity 0.22) | `background-position` follows pointer x, lerp 0.1 | continuous | — | — |
| tags | `border-color → --hairline-blue` | 2τ | metal | — |
| chain tether (HIGH only) | 3 links rising from the spine at the card's left edge, instance `scale 0→1` | 1τ | chain | 0.5τ |

Hover applies to linked cards only (§6.6). The lift is a CSS transition, so it takes §9.2's CSS
rule for lifts, `glyph`: `back.out` overshoots, which a cubic-bezier cannot express.

The sheen crosses the card's text, so it runs at the plate sheen's cap (§9.5): at opacity 0.22 the
band's peak adds 0.121 of `--chrome` to `--graphite`. Under the peak, the weakest text on a card, the
`--blue-lift` "github ↗", holds 4.62:1, body copy holds 7.89:1, and I2 holds. At full strength
they would drop to 1.23:1 and 2.10:1.

The tether is a stub pointing at the card. It does not reach it: the horizontal spine runs about
250 px below the cards at 1440×900, and three links at §7.3's pitch span about 85 px. Stretching
them across the gap would hang them apart as loose rings (§7.3). It borrows the LATTICE branch's
second `InstancedMesh`, idle during WORKS, so draw calls stay ≤ 3 (§7.7).

**Keyboard twin** (§10.4). `:focus-visible` on a card link gives the lift, border and tags. It
also parks the sheen band at the card's centre and seats the tether. Both retract on blur.

**Cards are never scaled.** Scaling rasterised text to a non-integer factor blurs it, and a
portfolio card is mostly text. The lift is a 6 px translate, which is enough.

**Progress readout.** Written directly in the pin's `onUpdate` — never tweened:

```js
onUpdate: (self) => {
  bar.style.transform = `scaleX(${self.progress})`;
  label.textContent = `${String(Math.round(self.progress * 3) + 1).padStart(2, '0')} / 04`;
}
```

Tweening a value that is itself being scrubbed smooths it twice, and the readout visibly lags the
cards. Without the pin (≤ 900 px, reduced motion, no JS) nothing drives the readout, so it rests
as authored (`01 / 04`, empty bar), and it returns to that state when the pin is torn down.

**Keyboard focus — the mandatory handler.** Cards are moved by `transform`, so when focus lands on
an off-screen card the browser cannot reveal it by scrolling. This is the failure mode that makes
pinned horizontal tracks inaccessible, and it must be handled explicitly.

**Do not add a `focusin` listener.** ScrollSmoother already installs its own — verified in
`ScrollSmoother.js`, it calls `scrollTo(e.target, false, "center center")` for any focused element
that is not in the viewport. A second listener would race it, and the two would fight over the
scroll position. The plugin exposes the correct hook instead: **an `onFocusIn` callback whose
`false` return cancels the built-in behaviour.**

```js
ScrollSmoother.create({
  /* …§9.1 config… */
  onFocusIn(self, e) {
    // The focusable element is the <a> or .card__stop *around* the <article> (§6.6).
    const item = e.target.closest?.('.card__link, .card__stop, [data-card]');
    const card = item && (item.matches('[data-card]') ? item : item.querySelector('[data-card]'));
    if (!card) return;                      // not our concern — let the smoother do its thing

    if (e.target.matches(':focus-visible')) {
      // 1:1 pin: travel = the card's offset from card 01, kept 1 px inside the pin.
      const x = clamp(cardOffsetLeft(card) - cardOffsetLeft(cards[0]), 1, D() - 1);
      glide(pin.start + x);                 // animated — see below
    }
    return false;                           // cancel the smoother's own scrollTo
  },
});
```

Four details that make this work:

- `scrollTo` accepts a **number** as well as an element — verified: it branches on `isNaN(target)`
  and clamps a numeric argument to the scrollable range. So feeding it a computed pin position is
  supported, not a workaround.
- **The move is animated, never a cut** (owner's decision, 8b, replacing an earlier `smooth:
  false`). A focused card glides to its rest position with the smoother's own 1.2 s catch-up. The
  pin scrubs the track and chain through the travel, and cards passed on the way play their
  entrances. The same holds for every scroll the page makes for the reader: any other off-screen
  focus (the smoother's instant `scrollTo(el, false, 'center center')` is replaced by the same
  target, glided), clicked anchors and `hashchange`. All of them go through `glide()` in
  `core/smoothscroll.js`. On a touch device ScrollSmoother does not smooth (§9.1 sets no
  `smoothTouch`), so there `glide()` tweens the scroll position itself over 10τ, `mask`.
  - Two exceptions. **The hash at page load is instant**: there is no earlier view to travel from.
  - **Reduced motion is instant, natively**: there is no smoother, and a focused card that is only
    partly on screen is brought wholly in with `scrollIntoView({ block: 'nearest' })`.
- The hook fires on every focus, pointer focus included. Only keyboard (`:focus-visible`) focus
  moves the pin. A clicked card is already under the pointer, and jumping the track would slide
  it away. The handler still returns `false`, so the smoother does not re-centre the card either.
- The focused card rests where card 01 rests. It is held 1 px inside the pin at both ends,
  because exactly on `start` or `end` the pin reads inactive, which would release the chain and
  flip `signals.axis`. A card whose entrance has not played yet plays it at once, so focus never
  sits on an invisible card waiting for its trigger.

This is ScrollSmoother's `onFocusIn` option, set through `setFocusIn()` in `core/smoothscroll.js`.
There is no `focusin` listener of our own while the smoother exists. Two listeners are safe
exceptions. A `focusout` on the viewport retracts the keyboard tether and never scrolls. Under
reduced motion, where no smoother exists to race, a `focusin` on the track brings a partly
visible card wholly into view.

Also handle deep links: if `location.hash` names a card (`#work-01` … `#work-04`, §6.6), jump the
pin to that card's rest position before the first paint of that section. This covers the hash at
load, a clicked in-page anchor and `hashchange`. `setHashTarget()` in `core/smoothscroll.js` maps
the card to a scroll position, since the smoother's element form would measure the transformed
track. Without the pin (≤ 900 px, reduced motion, no JS) the jump is the plain element jump.
`.card`'s `scroll-margin-top` lands the card below the rail, and the stack under the smoother
applies the same margin by hand.

**Known trade-off, accepted.** Browser find-in-page can locate text in off-screen cards but cannot
bring them into view, because the track is transformed rather than scrolled. All four cards remain
in the DOM and in the accessibility tree, and at ≤ 900 px the layout is a plain vertical stack.
This is the documented cost of the pinned design.

**Branches:**

| Condition | Behaviour |
|---|---|
| `max-width: 900px` | no pin, vertical stack, card triggers on vertical position, chain returns to vertical |
| reduced motion | vertical stack, `gsap.set` to final states, no scramble, no sheen, no tether |
| LOW tier | pin kept, tether and sheen dropped |

### 9.8 Movement 05 — LINK

Header as §9.5 (`sections/contact.js`). Rows enter with their hairlines on the list's `top 72%`:
`scaleX 0→1` 3τ `mask` origin left, 1τ stagger, each row's label and value `opacity 0→1` 2τ `glyph`
with its hairline. The hairlines are `.row::after` (and the first row's `::before`) scaled by
`--rule`, not borders, so drawing them never scales the text; they rest drawn, so a dead chunk
leaves them in place.

**Row hover / focus-visible:**

| Target | Change | Dur | Ease | Stagger |
|---|---|---|---|---|
| link glyph | MorphSVG open `C` → closed `O` | 3τ | chain | — |
| label | `x 0→8px`, `font-weight 600→760` | 1τ | glyph | — |
| underline | drawn 0→100 in `--blue` (`stroke-dashoffset` in `pathLength` units) | 3τ | mask | — |
| value | `--silver → --blue-lift` | 2τ | metal | — |

The glyph closing on hover is the page's thesis in one gesture: **pointing at a link closes the
chain link.** Both morph targets are authored as two paths with identical point counts in the same
SVG, one hidden — MorphSVG interpolates cleanly only between matched path data, and letting it
guess produces a wobble. The morph targets the open path itself with `shapeIndex: 0`; until the late
chunk brings MorphSVG, and under reduced motion, a CSS crossfade of the two paths stands in, and
`.rows.is-morph` retires it once JS morphs. `back.out`'s overshoot carries the seam end about 0.6
viewBox units past the closed point before it settles — the seat, not a mapping wobble.

The label is JetBrains Mono, which has only a `wght` axis (§5.1), so the width morph first written
here (`font-stretch 100%→108%`) would do nothing. It takes the rail items' weight settle instead
(§9.9), the same +160 step from the label's resting 600. A monospace advance doesn't change with
weight, so nothing in the row moves. The label, underline and value are CSS transitions, so they
work with JS dead. Reduced motion changes the colour only: no shift, no weight, the underline
appears without drawing.

**The loop snap.** Once per visit, as the loop closes: `#link` at `top center`, where §7.5's loop
scrub ends. The scrub and the snap's trigger share that frame in either order, so the stage waits on
the ticker for `loop = 1` (up to 3 s; a reader who has already scrolled away gets none). At an
earlier line the loop is still open, and the final link has no seam to seat in:

| Target | Change | Dur | Ease |
|---|---|---|---|
| loop's final link | `scale 1 → 1.14 → 1` | 1τ + 1τ | chain |
| `uExposure` (§8.4) | `1.0 → 1.25 → 1.0` | 2τ | metal |

The chain that has run the entire document closes, and the whole stage flashes once. That is the
ending, and it happens exactly when the reader is being asked to make contact.

**Dossier CTA:** one sheen sweep 8τ `metal` (`--sheen-x −120% → 220%`) as the CTA itself reaches
the `top 72%` line, since the section's top is a screen above it; on hover / focus-visible the 8τ
sweep repeats (§9.10's `.btn--metal` row) and a 1 px border goes `--hairline-blue`, 1τ metal. The
sheen only lightens `--silver-fill`, so `--ink` holds ≥ 12.35:1 under the band at full strength.

### 9.9 Navigation rail

**Shrink.** A class toggle with a CSS transition, not a tween — cheaper, and it survives
`ScrollTrigger.refresh()` without re-entering a mid-tween state:

```js
ScrollTrigger.create({
  start: 'top -80', end: 99999,
  toggleClass: { targets: '.rail', className: 'is-compact' },
});
```

`.rail.is-compact` transitions over 2τ with `ease.metal` as a `cubic-bezier`: height `72 → 56px`,
`backdrop-filter: blur(0 → 14px)`, ground alpha `0 → 0.72`, bottom hairline `opacity 0 → 1`. The
toggle exists under reduced motion too: the compact ground keeps the rail readable over content.

**Active indicator — Flip.** One ScrollTrigger per section; on toggle, the indicator element is
*moved in the DOM* to the active item and Flip animates the difference:

```js
const state = Flip.getState(indicator);
item.appendChild(indicator);
Flip.from(state, { duration: 3 * T, ease: 'mask' });   // a hairline landing: §9.2's draw curve
```

Each trigger runs from its section's `top center` to `max`, and the active item is the last trigger
started, resolved once per update (a jump across several sections is one Flip). Only the starts are
measured, so the ranges can never leave a gap. A range that ended at the next section's
`endTrigger` was not offset by the WORKS pin spacer, and it dropped the indicator for most of the
pin's travel. Above DOSSIER, in IDENTITY, the indicator goes back to `.rail__nav`, where CSS hides it.
Its first placement, and any move before the late chunk has loaded Flip (§12.7), is a plain
`appendChild`. It moves under reduced motion as well, because it is feedback (§10.1).

Flip is used rather than measuring offsets because nav labels have different widths and the
indicator must land exactly on each. Hand-rolled measurement here is re-implementing Flip, worse.

**Item hover:** `font-weight 400 → 560` 1τ `--ease-glyph`, colour `--silver → --chrome` 1τ
`--ease-metal`. The rail items are JetBrains Mono, which has only a `wght` axis (§5.1), so a
`font-stretch` morph would do nothing. A monospace advance doesn't change with weight, so nothing in
the row moves. Reduced motion changes the colour only.

**Mobile panel:** 15° polygon sweep from the top-right (§3.6), via a registered custom property so
the interpolation is typed:

```css
@property --sweep { syntax: '<percentage>'; inherits: false; initial-value: 0%; }

.rail__panel {
  /* horizontal run of a 15° lean over the panel's full height, scaled by how far open it is —
     zero at rest (fully collapsed, matching the old static polygon), full run at --sweep: 100% */
  --shear: calc(100vh * tan(15deg) * (var(--sweep) / 100%));   /* errata E13 */
  clip-path: polygon(
    100% 0,
    calc(100% - var(--sweep)) 0,
    calc(100% - var(--sweep) - var(--shear)) 100%,
    100% 100%
  );
}
```

Panel open 5τ `ease.mask`; items `y 24→0` + `font-weight 300→400` (mono: weight, not width, as the
item hover), 1τ each at 1τ stagger from 1τ, `ease.glyph`. Close reverses at 3τ. `--sweep` is tweened
by GSAP, not transitioned in CSS. While open: `aria-expanded="true"`; `#smooth-wrapper` is inert; Tab
and Shift+Tab cycle the toggle and the panel's links, so the menu can always be closed; Escape
closes and returns focus to the toggle; and `smoother.paused(true)` locks scroll (`overflow: hidden` on
`<html>` under reduced motion, which has no smoother). A panel link closes the panel first, so the
anchor's glide runs unpaused. Reduced motion opens and closes instantly. A breakpoint or
motion-toggle rebuild closes it.

The rail lives **outside** `#smooth-content` (§6.1). Inside it, the smoother's transform would drag
it up the page.

### 9.10 Colophon and global micro-states

Colophon (`sections/footer.js`): top hairline `scaleX 0→1` 8τ `mask` origin left; then rows
`opacity 0→1`, `y 8→0`, 2τ `glyph`, 1τ stagger, in DOM order. The trigger is `clamp(top 72%)`:
the colophon ends the page, and its top may never climb to the 72 % line. The hairline is
`#colophon::before` scaled by `--rule`, drawn at rest.

**Global micro-states** — everything interactive on the page, for consistency. Eases per §9.2's
rule: CSS transitions use the `--ease-*` tokens, GSAP the named curves.

| Element | Trigger | Change | Dur | Ease |
|---|---|---|---|---|
| text link | hover / focus | `--silver-light → --blue-lift` 1τ; a `--blue` underline draws 0→100 over the resting hairline, 3τ | 1τ / 3τ | metal (colour), mask (underline) |
| `.btn--metal` | hover / focus | sheen sweep repeats, 8τ; `translate3d(0,−2px,0)`, 1τ | 8τ / 1τ | metal (sheen), glyph (lift) |
| `.btn--ghost` | hover | border `--hairline → --hairline-blue`; text → `--chrome` | 1τ | metal |
| tag | hover | border → `--hairline-blue` | 1τ | metal |
| any focusable | `:focus-visible` | 2 px `--blue-lift` outline, 2 px offset, 1 px `--ink` inset ring | 0 (instant) | — |
| toggle | click | label swap, 1τ crossfade | 1τ | metal |

Focus rings are **instant**. An animated focus ring lags keyboard navigation and feels broken.

**Text links** are the inline links in running text: the plate's two values and the colophon's
licence (`a.tlink`). At rest they are `--silver-light` over a static 1 px `--hairline-strong`
underline. The underline is what marks them as links, since `--silver-light` against the
surrounding `--silver` is only 1.41:1 and colour alone can't (WCAG 1.4.1), and it spends none of
§4.4's blue. Both lines are SVG in the HTML (`.tlink__u`: `.tlink__rest`, `.tlink__draw`,
`pathLength="100"`), so the resting underline needs neither JS nor the late chunk. Unclassed links
keep §4.1's `--blue-lift`.

**Sheen sweeps are 8τ** (§3.5), hover repeats included. On `.btn--metal` and the rail CTA the sweep
is a `::after` layer (`--silver-sheen`, 180 % wide, §9.5's ends) and a CSS `@keyframes` run, which
restarts on each hover and focus. Reduced motion has no sweep and no lift. The table's 1τ for
`.btn--metal` is the lift's.

**Motion toggle mechanics.** Every movement's animations are created inside a `gsap.context()`
held in a registry. Toggling motion calls `revert()` on all contexts, flips the stored preference,
and re-initialises in the other mode — no page reload, and `saveStyles` guarantees the DOM returns
to its authored state first.

---

## 10. Degradation and accessibility

### 10.1 Motion preference

Two inputs, either able to override the other, resolved once at boot into `signals.motion`:

1. `prefers-reduced-motion: reduce` — the OS setting, and the default answer.
2. A persisted toggle in the colophon (§6.8), `localStorage['motion'] ∈ {'full','reduced'}`.

Resolution: **the stored toggle wins if present, otherwise the media query decides.** A visitor
whose OS asks for reduced motion but who explicitly enables it here gets the full page; a visitor
with no OS preference who turns it off gets the reduced page. Respecting the OS default while
allowing an explicit override in both directions is the only correct reading of the setting.

What `reduced` means, concretely:

| Subsystem | Reduced behaviour |
|---|---|
| ScrollSmoother | not created; native scrolling |
| Entrance timelines | `gsap.set` to final states; nothing animates in |
| Scrubbed animations | not created |
| WORKS pin | not created; vertical stack |
| Chain | drawn, never animated: no ticker callback, no phase spring, no sag response, no ripples. The frame is redrawn only on scroll and resize, so the readability guard (§7.6) keeps dimming links as copy scrolls past. The tier stays whatever the probe measured |
| Idle breathing, scramble, sheen, ripples | never created |
| Hover states | colour and border changes only; no transforms, no dimming |
| Focus rings, nav indicator | unchanged — these are feedback, not decoration |

Reduced motion is not a degraded page. It is the same page, still, and it must look deliberate.

### 10.2 Quality tiers

A 30-frame probe after first paint, discarding the first 5 frames:

```js
// median frame time over frames 6..30, then:
const tier = !gl                      ? 'NONE'
           : median <= 18             ? 'HIGH'   // ~55+ fps
           : median <= 28             ? 'MED'    // ~35+ fps
           :                            'LOW';
```

Forced to `LOW` regardless of probe when `navigator.hardwareConcurrency <= 4`, or when
`(pointer: coarse)` and (`navigator.deviceMemory < 4` or `navigator.deviceMemory === undefined`).
`deviceMemory` is Chromium-only — absent in Firefox, Safari, and Safari on iOS — so on those engines
the comparison is `undefined < 4`, always `false`; treating `undefined` itself as "assume low" on a
coarse-pointer device is what actually catches iOS Safari, the exact low-power-mobile population
this heuristic exists for. Forced to `NONE` when WebGL2 context creation
fails or when the probe itself throws. Reduced motion does not change the tier (§10.1).

`antialias` is fixed at context creation, but the tier that decides it (§8.1) comes from a probe
that needs a renderer. A forced tier builds the right renderer first time. Otherwise the renderer
is built for HIGH (antialias off) on the real canvas, the probe renders the real chain on it while
the canvas is still at `opacity: 0`, and a MED/LOW result swaps in a fresh `<canvas id="stage">`
and builds again with antialias on — once, before anything is visible.

Tier parameters are in §7.7; the selected tier is printed in the colophon (§6.8) so a performance
report from a real visitor is actionable.

### 10.3 No-JS and no-WebGL

Both resolve to the same static page, and both must look finished rather than broken.

- **No JS:** the served HTML is complete and styled. No `#cast` veil is ever created (§9.3), so
  nothing covers the content. All `motion.css` initial states are declared inside
  `@media (scripting: enabled)` — **this is the load-bearing detail.** If `opacity: 0` initial
  states were unconditional, a JS failure would produce a blank page. The canvas element is inert.
- **No WebGL (tier `NONE`):** the canvas is removed from the DOM. A CSS fallback layer takes over:
  a fixed sheet combining a `--silver-sheet` radial *(errata E19)* at 18 % opacity and a static inline-SVG chain
  strip at 0.18 opacity, positioned where the spine would run. The motif survives; the motion does
  not.

### 10.4 Accessibility requirements

| Requirement | Implementation |
|---|---|
| Skip link | `.skip` first in `<body>`, visible on focus, targets `#identity` |
| Landmarks | `<header>`, `<nav aria-label>`, `<main>`, `<footer>`; every `<section aria-labelledby>` |
| Heading order | one `<h1>` (the name), `<h2>` per movement, `<h3>` per card — no skipped levels |
| Split text | `aria: 'auto'` (3.15 default) puts `aria-label` on the element and `aria-hidden` on the generated spans, so screen readers get the sentence, not 40 letters |
| Re-split safety | `autoSplit: true` + `onSplit` returning the timeline; re-splits on font load and resize without leaking tweens |
| Contrast | §4.3 table; dim floor 0.60 enforced as a token, never bypassed |
| Focus visible | 2 px `--blue-lift` outline + 2 px offset + 1 px `--ink` inset ring, so it reads on both dark ground and silver fills |
| Focus order | DOM order throughout; every WORKS card is a tab stop, linked or not (§6.6). While the WORKS pin exists, the smoother's `onFocusIn` hook (§9.7) keeps view and focus in agreement, gliding rather than cutting. It is not a second `focusin` listener, which would race the smoother's own |
| Targets | ≥ 44 × 44 px for every interactive element, including lattice nodes and contact rows |
| Keyboard parity | every hover state has a `:focus-visible` equivalent; lattice nodes are `<button>`, not `<span>` |
| Motion control | persisted toggle in the colophon, reachable by keyboard |
| Canvas | `aria-hidden="true"`, `pointer-events: none`, not focusable |
| Images | `me.jpg` has a real `alt` ("Leonid Yesaulov"), explicit `width`/`height`, `fetchpriority="high"` |
| Language | `<html lang="en">` retained |
| Zoom | usable to 200 % without horizontal scroll, except the WORKS track, which scrolls horizontally by design |

### 10.5 Forced colours and reduced transparency

```css
@media (prefers-reduced-transparency: reduce) {
  .rail, .card { backdrop-filter: none; background: var(--void); }
}
@media (forced-colors: active) {
  #stage, .grain { display: none; }
  .silver-type  { color: CanvasText; background-image: none; }
  .hairline, .card, .plate { border-color: CanvasText; }   /* errata E10 */
  .rail__indicator { background: Highlight; }
}
```

Under forced colours the page is a plain, high-contrast, fully readable document. That is the
correct outcome, and it is the last proof that the aesthetic is a layer rather than the substance.

---

## 11. SEO and metadata

The current `<head>` has a title and a favicon. Everything else below is new.

```html
<title>Leonid Yesaulov — AI &amp; Infrastructure Engineer</title>
<meta name="description" content="AI &amp; Infrastructure Engineer in Munich. Secure, scalable
      backend services and deployment pipelines — Python, Go, gRPC, Docker, CI/CD.">
<link rel="canonical" href="https://omniserv.me/">
<meta name="theme-color" content="#05070A">

<meta property="og:type"        content="website">
<meta property="og:url"         content="https://omniserv.me/">
<meta property="og:title"       content="Leonid Yesaulov — AI &amp; Infrastructure Engineer">
<meta property="og:description" content="Secure, scalable systems end to end.">
<!-- og:image: switch to assets/og.png once it exists (§14 item 1). Until then this points at
     assets/me.jpg so the share card is never a broken image. -->
<meta property="og:image"       content="https://omniserv.me/assets/me.jpg">
<meta name="twitter:card"       content="summary_large_image">

<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/me.jpg">
```

- **Favicon** becomes `assets/favicon.svg` — two interlocked chain links in `--silver` on
  transparent, the same glyph as the rail mark (§6.2). The current favicon is a 42 KB JPEG
  portrait scaled to 16 px, which is both unreadable and wasteful. `me.jpg` is retained as the
  `apple-touch-icon`, where a photo is appropriate.
- **`assets/og.png`** (1200 × 630) must be produced — see §14.
- **JSON-LD**, one `Person` block:

```json
{
  "@context": "https://schema.org", "@type": "Person",
  "name": "Leonid Yesaulov",
  "jobTitle": "AI & Infrastructure Engineer",
  "url": "https://omniserv.me/",
  "image": "https://omniserv.me/assets/me.jpg",
  "email": "mailto:leo@omniserv.me",
  "address": { "@type": "PostalAddress", "addressLocality": "Munich", "addressCountry": "DE" },
  "alumniOf": { "@type": "CollegeOrUniversity", "name": "Technical University of Munich" },
  "knowsLanguage": ["en", "de", "ru", "uk"],
  "sameAs": [
    "https://github.com/leoyesaulov",
    "https://www.linkedin.com/in/leonid-yesaulov-836b98217/"
  ]
}
```

Plus `public/robots.txt` allowing everything and naming no sitemap — a single page does not need one.

---

## 12. Build, file layout and deployment

### 12.1 Dependencies

`professional/package.json` — three packages, exact pins, no ranges:

```json
{
  "name": "professional", "private": true, "type": "module",
  "scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview" },
  "dependencies": { "gsap": "3.15.0", "three": "0.186.1" },
  "devDependencies": { "vite": "8.3.1" }
}
```

GSAP 3.15.0 ships every plugin this design uses — ScrollTrigger, ScrollSmoother, SplitText,
CustomEase, Flip, DrawSVGPlugin, MorphSVGPlugin — in the one package, under the Standard
"no charge" license. No registry token, no separate Club install. Verified against the published
tarball.

Three addons *(errata E11)* are imported through the `three/addons/*` subpath, which the package's `exports` map
resolves to `examples/jsm/*`:

```js
import { RoomEnvironment }  from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer }   from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }       from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass }       from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass }       from 'three/addons/postprocessing/OutputPass.js';
```

### 12.2 Source layout

```
professional/
  index.html                  ← Vite entry, at the root
  design.md                   ← this document (not shipped, see §12.4)
  package.json  vite.config.js
  Caddyfile  Dockerfile  .dockerignore  README.md
  public/                     ← copied verbatim to dist/, URLs never change
    files/Yesaulov_CV.pdf     ← path is load-bearing: may already be shared externally
    assets/me.jpg  assets/favicon.svg  assets/og.png
    fonts/archivo-var-v1.woff2  fonts/inter-var-v1.woff2  fonts/jetbrains-mono-var-v1.woff2
    LICENSE.txt  robots.txt
  src/
    css/  tokens.css  base.css  layout.css  components.css  motion.css
    js/
      main.js
      core/      easings.js  signals.js  smoothscroll.js  split.js  tiers.js
                 registry.js  late.js  lazy.js
      sections/  preloader.js nav.js hero.js about.js stack.js projects.js contact.js footer.js
                 chain.js     ← registers the chain's movement states (built by gl/movements.js)
                 header.js    ← the §9.5 section-header reveal + heading depth, shared by 02–05
                 index.js     ← the sections chunk: about.js onward, fetched alongside the fonts
                                and awaited before boot, so the entry does not grow (§12.7)
      gl/        stage.js  chain.js  lattice.js  movements.js
                 tether.js    ← the §9.7 hover tether, drawn in the lattice branch's idle mesh
      gl/passes/ metal.js
      util/      scramble.js  rect.js  lerp.js  prefers.js
```

`vite.config.js`:

```js
export default {
  build: {
    outDir: 'dist',
    assetsDir: '_',          // hashed bundles land in dist/_/ so they cannot collide
                             // with the verbatim public/assets/ tree
    target: 'es2022',
    rollupOptions: { output: { manualChunks: { three: ['three'] } } },   // errata E13
  },
};
```

Splitting `three` into its own chunk lets the hero paint from a small entry chunk while the
~170 KB (gzipped) WebGL chunk streams in behind it. Note that three 0.186 ships a split build —
`three.module.js` re-exports from `three.core.js` — so the `manualChunks` entry bundles both into
the one chunk, which is what we want. Import only from `'three'` and `'three/addons/*'`, never
from a `build/` path directly.

**Fonts live in `public/fonts/` with a version in the filename** rather than being hashed by Vite.
This keeps the `<link rel="preload">` href static and lets Caddy serve them `immutable`; the
trade-off is that replacing a face requires bumping `-v1` to `-v2`, which is a deliberate, visible
act rather than an invisible cache hazard.

### 12.3 Dockerfile — multi-stage

```dockerfile
FROM node:26-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:2-alpine
EXPOSE 5005
WORKDIR /app
COPY --from=build /src/dist /app
COPY Caddyfile /app/Caddyfile
CMD ["caddy", "run", "--config", "Caddyfile"]
```

- `package.json` and the lockfile are copied before the source so `npm ci` stays cached across
  content-only changes.
- `package-lock.json` must be committed. `npm ci` fails without it, which would break the deploy
  workflow on the self-hosted runner.
- **`docker-compose.yaml` needs no changes.** `build: ./professional/` still finds the Dockerfile,
  the port is still 5005, and the healthcheck still works: `caddy:2-alpine` and the currently-untagged
  `caddy:latest` both run **Alpine 3.23.6** underneath (confirmed directly, not inferred) and both ship
  Caddy v2.11.4 with `curl` at `/usr/bin/curl`, so `["CMD","curl","-f","http://webpage:5005"]` behaves
  exactly as today.
- Only `dist/` reaches the final image. Source, `node_modules` and this document are confined to
  the build stage.

### 12.4 .dockerignore

```
.*
node_modules
dist
**/*.md
/hidden
```

Two changes from the current file:

- **`*.txt` is removed.** It currently excludes `LICENSE.txt` and `README.txt` from the build
  context entirely, which is why the footer's licence link would 404 today (§2.1). With `*.txt`
  gone and the file moved to `public/LICENSE.txt`, it ships and serves.
- **`**/*.md` is added, with the globstar.** Docker's `*.md` matches root level only; the globstar
  form is what actually keeps `design.md` and `README.md` out of the image. They are documentation,
  not web content, and there is no reason to publish them at `omniserv.me/design.md`.

`node_modules` and `dist` are excluded because the build stage produces both; shipping local copies
into the context would slow every build and risk platform-mismatched binaries.

### 12.5 Caddyfile

Keep the whole existing security block — every `respond ... 403` line and the log configuration —
and add compression plus cache policy:

```
encode zstd gzip

@hashed path /_/*
header @hashed Cache-Control "public, max-age=31536000, immutable"
header /fonts/*  Cache-Control "public, max-age=31536000, immutable"
header /assets/* Cache-Control "public, max-age=604800"
header /files/*  Cache-Control "public, max-age=86400"
header /         Cache-Control "no-cache"

header {
  X-Content-Type-Options   "nosniff"
  Referrer-Policy          "strict-origin-when-cross-origin"
  -Server
}
```

`encode` matters more than usual here: the three.js chunk is roughly 1.2 MB raw and about 170 KB
compressed, and the origin currently serves everything uncompressed.

Also: **the `@notData` matcher at `Caddyfile:6` is declared and never used** (§2.2). Delete it. The
`respond` directives below it already enforce the same policy, so it is dead configuration that
reads as if it were doing something.

### 12.6 Repository housekeeping

- **`.gitignore`** (repo root) contains `dist/` at line 13, which correctly ignores
  `professional/dist/`. It has **no** `node_modules` entry — verified — so add
  `professional/node_modules/`. Without it the first `npm install` stages thousands of files.
- **`README.txt` → `README.md`**, rewritten. The current text ("built with HTML, CSS, JS and AI")
  will no longer be accurate:

  > Portfolio page for Leonid Yesaulov — Vite + GSAP + three.js, built into a Caddy image.
  > Part of Omniserv. `npm run dev` to develop, `docker compose up --build webpage` to run as
  > deployed. See `design.md` for the full specification.

- `LICENSE.txt` moves to `public/LICENSE.txt` unchanged. It is CC BY 3.0; the colophon links it.

### 12.7 Performance budget

| Metric | Budget |
|---|---|
| Entry JS chunk (compressed) | ≤ 68 KB |
| Late plugins chunk — Flip + MorphSVG (compressed, idle after `load`) | ≤ 16 KB |
| `three` chunk (compressed) | ≤ 180 KB |
| Total JS (compressed) | ≤ 236 KB |
| CSS (compressed) | ≤ 14 KB |
| Fonts (3 × variable woff2, subset) | ≤ 140 KB |
| LCP (hero name, cable) | < 2.0 s |
| CLS | 0 — fixed portrait box, explicit image dimensions, `font-display: swap` with metric-compatible fallbacks *(errata E28)* |
| First WebGL frame | after LCP; the canvas fades in over 8τ on `requestIdleCallback` |
| Draw calls | ≤ 3 |

The entry budget was 40 KB until checkpoint 4 measured it: GSAP core + ScrollTrigger alone are
~46 KB gzipped, and everything else in the entry (ScrollSmoother, SplitText, CustomEase, DrawSVG)
is needed by the first frame of motion. Raised to 64 KB by owner decision (2026-09-27) — ~61 KB
measured, with ~3 KB of headroom for the project's own code — with Flip and MorphSVG moved to the
late chunk (§9.1). Raised again to 66 KB by owner decision (2026-09-28), when checkpoint 5b's hero
and depth modules brought the entry to 64.0 KB: that headroom was the hero's. Section modules below
the fold (DOSSIER onward) load as their own chunk rather than grow the entry further; the total
JS budget still governs. That chunk (`sections/index.js`, §12.2) is fetched in parallel with the
fonts and awaited with them before boot, because its movements and heading builders must be
registered before the registry builds and the headings split (owner decision, checkpoint 7a). A
failed chunk costs only its choreography, since nothing it animates is hidden in CSS. The entry is a deferred module, so its size
moves when motion starts, not when the hero paints.

The total was 220 KB until checkpoint 6b: `three` alone is ~136 KB, and the chain's movement
states (the LATTICE branch, the horizontal run, the loop) brought the total to 220.7 KB. Raised to
224 KB by owner decision (2026-09-28). Raised again to 228 KB by owner decision (2026-09-28), when
checkpoint 7b's lattice (`sections/stack.js`, +2.4 KB in the sections chunk) brought it to 225.0 KB,
leaving ~3 KB for the remaining section modules. Raised again to 232 KB by owner decision
(2026-09-28), when checkpoint 8b's WORKS interaction (focus, deep links, hover, tether, glided
focus scrolls) brought it to 228.03 KB. That leaves ~4 KB for checkpoints 9a and 9b. Raised again
to 236 KB by owner decision (2026-09-28), when checkpoint 10's composer (EffectComposer,
RenderPass, OutputPass, the metal pass: +2.6 KB in `three`, +1.4 KB in the stage chunk) and CAST
brought it to 234.90 KB. The entry was raised to 68 KB in the same decision: CAST must run before
boot, so `sections/preloader.js` is in the entry (+1.2 KB, to 67.07 KB).

The ordering rule: **the hero must be readable before the stage exists.** The canvas starts at
`opacity: 0` and is faded in once the first frame has rendered, so WebGL initialisation can never
delay or shift the largest text on the page.

---

## 13. Implementation order

> **Superseded for execution** by the checkpoint list in `PROGRESS.md`, whose **Ownership map**
> names the one checkpoint that owns each section of this document. Phase → checkpoint: 1 → 1–3 ·
> 2 → 4 · 3 → 5a–5b · 4 → 6a–6b · 5 → 7a–9b · 6 → 10 (plus §9.3 CAST) · 7 → 11a–11b. The table
> below is kept as the original rationale.
>
> **Contradictions** inside this document are tracked in `PROGRESS.md`'s **Errata** table and
> marked `(errata E#)` where they occur. The checkpoint that owns a row corrects the text here.

Seven phases. Each ends in a state that could ship.

| # | Phase | Contents | Done when |
|---|---|---|---|
| 1 | **Scaffold and static page** | `package.json`, Vite config, Dockerfile, Caddyfile, `.dockerignore`, `public/` moves; `tokens.css` + `base.css` + `layout.css` + `components.css`; all six movements in semantic HTML with final copy | The page is complete, styled and readable with **zero JavaScript**. This is the invariant-I1 and I3 baseline, and it is a shippable improvement on the current site by itself |
| 2 | **GSAP rig** | `easings.js`, `signals.js`, `smoothscroll.js`, `matchMedia` scaffolding, `saveStyles`, context registry, motion toggle | Smooth scroll works; velocity and pointer signals read correctly in a debug overlay; the toggle reverts everything cleanly |
| 3 | **Kinetic type** | `split.js` with the fonts gate; hero, section headings, card titles; the 102° wipe utility | Headlines animate; no reflow on load; re-split on resize leaks no tweens |
| 4 | **Chain stage** | `stage.js`, `chain.js`, catenary curve, phase spring, ripples, the `aDim` guard, tier probe | The chain bows at rest, snaps taut on fast scroll, and visibly dims behind copy |
| 5 | **Choreography** | Per-section timelines; the lattice; the WORKS pin including its `onFocusIn` hook; the LINK morphs and loop snap | Every movement animates per §9; keyboard tabbing through the pinned track never strands focus |
| 6 | **Post-processing** | `metal.js` pass, composer wiring, `OutputPass`, exposure flash, the CSS grain sheet | Silver reads as brushed metal; no banding; `uAxis` flips during the pin |
| 7 | **Degradation pass** | Reduced motion, `NONE` tier fallback, forced colours, focus rings, SEO and JSON-LD, `og.png` | Every row of §10.4 verified; all four degradation modes look deliberate |

Phases 1 and 2 are the ones worth being slow about. Everything after them is additive, and a
mistake in either is felt in all five remaining phases.

---

## 14. Open items

Four decisions that need input or an asset, none of which blocks phases 1–6.

1. **`assets/og.png` (1200 × 630)** must be produced — it cannot be generated from what is in the
   repository. Suggested composition: `--ink` ground, `LEONID YESAULOV` in Archivo at `wdth 100`,
   the role line in mono beneath it, and three chain links entering from the right edge. Until it
   exists, point `og:image` at `assets/me.jpg`; a wrong-aspect share card is better than none.
2. **Secure Memory Unit has no link** (`index.html:138-148` never had one). If a repository or
   write-up exists it should become card `03`'s target; if it is coursework that cannot be
   published, the card stays link-free, which the design handles (§6.6).
3. **uWeMe has no public link** either. If TestFlight or a landing page still resolves, card `02`
   gets a target; otherwise it also stays link-free.
4. **The Dossier sub-label omits file size** by design. `104 KB` would be exact today and wrong the
   next time the PDF is regenerated, and nothing in a static build can keep it honest. The label is
   `A4 · 1:√2 · PDF` instead — permanently true. If a size is wanted, Caddy can be templated to
   emit it, but that is a real cost for a small flourish.

---

## Appendix — quick reference

**Beat.** τ = 0.12 s · durations 1/2/3/5/8/13/21τ · glyph stagger 0.5τ · line stagger 1τ
**Ratio.** √2, from A4 · type step 2^(1/4) · spacing 8 px × Fibonacci · parallax 4 px × √2ⁿ
**Angles.** 12° wipes · 15° panel · 30/150° lattice · 45° chamfer · 105° sheen · 168° sheet
**Easings.** mask · glyph · chain (`back.out(1.8)`) · metal; scrubs are `none`; a "—" is glyph
**Dim floor.** 0.60 — never lower for anything resting on screen
**Chain.** `sag(t) = (cosh(1.9(2t−1)) − cosh 1.9)/(1 − cosh 1.9)` · `A = 0.09·H·(1 − |v|)` ·
phase spring ζ 0.72, ω 14 · 1 link per 12 vh
**Blue budget.** ≤ 5 % of pixels, ≤ 2 elements on screen; `--blue` is never body text
