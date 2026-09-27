# Implementation progress

Conventions (kickoff prompt, commit format, verification approach) live in `SESSIONS.md` — read
that first if you're a new session. This file is just the checklist, the per-checkpoint scope, and
the running log.

- [x] 1. Scaffold & build config — design.md §12.1–12.6
      Scope: `package.json`, `vite.config.js`, `Dockerfile`, `Caddyfile`, `.dockerignore`,
      `public/` file moves (CV, LICENSE, assets, robots.txt), root `.gitignore` fix, `README.md`
      rewrite.
      Done when: `npm run build` and `docker build` succeed on a minimal placeholder `index.html`;
      `/files/Yesaulov_CV.pdf` and `/LICENSE.txt` resolve in the built output at their old paths.

- [x] 2. Design tokens + base/layout CSS — design.md §3, §4
      Scope: `src/css/tokens.css`, `base.css`, `layout.css` — the √2 type scale, spacing, colour
      tokens, grid/breakpoints, fixed angles.
      Done when: tokens compute correctly (spot-check a few px values against the tables); a
      placeholder page using only these three files respects the grid and contrast floors.

- [x] 3. Full static HTML + copy + components.css — design.md §2, §5.3, §6, §11 (title/meta only)
      Scope: all six `<section>`s in `index.html` with final copy verbatim from §6.2–6.8,
      `components.css`, legacy-hash map script inline, base `<title>`/`<meta description>`.
      Done when: page is complete, styled and readable with **zero JavaScript beyond the hash-map
      snippet** — this is invariant I1/I3's baseline. Every row of design.md §2.1 is accounted for.

- [x] 4. GSAP rig — design.md §9.1
      Scope: `easings.js`, `signals.js`, `smoothscroll.js` (ScrollSmoother), `matchMedia`
      scaffolding, `saveStyles`, context registry, motion toggle wiring in colophon.
      Done when: smooth scroll works; a debug overlay shows `velocity`/`pointer`/`axis`/`tier`/
      `motion` updating correctly; toggling motion off and back on reverts cleanly with no leaked
      state.

Checkpoints 5–11 were split into session-sized halves (5a/5b … 11a/11b) on 2026-09-28 so every
part of design.md has exactly one owner — see the **Ownership map** below. A letter suffix is a
full checkpoint: own session, own commit, own box. Code comments written before the split say
"checkpoint 6", "checkpoint 8" etc.; the map says which half that now means.

- [ ] 5a. Fonts + split rig — design.md §5.1 (install check), §5.2, §5.4, §9.1 step 3
      Scope: download and subset the three variable faces to `public/fonts/*-v1.woff2` (§5.2,
      §12.2 — resolve **E2**); the subset is every non-ASCII character actually in `index.html`,
      not just §5.2's list (it misses `©` `°` `–` `↗`), with the mono face's tabular digits kept;
      **verify Archivo's real `wdth` range** and record it in the log (§5.1 — scale §9.4's
      targets if it differs); `@font-face` blocks with the full ranges, `font-display: swap`, plus
      metric-compatible fallback faces (`size-adjust` / `ascent-override` etc.; §12.7's CLS row
      depends on them); `<link rel="preload">` for Archivo only. `core/split.js` behind the `document.fonts.ready`
      gate, with `autoSplit` + `onSplit` (§9.4 config); splits for the hero name, section headings
      (`data-split="heading"`) and card titles (`data-split="title"`) — the splits only, no
      choreography. The 102° `.wipe` utility (§9.5 CSS). **Create `src/css/motion.css`** with every
      initial state inside `@media (scripting: enabled)` (§10.3) — later checkpoints add to it.
      Done when: fonts ≤ 140 KB total (§12.7) and the page renders in Archivo/Inter/JetBrains Mono;
      CLS 0 on load; splits produce no visible reflow; resizing/re-splitting leaks no tweens
      (`gsap.globalTimeline.getChildren()` count stable); no-JS page still complete.

- [ ] 5b. IDENTITY choreography — design.md §9.4 (everything but the split config), §3.7
      Scope: `sections/hero.js`. The §9.4 entrance timeline (every row, incl. per-char width morph,
      role tracking, role hairline, tagline wipe, portrait stadium aperture + image scale, buttons,
      ring DrawSVG, scroll cue). The role hairline has no element yet — resolve **E20** (a
      decorative, `aria-hidden` element plus its `motion.css` state). It starts on its own at boot when there is no CAST; 10 later rewires the start
      to CAST t = 5τ. Idle breathing (resolve **E3**'s `sine.inOut`); scroll-out (resolve **E4**).
      Settle **E-ease**, the rule for a "—" in an Ease column, before writing the first such row.
      **The depth module** §9.1 asks for ("one module owns the depths and applies them to both")
      owns §3.7's amplitudes for pointer and scroll parallax. It wires the hero layers now and
      exposes the per-layer API that 6b (chain), 7a (headings, plate), 8a (cards) and 10
      (background) apply. Hero pointer parallax. Reduced-motion branch: `gsap.set` to final states.
      Done when: hero animates per §9.4's table and rests at ≈ 21τ; breathing starts after 4 s idle
      and dies on input; scroll-out never leaves text resting below 0.60; LCP < 2.0 s (§12.7) with
      the hero readable before any JS runs; motion toggle reverts it cleanly.

- [ ] 6a. Chain core (WebGL) — design.md §7.1–7.4, §7.6, §7.7, §10.2
      Scope: `gl/stage.js`, `gl/chain.js`: renderer/camera, catenary + velocity sag, phase spring,
      reversal ripples, instanced links + alternating orientation, `RoomEnvironment` tint + three
      lights, `aDim` readability guard with its document-space rect cache in `util/rect.js`
      (§7.6). Ripple envelope ease (resolve **E3**'s `power2.out`). Resolve **E22**, the unused
      `catenary` ease. Render loop on `gsap.ticker`
      (§9.1 "one clock"). `core/tiers.js` probe + forced LOW/NONE rules, setting `signals.tier`
      (§9.1 boot step 1). Decide how the renderer is created given that `antialias` is fixed at
      context creation, while the tier that decides it (§8.1: on at MED/LOW) comes from a probe
      that needs a renderer; log the choice. Resolve **E1**, what reduced motion does to the chain.
      Tier params for DPR/links/clearcoat (§7.7). Canvas fades in over 8τ after the first frame
      on idle (§12.7). Vertical spine at IDENTITY's `X` only — movement states are 6b.
      Done when: chain renders, bows at rest (~9 % of H), snaps taut on fast scroll, visibly
      dims/mattes behind copy; tier probe downgrades under forced LOW; colophon shows the tier;
      draw calls ≤ 3; `three` chunk ≤ 180 KB; reduced motion behaves as E1's resolution says.

- [ ] 6b. Chain movement states — design.md §7.5, §3.7 (chain rows)
      Scope: every row of §7.5 except CAST's preloader behaviour (10): the IDENTITY spine entering
      from the top-left at full `A₀`; scrubbed `X` migrations for IDENTITY → DOSSIER (their ease is
      **E15**: `ease.metal` vs scrubs-are-`none`); the LATTICE four-way branch (`gl/lattice.js`,
      second `InstancedMesh` cross-fade), including what it does at the `s` breakpoint (resolve
      **E9**), with a **branch-roots setter** fed from CP3's column layout for now — 7b re-feeds it
      with the lattice-resolved root positions; the **horizontal mode API**
      (rotation to `y = −0.40·H`, phase driven by an external progress value) for 8a to bind, and
      a way back to vertical for 8a's ≤ 900 px branch (§9.7); the LINK closed 24-link loop +
      colophon idle, with a `snapFinalLink()` hook for 9b. The degenerate-tangent guard at the
      loop top. The §3.4 asymmetry rule: the spine runs on the unused column side. Chain
      pointer/scroll parallax (foreground n=3, mid n=4) from 5b's depth module.
      Done when: the chain migrates (never cuts) at every boundary; branch terminates at the four
      cluster roots; loop closes and idles; horizontal mode can be driven from a debug slider.

- [ ] 7a. Choreography — DOSSIER — design.md §9.5
      Scope: `sections/about.js`. The section-header reveal (index, rule, heading chars) as a
      reusable helper that 7b, 8a and 9b call. The helper also applies the headings' §3.7 depth
      (n=0: 4 px pointer, 16 px scroll) through 5b's module, so all four sections get it. The three
      body wipes; principles strip; fact-plate border (four DrawSVG segments), rows, leaders
      drawn L→R (§6.4), value wipes, sheen; plate parallax, scroll (±22.6 px) and pointer (5.66 px).
      Done when: DOSSIER animates per §9.5's tables; body copy never parallaxes; no resting text
      below the dim floor; toggle reverts cleanly.

- [ ] 7b. LATTICE — design.md §6.5 (geometry), §9.6
      Scope: lattice coordinates in `sections/stack.js` resolved to px (pitch 88 px desktop, 62 px
      tablet), the edge SVG (`pathLength="100"`, 30°/150°/90° only), absolute placement on top of
      CP3's markup — the four-column layout stays for `s`, no-JS and no-WebGL. Growth (BFS order,
      origin-at-edge-start nodes), hover/focus dim-and-highlight, cluster readout, reduced/LOW
      branch. Feed the resolved cluster-root positions to 6b's branch-roots setter (§7.5), on every
      resize. Arrow-key traversal (§9.6) is **optional and deferred** — build only if time remains.
      Done when: every edge sits on a permitted axis; hover never dims a label below 0.60; keyboard
      focus matches hover; `s` breakpoint shows the columns with no edges.

- [ ] 8a. WORKS pin — design.md §6.6 (pinned geometry), §9.7 (pin, entrances, branches)
      Scope: `sections/projects.js`. Flip `.works__viewport` from native scroller to clipped when the pin owns `x`; the pin
      (`invalidateOnRefresh`, function `end`/`x`), `signals.axis` on toggle; card triggers via
      `containerAnimation`; card entrance table incl. title split and chamfer draw; index scramble
      (`util/scramble.js`, 12 fps); bind 6b's horizontal chain mode to the pin's progress; the
      ≤ 900 px vertical-stack branch (cards trigger on vertical position, chain switched back to
      vertical via 6b's API). Cards' §3.7 depth (n=1) through 5b's module; if it fights the
      pinned track, drop it while pinned and log the call. The pin's scroll extent (§6.1, ~310 vh)
      is whatever `D` gives; record the measured value in the log.
      Done when: pin travels 1:1 with scroll and survives resize; each card fires on its own
      horizontal position; chain and cards travel locked; vertical stack works at ≤ 900 px.

- [ ] 8b. WORKS interaction — design.md §9.7 (focus, hover, readout, deep links)
      Scope: **the `onFocusIn` handler** via `setFocusIn()` (resolve **E7**); card deep links (hash naming a card
      jumps the pin); hover lift, border, pointer-following sheen, tag borders; the chain tether
      (HIGH only); progress readout written in `onUpdate`; reduced-motion and LOW-tier branches.
      Done when: tabbing through every card never strands focus off-screen (test manually, every
      card — see SESSIONS.md); progress readout never lags; cards are never scaled; LOW drops
      tether and sheen.

- [ ] 9a. Nav rail — design.md §9.9
      Scope: `sections/nav.js`. Shrink via `toggleClass`, which also drives §6.2's at-rest → compact
      ground, blur and bottom hairline fade. Active indicator per section: a static first placement
      at boot (CP3 hides it as `display: none` while it's still a child of `.rail__nav`), then Flip
      via `late()?.Flip`, plain `appendChild` until the late chunk lands (checkpoint 4's log);
      resolve **E3**'s `power3.out`. The indicator keeps moving under reduced motion — §10.1 lists
      it as feedback, not decoration. Item hover; mobile panel open/
      close with the typed `--sweep` (**as fixed in checkpoint 3's log — the spec's `/ 100%` form
      is invalid**), focus trap, Escape returns focus, `smoother.paused(true)` while open. Panel
      stays a sibling of `.rail`.
      Done when: indicator lands exactly on each item; panel opens/closes with trap and Escape;
      scroll locked while open; indicator works before the late chunk loads.

- [ ] 9b. LINK + colophon + micro-states — design.md §9.8, §9.10
      Scope: `sections/contact.js`. LINK header + row entrances; row hover/focus (MorphSVG glyph
      via `late()?.MorphSVGPlugin` — matched point counts, static until loaded; label, underline,
      value, email chips — resolve **E8**); the loop snap once per visit, calling 6b's `snapFinalLink()` and a
      stage `flash()` hook (the `uExposure` uniform it drives arrives in 10); the LINK section's
      Dossier CTA sheen (§9.8). Colophon reveal (in CP4's `sections/footer.js`). **Every §9.10
      global micro-state** (text-link underline — CP3 authored an SVG rule only for LINK rows, so
      author the underline element for inline text links such as the colophon's `CC BY 3.0` and
      the plate's two links; `.btn--metal`,
      `.btn--ghost`, tag, toggle crossfade). Focus rings already exist (CP2) — do not animate them.
      Done when: glyph morph is clean (no wobble); loop snap and `flash()` fire exactly once per
      visit; every hover state has a `:focus-visible` twin.

- [ ] 10. Post-processing + CAST — design.md §8, §9.3
      Scope: `EffectComposer` + MSAA target, `gl/passes/metal.js`, `OutputPass`, `uStreak` and
      `uVelocity` fed from tier and `signals.velocity` (MED's streak vs "no composer at MED" is
      **E16**); wire 9b's
      `flash()` to `uExposure`; `uAxis` from `signals.axis`; MSAA/streak per tier (§7.7). The §8.5
      grain sheet and the page's background ramp (the §3.7 depth-5 "background gradient sheet",
      parallaxed through 5b's module; never specified — resolve **E18**). **CAST** (`sections/preloader.js`): JS-injected veil only
      when `readyState !== 'complete'`, hard 3 s timeout, weighted progress (fonts/PMREM/me.jpg),
      counter + hairline, the single-link CAST state (§7.5's CAST row; spin ω = 0.6 rad/s, roughness
      polishing 0.60 → 0.12 across progress), the SVG-mask exit that takes over the start of 5b's
      hero timeline at 5τ; §9.1 boot step 6. Resolve **E17**: CAST with no stage, under reduced
      motion, and before the tier probe resolves.
      Done when: silver reads as brushed metal, no banding in dark ramps; `uAxis` flips during the
      WORKS pin; exposure flash visible once on the LINK snap; MED/LOW drop the composer; CAST never
      outlives 3 s, never appears on a cached reload that is already complete, never exists with JS
      off; draw calls still ≤ 3.

- [ ] 11a. Degradation — design.md §10.1–10.3, §10.5
      Scope: audit §10.1's reduced table against every section built so far and fill gaps; verify
      §10.2's forced LOW/NONE rules on real conditions; the NONE-tier CSS fallback (silver-sheet
      radial + static inline-SVG chain strip — resolve **E19**); §10.5 reduced-transparency and forced-colours blocks
      (extend CP3's additions; resolve **E10**). Styling keyed off CP4's `<html data-motion>`.
      Done when: no-JS, no-WebGL, reduced-motion and LOW all render complete, readable, deliberate
      pages; forced colours is a plain readable document.

- [ ] 11b. A11y, SEO & final audit — design.md §10.4, §11, §12.7, §14, cross-cutting rules
      Scope: every §10.4 row verified (focus ring audited, not rewritten), including 200 % zoom; the
      rest of §11 — canonical, OG/Twitter, JSON-LD, `apple-touch-icon`, `public/assets/favicon.svg`
      (the rail's chain mark); §14 item 1 (`og.png` — flag if no asset, keep `me.jpg` fallback),
      items 2–3 left as the spec handles them; full §12.7 budget table measured, with transfer sizes
      taken under Caddy's actual `zstd` encoding (checkpoint 4's log); §6.1's scroll extents
      measured against the ≈ 810 vh total; the **cross-cutting audit** (see map); the spec-text
      errata **E5, E6, E11, E12, E13, E14, E21** fixed in design.md.
      Done when: every §10.4 row verified; Lighthouse a11y ≥ 95; every §12.7 budget met or logged;
      cross-cutting audit clean or logged; every Errata row is marked resolved.

## Ownership map

Every `##`/`###` heading of design.md, with the checkpoint that owns it. "Done" means an earlier
checkpoint already built it; its log is the record. A row split across checkpoints names each part.
Chapter headings (§1–§10, §12) are owned through their subsections — their intro prose adds no
requirement of its own (§7's "everything lives in `js/gl/`" → 6a/6b; §9's "every animation in
multiples of `T`" → cross-cutting).

**Cross-cutting rules — every checkpoint obeys them for the code it adds; 11b owns the final
audit:** §1.3 invariants I1–I3 (re-verify no-JS at every checkpoint, per SESSIONS.md), §1.4
non-goals, §3.5 beat grid (durations as `n * T` / `var(--beat-n)`) and staggers, §3.6 angle
whitelist, §4.1 no colour outside the palette, §4.3 dim floor, §4.4 colour/blue budget, §5.3
`tabular-nums` on every mono number, §5.4 never `letter-spacing` and `wdth` on one element at once,
§9.1 `will-change` hygiene, §9.2 easing whitelist + scrubs are `none` (and whatever rule **E-ease**
settles for a "—"), §10.1 every animation ships its reduced-motion branch, §10.4 ≥ 44 px targets and
a `:focus-visible` twin for every hover, §12.7 budgets for whatever chunk the checkpoint grows, and
checkpoint 4's rule: **ScrollTriggers are created only inside a registered branch, never at module
level.**

**Pre-split numbers.** Checkpoint 1–4 logs and code comments use the old numbering. Read them as:
5 → 5a (fonts, splits) / 5b (hero); 6 → 6a (tier, `getSmoother()` in the guard) / 6b; 7 → 7a / 7b;
8 → 8a (pin) / 8b (`setFocusIn`); 9 → 9a (panel, `paused`) / 9b; 11 → 11a (`data-motion`, degradation)
/ 11b (focus-ring audit, favicon, zstd).

| design.md | Owner |
|---|---|
| §1.1 What this page is · §1.2 Aesthetic thesis | narrative — no implementation; realised by all |
| §1.3 Readability invariants · §1.4 Non-goals | cross-cutting (above) → 11b audit; I1's wording → E6, §1.4's § ref → E11 |
| §2.1 Content that moves | 3 (every copy/markup row) · 1 (CV, LICENSE, README, Caddyfile/Dockerfile/.dockerignore rows) · 11b (`og:image` source) — done except 11b |
| §2.2 Content retired on purpose | 1 (`@notData`) · 3 (blobs, particles, `.reveal`, `theme-dark`, `.accent`, Google Fonts link, `.blob-3`) — done |
| §2.3 Anchor migration | 3 (map) · 4 (moved to `main.js`, smoother hash resolution) — done; card deep links → 8b |
| §3.1 Why √2 · §3.2 Type scale · §3.3 Spacing · §3.4 Grid and measure · §3.6 Fixed angles | 2 — done; §3.4's asymmetry rule for the chain → 6b; spec slips → E12 (§3.2), E14 (§3.4) |
| §3.5 Beat grid | 2 (`--beat*`) · 4 (`T`) — done; usage cross-cutting |
| §3.7 Parallax depths | 2 (tokens, done) · 5b (depth module; name, portrait) · 7a (headings via the header helper; plate) · 8a (cards) · 6b (chain fore/mid) · 10 (background sheet) |
| §4.1 Palette · §4.2 Silver gradient tokens · §4.3 Contrast and the dim floor | 2 — done; §4.1's no-other-colour rule and §4.3's dim floor are also cross-cutting; §4.3's luminance misprint → E12; §4.2's sheen § ref → E21 |
| §4.4 Colour budget | cross-cutting → 11b audit |
| §5.1 Families | 2 (stacks, done) · 5a (axis-range check at install); wrong § ref → E11 |
| §5.2 Self-hosting | 5a (incl. E2, full subset) |
| §5.3 Roles | 3 — done |
| §5.4 Animating the width axis | 5a (mechanism) · used by 5b, 7a, 7b, 8a, 9a, 9b |
| §6.1 Overview / DOM shell | 3 — done · scroll extents: 8a (pin) · 11b (measured) · chain-state column → §7.5 owners |
| §6.2 Navigation rail | 3 (markup, CSS, done) · 9a (shrink, ground/hairline fade, indicator) |
| §6.3 IDENTITY | 3 (markup, copy, aperture CSS, done) · 5b (animation) |
| §6.4 DOSSIER | 3 — done |
| §6.5 LATTICE | 3 (columns markup, fallback, done) · 7b (geometry, coordinates, edges); node-label colour → E5 |
| §6.6 WORKS | 3 (markup, copy, native-scroll no-JS, done) · 8a (pinned geometry) · 8b (readout, linking behaviour) |
| §6.7 LINK · §6.8 Colophon | 3 (markup, copy, done) · 4 (year, toggle, tier readout, done) |
| §7.1 Stage · §7.2 Catenary · §7.3 Links · §7.4 Material · §7.6 Guard | 6a (§7.3's degenerate-tangent guard → 6b, it fires only at the loop top) |
| §7.5 Per-movement choreography | 6b (IDENTITY → colophon rows, incl. E9, E15; branch-roots setter) · 7b (feeds lattice-resolved roots) · 8a (bind WORKS row to pin, ≤ 900 px return to vertical) · 9b (trigger loop snap) · 10 (CAST row) |
| §7.7 Performance | 6a (DPR, links, clearcoat) · 10 (MSAA, post, incl. E16) · 8b (tethers) |
| §8.1 Pass chain · §8.2 Metal pass · §8.3 Why these four · §8.4 Exposure flash | 10 (§8.4's trigger → 9b; §8.1's MED/LOW `antialias` depends on 6a's renderer decision; MED streak vs no composer → E16) |
| §8.5 CSS grain sheet | 10 (plus the background ramp, incl. E18) |
| §9.1 Global rig | 4 — done, except: step 1 tier probe → 6a · step 3 splits → 5a · step 6 veil → 10 · "one clock" → 6a · depth module → 5b · `axis` signal set by 8a · `will-change` cross-cutting |
| §9.2 Named easings | 4 — done; usage cross-cutting; off-list eases elsewhere → E3, E4, E15, E-ease; unused `catenary` → E22 (6a) |
| §9.3 CAST | 10 (incl. E17) |
| §9.4 IDENTITY | 5a (split config, width-morph mechanism) · 5b (everything else, incl. E3/E4/E-ease/E20; pointer parallax for chain → 6b, background → 10) · 10 (start at CAST 5τ) |
| §9.5 DOSSIER | 5a (`.wipe` CSS) · 7a (rest; header helper reused by 7b/8a/9b) |
| §9.6 LATTICE | 7b (arrow keys optional/deferred); "4.6:1" → E21 |
| §9.7 WORKS | 8a (pin, entrances, scramble, ≤ 900 px branch) · 8b (focus incl. E7, deep links, hover, tether, readout, reduced/LOW branches) |
| §9.8 LINK | 9b (incl. E8; exposure uniform → 10) |
| §9.9 Navigation rail | 9a (incl. E3's `power3.out`; `--sweep` spec text → E13) |
| §9.10 Colophon + micro-states | 9b (incl. inline text-link underline elements; its missing Ease column → E-ease, 5b) · 4 (motion-toggle mechanics, done) · 2 (focus ring, done) |
| §10.1 Motion preference | 4 (resolution, done) · each checkpoint's reduced branch (cross-cutting; nav indicator row → 9a) · chain row → 6a via E1 · 11a audit |
| §10.2 Quality tiers | 6a (incl. E1) · 11a verification |
| §10.3 No-JS / no-WebGL | 3 (baseline, done) · 5a (`motion.css` rule) · 11a (NONE fallback, incl. E19) |
| §10.4 Accessibility | 2/3 (focus ring, targets, done) · 5a (split text, re-split safety rows) · 11b audit; `focusin` wording → E7 |
| §10.5 Forced colours / transparency | 3 (partial, done) · 11a (incl. E10) |
| §11 SEO and metadata | 3 (title, description, theme-color, done) · 1 (`robots.txt`, done) · 11b (canonical, OG/Twitter, JSON-LD, favicon, apple-touch-icon) |
| §12.1 Dependencies · §12.2 Source layout · §12.3 Dockerfile · §12.4 .dockerignore · §12.5 Caddyfile · §12.6 Housekeeping | 1 — done; §12.2's files are created by the checkpoint whose scope names them — `motion.css`, `split.js` 5a · `hero.js` 5b · `tiers.js`, `stage.js`, `chain.js`, `rect.js` 6a · `lattice.js` 6b · `about.js` 7a · `stack.js` 7b · `projects.js`, `scramble.js` 8a · `nav.js` 9a · `contact.js` 9b · `preloader.js`, `metal.js` 10 · `favicon.svg`, `og.png` 11b · fonts 5a · the rest 1–4 (done). Spec-text slips → E11, E13 |
| §12.7 Performance budget | cross-cutting · 5a (fonts, CLS via fallback metrics) · 5b (LCP) · 6a (three chunk, canvas fade-in, draw calls) · 11b full audit (zstd transfer) |
| §13 Implementation order | superseded by this checklist (see note in design.md §13) |
| §14 Open items | 11b (items 1–3; item 4 closed by 3) |
| Appendix | reference only |

## Errata

Places where design.md contradicts itself or its own code, so neither side of the conflict has an
owner until it is assigned here. The owning checkpoint's session puts the row to the user at kickoff
and gets a decision; no session raises or resolves another checkpoint's rows (SESSIONS.md,
**Errata**). It then implements the decision, logs it, and **corrects design.md's text**, removing
the marker (a spec-text-only row just needs the text corrected). Then it marks the row resolved. design.md marks each spot `(errata E#)`. 11b cannot close until every row is
resolved.

| # | design.md | Contradiction | Owner | Status |
|---|---|---|---|---|
| E1 | §10.1 vs §10.2 | Reduced motion: "one static frame rendered, then the ticker callback is removed" vs "forced to `NONE` when `signals.motion === 'reduced'`", which removes the canvas | 6a | open |
| E2 | §5.2 vs §12.2 | Fonts "in `src/fonts/`, imported from CSS so Vite fingerprints them" vs `public/fonts/*-v1.woff2`, deliberately unhashed. 5a's scope already follows §12.2 | 5a | open |
| E3 | §9.2 vs §9.9, §9.4, §7.2 | "Nothing else is used anywhere", yet: Flip `ease: 'power3.out'` (§9.9), idle breathing `ease: 'sine.inOut'` (§9.4), ripple "power2.out envelope" (§7.2) | 9a · 5b · 6a respectively | open |
| E-ease | §9.4–§9.8 tables | An Ease column of "—" (button labels, scroll cue, section index, plate row labels, node labels, colophon rows) is undefined, and §9.10's micro-state table has no Ease column at all (CSS transitions, so the rule must also give `cubic-bezier` forms, as §9.9 does for `ease.metal`); GSAP's default `power1.out` is not on the §9.2 list. Settle the rule once (`none`, or a `gsap.defaults` ease); it is cross-cutting after that | 5b | open |
| E4 | §9.2 vs §9.4 scroll-out | "Scrubbed animations always use `ease: 'none'`", but the scroll-out is scrubbed and gives the aperture ease `shut` | 5b | open |
| E5 | §6.5 vs §5.3 / §4.3 | Node label "mono label in `--silver`" vs `--silver-light` (dimmable, AA at the floor). Code already follows §5.3 (`components.css`, `.node__label`) | 11b (text) | resolved in code by 3 |
| E6 | §1.3 I1 | "The only text JS writes is the copyright year and the diagnostic tier readout", but the CAST counter, card index scramble, WORKS progress label and lattice cluster readout also write text. Reword to what I1 means: JS never supplies *content* | 11b (text) | open |
| E7 | §10.4 vs §9.7 | "the WORKS pin's `focusin` handler" vs "Do not add a `focusin` listener", i.e. use the smoother's `onFocusIn` | 8b | open |
| E8 | §9.8 | Email chips `scale 0.9→1, opacity 0→1` on row hover imply hidden chips at rest: unreachable on touch and invisible without hover, against I1/I3 and CP3's "nothing hides content" | 9b | open |
| E9 | §7.5 × §6.5 | The LATTICE chain branch terminates at cluster root nodes, but at `s` the lattice is four plain columns with no edges; the chain's behaviour there is unspecified | 6b | open |
| E10 | §10.5 | Block targets a `.hairline` class that does not exist, and `.card { backdrop-filter: none }` although cards have none | 11a | open |
| E11 | §1.4, §5.1, §12.1 | Wrong references: §1.4 "one pinned section (§6.5)" → §6.6; §5.1 "animation targets in §9.3" → §9.4; §12.1 "Three addons" lists five | 11b (text) | open |
| E12 | §4.3, §3.2 | `--void`/`--graphite` luminances misprinted (0.0043/0.0094 → 0.0040/0.0108); `--t-5` 38.06 → 38.05 (checkpoint 2's log) | 11b (text) | resolved in code by 2 |
| E13 | §9.9, §12.2 | `--sweep / 100%` is invalid CSS (checkpoint 3's log); `manualChunks` object form fails under vite 8 (checkpoint 1's log) | 11b (text) | resolved in code by 1, 3 |
| E14 | §3.4 | "These three numbers match the existing CSS breakpoints" is false: the old sheet had 768/900, no 640 (checkpoint 2's log) | 11b (text) | open |
| E15 | §7.5 vs §9.2 | The `X` migration is "a scrubbed GSAP tween … `ease.metal`", but "scrubbed animations always use `ease: 'none'`". E4 covers only §9.4's scroll-out | 6b | open |
| E16 | §7.7, §8.2 vs §8.1 | MED tier lists "Post: streak taps 3" and `uStreak` "0.6 MED", but §8.1 drops the composer entirely at MED and LOW, so no pass exists for the streak to run in; the shader also has no tap-count parameter | 10 | open |
| E17 | §9.3 × §10.1, §10.2, §7.7 | CAST shows "the single spinning link from the WebGL stage", but its behaviour with no stage (tier NONE, WebGL failure, reduced motion forced to NONE per E1) and its exit under reduced motion are unspecified. The tier probe runs *after* first paint while CAST renders *from* it, and no rule says which tier's parameters apply until the probe resolves | 10 (with 6a's renderer decision) | open |
| E18 | §8.5, §3.7 | "The page's background ramp" / the depth-5 "background gradient sheet" is referenced but never specified: no gradient, stops, angle or element | 10 | open |
| E19 | §10.3 | NONE fallback uses "a `--silver-sheet` radial", but `--silver-sheet` is a 168° linear gradient, so the radial form is undefined; the static chain strip is "positioned where the spine would run", but the spine's `X` changes per movement | 11a | open |
| E20 | §9.4 × §6.3 | The entrance table animates a "role hairline" and §6.3's wireframe draws one, but §6.3's markup has no such element, and neither does CP3's `index.html` | 5b | open |
| E21 | §9.6, §4.2 | Spec-text slips outside E11/E12: §9.6's dimmed labels at "4.6:1" vs §4.3's 4.96:1 on `--void` (the nodes' ground); §4.2's `--silver-sheen` "animated via background-position (§9.4)", but §9.4 has no sheen (§9.5/§9.7/§9.8 do) | 11b (text) | open |
| E22 | §9.2 | The `catenary` ease ("chain slack relaxation only") has no consumer: sag reads velocity directly with no tween (§7.2) and nothing in §7/§9 names it. Give it one or strike it from §9.2 | 6a | open |

## Log

**Note on commit hashes.** A commit cannot contain its own hash, so entries identify their
commit by subject line (`git log --grep`). Same convention for every checkpoint from here on.

### Checkpoint 1 — Scaffold & build config

**2026-09-27** · commit `refactor(webpage): checkpoint 1 — scaffold & build config`

**Deviation from design.md §12.2 — `manualChunks`.** The spec's object form
`manualChunks: { three: ['three'] }` is invalid under the pinned `vite@8.3.1`, which is
Rolldown-based: the build fails with `TypeError: manualChunks is not a function` (plus
`Invalid type: Expected Function but received Object`). Replaced with the equivalent predicate,
which is what Rolldown accepts:

```js
manualChunks: (id) => (/node_modules[\\/]three[\\/]/.test(id) ? 'three' : undefined),
```

Verified as more than a syntax fix: with a temporary probe module importing `three`, the build
emits `dist/_/three-<hash>.js` at **131 kB gzipped** alongside a 0.45 kB entry chunk — the split
§12.2 asks for, inside §12.7's ≤ 180 KB `three` budget. The probe was removed before committing,
so **checkpoint 6 is the first checkpoint where this config does anything**; the working form is
already in `vite.config.js` with a comment recording why it deviates. Note also that vite 8 calls
the option `build.rolldownOptions` in its own diagnostics, though `rollupOptions` is still accepted.

**Confirmed against the registry, not assumed:** `gsap@3.15.0`, `three@0.186.1` and `vite@8.3.1`
all publish. Local Node is v26.10.0, satisfying vite 8.3.1's `engines` (`^20.19.0 || >=22.12.0`).

**Confirmed §12.3's healthcheck claim:** `caddy:2-alpine` ships curl 8.22.0 at `/usr/bin/curl`, and
`curl -f http://localhost:5005` succeeds inside the built container — so `docker-compose.yaml` needs
no change, as the spec says.

**Verified end to end** by running the built image: `/`, `/files/Yesaulov_CV.pdf`, `/LICENSE.txt`,
`/assets/me.jpg`, `/robots.txt` → 200 (the CV's sha256 is byte-identical after the move into
`public/`); `/Caddyfile`, `/Dockerfile`, `/.env`, `/hidden/*` → 403, so the security block survived
the Caddyfile rewrite intact; `/` returns `Content-Encoding: gzip` and `Cache-Control: no-cache`,
`/files/*` 86400, `/assets/*` 604800; `X-Content-Type-Options` and `Referrer-Policy` present and
`Server` stripped. The final image contains only `dist` + `Caddyfile` — no `node_modules`, no `src`,
no `design.md`.

**Carried forward to checkpoint 3:** `style.css` and `script.js` are still at the repo root. The
placeholder `index.html` references neither, and §12.2's layout has no place for them, but deleting
them belongs with the rewrite that replaces them. Checkpoint 3 should remove both when it writes the
real `index.html` — and note `index.html` as it stands is a deliberate placeholder, to be replaced
wholesale, not edited.

**Cosmetic, deliberately not fixed:** `caddy validate` reports `Valid configuration` but warns the
Caddyfile "is not formatted". `caddy fmt` wants to strip §12.5's column alignment and move the
pre-existing inline comment off the `:5005 {` line. Left as design.md writes it; the warning is
expected, not a regression.

**Still unprovided (not blocking, owned by later checkpoints):** `public/fonts/*.woff2` (§5.2),
`public/assets/favicon.svg` and `public/assets/og.png` (§11, §14 item 1). `public/` currently holds
only `files/`, `assets/me.jpg`, `LICENSE.txt` and `robots.txt`.

### Checkpoint 2 — Design tokens + base/layout CSS

**2026-09-27** · commit `refactor(webpage): checkpoint 2 — design tokens + base/layout CSS`

**The layout API checkpoint 3 must build against.** design.md §6's markup carries no layout
classes, so `layout.css` had to name them. Six classes, and nothing later should invent more:

| Class | Meaning |
|---|---|
| `.col-left` | grid columns 2–8 (§3.4 asymmetry, left phase) |
| `.col-right` | grid columns 5–12 (right phase) |
| `.col-aside` | grid columns 9–12 — the hero portrait slot per §6.3's diagram |
| `.col-full` | full bleed, `1 / -1` |
| `.measure` | `min(66ch, 704px)` body-copy cap (§3.4) |
| `.track` | `--container-wide: 1568px`, the one wide exception (§6.6) |

The grid itself is on `main > section` (also available as `.shell` for the `<footer>`), so a
section needs no wrapper div. All four `.col-*` collapse to full width at ≤ 900px. Shell
selectors `#stage`, `.grain`, `#smooth-wrapper`, `#smooth-content`, `.rail`, `.skip` and the
`.sr-only` / `.silver-type` utilities are already styled positionally, matching §6.1's markup
verbatim.

**Verified numerically, not by eye.** A scratch WCAG/arithmetic script reproduced every table in
§3.2, §3.3, §3.5, §3.7, §4.1 and §4.3 against the literals in `tokens.css`: all twelve type steps,
the seven spacing steps, the beat multiples, the parallax amplitudes, all eleven hexes, the seven
ratios against `--ink`, the `--void`/`--graphite` columns (including `--silver-shadow` at exactly
3.70:1, which is why it may never carry small text), the three dim-floor composites (4.95 / 4.96 /
4.72:1) and the gradient claims (`--silver-sheet` 4.32:1 at 38 %, 1.95:1 at 100 %; `--silver-fill`
worst stop 8.00:1). Every value matches the spec.

**Two spec slips found by that check, neither acted on:**

1. **§4.3's stated luminances for `--void` and `--graphite` are wrong** — 0.0043 and 0.0094, where
   the hexes actually give 0.0040 and 0.0108. Every *ratio* §4.3 quotes is right and matches the
   real luminances, so the hexes are authoritative and only the two luminance figures are
   misprinted. `--ink` (0.0021) is correct.
2. **§3.2's `--t-5` is printed as 38.06 px**; `16·2^(5/4)` is 38.0546 → 38.05. The token is
   declared as `2.3784rem` (the exact value); the scale rounds, the spec's table does not. `--t-5`
   has no assigned use, so nothing depends on it.

**Deliberate scope decisions, all recorded here rather than left implicit:**

- **Typographic roles (§5.3) are *not* in these sheets** — they belong to `components.css` in
  checkpoint 3. `base.css` sets element defaults only (body = Inter/`--t-0`/`--silver-light`,
  headings = Archivo/`--chrome`), which is what those roles are exceptions to.
- **No `@font-face`.** §5.2 is unowned by any checkpoint and the `woff2` files still do not exist
  (see checkpoint 1's log). `tokens.css` declares the three §5.1 stacks, so the page currently
  renders in the fallbacks — Arial Narrow / system-ui / ui-monospace. Whoever lands §5.2 adds the
  `@font-face` blocks and `public/fonts/*-v1.woff2`; no token changes are needed for it.
  **Note for checkpoint 5:** the hero's width-axis morph is inert until then, because no fallback
  in the display stack has a `wdth` axis.
- **The §10.4 focus ring is pulled in early** (2 px `--blue-lift` outline, 2 px offset, 1 px
  `--ink` inset ring). §10.4 is checkpoint 11's section, but shipping a base sheet without a focus
  style would make checkpoint 3's static page an accessibility regression the moment it lands.
  Checkpoint 11 should audit it rather than write it.
- **`::selection` is `--chrome` ground with `--ink` text** (16.85:1). `--blue` with `--chrome`
  measures 4.39:1 and fails AA; `--blue` with `--white` passes at 5.25:1 but spends the §4.4 blue
  budget and stretches `--white`'s "specular clip only" role. Silver-on-silver costs nothing.
- **`--beat-1 … --beat-21`** were added alongside `--beat` so CSS transitions can be written as
  `var(--beat-3)` rather than `0.36s`, which is the CSS counterpart of §3.5's `5 * T` rule for JS.
- **Three non-palette hexes appear in `tokens.css`** — `#8A9199`, `#9DA4AB`, `#B4BAC0` — solely as
  intermediate stops inside the §4.2 gradient definitions, transcribed from the spec's own code
  block. They are not tokens and must not be used as colours anywhere else. Apart from these, a
  grep confirms every hex, `rgba()` and angle in `src/css/` is either a §4.1 token, a
  palette-derived hairline/sheen, or one of §3.6's eight permitted angles (`180deg` on
  `--silver-text` is orthogonal, which §3.6 does not govern).

**§3.4's breakpoint claim is only two-thirds true.** It says 640 / 900 / 1280 "match the existing
CSS breakpoints so nothing regresses silently"; the old `style.css` actually uses 900 px and
768 px, with no 640 px breakpoint at all. The spec's own three numbers are implemented as written —
the old 768 px breakpoint dies with `style.css` in checkpoint 3 — but the reassurance in that
sentence should not be relied on when the old page's behaviour is being compared.

**Verified end to end:** `npm run build` succeeds; Vite concatenates the three sheets into a single
5.37 kB (2.11 kB gzipped) `dist/_/index-*.css` **in link order** (tokens → base → layout), which is
the loading pattern checkpoint 3 inherits when it adds `components.css`. `dist/index.html` contains
**zero `<script>` tags** and both load-bearing links (`/files/Yesaulov_CV.pdf`, `/LICENSE.txt`)
still resolve — the I1/I3 baseline holds trivially at this checkpoint, since there is no JS at all.
Headless Firefox at 1440 / 1280 / 900 / 640 px confirms the grid: 12 columns, 24 px gutters, 40 px
margins (24 px at ≤ 640), content alternating 2–8 / 5–12 with the portrait slot on 9–12, measure
capped at 704 px, section rhythm stepping 168 → 104 → 64 px, no horizontal overflow at any width,
and the gradient-text, `--silver-fill` and `--silver-sheet` surfaces all rendering as metal.

**Carried forward to checkpoint 3:** `index.html` is still a placeholder — now one that exercises
the grid, the type ladder and the palette — and is still to be replaced wholesale, along with
deleting the root `style.css` and `script.js` (per checkpoint 1's log). Its `<style>` block is
checkpoint-2 scaffolding with no counterpart in design.md and goes with it. Keep the three `<link>`
elements and their order.

### Checkpoint 3 — Full static HTML + copy + components.css

**2026-09-27** · commit `refactor(webpage): checkpoint 3 — full static HTML + copy + components.css`

`index.html` is now the real page: §6.1's shell, all five `<section>`s plus the colophon, §6.2–6.8's
copy transcribed verbatim, §2.3's hash map as the one inline `<script>`, and §11's `<title>` and
`<meta description>` (the rest of §11 stays with checkpoint 11). `src/css/components.css` carries
§5.3's roles and every component surface. Root `style.css` and `script.js` are deleted, as
checkpoint 1's log required.

**The component API later checkpoints bind to.** §6 gives markup for the rail and the hero only, so
the other four movements had to name their own classes. Everything §9/§10.5 already names is used
as named — `.card`, `.plate`, `.rail__indicator`, `.btn--metal`, `.btn--ghost`, `[data-track]`,
`[data-card]`. New: `.head` / `.head__index` / `.head__rule` / `.head__title` (the three separately
animatable targets §9.5's header table wants, one shape in all four sections), `.principles` +
`.principles__row`, `.plate__frame` / `.plate__row` / `.plate__label` / `.plate__leader` /
`.plate__value`, `.lattice` / `.cluster` / `.cluster__label` / `.node` / `.node__label`,
`.works__viewport` / `.works__track` / `.works__bar` / `.works__count` / `.card__link` /
`.card__head` / `.card__index` / `.card__kicker` / `.card__body` / `.card__tags` / `.card__go`,
`.chamfer` (one rule for the card and plate bevels), `.rows` / `.row` / `.row__link` / `.row__index`
/ `.row__label` / `.row__value` / `.row__glyph` / `.row__rule` / `.chip`, `.colophon__col` /
`.colophon__controls` / `.toggle`, and `.tag` / `.mono` / `.meta`. Hooks already in the markup:
`data-split` (`name` / `lines` / `heading` / `title`), `data-role`, `data-portrait`, `data-rail`,
`data-indicator`, `data-nav-toggle`, `data-nav-panel`, `data-lattice`, `data-cluster`,
`data-readout`, `data-works-viewport`, `data-progress-label`, `data-progress-bar`,
`data-motion-toggle`, `data-motion-state`, `data-tier`, and `data-copy` on every copy block the
§7.6 readability guard has to measure.

**Two bugs in design.md's own code, both found by running it, both fixed here:**

1. **§9.9's `--sweep` cannot work as written.** The panel's shear is
   `calc(100vh * tan(15deg) * (var(--sweep) / 100%))`, but CSS math only permits division by a
   *number* — dividing by `100%` makes the declaration invalid at computed-value time, which takes
   the whole `clip-path` with it. Verified: Firefox computes `clip-path: none` on the panel, i.e.
   the sweep would never have clipped anything. `--sweep` is registered as a `<number>` 0–1 instead
   and every use multiplies it back up (`calc(100% - var(--sweep) * 100%)`); the geometry is
   unchanged, and the computed clip-path is now the expected
   `polygon(100% 0px, 0% 0px, calc(0% - 187.55px) 100%, 100% 100%)` at full open on a 700px
   viewport. `tan(var(--angle-panel))` resolves, so the 15° literal stays in tokens.css.
2. **The panel may not be a child of `.rail`.** `backdrop-filter` on `.rail.is-compact` makes the
   rail a containing block for fixed-position descendants, so `position: fixed; inset: 0` on a
   nested `.rail__panel` resolves against the 56px bar, not the viewport — measured at 208px tall
   instead of 700. The panel is now a sibling of `<header class="rail">` (still outside
   `#smooth-content`) at `z-index: calc(var(--z-rail) - 1)`: over the content, under the bar, so the
   toggle stays hittable. Checkpoint 9 should keep it there.

**Decisions where design.md is silent, all deliberate:**

- **WORKS with no JS.** §6.6 describes only the pinned state and §9.7 branches only on width and
  motion preference, so "JS dead on a desktop viewport" was unowned. `.works__viewport` is a native
  horizontal scroller (`overflow-x: auto`, `scroll-snap-type: x proximity`) — all four cards are
  reachable without a line of JS (I3), and the geometry is exactly the one the pin inherits.
  **Checkpoint 8 must flip the viewport to clipped when it takes over `x`**, or the browser's own
  scroll will fight the pin. ≤900px is the plain vertical stack §9.7's branch table asks for.
- **The colophon's two JS-written strings.** `<span id="year">2026</span>` ships with the year in
  it — §1.3 allows JS to write it, but with JS dead an empty span reads "© Leonid Yesaulov". JS
  overwrites it either way. `TIER · —` is the placeholder for §10.2's probe.
- **`@media (scripting: none)`** hides the motion toggle and tier readout (a control that controls
  nothing is worse than an absent one) and the panel + its toggle, restoring the rail's `DOSSIER`
  CTA on mobile in that case. Every section stays reachable by scrolling. Verified in Firefox with
  `javascript.enabled=false`: the colophon renders its two columns without the control row.
- **Lattice ships as the four labelled columns.** §6.5 makes that the `s`-breakpoint layout and the
  no-WebGL fallback; since node positions are lattice coordinates resolved in `js/sections/stack.js`
  at runtime, it is also necessarily the no-JS layout. All 22 nodes are `<button>`s with their
  labels in the served HTML. **Checkpoint 6/7 adds the coordinates, the edge SVG and the absolute
  placement on top of this markup** — it should not need to change the DOM.
- **The plate's border is `.plate__frame`, not a CSS border.** Both would read as a doubled
  hairline, and §9.5 draws the frame as four segments anyway. Its stroke is 2px with
  `vector-effect: non-scaling-stroke`, which renders as 1px because half of a centred stroke falls
  outside the clip. The 45° bevel itself is `.chamfer`, a hairline lying on the clip-path's cut —
  shared by the plate and all four cards, whose `d` is `M0 0 L24 24` (the diagonal runs top-left to
  bottom-right in the 24×24 corner box; the mirrored path draws a line *into* the card).
- **Principles strip is two authored rows at `--t--2`.** §6.4 prints two specific rows; left to
  `flex-wrap` at `--t--1` the first row breaks after "READABLE CODE" inside the 5–9 column. Set at
  the plate-label size, both rows fit as printed. Separators are trailing (`li:not(:last-child)`),
  so a wrap never starts a line with a lone `·`.
- **`.rail__nav ul` and `.rail__panel ul` needed an explicit `list-style: none`** — base.css only
  resets `ul[class]`, and §6.2's markup puts no class on those two lists. They shipped with bullets
  until this was caught.
- **`.rail__indicator` is `display: none` while it is still a child of `.rail__nav`.** Authored at
  `width: 100%` per §9.9 it is a full-width blue bar under the whole nav until Flip parents it to an
  item — which would also blow §4.4's blue budget at rest. `.rail__nav li` is `position: relative`
  so it lands correctly once moved.
- **Hero name wraps by `max-width: min-content`**, giving §6.3's two lines (LEONID / YESAULOV)
  without a `<br>` that SplitText would have to reason about.
- **44px target floor** (§10.4) is applied as `min-height` on the rail mark, nav items, panel items,
  both button variants, the hero cue, the motion toggle, nodes and chips. Inline links inside a
  sentence — `CC BY 3.0` in the colophon, the plate's two links — are left at text size under
  WCAG 2.5.8's inline exception.
- `.rail`'s ground uses `color-mix(in srgb, var(--void) 72%, transparent)` rather than the raw
  `rgba(10,13,18,0.72)`, so no palette channel is duplicated outside tokens.css. A grep for hexes,
  `rgba()` and angles in `components.css` now returns **nothing at all**.
- **Nothing in this sheet hides content.** The only invisible things are decoration: the closed link
  glyph, the blue hover underline, the progress bar's `scaleX(0)` fill, and the collapsed panel.
  Entrance states (opacity 0, the 102° `.wipe`, DrawSVG offsets) stay unwritten until motion.css
  under `@media (scripting: enabled)` (§10.3).

**Verified, at the final build:**

- `npm run build` succeeds. `dist/_/index-*.css` is 19.8 kB / **4.90 kB gzipped** — the four sheets
  concatenated in link order, inside §12.7's ≤ 14 KB budget. `dist/index.html` is 5.92 kB gzipped.
- **I1/I3:** `dist/index.html` contains exactly **one** `<script>` (the hash map) and **zero**
  `<style>` blocks. Every paragraph, card body, plate value and copy line of §6.2–6.8 matches the
  spec **character for character** after whitespace normalisation (checked programmatically, not by
  eye). Rendered in Firefox with `javascript.enabled=false` at 1440/900/640: complete, styled, and
  nothing clipped or invisible (`hidden-text=0` at all three widths, counting every leaf element
  with text whose computed style is `display:none`, `visibility:hidden` or `opacity:0`).
- **Every row of §2.1 accounted for** — all 27 checked individually against the built HTML,
  including the two restored Omniserv tags (`Docker`, `GitHub Actions`), both mailto intents with
  their exact query strings, the LinkedIn URL, the four `/files/Yesaulov_CV.pdf` references (rail,
  panel, hero, LINK) and `/LICENSE.txt`. All eight original badges survive as lattice nodes
  (`Linux` → `Linux (Arch, Debian)`), 22 nodes in the four clusters §6.5 lists.
- **Layout at 1440/1280/900/640:** no horizontal page overflow at any width; 12 tracks, 24px
  gutters, 40/24px margins; hero on cols 2–8 with the portrait at 9–12 (x=1074, w=240 at 1440),
  DOSSIER copy on 5–9 (x=522, w=486) with the plate nested at 10–12 (x=1032, w=282); both collapse
  to full width at ≤900, where the plate drops below the copy. Hero name renders two lines at 128px.
- **A11y:** heading order is `H1 H2 H2 H3×4 H2 H3×4 H2` with no skips; every `section
  aria-labelledby` resolves; **no interactive element measures under 44×44** at any of the three
  widths; the §10.4 focus ring reads clearly on the `--silver-fill` CTA (the 1px `--ink` inset ring
  is what separates it from the metal). The mobile panel is `inert` and `visibility: hidden` at
  rest — confirmed not reachable.
- **Forced colours** (`ui.useAccessibilityTheme`): a plain black-on-white document — the metal fill
  drops out, `.silver-type` becomes `CanvasText`, and the plate frame and bevels render as strokes
  in `CanvasText` (added to §10.5's block, which only covered borders).

**Carried forward:** §5.2's `public/fonts/*.woff2` still do not exist, so the page renders in the
fallback stacks (Arial Narrow / system-ui / ui-monospace) — the hero's width-axis morph stays inert
until then (checkpoint 5's note in checkpoint 2's log still stands), and the mono roles are wider
than JetBrains Mono will be. `public/assets/favicon.svg` and `og.png` remain unprovided (§11, §14).
The rail's chain-link mark is two interlocked stadiums authored here; §11's favicon should reuse it.

### Checkpoint 4 — GSAP rig

**2026-09-27** · commit `refactor(webpage): checkpoint 4 — GSAP rig`

`src/js/` exists now. `main.js` boots in §9.1's order (steps 1, 2, 4 and 5 are live; the tier probe,
splits and veil are marked with the checkpoints that own them). `core/easings.js` registers all
seven plugins and defines `T` plus the five §9.2 curves, exported as `ease.{mask,glyph,metal,catenary,shut,chain}`.
`core/signals.js` holds the five §9.1 signals. `core/smoothscroll.js` owns the smoother, hash
resolution and anchors. `core/registry.js` holds the contexts and the matchMedia branches.
`sections/footer.js` covers the year, the motion toggle and the tier readout.
`util/prefers.js` implements §10.1's two inputs, and `util/lerp.js` has `lerp`/`clamp`.
`?debug` lazy-loads `util/debug.js` as a 0.76 kB side chunk, so it's never in the entry. It draws
the overlay and exposes `window.__rig`.

**The API later checkpoints bind to:**

| Hook | For |
|---|---|
| `register({ name, selectors, desktopFull, mobileFull, staticStates })` from `core/registry.js`, called **before** `boot()` (it throws after). `selectors` feed `ScrollTrigger.saveStyles`; each branch runs inside its own `gsap.context()`. | checkpoints 5, 7–9 |
| `signals.{velocity,pointer,axis,tier,motion}`: each is `{ value, set(v), subscribe(fn) }`. Per-frame consumers read `.value` in a ticker callback. `signals.axis.set([1,0])` works as §9.7 writes it. | 6, 8, 10 |
| `signals.tier` is `null` (the colophon reads `—`) until `tiers.js` sets it. The colophon readout is already subscribed. | 6 |
| `setFocusIn(fn)` from `core/smoothscroll.js` plugs §9.7's card handler into the smoother's `onFocusIn` without recreating it. | 8 |
| `getSmoother()`, for `scrollTop()` in the §7.6 guard and `paused(true)` in the §9.9 panel. It is `null` under reduced motion. | 6, 9 |
| `<html data-motion="full|reduced">` for CSS to key reduced-motion styling off. | 11 |

**Deviations from design.md, all deliberate:**

1. **One matchMedia handler dispatches §9.1's three branches, instead of three `mm.add` queries.**
   §10.1 lets the stored toggle override the OS preference in both directions, and a media query
   can't see `localStorage`. The conditions are `{desktop: (min-width: 901px), mobile: (max-width:
   900px), osReduced: (prefers-reduced-motion: reduce)}`. `resolveMotion()` applies the override
   and dispatches to `desktopFull` / `mobileFull` / `staticStates`. matchMedia still owns
   reversion, so an OS or breakpoint change reverts and rebuilds.
2. **§2.3's legacy-hash map moved from the inline `<script>` into `main.js`**, as §2.3 specifies
   and checkpoint 3's comment anticipated. `dist/index.html` now has exactly one `<script>`, the
   module entry. Nothing on the page depends on it for content.
3. **Two files not in §12.2's layout**: `core/registry.js` (the context registry had no home,
   and `footer.js` needs it without a cycle through `main.js`) and `util/debug.js`.
4. **Same-page anchors are resolved through the smoother.** §2.3 only covers the hash at load.
   Verified broken without this: native fragment navigation measures the *transformed* content
   and scrolls the nearest scroll container, which is the `overflow: hidden` `#smooth-wrapper`, not
   the window. A nav click left the wrapper at `scrollTop` 2606 with the smoother still at 0, a
   desync the wheel couldn't recover from. The skip link (whose target is above) didn't move the
   view at all. While a smoother exists, `bindAnchors()` handles three cases:
   - it intercepts same-page `a[href^="#"]` clicks (pushState, `scrollTo(target, true, 'top top')`,
     and focus moved to the target with a temporary `tabindex=-1`)
   - it re-resolves on `hashchange`
   - it folds any stray wrapper scroll (e.g. find-in-page) back into the smoother
   With reduced motion it does nothing, and the browser's own jump runs.

**Bug found and fixed during verification: a ScrollTrigger must not outlive the smoother.** The
velocity trigger was first created once at boot. ScrollSmoother re-initialises existing triggers
onto its `#smooth-wrapper` proxy, and on `kill()` its `ScrollTrigger.scrollerProxy(wrapper)` call
splices `_scrollers` but **never removes the `_proxies` entry** (gsap 3.15.0,
`ScrollTrigger.js:2183`). So after toggling OFF, every refresh called the dead smoother's
`scrollHeight`, which rewrote `body.style.height` and `#smooth-content { overflow: visible }`. The
velocity signal also went dead in reduced mode, because it was bound to a wrapper that no longer
scrolled. The fix is `trackVelocity()`, which the registry calls inside each mode *after*
`createSmoother()`, so the trigger binds to the live scroller and is reverted with that mode's
context. **Every later checkpoint must follow the same rule:** create ScrollTriggers only inside
a registered branch, never at module level. A trigger built before the smoother is re-bound to a
proxy that outlives it.

**Verified**, in headless Firefox 156 (puppeteer-core over WebDriver BiDi) against `vite preview`:
- **Smooth scroll.** Content transform trails scrollY and settles (−959 → −1800 over ~1.3 s at
  `smooth: 1.2`).
- **Signals.** `velocity` is signed (+0.93 / −0.82) and decays to exactly 0 at rest. `pointer`
  reaches the NDC corners (±0.999) and follows the y-up convention. `axis.set([1,0])` shows in the
  overlay. `tier` reads `—` and `motion` reads `full`.
- **Toggle.** Five OFF→ON cycles by keyboard from the colophon at scrollY 3994:
  - Counts stay constant: ScrollTriggers 1 in both modes; global-timeline children 5 ON / 1 OFF.
  - OFF leaves `style` empty on `#smooth-content`, `#smooth-wrapper` and `<body>`, even through a
    forced `refresh()` and a resize.
  - Scroll position and focus are kept; `aria-pressed` and the label follow.
  - The one extra child at first boot (6 vs 5) is the live smoother's paused 1.20 s scrub tween,
    created lazily on the first scroll. It isn't a leak.
- **Motion preference.** A reload respects the stored value. With `ui.prefersReducedMotion=1` and
  nothing stored, motion is `reduced` with no smoother, and the toggle overrides it to `full`.
- **Resize.** Four 900↔1200 crossings are stable (1 trigger, 6 children), and velocity is live at
  900px.
- **Hashes.** Fresh loads of `#about` (→ `#dossier`), `#works` and `#link` land at `top: 0`. Nav
  clicks land exactly, and the wheel works afterwards. The skip link scrolls to the top, focuses
  `#identity`, and the next Tab reaches the hero CTA; the tabindex is removed on blur. Typed hashes
  and back/forward resolve through the smoother.
- **No JS** (`javascript.enabled=false`): all five sections, controls hidden, no inline styles.
  I1/I3 hold.

**Test-harness pitfall, for every later session:** headless Firefox matches `(hover: none)`, so
`ScrollTrigger.isTouch === 1`, and ScrollSmoother then *correctly* disables smoothing (the spec
sets no `smoothTouch`). The wrapper stays `position: relative` and nothing smooths. Launch with
`ui.primaryPointerCapabilities=6` and `ui.allPointerCapabilities=6` (fine + hover) to test as a
desktop.

**§12.7 entry budget — resolved in a follow-up commit** (`refactor(webpage): checkpoint 4 —
lazy-load Flip and MorphSVG, raise entry budget`). As first committed, the entry chunk was **75.6
kB gzipped** against a 40 KB budget. Per-plugin gzip from `gsap/dist/*.min.js`:

| Plugin | gzip | First needed |
|---|---|---|
| core | 28.3 KB | boot |
| ScrollTrigger | 18.0 KB | boot |
| Flip | 9.7 KB | nav indicator after the first section change (§9.9) |
| MorphSVG | 9.6 KB | LINK glyph, last section (§9.8) |
| ScrollSmoother | 5.5 KB | boot |
| CustomEase | 3.7 KB | boot |
| SplitText | 3.7 KB | boot (checkpoint 5) |
| DrawSVG | 2.2 KB | hero, plate, link underlines — early |

Owner decision: raise the budget and keep the entry lean for slow connections (the site is
self-hosted at ~50 Mbps upstream). Flip and MorphSVG moved to `core/late.js`, loaded by
`core/lazy.js` at idle *after* the `load` event. `requestIdleCallback` alone fired at 115 ms, before
`load` at 136 ms, so the chunk would have held up the load event; now it's requested at ~200 ms.

- **Measured:** the entry is **61.7 kB** (Vite gzip), the late chunk **14.6 kB**. Transfer sizes:
  61.0 / 14.5 kB with gzip -6, 63.8 / 15.2 kB with zstd -3.
- **Estimate vs reality:** I estimated the entry at ~56 kB. The shortfall is because the two
  plugins share helpers with core, so moving them saved ~14 kB, not 19.
- **Budget:** set to ≤ 64 KB entry and ≤ 16 KB late (design.md §12.7, §9.1 and §12.2 updated).
  Total JS is ~61 + 131 + 15 ≈ 207 KB, inside 220.
- **Runtime:** verified one request for the late chunk. `Flip.getState`/`Flip.from` work and
  `morphSVG` is registered. Checkpoint 4's full suite re-passes on this build (toggle ×5 clean,
  anchors, OS preference, resize, no-JS).
- **Not changed, noted for checkpoint 11:** Caddy's `encode zstd gzip` prefers zstd, which at
  Caddy's default level is ~4 % *larger* than gzip for these bundles (+2.7 kB on the entry). The
  owner chose to keep §12.5 as written.
- **Flip isn't a tween plugin,** so it never appears in `gsap.plugins`. Test it functionally, not
  by key.

**Known and accepted:** each smoother re-creation leaves one stale `_proxies` pair behind (the
GSAP bug above). That's two array entries per toggle, harmless since lookups hit the newest entry
first.

**Resumed after an interrupted session:** before continuing, the working tree was checked. HEAD was
still checkpoint 3, all nine files were complete, `dist/` post-dated every source edit, and no
stray processes were left. Every result above comes from runs made after the resume, on the final
code.
