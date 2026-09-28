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

- [x] 5a. Fonts + split rig — design.md §5.1 (install check), §5.2, §5.4, §9.1 step 3
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

- [x] 5b. IDENTITY choreography — design.md §9.4 (everything but the split config), §3.7
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

- [x] 6a. Chain core (WebGL) — design.md §7.1–7.4, §7.6, §7.7, §10.2
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

- [x] 6b. Chain movement states — design.md §7.5, §3.7 (chain rows)
      Scope: every row of §7.5 except CAST's preloader behaviour (10): the IDENTITY spine entering
      from the top-left at full `A₀`; scrubbed `X` migrations for IDENTITY → DOSSIER (their ease is
      **E15**: `ease.metal` vs scrubs-are-`none`); the LATTICE four-way branch (`gl/lattice.js`,
      second `InstancedMesh` cross-fade), including what it does at the `s` breakpoint (resolve
      **E9**), with a **branch-roots setter** fed from CP3's column layout for now — 7b re-feeds it
      with the lattice-resolved root positions; the **horizontal mode API**
      (rotation to `y = −0.40·H`, phase driven by an external progress value) for 8a to bind, and
      a way back to vertical for 8a's ≤ 900 px branch (§9.7); the LINK closed 24-link loop (34 links, **E33**) +
      colophon idle, with a `snapFinalLink()` hook for 9b. The degenerate-tangent guard at the
      loop top. The §3.4 asymmetry rule: the spine runs on the unused column side. Chain
      pointer/scroll parallax (foreground n=3, mid n=4) from 5b's depth module.
      Done when: the chain migrates (never cuts) at every boundary; branch terminates at the four
      cluster roots; loop closes and idles; horizontal mode can be driven from a debug slider.

- [x] 7a. Choreography — DOSSIER — design.md §9.5
      Scope: `sections/about.js`. The section-header reveal (index, rule, heading chars) as a
      reusable helper that 7b, 8a and 9b call. The helper also applies the headings' §3.7 depth
      (n=0: 4 px pointer, 16 px scroll) through 5b's module, so all four sections get it. The three
      body wipes; principles strip; fact-plate border (four DrawSVG segments), rows, leaders
      drawn L→R (§6.4), value wipes, sheen; plate parallax, scroll (±22.6 px) and pointer (5.66 px).
      Done when: DOSSIER animates per §9.5's tables; body copy never parallaxes; no resting text
      below the dim floor; toggle reverts cleanly.

- [x] 7b. LATTICE — design.md §6.5 (geometry), §9.6
      Scope: lattice coordinates in `sections/stack.js` resolved to px (pitch 88 px desktop, 62 px
      tablet), the edge SVG (`pathLength="100"`, 30°/150°/90° only), absolute placement on top of
      CP3's markup — the four-column layout stays for `s`, no-JS and no-WebGL. Growth (BFS order,
      origin-at-edge-start nodes — resolve **E25**'s edge part: DrawSVG ignores `pathLength`), hover/focus dim-and-highlight, cluster readout, reduced/LOW
      branch. Feed the resolved cluster-root positions to 6b's branch-roots setter (§7.5), on every
      resize. Arrow-key traversal (§9.6) is **optional and deferred** — build only if time remains.
      Done when: every edge sits on a permitted axis; hover never dims a label below 0.60; keyboard
      focus matches hover; `s` breakpoint shows the columns with no edges.

- [x] 8a. WORKS pin — design.md §6.6 (pinned geometry), §9.7 (pin, entrances, branches)
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

- [x] 8b. WORKS interaction — design.md §9.7 (focus, hover, readout, deep links)
      Scope: **the `onFocusIn` handler** via `setFocusIn()` (resolve **E7**); card deep links (hash naming a card
      jumps the pin); hover lift, border, pointer-following sheen, tag borders; the chain tether
      (HIGH only); progress readout written in `onUpdate`; reduced-motion and LOW-tier branches.
      Done when: tabbing through every card never strands focus off-screen (test manually, every
      card — see SESSIONS.md); progress readout never lags; cards are never scaled; LOW drops
      tether and sheen.

- [x] 9a. Nav rail — design.md §9.9
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
      value — **E8** is moot, the email chips were removed in 8b's session); the loop snap once per visit, calling 6b's `snapFinalLink()` and a
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
      errata **E5, E6, E11, E12, E13, E14, E21** fixed in design.md; **E27** (saveStyles vs media
      changes) and **E28** (CLS from the width morphs) settled.
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
| §6.5 LATTICE | 3 (columns markup, fallback, done) · 7b (geometry, coordinates, edges, incl. E38, E39 — done); node-label colour → E5 |
| §6.6 WORKS | 3 (markup, copy, native-scroll no-JS, done) · 8a (pinned geometry, incl. E41 — done) · 8b (readout, linking behaviour, card ids incl. E44 — done) |
| §6.7 LINK · §6.8 Colophon | 3 (markup, copy, done) · 4 (year, toggle, tier readout, done) |
| §7.1 Stage · §7.2 Catenary · §7.3 Links · §7.4 Material · §7.6 Guard | 6a (§7.3's degenerate-tangent guard → 6b, it fires only at the loop top) |
| §7.5 Per-movement choreography | 6b (IDENTITY → colophon rows, incl. E9, E15, E33, E34; branch-roots setter) · 7b (feeds lattice-resolved roots) · 8a (bind WORKS row to pin, ≤ 900 px return to vertical) · 9b (trigger loop snap) · 10 (CAST row) |
| §7.7 Performance | 6a (DPR, links, clearcoat) · 10 (MSAA, post, incl. E16) · 8b (tethers) |
| §8.1 Pass chain · §8.2 Metal pass · §8.3 Why these four · §8.4 Exposure flash | 10 (§8.4's trigger → 9b; §8.1's MED/LOW `antialias` depends on 6a's renderer decision; MED streak vs no composer → E16) |
| §8.5 CSS grain sheet | 10 (plus the background ramp, incl. E18) |
| §9.1 Global rig | 4 — done, except: step 1 tier probe → 6a · step 3 splits → 5a · step 6 veil → 10 · "one clock" → 6a · depth module → 5b · `axis` signal set by 8a · `will-change` cross-cutting · `saveStyles` → E27 (11b) |
| §9.2 Named easings | 4 — done; usage cross-cutting; off-list eases elsewhere → E3, E4, E15, E-ease; unused `catenary` → E22 (6a) |
| §9.3 CAST | 10 (incl. E17) |
| §9.4 IDENTITY | 5a (split config, width-morph mechanism) · 5b (everything else, incl. E3/E4/E-ease/E20; pointer parallax for chain → 6b, background → 10) · 10 (start at CAST 5τ) |
| §9.5 DOSSIER | 5a (`.wipe` CSS) · 7a (rest, incl. E35, E36, E37's plate part; header helper reused by 7b/8a/9b) |
| §9.6 LATTICE | 7b (done, incl. E25's edges, E40's part; arrow keys deferred, not built); "4.6:1" → E21 |
| §9.7 WORKS | 8a (pin, entrances, scramble, ≤ 900 px branch, incl. E37's card part, E41 — done) · 8b (focus incl. E7, deep links incl. E44, hover incl. E42, tether incl. E43, readout, reduced/LOW branches — done) |
| §9.8 LINK | 9b (E40's row-label part; exposure uniform → 10; E8 moot — chips removed in 8b's session) |
| §9.9 Navigation rail | 9a (incl. E3's `power3.out`, E40's item-hover and panel-item part — done); `--sweep` spec text → E13 |
| §9.10 Colophon + micro-states | 9b (incl. inline text-link underline elements; its missing Ease column → E-ease, 5b) · 4 (motion-toggle mechanics, done) · 2 (focus ring, done) |
| §10.1 Motion preference | 4 (resolution, done) · each checkpoint's reduced branch (cross-cutting; nav indicator row → 9a) · chain row → 6a via E1 · 11a audit |
| §10.2 Quality tiers | 6a (incl. E1) · 11a verification |
| §10.3 No-JS / no-WebGL | 3 (baseline, done) · 5a (`motion.css` rule) · 11a (NONE fallback, incl. E19) |
| §10.4 Accessibility | 2/3 (focus ring, targets, done) · 5a (split text, re-split safety rows) · 8b (focus order row, E7 — done) · 11b audit |
| §10.5 Forced colours / transparency | 3 (partial, done) · 11a (incl. E10) |
| §11 SEO and metadata | 3 (title, description, theme-color, done) · 1 (`robots.txt`, done) · 11b (canonical, OG/Twitter, JSON-LD, favicon, apple-touch-icon) |
| §12.1 Dependencies · §12.2 Source layout · §12.3 Dockerfile · §12.4 .dockerignore · §12.5 Caddyfile · §12.6 Housekeeping | 1 — done; §12.2's files are created by the checkpoint whose scope names them — `motion.css`, `split.js` 5a · `hero.js` 5b · `tiers.js`, `stage.js`, `chain.js`, `rect.js` 6a · `lattice.js` 6b · `tether.js` 8b · `about.js` 7a · `stack.js` 7b · `projects.js`, `scramble.js` 8a · `nav.js` 9a · `contact.js` 9b · `preloader.js`, `metal.js` 10 · `favicon.svg`, `og.png` 11b · fonts 5a · the rest 1–4 (done). Spec-text slips → E11, E13 |
| §12.7 Performance budget | cross-cutting · 5a (fonts, CLS via fallback metrics) · 5b (LCP; entry raised to 66 KB) · CLS vs width morphs → E28 (11b) · 6a (three chunk, canvas fade-in, draw calls) · 6b (total raised to 224 KB) · 7b (total raised to 228 KB) · 8b (total raised to 232 KB) · 11b full audit (zstd transfer) |
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
| E1 | §10.1 vs §10.2 | Reduced motion: "one static frame rendered, then the ticker callback is removed" vs "forced to `NONE` when `signals.motion === 'reduced'`", which removes the canvas | 6a | resolved by 6a — §10.1 wins: the chain is drawn but never animated (no ticker callback), redrawn only on scroll/resize so the guard holds; tier unaffected |
| E2 | §5.2 vs §12.2 | Fonts "in `src/fonts/`, imported from CSS so Vite fingerprints them" vs `public/fonts/*-v1.woff2`, deliberately unhashed. 5a's scope already follows §12.2 | 5a | resolved by 5a — `public/fonts/*-v1.woff2`, unhashed, per §12.2 |
| E3 | §9.2 vs §9.9, §9.4, §7.2 | "Nothing else is used anywhere", yet: Flip `ease: 'power3.out'` (§9.9), idle breathing `ease: 'sine.inOut'` (§9.4), ripple "power2.out envelope" (§7.2) | 9a · 5b · 6a respectively | 5b's part resolved by 5b — breathing is a true sine computed per frame on the ticker, no eased tween; 6a's part resolved by 6a — ripple `env = (1 − τ/1.2)²` computed per frame; resolved by 9a — the indicator Flip uses `mask` |
| E-ease | §9.4–§9.8 tables | An Ease column of "—" (button labels, scroll cue, section index, plate row labels, node labels, colophon rows) is undefined, and §9.10's micro-state table has no Ease column at all (CSS transitions, so the rule must also give `cubic-bezier` forms, as §9.9 does for `ease.metal`); GSAP's default `power1.out` is not on the §9.2 list. Settle the rule once (`none`, or a `gsap.defaults` ease); it is cross-cutting after that | 5b | resolved by 5b — "—" means `glyph`, written out; `gsap.defaults({ ease: 'none' })`; CSS `--ease-mask/glyph/metal` tokens (§9.2), §9.10 gained an Ease column; existing CSS `ease` keywords are converted by their owners (9a, 9b), audited by 11b |
| E4 | §9.2 vs §9.4 scroll-out | "Scrubbed animations always use `ease: 'none'`", but the scroll-out is scrubbed and gives the aperture ease `shut` | 5b | resolved by 5b — scrubs are `none` with no exception; the aperture closes linearly |
| E5 | §6.5 vs §5.3 / §4.3 | Node label "mono label in `--silver`" vs `--silver-light` (dimmable, AA at the floor). Code already follows §5.3 (`components.css`, `.node__label`) | 11b (text) | resolved in code by 3 |
| E6 | §1.3 I1 | "The only text JS writes is the copyright year and the diagnostic tier readout", but the CAST counter, card index scramble, WORKS progress label and lattice cluster readout also write text. Reword to what I1 means: JS never supplies *content* | 11b (text) | open |
| E7 | §10.4 vs §9.7 | "the WORKS pin's `focusin` handler" vs "Do not add a `focusin` listener", i.e. use the smoother's `onFocusIn` | 8b | resolved by 8b — §9.7 wins: the smoother's `onFocusIn` via `setFocusIn()`, no `focusin` listener; §10.4 and §13 reworded |
| E8 | §9.8 | Email chips `scale 0.9→1, opacity 0→1` on row hover imply hidden chips at rest: unreachable on touch and invisible without hover, against I1/I3 and CP3's "nothing hides content" | 9b | resolved by owner decision (8b session) — the chips are removed; row 03 is one `mailto:` row like the others, so there is nothing left to hide |
| E9 | §7.5 × §6.5 | The LATTICE chain branch terminates at cluster root nodes, but at `s` the lattice is four plain columns with no edges; the chain's behaviour there is unspecified | 6b | resolved by 6b — no branch at `s` (≤ 640 px): the spine keeps its DOSSIER state through LATTICE |
| E10 | §10.5 | Block targets a `.hairline` class that does not exist, and `.card { backdrop-filter: none }` although cards have none | 11a | open |
| E11 | §1.4, §5.1, §12.1 | Wrong references: §1.4 "one pinned section (§6.5)" → §6.6; §5.1 "animation targets in §9.3" → §9.4; §12.1 "Three addons" lists five | 11b (text) | open |
| E12 | §4.3, §3.2 | `--void`/`--graphite` luminances misprinted (0.0043/0.0094 → 0.0040/0.0108); `--t-5` 38.06 → 38.05 (checkpoint 2's log) | 11b (text) | resolved in code by 2 |
| E13 | §9.9, §12.2 | `--sweep / 100%` is invalid CSS (checkpoint 3's log); `manualChunks` object form fails under vite 8 (checkpoint 1's log) | 11b (text) | resolved in code by 1, 3 |
| E14 | §3.4 | "These three numbers match the existing CSS breakpoints" is false: the old sheet had 768/900, no 640 (checkpoint 2's log) | 11b (text) | open |
| E15 | §7.5 vs §9.2 | The `X` migration is "a scrubbed GSAP tween … `ease.metal`", but "scrubbed animations always use `ease: 'none'`". E4 covers only §9.4's scroll-out | 6b | resolved by 6b — scrubbed, `ease: 'none'`; `ease.metal` struck from §7.5 |
| E16 | §7.7, §8.2 vs §8.1 | MED tier lists "Post: streak taps 3" and `uStreak` "0.6 MED", but §8.1 drops the composer entirely at MED and LOW, so no pass exists for the streak to run in; the shader also has no tap-count parameter | 10 | open |
| E17 | §9.3 × §10.1, §10.2, §7.7 | CAST shows "the single spinning link from the WebGL stage", but its behaviour with no stage (tier NONE, WebGL failure, reduced motion forced to NONE per E1) and its exit under reduced motion are unspecified. The tier probe runs *after* first paint while CAST renders *from* it, and no rule says which tier's parameters apply until the probe resolves | 10 (with 6a's renderer decision) | open |
| E18 | §8.5, §3.7 | "The page's background ramp" / the depth-5 "background gradient sheet" is referenced but never specified: no gradient, stops, angle or element | 10 | open |
| E19 | §10.3 | NONE fallback uses "a `--silver-sheet` radial", but `--silver-sheet` is a 168° linear gradient, so the radial form is undefined; the static chain strip is "positioned where the spine would run", but the spine's `X` changes per movement | 11a | open |
| E20 | §9.4 × §6.3 | The entrance table animates a "role hairline" and §6.3's wireframe draws one, but §6.3's markup has no such element, and neither does CP3's `index.html` | 5b | resolved by 5b — `<span class="hero__rule" aria-hidden="true">` inside the role line, absolutely positioned `border-top` at the role's width |
| E21 | §9.6, §4.2 | Spec-text slips outside E11/E12: §9.6's dimmed labels at "4.6:1" vs §4.3's 4.96:1 on `--void` (the nodes' ground); §4.2's `--silver-sheen` "animated via background-position (§9.4)", but §9.4 has no sheen (§9.5/§9.7/§9.8 do) | 11b (text) | open |
| E22 | §9.2 | The `catenary` ease ("chain slack relaxation only") has no consumer: sag reads velocity directly with no tween (§7.2) and nothing in §7/§9 names it. Give it one or strike it from §9.2 | 6a | resolved by 6a — struck from §9.2, the Appendix and `core/easings.js` |
| E23 | §9.4 × §6.3 | The entrance fades "button labels" in after the buttons seat, but each label is a bare text node inside `.btn`, so there is no element to fade | 5b | resolved by 5b — each hero button's content is one `<span class="btn__label">` (inline-flex, `gap: inherit`, so no visual change) |
| E24 | §9.2 | With E4 settled as `none`, `shut` ("apertures closing, hero exit") has no consumer left | 5b | resolved by 5b — struck from §9.2, the Appendix and `core/easings.js` |
| E25 | §6.3, §9.4, §9.6 | `pathLength="100"` "so DrawSVG maths is in whole percent", but DrawSVG ignores `pathLength`: it measures a `<rect>` as sharp corners and a `<path>` by `getTotalLength()`, while the browser reads the dash in `pathLength` units, so draws complete after a fraction of their tween (the hero ring appeared whole at ~9 %) | 5b (hero ring) · 7b (§9.6 lattice edges) | resolved — 5b: the ring tweens `stroke-dasharray` `'0 100' → '100 0'` directly; 7b: the lattice edges do the same, no DrawSVG |
| E26 | §9.4 scroll-out vs §9.4 / §4.3 | "meta, role, tagline `opacity → 0` by 40 % progress" leaves them wholly on screen at 0.375 and 0 at 1440×900, against the section's own "nothing rests below 0.60" (and meta/role are `--silver`, which may not be dimmed at all) | 5b | resolved by 5b — every scroll-out fade (incl. the name's 0.06) is bound to the element's own exit: full opacity while wholly on screen, fading only while the viewport's top edge cuts through it |
| E27 | §9.1 teardown | "`ScrollTrigger.saveStyles()` on every animated selector", but ScrollTrigger restores every saved style on *any* media-query change (`matchMediaRevert`, incl. its own `(orientation: portrait)` query), even when no context toggled — after a 900 px crossing into a portrait viewport it wiped the rebuilt hero (hairline invisible). The hero registers no selectors; its context revert and cleanup restore everything | 11b (§9.1 text, registry comment, cross-cutting audit) | open |
| E28 | §12.7 CLS vs §5.4 / §9.4 | CLS budget 0, but a per-character `wdth` morph changes glyph advances, so following characters really move and Layout Instability counts it: the hero entrance measures **0.002** in Chrome 154 (all sources `DIV.char`); breathing registers 0; 7a's heading morphs will add their own | 11b (§12.7 audit) | open |
| E29 | §7.3 | `UP` in the orientation code is undefined; the guard's "fall back to `(0,0,1)` … at the top of the loop" implies `UP = (1,0,0)`, which is parallel to the tangent along the whole WORKS horizontal run, while world-up is parallel at every bow apex of the vertical spine | 6a | resolved by 6a — `UP = (0,0,1)` (camera axis; never parallel for xy-plane curves), fallback `(1,0,0)` |
| E30 | §7.4 | The env-tint snippet picks meshes by `color.l > 0.5`, but RoomEnvironment's light panels have black `color` (their light is `emissive`), so it turns the room walls blue and leaves every light white — no left/right specular split | 6a | resolved by 6a — the two far-left panels' `emissive` → `0x6C9BFF`, the rest white, walls neutral |
| E31 | §7.2 | The ripple is written into the 9 control points (`ripple(i)`), but its constants are per link (6-link wavelength, 0.9×/link, 48 links/s); control points ≈ 6.3 links apart alias it into a whole-chain 8 Hz wobble | 6a | resolved by 6a — applied per link after sampling, `k = u·N` from the top end |
| E32 | §7.3 × §7.7 | §7.7 cuts links to 36 (MED) / 18 (LOW), but §7.3 fixes the spacing (0.72 × diameter) and the 1.6·H span, which need 51: at LOW the links hang ~2.5 diameters apart as loose rings | 6a | resolved by 6a — 51 links at every tier; the tier cuts torus tessellation (12×48 / 10×32 / 8×24) |
| E33 | §7.5 vs §7.3 | The LINK loop is "24-link, radius 0.17·H", but a 0.17·H circle is 1.068·H round, 34 links at §7.3's 0.72-diameter pitch: 24 links hang ≈ 1.01 diameters apart, as touching rings (E32's failure) | 6b | resolved by 6b — keep the radius, 34 links: R = 34·spacing/2π ≈ 0.171·H, so the seam closes exactly |
| E34 | §7.5 vs §7.3 | WORKS runs "the full track width", but §7.3 fixes N = 51 from the vertical 1.6·H span: the visible width is aspect·H, so 51 interlocked links (1.616·H) only just span 16:10, and wider screens show the ends or stretch the links apart | 6b | resolved by 6b — N = ceil(length / spacing) for every curve, from a 96-instance pool; the run spans the visible width + a diameter past each edge |
| E35 | §9.5 vs §1.3 I2 / §4.3 | The fact plate's sheen sweeps `--silver-sheen` (a 0.55 `--chrome` peak) behind the plate's text, which drops to ~2:1 at the band (the `--blue-lift` links 1.23:1), while I2 forbids any on-screen text animating below 4.5:1 | 7a | resolved by 7a — the sweep layer runs at opacity 0.22 (peak 0.121 `--chrome`): links 4.61:1, labels 5.55:1 at the peak |
| E36 | §9.5 × §6.4 | The plate's 45° `.chamfer` hairline sits on the bevel, but §9.5 draws the border as "4 DrawSVG segments" and never mentions it, so it would hang fully drawn while the frame draws in around it | 7a | resolved by 7a — the chamfer draws (1τ, mask) as the top edge's eased draw reaches the bevel, handing over to the right edge; 4 segments, 8τ |
| E37 | §9.5, §9.7 (E25's mechanism) | `.chamfer`'s path `M0 0 L24 24` carries `pathLength="100"` but is 24√2 ≈ 33.94 long: DrawSVG writes its dash in real units, the browser reads them in `pathLength` units, so the draw stops at 34 %. The plate's frame paths are exactly 100 long, so DrawSVG is right there | 7a (plate) · 8a (§9.7 card chamfers) | resolved — 7a: the plate's chamfer tweens `stroke-dasharray '0 100' → '100 0'`, as the hero ring does; 8a: the card chamfers do the same (3τ, mask, at 6τ), no DrawSVG |
| E38 | §6.5 × §7.5 | The wireframe arranges the clusters 2×2, but §7.5's fallback roots are four distinct left-to-right X values, and a 2×2 sends the lower row's branch chains through the upper clusters (6b's log); with capsules up to 217 px, four across only fits wide screens | 7b | resolved by 7b — four across where the measured spans fit (≥ ~1280 px), 2×2 otherwise; each cluster its own lattice (no edge leaves one), packed a gutter apart, rows on a shared lattice row |
| E39 | §6.5 | The wireframe draws horizontal edges, but the text allows only 30°/150°/90°, and claims integer basis combinations give those axes "therefore" (`b₁ − b₂` is horizontal); a one-step 30° neighbour is narrower than most capsules | 7b | resolved by 7b — edges are `k·b₁`, `k·b₂`, `k·(b₁+b₂)` only; the wireframe is topology; rows and same-row nodes two units apart; three wireframe edges replaced by the nearest legal ones |
| E40 | §9.6, §9.8, §9.9 vs §5.1 | `font-stretch` animations on mono text (§9.6 connected-node labels, §9.8 row label, §9.9 rail item hover and panel item entrance) are no-ops: JetBrains Mono has only a `wght` axis (5a's `fvar` check) | 7b · 9b · 9a respectively | 7b's part resolved by 7b — connected-node labels tween `letter-spacing 0.08em → 0.12em` (1τ glyph); 9a's part resolved by 9a — rail item hover `font-weight 400 → 560` (1τ `--ease-glyph`, no reflow: mono advances are weight-independent), panel items `font-weight 300 → 400`; 9b open |
| E41 | §9.7 vs §6.6 / §3.4 | `D = track.scrollWidth − window.innerWidth`, but `#works` is capped at `--container-wide` (1568 px): above that the clipped viewport is narrower than the window, so the cards cut off at an invisible line up to ~176 px in from each screen edge (over a chain that runs full width, §7.5), and the track travels `innerWidth − 1568` px too far | 8a | resolved by 8a — full-bleed while pinned: the viewport spans the window's layout width (`clientWidth`), the leading pad grows so card 01 stays on the header's edge, `D = scrollWidth − viewport.clientWidth` |
| E42 | §9.7 vs §1.3 I2 / §4.3 | The card hover sheen sweeps `--silver-sheen` (0.55 `--chrome` peak) over the card's text: under the band the `--blue-lift` "github ↗" drops to 1.23:1 and body copy to 2.10:1 on `--graphite`, against I2 (E35's problem, on the cards) | 8b | resolved by 8b — E35's cap: the sheen layer runs at opacity 0.22, `--blue-lift` 4.62:1, body 7.89:1 at the peak |
| E43 | §9.7 × §7.3 / §7.5 | "3 links from spine to the card's left edge", but the horizontal spine runs ≈ 250 px below the cards at 1440×900 and 3 links at §7.3's pitch span ≈ 85 px; stretched to reach, they hang as loose rings (E32) | 8b | resolved by 8b — a 3-link stub rising from the spine at the card's left edge, at §7.3's pitch, drawn in the LATTICE branch's idle mesh (draw calls ≤ 3) |
| E44 | §9.7 × §6.6 | "If `location.hash` names a card, jump the pin to it", but no card has an id in §6.6 or `index.html`, so no hash can name one | 8b | resolved by 8b — `#work-01` … `#work-04` on each `<article data-card>`; the jump rests the card where card 01 rests |

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

### Checkpoint 5a — Fonts + split rig

**2026-09-28** · commit `refactor(webpage): checkpoint 5a — fonts + split rig`

The page now renders in the three self-hosted faces, and `core/split.js` splits the hero name, the
four section headings and the four card titles once fonts are ready. There's no choreography yet.
`src/css/motion.css` exists and carries the §9.5 `.wipe` utility. No element uses it yet.

**E2 resolved (user decision): §12.2 wins.** The fonts live in `public/fonts/*-v1.woff2` and
aren't hashed. That keeps the Archivo preload href static, and checkpoint 1's Caddy
`/fonts/*` immutable header already serves them. Replacing a face means bumping to `-v2`.
design.md §5.2 now says this, and the marker is removed.

**Fonts (§5.1, §5.2).** The sources are OFL builds from `google/fonts`:
- Archivo 2.001
- Inter 4.001
- JetBrains Mono 2.211

**Axis ranges, read from `fvar`:**
- Archivo: `wght` 100–900, `wdth` **62–125**. This matches §5.1, so §9.4's targets need no scaling.
- Inter: `opsz` 14–32, `wght` 100–900.
- JetBrains Mono: `wght` 100–800.

The name really does move on the axis: its width is 66.9 / 101.1 / 127.1 % of its 100 % width at
`font-stretch` 62 / 100 / 125 %.

**Sizes:** Archivo 48.2 KB, Inter 40.6 KB, JetBrains Mono 31.1 KB, **119.8 KB total** against a
≤ 140 KB budget.

**The subset is narrower than §5.2's "latin".** Full Latin-1 (U+00A0–00FF) came to 167 KB, which
is over budget. The fonts carry printable ASCII plus exactly the non-ASCII characters the page
renders: `© ° · × – — → ↓ ↗ √`. That set was found by parsing `index.html`'s text and attributes,
not its comments. The JS writes only ASCII and `—`, apart from the `?debug` overlay.
- Layout features kept: `kern liga calt tnum case ccmp locl rvrn`, plus `zero` for mono.
- **Any later checkpoint that adds a character outside this set must re-subset.** Otherwise the
  character falls back glyph by glyph.
- The recipe is: fontTools venv, then `pyftsubset <src>.ttf --unicodes=U+0020-007E,<the set>
  --layout-features=… --flavor=woff2`.
- The OFL text ships as `public/fonts/LICENSE-OFL.txt`, because the licence has to travel with
  the fonts.

**`@font-face` blocks** are in `base.css` and use the family names the `tokens.css` stacks already
had. They are `swap` with the full ranges declared. The Archivo preload is in `<head>`.

**Metric fallbacks** are `"Archivo Fallback"`, `"Inter Fallback"` and `"JetBrains Mono Fallback"`,
each second in its stack.
- Sources: `local()` Arial → Liberation Sans → Helvetica → FreeSans for the two sans faces, and
  Courier New → Liberation Mono → FreeMono for mono.
- The overrides were computed with fontTools from `hhea` and an English-weighted average advance.
- Archivo is matched on capitals, because every Archivo role is uppercase: `size-adjust`
  100.61 %, ascent 87.27 %, descent 20.87 %.
- Inter: 110.61 %, 87.58 %, 21.81 %.
- JetBrains Mono: 100 %, 102 %, 30 %.
- All three have `line-gap-override: 0%`.

**Split rig: the API for 5b, 7a and 8a.**
- `onSplit(kind, (self, el) => timeline)` from `core/split.js`, where the kind is `'name'`,
  `'heading'` or `'title'`.
  - Register it before `boot()`.
  - **The builder must return its timeline.** autoSplit re-splits on font load or a width change,
    and SplitText then reverts the returned animation, keeps its progress and calls the builder
    again.
  - SplitText remembers the `gsap.context()` it was created in and re-runs each split inside it
    (`this._ctx.add`, SplitText.js:201). So ScrollTriggers a builder creates stay inside the
    registered branch on re-splits too. That meant the registry change I'd planned wasn't needed.
- `widthTween(chars, { from, to, ...vars })` is §5.4's mechanism 2. It tweens one proxy array
  and makes one `fontVariationSettings` write pass per frame. `from` applies immediately.
- The splits are registered as the first movement (`splits`), and `main.js` imports `split.js`
  ahead of every section. There is one SplitText per element.
- **Reduced motion creates no splits at all.** Final states need no pieces, and the authored
  text is the most robust thing to leave. A motion toggle reverts the splits along with their
  context.
- **The tagline's `data-split="lines"` is left unsplit on purpose.** §9.4 wipes the whole
  element, and §9.5 reserves per-line masks for headings.
- The pieces are `.line-mask > .line > .word > .char`. SplitText names the mask wrapper
  `<linesClass>-mask`, not something of ours.

**Two deviations from §9.4's split config, both found by measuring:**
1. **`type: 'lines,words,chars'`, not `'lines,chars'`.** Without word wrappers every char is a
   separate inline-block with a break opportunity after it. `.hero__name`'s
   `max-width: min-content` then collapses to one character per line, which measured at 16
   lines and 101 px wide. Even with `words` added, chars can still break *inside* the
   inline-block word, so `motion.css` sets `[data-split] .word { white-space: nowrap }`. design.md
   §9.4's code block still reads `'lines,chars'`. **5b: don't copy it back.**
2. **Kerning compensation (`rekern` in `split.js`).** Splitting into inline-block chars loses
   pair kerning, which moved chars by up to 8.03 px on the 128 px name and 4.53 px on "STACK".
   - `rekern` measures an invisible, unsplit probe of the original markup and writes the gap
     difference between neighbours inside each word back as an em `margin-right`.
   - It's exact at rest. Mid-`wdth`-morph it's only approximately right, which is invisible
     while chars move.

**`.wipe` (§9.5)** is transcribed inside `@media (scripting: enabled)` and uses `--angle-wipe`.
- One deviation: the static `will-change: mask-position` §9.5 writes into the rule is left out.
  §9.1's hygiene rule says it's set on tween start and removed `onComplete`, and a CSS
  declaration can't be removed that way.
- Checked by adding the class to the tagline: it's masked at `--wipe: 100%`, half-revealed along
  the 102° edge at 50 %, and whole at 0 %.

**Verified** in headless Firefox (puppeteer-core, desktop pointer prefs) against `vite preview`,
with CLS measured in `chrome-headless-shell` 154 because Firefox has no layout-shift API:
- **Build:** the entry is **62.47 kB** gzipped against ≤ 64, and CSS is 5.27 kB against ≤ 14.
  **Only ~1.5 kB of entry headroom is left. 5b's `hero.js` will need to watch this.**
- **Fonts:** all three are `loaded`. The computed family is Archivo on the name, Inter on the
  tagline and JetBrains Mono on the role line.
- **CLS 0**, measured with `PerformanceObserver('layout-shift')` in three runs:
  - fonts immediate
  - font responses delayed 800 ms at 1440 px, which really swaps from the fallback face
  - the same delay at 700 px

  A cross-check with fonts blocked against real fonts, JS off, shows no x, y or height change on
  any block. Only the text widths inside boxes differ; the fallback name is 45 px narrower,
  because Archivo's metrics were taken at its default weight of 600 and the name is 800. That
  isn't a shift. If a later checkpoint ever makes the name's box shrink-to-fit something
  positioned after it, revisit this.
- **No reflow from splits:** at 1440, 1000 and 700 px, every split element keeps its box to
  0.00 px and every char keeps its x to 0.00 px against the unsplit text.
  - Pixel diff, split against unsplit: the title is identical.
  - The name and heading differ only by anti-aliasing along glyph edges on some lines, which is
    a sub-pixel baseline rounding of the block line wrappers.
  - The `.silver-type` gradient survives the split in Firefox as one continuous 180° sheet.
    **Note for 5b:** Chromium's `background-clip: text` is known to drop descendants that get
    their own compositing layer. Check the name mid-entrance in Chrome once chars carry `y`
    transforms or `will-change`.
- **Leaks.** Test builders were injected through `?debug`'s `__rig.onSplit`: a `widthTween` +
  `y` timeline for the name, a ScrollTrigger timeline per heading, and a tween per title.
  - Five 1440↔1000 resizes: global-timeline children / triggers held at 13/5 each time, and the
    name re-split and rebuilt 10 times.
  - Two 900 px crossings: 17/5 on every rebuild.
  - Three motion toggles: 17/5 on and **1/1 off**, the same as checkpoint 4's baseline, with 0
    splits and 0 `.char` under reduced motion.
  - `widthTween` left every char at `"wdth" 100`.
- **a11y:** each split element has `aria-label` set to its text, and every generated piece is
  `aria-hidden="true"`, with 0 exceptions.
- **No JS:** at 1440, 900 and 640 px, all five sections are there, `hidden-text=0`, no split
  pieces and no masks exist, the page renders in the real fonts, and there's no horizontal
  overflow.

**Left alone:** E3, E4, E-ease and E20 (5b) and E11 (§5.1's "§9.3" ref, 11b) all touch this area
and all have other owners.

### Checkpoint 5b — IDENTITY choreography

**2026-09-28** · commit `refactor(webpage): checkpoint 5b — IDENTITY choreography`

`sections/hero.js` builds §9.4: the entrance, idle breathing, pointer parallax, the scroll-out and
the reduced branch. `core/depth.js` is §9.1's "one module owns the depths" (§3.7). Neither file is
in §12.2's layout; both are named by this checkpoint's scope.

**Errata decisions (user, this session):**
- **E3, 5b's part:** breathing is a true sine on the ticker clock, `wdth_i = 100 + 3·A·sin(2π(t −
  0.08i)/6)`, with the amplitude `A` ramped in over 8τ and out over 3τ (`glyph`). A `sine.inOut` yoyo
  over 3 s is exactly a cosine, so this is the motion the spec meant, with no curve added to §9.2.
  E3's other parts stay open for 9a (`power3.out`) and 6a (`power2.out`).
- **E4:** scrubs are `none` with no exception. Measured at 1440×900: the portrait leaves the view
  at 53 % of the scroll-out, where `shut` had closed only 5 %. Linear, it's visibly closing.
- **E-ease:** a "—" means `glyph`, written out explicitly; `gsap.defaults({ ease: 'none' })` in
  `easings.js`, so an omitted ease can't be `power1.out`. CSS forms are `--ease-mask/glyph/metal`
  in `tokens.css`, and §9.10 gained an Ease column. **Not converted here:** the plain `ease`
  keyword in the existing CSS transitions (the panel's belongs to 9a, the micro-states' to 9b).
  Their owners convert them, and 11b audits.
- **E20:** the hairline is `<span class="hero__rule" aria-hidden="true">` inside `<p data-role>`,
  absolutely positioned 1 px `border-top` (`--hairline-strong`, so forced colours keep it) at the
  role's width. There's no layout change. Its `scaleX(0)` is the hero's only CSS-hidden state.
- **New E23** (user agreed): button labels are `<span class="btn__label">` (inline-flex, `gap:
  inherit`). Verified: the arrow glyphs sit at the same pixels as before.
- **New E24** (user agreed): `shut` struck from §9.2, the Appendix and `easings.js`.
- **New E26** (user agreed): the scroll-out's fades are bound to each element's own exit (full
  opacity while wholly on screen, fading only while the top edge cuts through it). The name's
  window is divided by `k = 1 + 0.12·vh / section height`, because it also rises 12vh. It's computed
  from untransformed `offsetTop`, so a refresh mid-scroll can't skew it.
- **Owner decision, §12.7:** entry budget **64 → 66 KB**. See "Carried forward".

**Found and settled in code, with rows opened for other owners:**
- **E25, DrawSVG ignores `pathLength`.** It measured the ring `<rect>` as 1088 (sharp corners),
  while the browser read the dash in `pathLength` units, so the ring appeared whole at ~9 % of its
  draw. The hero ring now tweens `stroke-dasharray '0 100' → '100 0'` itself. **7b:** §9.6's edges
  carry `pathLength="100"` too, and `getTotalLength()` has the same mismatch.
- **E27, `saveStyles` vs media changes.** ScrollTrigger answers every `matchMediaRevert` by
  restoring *all* `saveStyles` records, even when no context toggled. Its own `(orientation:
  portrait)` query counts. So crossing 900 px into a portrait viewport reverted and rebuilt the
  hero, and then a second media event wiped the rebuilt state: the hairline became invisible.
  **The hero registers no `selectors`**, and its context revert plus `full()`'s cleanup restore
  everything (verified below). **7a onward: don't register `selectors` either** until 11b settles
  E27.
- **E28, CLS.** Chrome 154 measures the entrance at **0.002**, every source `DIV.char`: §9.4's
  `wdth` morph changes glyph advances, so later chars really move. Breathing registers 0. It's far
  under 0.1 ("good"), but the §12.7 budget is 0, so it's left to 11b's audit. 7a's heading morph
  will add its own.

**Deviations and decisions where the spec is silent:**
- **The hero is readable before any JS runs**, per the done-when. Nothing is hidden in CSS apart
  from the hairline, and the entrance sets its own from-states when built. On a load without CAST,
  the hero therefore paints and is then re-hidden by the build step before the entrance plays it
  in. **Note for 10:** CAST's veil covers that. Wire it with `holdEntrance()` before boot and
  `playEntrance()` at CAST t = 5τ (both exported from `hero.js`).
- **The entrance is a page-load event.** A rebuild after it has played (motion toggle, breakpoint)
  builds no timeline: it sets the hairline, jumps the chars to rest and arms breathing. Jumping a
  freshly built timeline to `progress(1)` was tried first and left `.btn__label { opacity: 0 }`
  behind on the next revert, which hid the labels under reduced motion.
- **Two writers on one value compose in CSS.** The entrance tweens `--in` and `--ap-in`, the
  scroll-out `--out` and `--ap-out`, and `motion.css` multiplies them: `opacity: calc(var(--in, 1) *
  var(--out, 1))`, `clip-path: inset(calc(50% − 50%·in·out) 0 round 116px)`. The latter is a true
  stadium at every height, because the round radii scale down together. All default to 1, so
  nothing is hidden pre-JS.
- **The name's width has three drivers** (entrance, scroll-out, breathing) and one writer,
  `writeWidth()`: `wdth = lerp(enter + breath, 62, out)`. `widthTween` isn't used for it, and
  `debug.js` no longer re-exports `widthTween`, which kept it in the entry for nothing. 7a/8a
  importing it brings it back.
- **The char timeline is paused and driven by the master's `onUpdate`** (`time − 1τ`). SplitText's
  progress restore then keeps a re-split in step.
- **Buttons seat through the `scale` property** (`scale: 1 var(--sy)`), not `transform`, so
  `.btn--metal`'s transform transition never smears the entrance.
- **The role holds `white-space: nowrap`** while tracking from 0.6em. At 0.6em it's ~452 px and
  wrapped at ≤ 390 px, which pushed the tagline and buttons down mid-entrance.
- **`.hero__text` gets `grid-template-columns: minmax(0, 1fr)`** (in `components.css`). The
  implicit `auto` track grew to its widest child's min-content. That was the nowrap role, but also
  already the 704 px tagline measure at 1440 (column: 690) and "YESAULOV" at 375. The tagline box
  now stays inside its column: 690 not 704 at 1440, 315 not 358 at 375, with the same height and
  line count. That's the only layout change from 5a, and JS-on and no-JS rest layouts are now
  identical at 375/640/900/1440.
- **Split gradient type:** Chromium drops transformed descendants from an ancestor's
  `background-clip: text`. The split name rendered as one silver blob, **even at rest** (5a's note
  was right). Once split (`.silver-type:has(.char)`), each char paints `--silver-text` itself,
  with `--sheet-h` (the element's height) and its own `--sheet-y` measured at split. The gradient
  is vertical, so horizontal position and `wdth` don't matter. Pixel check: Chrome, rest vs no-JS,
  27 of 324 000 px differ. Firefox matches row-mean colour to within 1–4 levels, differing only at
  glyph edges, as in 5a. 7a's heading and 8a's title splits aren't `.silver-type`, but the rule is
  generic if one ever is.
- **Breathing is gated** to "after the entrance has rested" and "hero on screen". The §9.4 wording
  covers neither; without them it would run behind the reader forever.
- **The tagline's `.wipe` class** is added by `full()` and removed when its tween completes, which
  drops the mask layer. The cleanup removes it too.

**Depth module, the API for 6b, 7a, 8a and 10** (`core/depth.js`):
- `DEPTH` (heading 0, plate/card 1, portrait 2, chainFore 3, chainMid 4, background 5) and
  `amplitude(layer, 'pointer' | 'scroll')` = `4·√2ⁿ` px, ×4 for scroll.
- `pointerOffset(layer, out)`: the inverted px offset, for the WebGL consumers (6b chain, 10
  background) to read per frame.
- `pointerParallax(el, layer)` and `scrollParallax(el, layer, stVars)` return cleanups. Call them
  inside a registered branch and return the cleanup from it: gsap.context runs a branch's returned
  function on revert.
- **The module owns the element's CSS `translate` property**, pointer + scroll summed in one write,
  so GSAP's `x`/`y`/`transform` stay free for choreography. The hero name's scroll-out `y` and its
  pointer parallax coexist that way. Pointer writes fire only when the (already lerped) signal
  changes.

**Verified** in headless Firefox (desktop pointer prefs) and chrome-headless-shell 154, against
`vite preview` on the final build:
- **Build:** entry **64.11 kB** (Vite's gzip figure; `gzip -6` 63.4 kB, zstd −3 66.3 kB, see 11b's
  zstd note), inside the new 66 KB; CSS 5.53 kB; late 14.56 kB.
- **Entrance per §9.4:**
  - The master is 2.52 s = 21τ. Sampled at four points, each row starts on its beat (the role at
    8.07 px of tracking on the first frame, the tagline mask at 71 % at 0.75 s, the buttons
    overshooting to `scale 1 1.10` on `back.out`, the ring drawing progressively from 1.2 s).
  - At rest every value is the authored one: tracking 0.18em, `wdth` 100, no `.wipe`, `scaleX(1)`,
    aperture `inset(0)`, image `scale(1)`, dash `100 0`.
  - 14 chars, lines at 1τ/3τ.
- **Breathing:**
  - It starts ~4 s after rest, spans exactly **97–103**, and a pointer move takes `A` to 0 within
    3τ.
  - Its clock stops (checked by `t` freezing, since GSAP's own ticker traffic pollutes an add/remove
    count), and it re-arms after 4 s.
  - A motion toggle OFF mid-breath stops it. It's never active under reduced motion.
- **Scroll-out:**
  - Linear (name `wdth` 96.2 / 90.5 / 81 at 10 / 25 / 50 %); the aperture ends at `inset(49.68%)`
    = 2 px of 312.
  - At 1440×900, 1280×700, 800×900 and 390×844, scanned in 5 % steps: the minimum opacity of any
    text wholly on screen is **1.0**.
- **LCP** (`.hero__text`, or the portrait at 390): 32–136 ms unthrottled, **364 ms** at 8 Mbps /
  60 ms / 4× CPU.
- **Readable before JS:** with the entry script held 3 s, at 1.2 s the hero is complete (opacity
  1 throughout, no `__rig`), with only the decorative hairline undrawn.
- **Leaks, Firefox:**
  - Motion toggle ×3: **24 children / 6 triggers ON, 1 / 1 OFF** every cycle, the same OFF
    baseline as checkpoints 4 and 5a.
  - 5 resizes 1440↔1000 and 4 crossings of 900 px: stable at 23–24 / 6. The one-child swing is a
    live breathing ramp.
  - The hero rests correctly after every rebuild, including a crossing 250 ms into the entrance.
    No page errors.
- **Reduced motion** (OS pref and toggle): no splits, no `.wipe`, the hairline drawn, no parallax
  (`translate` only GSAP's own `none`), every text at opacity 1.
- **Parallax:** at the pointer's corners the name moves ∓3.99 px and the portrait ∓7.98 px,
  inverted.
- **a11y:** the accessible names are unchanged ("Selected work →", "Dossier ↓ PDF"), the role's
  text is unchanged, and `.hero__rule` is `aria-hidden`.
- **No JS** at 1440/900/640: five sections, no hidden text, no horizontal overflow, real fonts,
  hairline drawn.

**Carried forward:**
- **7a onward:** entry headroom is ~1.9 KB. DOSSIER and later sections should load as their own
  chunk right after boot rather than grow the entry (owner decision; the total JS budget ≤ 220 KB
  still governs). Also: register no `saveStyles` selectors (E27), and use `core/depth.js` for
  heading and plate depth.
- **6b:** chain pointer depth comes from `pointerOffset('chainFore' | 'chainMid')`.
- **10:** `holdEntrance()` / `playEntrance()`, and the background sheet's depth is
  `pointerOffset('background')`.
- **Left alone, owned elsewhere:** E3 (9a, 6a), E15 (6b, the same scrub-ease question for the chain
  migration, which E4's "no exception" wording now informs), E21 (§4.2's "§9.4" sheen reference).

### Checkpoint 6a — Chain core (WebGL)

**2026-09-28** · commit `refactor(webpage): checkpoint 6a — chain core (WebGL)`

The chain renders. The new files are:
- `gl/stage.js`: renderer, camera, clock, fade-in, motion handling.
- `gl/chain.js`: catenary, spring, ripples, links, material, env, lights, guard.
- `core/tiers.js`: forced rules, the 30-frame probe, §7.7 params.
- `util/rect.js`: the document-space `[data-copy]` cache.

`main.js` imports `gl/stage.js` at idle after `load`, next to the late plugins. That chunk pulls
`three` in behind it, and `tiers.js` rides in it too, so the entry doesn't grow. Movement states
are still 6b's: the spine sits at IDENTITY's `X = +0.26` on every section.

**Errata decisions (user, this session):**
- **E1:** §10.1 wins. Under reduced motion the chain is drawn and never animated: no ticker
  callback, spring, sag response or ripples, and the phase is frozen where it was. The frame is
  redrawn only on `scroll` and `resize`, coalesced to one `gsap.ticker.add(fn, true)` per frame.
  That was the catch in the literal "one frame" reading: `#stage` is fixed, so a single frame's
  `aDim` would go stale as copy scrolled past. The tier keeps its probed value, and the motion
  toggle only adds or removes the ticker callback.
- **E3, 6a's part:** the ripple envelope is `(1 − τ/1.2)²`, i.e. 1 − power2.out, computed per
  frame. E3 stays open for 9a.
- **E22:** `catenary` is struck from §9.2, the Appendix and `easings.js`.
- **New E29:** `UP = (0,0,1)` with fallback `(1,0,0)`. Even links read edge-on and odd face-on.
  The guard never fires for an xy-plane curve. §7.3's loop-top placement stays 6b's.
- **New E30:** the spec's tint snippet turned the room *walls* blue. RoomEnvironment's panels
  carry their light in `emissive`, and their `color` is black. Now the two far-left panels (x ≈ −16)
  get emissive `0x6C9BFF` at their own intensity.
- **New E31:** the ripple is applied per link after sampling the curve, with `k = u·N` counted
  from the top end. Nine control points can't carry a 6-link wave.
- **New E32:** every tier keeps 51 links, and the tier cuts tessellation instead: 12×48 / 10×32 /
  8×24, i.e. 1152 / 640 / 384 tris per link. Checked in a screenshot: with 18 links, LOW hung as
  loose rings ~2.5 diameters apart. Now it's an interlocked chain.

**My decisions where the spec is silent (all logged, none in design.md except the renderer note in
§10.2):**
- **Renderer vs antialias.** A forced tier builds the right renderer the first time. Forced NONE
  builds nothing and removes the canvas. Otherwise:
  - The renderer is built for HIGH (`antialias: false`) on the real `#stage`.
  - The probe renders the real chain there at `opacity: 0`.
  - A MED/LOW result disposes the renderer (`forceContextLoss`), swaps in a `cloneNode` canvas,
    re-bakes PMREM and rebuilds with `antialias: true`.

  Verified in Chrome at 6× CPU: the probe gives LOW, there's one `#stage`, `stage.canvas` is the
  live one, and antialias is on. **Note for 10:** until the composer lands, HIGH renders with no AA
  at all. `TIERS[t].msaa` (4/0/0) is already there for the composer target.
- **The guard measures from the link's nearest edge, not its centre** (each rect grown by the
  on-screen outer radius, 0.022·vh). This is a deviation from §7.6 step 4's literal reading. Measured:
  - At 1440×900 the link centres run x = 1013–1025. That's inside the 24 px gutter between
    DOSSIER's copy (≤ 1008) and the plate (≥ 1032).
  - So the centre test gave `aDim = 0` everywhere, while the 40 px rings covered the ends of the
    copy lines.
  - Edge-based, the links over the copy dim to 0.35–0.64.

  At `aDim = 1` (checked with a forced full-width `[data-copy]` band) links go visibly matte and
  flat with no highlight. At the spec's 0.42/0.62 values they stay mid-grey rather than dark,
  because the env is bright. The spec's numbers are kept.
- **Sag direction:** `state.bow = −1` bows toward screen centre. At IDENTITY that puts the on-screen
  bow in the tagline–portrait gutter (§7.5 "runs the gutter"). `+1` would cross the portrait.
  **6b:** `state.x` and `state.bow` are the plain-object knobs for the migrations.
- **Lights are `DirectionalLight`s.** A point light at §7.4's positions and intensities would
  leave almost nothing after inverse-square falloff.
- **Reversal detection:** `Δv` = the peak speed in the old direction + the speed in the new one
  (the signal is EMA-smoothed and crosses zero slowly). A chain at rest (`v === 0`) forgets its
  direction. This is written into §7.2 along with E31.
- **Phase target** is `window.scrollY` (§7.2's code). The guard uses `getSmoother().scrollTop()`,
  the rendered position (§7.6).
- **Fade-in:** `gsap.to(canvas, { opacity: 1, duration: 8*T, ease: 'metal' })` after the first
  frame, since it's a crossfade. Under reduced motion it's a `gsap.set`. `#stage { opacity: 0 }` is
  in `motion.css` under `scripting: enabled`.
- `mesh.computeBoundingSphere()` runs every frame after the matrices, because `frustumCulled` would
  otherwise use a stale sphere. The dev build warns if `renderer.info.render.calls > 3`.
- `?debug` shows `stage mode · tris · calls · ripples` and exposes `__rig.stage`
  (`chain.dims()`, `chain.phase`, `renderer`, `camera`).

**Verified** in headless Firefox (desktop pointer prefs) and chrome-headless-shell 154
(SwiftShader), against `vite preview`:
- **Build:**
  - `three` chunk **135.68 kB** gz against a ≤ 180 budget.
  - Stage chunk 3.49 kB.
  - The entry is now two files, because `easings.js` became a shared chunk once the stage imported
    it: `index` 5.70 + `easings` 58.91 = **64.61 kB** against ≤ 66.
  - Late 14.55 kB, CSS 5.53 kB.
  - **Total JS 218.3 kB against ≤ 220.**
- **At rest,** the on-screen bow spread (instances within ±0.8·H) is **74.5 px**, against 81 px =
  0.09·H at 900 px. The endmost links don't sit at the apex.
- **Fast wheel burst:** velocity reaches 0.96 and the spread falls to **3.1 px** (taut). It returns
  to 74.5 at rest. A reversal spawns a ripple that lives 1.2 s.
- **Draw calls: 1** at every tier.
- **Tiers:**
  - HIGH at DPR 2: pixel ratio 2, clearcoat 0.3, no AA.
  - Forced LOW (`hardwareConcurrency = 4`) at DPR 2: pixel ratio 1, 384 tris, clearcoat 0, AA on,
    and the colophon reads **LOW**.
  - `webgl.disabled`: `#stage` removed, colophon **NONE**, no errors.
- **Reduced motion:**
  - OS pref: mode `reduced`, 0 renders over 1 s idle, one render per scroll, `aDim` updated at
    DOSSIER, phase frozen.
  - Motion toggle ×3: **6 triggers / 23 children ON, 1 / 1 OFF** every cycle, the same as 5b's
    baselines. 0 renders while OFF, ~60 fps ON.
  - The 2nd child under the OS pref is ScrollTrigger's own delayed refresh call. It's identical at
    HEAD.
- **Resize** 1440 → 1000 → 700 → 390 → 1440: the drawing buffer and aspect follow every time, and
  triggers stay 6.
- **LCP** 36 ms (244 ms at 6× CPU), still `.hero__text`. The canvas becomes visible at 2.7 s
  (5.7 s throttled), well after LCP.
- **CLS** in SwiftShader Chrome is 0.010–0.016, every source `DIV.char`. That's E28's width morph
  sampled at coarser frame times, not the stage: the canvas is fixed and only its opacity changes.
- **No JS:** 5 sections, no overflow, canvas inert (the transparent, empty element).

**Carried forward:**
- **The total JS budget is nearly spent:** 1.7 KB headroom. 6b's `lattice.js` and **10's
  EffectComposer + RenderPass + OutputPass + metal pass will exceed 220 KB.** 10 (or 6b, if lattice
  alone tips it) needs an owner decision on §12.7's total.
- **6b:** `chain.state.{x, bow}`; the stage's `H`, `camera` and `chain` via `getStage()`. The
  instance loop is in `chain.update()`. The horizontal mode and loop need their own curve and the
  E29 fallback only if a curve leaves the xy-plane. Chain parallax from `pointerOffset()` isn't
  wired yet. Under reduced motion the chain is static at the phase it had. The migrations there
  should `gsap.set` `state.x` per section and call `getStage().redraw()`.
- **8a/8b:** `rect.js` measures `offsetLeft` only, so cards inside the horizontally-scrolled/pinned
  track are placed at their unscrolled x. The pin owner must feed the track offset in.
- **10:** `TIERS[t].msaa`, `.antialias`; `renderer` is replaced on a probe downgrade, so read it
  from `getStage().renderer` at composer build time, not at import.
- **11a:** the NONE path removes the canvas and nothing replaces it yet (E19).
- **Left alone, owned elsewhere:** E3 (9a's `power3.out`), E15/E9 (6b), E16/E17/E18 (10), E19
  (11a), E28 (11b).

### Checkpoint 6b — Chain movement states

**2026-09-28** · commit `refactor(webpage): checkpoint 6b — chain movement states`

Every §7.5 row except CAST's is built. The new files are:
- `gl/movements.js`: the per-boundary states, in the stage chunk.
- `gl/lattice.js`: the branch mesh.
- `sections/chain.js`: a small entry shim (+0.10 kB) that registers the chain as a movement.

The stage chunk arrives after `boot()`, so `setChainBuilder()` builds into the live `chain`
context with `gsap.context().add()`. A function returned from `add()` joins the context's cleanups
(checked in `gsap-core.js`), and a `gsap.matchMedia()` made inside it is reverted with it. So
checkpoint 4's rule holds: every trigger lives in a registered context. `rect.js` now exports
`docOffset`. §12.2 lists the two new files.

**Errata decisions (user, this session):**
- **E9:** there's no branch at `s`. The spine keeps DOSSIER's state through LATTICE. It's a nested
  `matchMedia('(min-width: 641px)')` inside the branch, so crossing 640 px toggles only the branch
  (verified: 800 → 600 → 800 inside the lattice gives branch 1 → 0 → 1).
- **E15:** scrubbed, `ease: 'none'`. The user followed E4's "no exception".
- **New E33:** 34 links at radius `34·spacing/2π = 0.1714·H`. Measured: exactly 34 links, radius
  spread 0, every gap exactly one link, ω = 0.120 rad/s.
- **New E34:** `N = ceil(length / spacing)` for every curve, from a 96-instance pool. Link `i` sits
  at `mod(i + phase, 96)·spacing` and is hidden past the curve's end. That replaces 6a's `u = (i +
  phase)/51`, and at rest the spine still shows 51. The horizontal run shows **54 links at 16:10,
  60 at 16:9 and 78 at 21:9**.
- **Owner decision, §12.7:** the total JS budget goes **220 → 224 KB**.

**My decisions where the spec is silent (all written into §7.5 unless noted):**
- **Trigger windows:**
  - X, `h` and the coil run while their boundary crosses the view (`top bottom → top top`; LINK
    `→ top center`).
  - The loop's §3.7 scroll parallax (×4, 45.25 px) spans `#link` `top bottom → bottom top`.
  - The branch is active while `[data-lattice]`'s top is between 80 % and 10 % of the view. The
    first try used `#lattice` `top/bottom center`, which left nothing drawn once the roots had
    scrolled off the top.
- **The bow keeps pointing toward screen centre.** It's tweened `−1 → +1` with X, so the chain
  swings across straight mid-migration.
- **The horizontal mode is a real rotation of the curve's frame:**
  - clockwise by `h·90°`, so the top end goes right and links travel left with the track;
  - the pivot lerps to `(0, −0.40·H)`, and the span to the visible width plus 2 diameters;
  - the sag lerps to "downward".

  §7.5's "hangs downward between card anchors" names anchors that don't exist, so it's one
  catenary across the run. **8b's tethers** are where cards meet the chain.
- **The coil:** the middle stretch of the open chain maps onto the circle from the loop top,
  clockwise. Positions and tangents are blended per link, and links outside that stretch shrink
  with `1 − loop`. Mid-coil the two tips bunch before they meet, which I judged acceptable for a
  transient. The zero-tangent case the blend creates takes the nearer pose's tangent. That's the
  §7.3 guard 6b owned, since `UP = (0,0,1)` never degenerates for the xy-plane curves themselves.
- **The ripple** acts along the in-plane normal, so it stays lateral on the horizontal run.
- **The crossfade is by scale on both meshes.** The material is opaque metal, so "fades out" is
  per-instance scale 1→0, and the primary mesh is hidden when it reaches 0. Draw calls are **1**
  (2 only mid-crossfade).
- **Branch chains hang from their roots:**
  - They run from just above the viewport to the root node's centre, following its live screen y
    (document px − `scrollTop`), and they're drawn behind the node's `--void` capsule.
  - Links are laid at the pitch upward from the root, with no conveyor.
  - The bow points toward centre, scaled by length.
  - The pool is 4 × 36.
  - Roots now come from CP3's columns (each cluster's first `.node`), re-fed on every refresh.
- **Parallax (§3.7):**
  - The spine, run and loop are `chainFore` (n=3). Measured at the pointer's corners: ±11.31 px,
    inverted.
  - The branches are `chainMid` (n=4), tapered to 0 over the 8 links nearest each root so they
    stay attached.
  - Scroll parallax goes only on the loop. The spine's scroll response is its conveyor, and a
    y-shift of a band that spans the screen would be invisible. Nothing moves under reduced motion.
- **IDENTITY entrance:** the curve's offset goes from `(−0.35·W, +1.0·H)` → 0 over 13τ `mask`,
  once per page load and only when the page opens within half a viewport of the top. It plays with
  the 8τ fade-in.
- **Reduced motion:** there are no scrubs or crossfades. Four start-only triggers set each section's
  final state on crossing (read off the scroll, not `isActive`, since `end: 'max'` didn't hold them
  to the page end), then `redraw()` runs. The WORKS pin doesn't exist there, so the chain stays
  vertical. The loop is static.
- **`snap` is a reserved GSAP tween property**, so a tween of `{ snap: 1.14 }` silently does
  nothing. The seat scale is `state.seat`.

**APIs for later checkpoints** (all on `getStage()`):
- **7b:** `setBranchRoots([{ x, y }] | null)` takes root centres in document px. Replace
  `columnRoots()` in `gl/movements.js` (it's re-fed on every `ScrollTrigger` refresh) with the
  lattice's resolved roots. At `m` the CP3 2×2 grid sends the lower row's branches through the
  upper clusters and their labels; the lattice geometry should fix that. Cluster labels and nodes
  aren't `[data-copy]`, so the guard doesn't dim links behind them.
- **8a:** `drive(px | null)` locks the phase to the track's travel, set directly with no spring.
  Engaging and releasing each capture an offset, so neither jumps. Measured: 1000 px of drive =
  35.073 links at 900 px tall, which is exactly `1000 / (0.72·0.044·900)`. The rotation to
  horizontal is already scrubbed here (desktop branch only), and the ≤ 900 px branch never leaves
  vertical. **8a doesn't need to switch it back.** The chain's triggers are created after boot, so
  after the pin exists check that they refresh after it (`refreshPriority` or `ScrollTrigger.sort()`).
- **9b:** `snapFinalLink()` seats the link at the loop's seam (1 → 1.14 → 1, 1τ + 1τ, `chain`) and
  returns the timeline. It returns `null` under reduced motion or before the loop has closed.
  Measured: 1.148, 1.152, 1.078, 0.995, 0.986, 1 at 40 ms steps.
- **10:** the entrance should start at CAST instead of at stage init.
- **11a:** at NONE there's still no fallback (E19). On portrait phones §7.5's loop (X +0.30, R
  0.17·H) sits over the LINK rows, dimmed by the guard. It's legible but crowded; it's worth a look
  in the §10.1/§10.2 audit.

**Verified** in headless Firefox (desktop pointer prefs) and chrome-headless-shell 154 (SwiftShader),
against `vite preview`:
- **Build:**
  - entry `index` 5.80 + `easings` 58.91 = **64.71 kB** against ≤ 66;
  - stage chunk 5.71 kB (was 3.50);
  - `three` 135.68;
  - late 14.55;
  - **total 220.65 kB against ≤ 224**;
  - CSS 5.53.
- **Migrates, never cuts:**
  - 150 even steps (27 px) over the whole page at 1440×900, with each mesh's scale-weighted centroid
    measured separately.
  - No step without a visible chain, and no NaN matrices.
  - The largest step, 51 px, is in the LINK coil, where one step is 6 % of the coil.
  - Mid-transition screenshots of X, `h`, the coil (30 %, 60 %) and the branch crossfade look
    continuous.
- **Per section** (1440 / 800 / 390): x 0.26 → −0.28, the branch (56 links at 1440, 64 at 800, none
  at 390), `h` 1 at WORKS on desktop only, the loop at LINK and the colophon.
- **Branch:** the chains end at each column's first node, at 1440 and 800.
- **§3.4:**
  - At 1440 the IDENTITY links cover x 994–1059 px (link edges), in the gutter between the tagline
    (right edge 906) and the portrait (1074). At 1280: 883–941 between 824 and 988.
  - DOSSIER: 354–418 against the copy's left edge at 522 (315–371 against 444 at 1280).
- **Forced LOW:** both meshes at 384 tris. Chrome at 6× CPU probes MED: 640 tris, AA on, no errors.
- **Leaks (Firefox):**
  - Motion toggle ×3: **28 children / 11 triggers ON, 1 / 5 OFF** every cycle. That's 6a's 6
    triggers plus 5 chain triggers ON; OFF adds reduced's 4.
  - Toggles inside LATTICE and LINK keep the state (branch 1, loop 1).
  - 5 resizes 1440 ↔ 1000 and two 800/600/1440 rounds: the trigger count is stable at 11/10/9, no
    errors.
- **Reduced motion (OS pref):** 0 renders over 1 s idle, 1 render per scroll. The states at DOSSIER,
  LATTICE, WORKS, LINK and the colophon are −0.28 / branch / −0.28 / loop / loop.
- **LCP** is still `.hero__text`, at 40 ms (276 ms at 6×). **CLS** is 0.011 (0.023 at 6×), all E28's
  width morph as in 6a.
- **No JS** at 1440/900/640: 5 sections, no hidden text, no overflow.

**Left alone, owned elsewhere:** E3 (9a), E16/E17/E18 (10), E19 (11a), E25 (7b), E27/E28 (11b).

### Checkpoint 7a — Choreography — DOSSIER

**2026-09-28** · commit `refactor(webpage): checkpoint 7a — DOSSIER choreography`

§9.5 is built. The new files are:
- `sections/about.js`: the body wipes, the principles strip, the fact plate and the plate's depth.
- `sections/header.js`: the section-header reveal, plus the heading depth, for all four headers.
- `sections/index.js`: the sections chunk root.

§12.2 lists all three.

**Errata:** no open row was owned by 7a. Three new rows, each opened and resolved with the user:
- **E35 (user decision: cap the sheen).**
  - At §9.5's full 0.55 band, the plate's text dropped to ~2:1, and the `--blue-lift` links to
    1.23:1, against I2.
  - `.plate::before` now runs at opacity **0.22**, so the band peaks at 0.121 `--chrome` over
    `--graphite`.
  - At that peak the weakest text still clears AA: links **4.61:1**, labels 5.55:1,
    `--silver-light` values 7.9:1.
  - The value was computed with a WCAG script, as the highest cap that keeps every plate colour at
    ≥ 4.5:1.
- **E36 (user decision: draw it at the corner).**
  - The chamfer draws over 1τ (`mask`), starting the moment the top edge's *eased* progress
    reaches the bevel. That's solved numerically from the `mask` curve: ≈ 0.45 of segment 1, ≈ 0.9τ.
  - The top edge is clipped there, so the stroke visibly turns the corner. Checked in slowed
    screenshots.
- **E37 (found by measuring).** DrawSVG wrote the chamfer's dash as `33.94px`, its real length,
  which the browser reads in `pathLength="100"` units. It drew 34 % and stopped.
  - The plate chamfer now tweens `stroke-dasharray` directly.
  - The four frame paths are exactly 100 long in their viewBox, so DrawSVG draws them correctly
    (measured `100px, 0.1px` at rest).
  - **8a:** §9.7's card chamfer row has the same bug. It's marked E37 and is yours.

**Owner decision: the sections chunk loads in parallel with the fonts.**
- `main()` starts `import('./sections/index.js')` first and awaits it together with
  `document.fonts.ready`, before `boot()`.
- So `register()` and `onSplit()` in the chunk run before the registry builds and the headings
  split, and the registry and split rig are unchanged.
- **7b, 8a, 9b: import your section from `sections/index.js`,** not from `main.js`.
- Measured in Chrome, the chunk lands at 48 ms, against 18 ms for the last font (254 vs 175 ms at
  6× CPU). Boot therefore waits ~30–80 ms longer than before. LCP is unaffected (the hero paints
  before JS).
- If the chunk fails (blocked in a test), boot goes on. The headings split but get no builder, and
  DOSSIER is fully readable.
- Rolldown split a shared chunk out (`depth-*.js`: registry, split, depth, signals), which the
  entry `modulepreload`s. The entry is therefore three files.

**My decisions where the spec is silent (written into §9.5 where they're choreography):**
- **Nothing is hidden in CSS, following 5b's hero.**
  - Every block sets its own from-states when its timeline is built, and adds `.wipe` itself.
  - `motion.css` gains a comment and no rules, so a dead chunk or dead JS leaves DOSSIER complete.
    This deviates from 5a's "initial states in motion.css" plan, for the same reason 5b gave.
- **Triggers.** The header, body, principles and plate each reveal on their own `top 72%` (the
  header's line). So each block reveals as it reaches that line, in both the side-by-side
  (> 900 px) and stacked layouts.
- **Timing.** §9.5's header table has no t column, so index, rule and chars all start together.
- **Reveals are once per page.**
  - The body, principles and plate record `played` on start. The header records the SplitText
    instance that played.
  - A branch rebuild (motion toggle, 900 px crossing) builds nothing for a played block, which
    rests authored (5b's `entered` pattern).
  - An autoSplit re-split of the *same* instance rebuilds, and SplitText restores its progress.
- **`.head__title { flex: 1 1 auto }`.**
  - The heading is a shrink-to-fit flex item, so the `wdth 125` from-state widened its box.
  - autoSplit then re-split it ~200 ms into the reveal, which, with the played guard, cut the
    reveal short: the chars rested at once.
  - Taking the rest of the header's line makes the box independent of the glyphs. There's no
    visual change, since the text sits left either way.
- **Principles hairlines.** They were CP3's `border-top/bottom`, which can't be scaled without
  scaling the text. They're now `.principles::before/::after` at `scaleX(var(--rule, 1))`, drawn at
  rest and hidden only while JS tweens `--rule`. Forced colours keep them as `CanvasText`.
- **Sheen geometry.**
  - The layer's image is 180 % of the plate wide.
  - A 60 % first try left part of the band visible *at rest*: the 105° band leans 15° over the
    plate's full height, and at a narrower size it clips at the image edges.
  - At 180 % both of §9.5's ends (−120 %, 220 %) clear the band for plates up to 4.6:1 tall.
  - A larger-than-box image makes the percentage sweep run right → left. Hidden in forced colours.
- **Depth.**
  - The heading depth (n=0) goes on the whole `.head`, so index, rule and heading move as one.
  - The plate gets n=1 on pointer and scroll. `.dossier__copy` gets nothing.
- **Fix in `core/depth.js` (5b's module; 7a is `scrollParallax`'s first consumer).** A scrubbed
  `.to()` renders nothing until its trigger first updates. So a plate built below the viewport sat
  at 0 and would jump 22.6 px as it entered, and after a 900 px crossing it read `0px` at
  progress 0. `scrollParallax` now writes its from-value at bind time; a refresh mid-range
  overwrites it.
- **Guard vs parallax.** `rect.js` caches `offsetTop`, which ignores `translate`. So the plate's
  `[data-copy]` rect is off by at most 22.6 + 5.7 px while it parallaxes, about one 24 px guard
  feather. Left as is.

**APIs for later checkpoints:**
- **7b / 9b:** `sectionHeader(section.querySelector('.head'))` at module level in your section
  module. That gives the §9.5 header reveal on `top 72%` plus heading depth, with nothing else to
  call. `onSplit('heading')` is taken by `header.js`, so don't register another.
- **8a:** `sectionHeader(head, { scroll: false })` drops the scroll parallax for the pinned header.
  If the reveal needs another line, pass `start`.
- **9b:** CP3's LINK header uses the same `.head` markup, so the same one-line call works there.

**Verified** in headless Firefox (desktop pointer prefs) and chrome-headless-shell 154, against
`vite preview`:
- **Build:**
  - entry `index` 4.24 + `depth` 2.23 + `easings` 58.91 = **65.38 kB** against ≤ 66;
  - sections 1.21, stage 5.73, late 14.55, `three` 135.68;
  - **total 222.55 kB against ≤ 224**;
  - CSS 5.63 kB.
- **§9.5 tables, sampled mid-flight and at rest (1440×900):**
  - Header: at 60 ms, index 0.47, rule `scaleX .25`, char 0 at `yPercent 76` / `wdth 119`. At 250 ms,
    `wdth 102.4`. At rest `wdth 100`, `translate(0)`, and `will-change` cleared.
  - Body: `--wipe` 63 % → 15 % → 2 % → 0, then `.wipe` removed from all 8 elements (3 paragraphs +
    5 values).
  - Principles: `--rule` .73 → 1 by 200 ms, then the items fade left to right (0.94 / 0.78 / 0 … at
    400 ms, all 1 by 1.5 s).
  - Plate:
    - frame segments sequential (100 / 41 / 0 / 0 at 250 ms, 100 / 100 / 100 / 56 at 500 ms);
    - labels and leaders from 8τ;
    - the sheen crosses −120 % → 220 % and is off-plate at both ends (screenshots at 0.2×
      timescale).
- **Parallax:**
  - Pointer at a corner: heading −3.99 px, plate −5.65 px, the copy untouched.
  - Scroll: plate +22.63 → −0.75 → −22.59 px across its trigger; heading up to ∓16 px.
- **Dim floor.** 21 scroll steps through DOSSIER at 1440×900, 800×900 and 390×844, each settled.
  - No text wholly on screen above the 72 % line is below 0.60, masked or unrisen.
  - The only exception, one step at 390, is the heading sitting within its own parallax offset of
    the trigger line.
  - **Known and inherent to §9.5's trigger:** up to 6–8 not-yet-revealed elements wait at opacity
    0 in the bottom 28 % of the viewport until they cross the line.
- **Leaks** (Firefox, after every reveal has played):
  - Motion toggle ×3: **24–25 children / 13 triggers ON, 1 / 5 OFF** every cycle, the same OFF
    baseline as 6b.
  - First load has 17 triggers because the 4 reveal triggers exist until played, and rebuilds skip
    them.
  - Resizes 1440 ↔ 1000 ×2, 800 and 600 round trips: 13/12/11 triggers stable; DOSSIER stays at rest
    with no replay; no errors.
- **Reduced motion (OS pref):** no splits, no `.wipe`, every text at opacity 1, hairlines and frame
  drawn, sheen off-plate, no `translate`.
- **CLS** (Chrome): 0.0031 at load (E28's hero morph, as before). The DOSSIER heading morph adds
  **~0.002** (0.003 at 6× CPU), every source `DIV.char`. That's E28's, left to 11b.
- **LCP** is `.hero__text` at 36 ms (316 ms at 6× CPU).
- **No JS** at 1440/900/640: 5 sections, no hidden text, no overflow.

**Carried forward:**
- **Not caused by 7a (reproduced at HEAD before this change):** crossing 900 px resets the scroll
  position to 0, because the registry rebuilds the smoother (checkpoint 4). It's worth fixing in
  11a/11b's audit.
- **9b / 8a:** §9.7's card sheen and §9.8's LINK CTA sheen may hit E35's contrast problem too,
  wherever they pass behind text.
- **Left alone, owned elsewhere:** E25 (7b's lattice edges), E27/E28 (11b), E3 (9a), E16–E18 (10),
  E19 (11a).

### Checkpoint 7b — LATTICE

**2026-09-28** · commit `refactor(webpage): checkpoint 7b — LATTICE`

§6.5's geometry and §9.6 are built in `sections/stack.js`, imported from `sections/index.js`
(§12.2 already listed it). CP3's markup is unchanged: above 640 px, with the tier not NONE, JS adds
`.lattice.is-graph`, positions each node's `<li>` and each cluster label, and prepends one
`<svg class="lattice__edges">`. The columns stay the layout at `s`, with no JS and at tier NONE (a
NONE result arriving after boot reverts to them). The DOM order, and so the tab order, is the
columns'.

**Errata decisions (user, this session):**
- **E25, 7b's part:** edges keep `pathLength="100"`, and the growth tweens `stroke-dasharray '0 100'
  → '100 0'` directly, as the hero ring and plate chamfer do. E25 is now fully resolved.
- **New E38 (clusters):** four across where the measured spans fit, 2×2 otherwise.
  - As first built, each cluster's origin was snapped to one shared lattice. Measured, that lost up
    to one step per cluster to rounding and parity: 4-across never fit, even at the 1200 px max
    content width, and 641–699 px fell to one column.
  - **Second user decision:** each cluster is its own lattice (no edge leaves a cluster, so every
    edge keeps its axis). Clusters are packed exactly a gutter apart, and rows of clusters share a
    lattice row.
  - Result: 4-across from 1280 px viewports, 2×2 from 641 to 1279. The one-column arrangement
    survives only as a guard and is never reached at any tested width.
- **New E39 (axes):** edges are `k·b₁`, `k·b₂`, `k·(b₁+b₂)` only, and the wireframe is topology.
  Rows are two lattice units apart (so no two rows' capsules touch), as are nodes sharing a row.
  Three wireframe edges had no legal geometry in a two-column cluster and were replaced by the
  nearest legal ones: Java–C/C++ (for Go–Java), SQL–MongoDB (for FastAPI–SQL), and Traefik–Caddy
  (for Docker–Caddy and Traefik–Linux). gRPC–MongoDB follows the wireframe's diagonal under gRPC.
- **New E40 (mono `font-stretch`):** connected-node labels tween `letter-spacing 0.08em → 0.12em`.
  The §9.8 row label and §9.9 rail item hover have the same no-op and stay open for 9b and 9a
  (markers added).
- **Owner decision, §12.7:** total JS budget **224 → 228 KB**.

**My decisions where the spec is silent (written into §6.5/§9.6):**
- **Roots.** Each cluster's root is its first node, which is also its topmost, so its branch chain
  crosses none of its own nodes. Those are the same nodes 6b's `columnRoots()` already measured, so
  6b's feed needed no new API.
  - It's renamed `clusterRoots()` and still reads the first node's offsets on every refresh.
  - `place()` runs on `refreshInit`, before that read.
  - Each `<li>` is the node's rest box (left/top/width, no translate), and the button centres in
    it, so the offsets are the node's even while a linked label tracks out.
  - This deviates from the plan's "shared getter": it's the same data with no coupling between
    chunks.
- **Cluster labels** sit above the root, starting `0.022·vh + 8 px` right of its centre: clear of
  the branch chain's half-width (§7.3).
- **Growth timing.** Clusters grow in parallel. Edge `k` of a cluster starts at `3τ + k·0.5τ`, and
  the root seats from its centre at 0 with the cluster label. Infra's 9 edges rest at 13τ.
  - Each edge is drawn from the end BFS dequeued first.
  - A node seats on its first incoming edge's completion, `transformOrigin` at that edge's start in
    node-local px.
  - Label opacity is cleared at rest, so the hover's CSS dim can reach it.
- **Hover.** Colour, tracking and the dim are CSS transitions on classes (`is-lit`, `is-linked`,
  `is-active`, `.lattice.is-focus`), in 1τ and out 2τ. Only the 1.06 seat is a tween (`back.out`
  has no CSS form).
  - Hover and focus share one state, hover winning.
  - `.node`'s static CSS `scale(1.06)` hover is gone: it would have scaled under reduced motion and
    smeared the growth's tween.
  - `.node` transitions now use the `--ease-*` tokens (E-ease; 7b owns `.node`).
- **The dim is on the label and border, not the capsule.** First built as opacity on the button,
  it made the `--void` ground translucent, and the branch chain showed through the root labels
  (screenshot). The border goes to `color-mix(… --hairline 60 %)`.
- **Edges** use `--hairline-strong` (§9.6 names no colour; `--hairline` at 0.22 barely read), 1 px,
  `Highlight` when lit in forced colours.
- **Readout:** the cluster's name, restored to the authored "22 nodes · 4 clusters" markup on
  leave. E6 (JS writing text) stays 11b's.
- **LOW** is read from `signals.tier`, live. A LOW result before the growth has played kills its
  trigger and jumps it to rest.
- **Arrow-key traversal:** deferred, not built.

**Verified** in headless Firefox (desktop pointer prefs) against `vite preview`:
- **Build:**
  - entry `index` 4.25 + `depth` 2.23 + `easings` 58.91 = **65.39 kB** against ≤ 66;
  - sections **3.60** (was 1.21), stage 5.73, late 14.55, `three` 135.68;
  - **total 224.95 kB against the new ≤ 228**;
  - CSS 5.85 kB.
- **Geometry**, at 641 / 700 / 900 / 901 / 1100 / 1280 / 1440 / 1920:
  - graph at every width, the edge angles are {30, 90, 150}° exactly, no overlaps between capsules
    or labels (4 px margin), no edge under a non-incident capsule, the lattice inside its box, no
    page overflow;
  - lattice heights 766 px (2×2 at 62 px pitch), 990 px (2×2 at 88), 594 px (four across).
- **Growth (1440):**
  - 150 ms: roots overshooting at 1.08, cluster labels at 2.39 px of tracking and 0.86 opacity, no
    edges drawn;
  - 500 ms: first edges at 99 / 95 / 72 of 100;
  - 1.0 s: every edge drawn, nodes mid-seat;
  - 1.7 s: all 22 nodes at scale 1, labels at 2.04 px = 0.18em.
- **Hover = focus:** hovering and `focus()`ing gRPC give identical class sets, label opacities and
  letter-spacing, and the same `matrix(1.06…)`. There are 3 lit edges, 3 linked nodes at 0.12em,
  18 labels at 0.60, and the readout says "Backend"; leaving restores everything.
- **Dim floor:** the minimum label opacity while hovering is 0.60, i.e. `--silver-light` on
  `--void` = **4.96:1**.
- **Keyboard:** Tab from the heading visits all 22 nodes in DOM order, all on screen at 1440.
- **Branch roots:** the four chains end on Python / Docker / Flutter/Dart / Git (screenshots at 1440
  and 800).
- **`s` (600 px):** columns, no SVG.
- **Reduced motion:** graph, edges drawn (`dasharray none`), no scale; hover lights 3 edges at 1 px,
  dims nothing, and swaps the readout.
- **Forced LOW** (`hardwareConcurrency` 4): edges drawn and nodes at rest 150 ms after scrolling in,
  with no growth; hover has no scale and no dim.
- **WebGL off:** tier NONE, columns.
- **Leaks:**
  - Motion toggle ×3: **27 children / 14 triggers ON, 1 / 5 OFF** every cycle, the same OFF
    baseline as 6b and 7a. ON is 7a's 13 plus the STACK heading's scroll depth, which 7b's
    `sectionHeader` call newly registers.
  - Resizes 1000 / 800 / 600 / 1100 / 1440: 12–14 triggers, graph on and off across 640 px, no
    errors.
- **No JS** at 1440 / 900 / 640: 5 sections, no hidden text, no overflow, no graph.
- **Not measured this session:** CLS/LCP in Chrome. The graph switch happens at boot, below the
  fold, and the growth is transform/opacity only, so neither should move; worth confirming in 11b.

**Carried forward:**
- **9a / 9b:** E40's `font-stretch` on mono text in your rows (rail item hover, LINK row label).
- **11b:** at 2×2 (641–1279 px) the lower clusters' branch chains pass behind the upper clusters,
  and behind the STACK heading at every width. The heading, cluster labels and nodes aren't
  `[data-copy]`, so the §7.6 guard doesn't dim links there. It's worth a look in the I2 audit. E21's
  "4.6:1" is measured here as 4.96:1.
- **8a:** sections chunk headroom inside the 228 KB total is ~3 KB.
- **Left alone, owned elsewhere:** E5 (11b), E6 (11b), E21 (11b), E27/E28 (11b), E3 (9a), E16–E18
  (10), E19 (11a), E37's card part (8a).

### Checkpoint 8a — WORKS pin

**2026-09-28** · commit `refactor(webpage): checkpoint 8a — WORKS pin`

The WORKS pin and card entrances from §9.7 are built. The new files are both already listed in §12.2:
- `sections/projects.js`, imported from `sections/index.js`;
- `util/scramble.js`.

Above 900 px `#works` pins and scroll drives the track's `x` 1:1. At ≤ 900 px CP3's vertical stack stays.

**Errata decisions (user, this session):**
- **E37, card part:** each card's chamfer tweens `stroke-dasharray '0 100' → '100 0'` (3τ, mask, at 6τ), the same way the hero ring, the plate chamfer and the lattice edges do. E37 is now fully resolved.
- **New E41 (full-bleed while pinned).** §9.7's `D = scrollWidth − innerWidth` didn't fit `#works`' 1568 px `--container-wide` cap. On a 1920 window the clipped viewport cut the cards off ~176 px from each edge, and the track travelled 352 px too far.
  - While `#works.is-pinned`, the viewport spans the window's layout width. `--bleed` is written from `document.documentElement.clientWidth` on every `refreshInit`, so the scrollbar never overflows the page.
  - The track's leading pad grows by the same inset (`motion.css`, scripting only), which keeps card 01 on the header's edge.
  - `D = track.scrollWidth − viewport.clientWidth`.
  - Measured: card 01's left edge equals the header's at 1440 (40 px), 1920 (210) and 2560 (530), and there's no page overflow. §6.6 and §9.7 now say this.

**My decisions where the spec is silent (written into §9.7):**
- **Cards already inside the 78 % line at rest.** At 1440, cards 01 and 02 sit left of the line with the track at `x = 0`. On `containerAnimation` alone they'd wait invisible through the whole vertical approach, about one viewport, until the pin started. So every card also gets a vertical `top 78%` trigger, which plays it only if it's left of the line at that moment. Measured: 01 and 02 play as the section rises, 03 at `x ≈ −400…−1000`, 04 later.
- **`refreshPriority: 1` on the pin,** so it refreshes before any trigger below it, whenever that trigger was created. **9b:** your LINK header reveal is built in the splits context, before the pin exists, and this is what keeps it correct.
- **Depth, n = 1:** pointer parallax on every card. Scroll parallax only at ≤ 900 px, because inside the pin it would drift a card ±22.6 px vertically while it travels horizontally (the scope allowed dropping it; this is that call).
- **Nothing is hidden in CSS** (5b/7a's rule). Each card's entrance is a paused timeline built with the branch, so its from-states apply at build and a dead chunk leaves WORKS complete.
  - Entrances are once per page. A rebuild after a card has played leaves it authored.
  - The title row is built by `onSplit('title')`, paused unless its card is already playing. The card's timeline starts it at 1τ. A re-split mid-entrance resumes where SplitText restores it, and a new split of a played card builds nothing.
  - At rest, `onComplete` clears the inline `transform`, `opacity`, `letter-spacing` and `stroke-dasharray`, so CP3's CSS hover lift still works. While an entrance plays, the card's inline `transition-property: border-color` stops the CSS transform transition from smearing the `y` tween.
- **Scramble:** one `ease: 'none'` `to()` tween that writes at most every 1/12 s. Positions settle left to right, and the authored text is restored on complete and on interrupt. It's a `to()` rather than a `fromTo()` so a paused entrance never touches the index.
- **Chain drive without the stage chunk.** Importing `gl/stage.js` from the sections chunk would pull `three` in early. `sections/chain.js` gained `driveChain(px)`, which holds the last value, and `setChainBuilder(fn, chain.drive)` forwards it. A stage that lands mid-pin picks the value up.
- **Guard (6a's handoff).** `util/rect.js` gained `shiftCopy(root, fn)`, and `copyRects(scrollTop)` applies each shift per frame. The stage now passes its `scrollTop`. The pin registers `[−d, d]` with `d = clamp(scrollTop − pin.start, 0, D)`, covering both the pin's hold and the track's travel. `rect.js` became its own 0.37 kB shared chunk.
- `about.js` now exports its `wipe()` helper for the card body.

**Verified** in headless Firefox (desktop pointer prefs) and chrome-headless-shell 154, against `vite preview`:
- **Build:**
  - entry `index` 4.29 + `depth` 2.23 + `easings` 58.91 = **65.43 kB** against ≤ 66;
  - sections **4.81** (was 3.60), `rect` 0.37, stage 5.64, late 14.55, `three` 135.68;
  - **total 226.48 kB against ≤ 228**;
  - CSS 5.95 kB.
- **Pin 1:1:** at 8 scroll positions across the pin, `x(track) = −clamp(scrollTop − start, 0, D)` exactly, in Firefox and in Chrome.
- **Scroll extent (§6.1, "~310 vh"):**
  - At 1440×900: D = 2404 px (267 vh), plus the 824 px pinned section, ≈ 359 vh.
  - At 1920×1080: D = 2334 (216 vh), ≈ 292 vh.
  - At 1280×700: D = 2484.
  - The last card's right edge rests at the viewport centre, per §6.6's trailing 50vw.
  - The pinned section is 824 px tall at every width. At 700 px tall its bottom padding is cut, and the cards (bottom at 560 px) aren't.
- **Survives resize:** mid-pin at 1440 → 1000 → 1920 → 1440 → 800 → 390 → 1440, D, `end` and `x` are recomputed and exact every time. Crossing 900 px removes the spacer and the `.is-pinned` class, the track goes `column`, and the chain goes to `h = 0`.
- **Chain locked:** 600 px of travel moved the phase **21.044** links, exactly `600 / (0.72·0.044·900)`. `signals.axis` is `(1, 0)` only while pinned. The chain is horizontal (`h = 1`) at pin start, and the LINK loop still closes after the spacer (`loop = 1` at `#link` top centre).
- **Entrance, card 03 sampled:**
  - Before: opacity 0, `y 24`, chars at `yPercent 100` / `wdth 88`, kicker 0.3em / 0, body `--wipe 100%`, tags 0.6, dash `0 100`.
  - Mid-flight: chars `wdth 99.5/99.2/98.6` staggered, kicker 2.03 px, wipe 23 %, tags 0.69.
  - At rest: every inline style cleared, `transform: none`, kicker 0.14em, dash `none` (drawn).
  - The index wrote `28 → 09 → 03`, three writes in 3τ.
- **≤ 900 px** (800×900 and 390×844, fresh loads): no spacer, and each card goes from 0 to 1 only after its top passes 78 %.
- **Guard:** mid-pin, every card body's cached rect matches `getBoundingClientRect()` to within 1 px.
- **Velocity** still updates at the colophon after the pin spacer (wheel: −0.48 … +0.17).
- **Leaks:**
  - Motion toggle ×3 mid-pin: **26–28 children / 15 triggers ON, 1 / 5 OFF** every cycle. That's the same OFF baseline as 6b–7b. First load has 25 triggers because of the once-triggers.
  - Resizes and 900 px crossings: 15–17 triggers, no errors.
- **Reduced motion (OS pref):** no pin, no spacer, no splits, no `.wipe`, nothing below opacity 1. The viewport is CP3's native scroller.
- **CLS (Chrome):**
  - 0.0101 at load, E28's hero morph as before.
  - The whole WORKS pass adds ~0.0005, sources `DIV.char` (the title `wdth` 88 → 100). That's E28's, left to 11b.
  - LCP is `.hero__text` at 40 ms.
- **No JS** at 1440 / 900 / 640: 5 sections, no hidden text, no overflow, and the viewport is `overflow-x: auto` at 1440.

**Carried forward:**
- **8b:**
  - The pin's `onUpdate` (`drive`) is where the readout goes. The pin is `ScrollTrigger.getAll().find((t) => t.pin)`, or restructure `pinned()` to share it.
  - `setFocusIn()` isn't wired. **Tabbing to an off-screen card strands focus until 8b.**
  - Deep links aren't built.
  - Reduced motion on desktop is still CP3's native horizontal scroller; §9.7 asks for a vertical stack.
  - LOW keeps the pin with no tether or sheen, and 8a builds neither.
  - The CSS hover lift and border from CP3 are untouched.
  - The cards' CSS transitions still use the plain `ease` keyword (E-ease's conversion is the owner's; 8b owns hover).
- **8b / 11a:** toggling motion OFF mid-pin removes the spacer, and the registry holds the reader's px position, so they land ~D px further down the page (in LINK at 1440). Same class as 7a's "crossing 900 px resets scroll" note.
- **Left alone, owned elsewhere:** E7 (8b), E28 (11b; the title morph adds to it), E3/E40 (9a, 9b), E16–E18 (10), E19 (11a), E27 (11b).

### Checkpoint 8b — WORKS interaction

**2026-09-28** · commit `refactor(webpage): checkpoint 8b — WORKS interaction`

The §9.7 interaction layer on 8a's pin is built: keyboard focus, card deep links, the hover set (lift, border, sheen, tags, chain tether), the progress readout, and the reduced / LOW branches. New file `gl/tether.js`, added to §12.2. `index.html` gained the four card ids.

**Errata decisions (user, this session):**
- **E7:** §9.7 wins. The card handler is ScrollSmoother's `onFocusIn`, plugged in through CP4's `setFocusIn()`, with no `focusin` listener of our own. §10.4's Focus-order row and §13's row 5 are reworded.
- **New E42 (card sheen vs I2):** reuse E35's cap. `.card::after` runs at opacity 0.22, so under the band's peak `--blue-lift` holds 4.62:1 and body copy 7.89:1 (1.23 and 2.10 at full strength).
- **New E43 (tether geometry):** a 3-link stub rising from the spine at the card's left edge, at §7.3's pitch. It points at the card and does not reach it (≈ 250 px gap at 1440×900 against ≈ 85 px of links). It's drawn in the LATTICE branch's `InstancedMesh`, which is idle during WORKS, so draw calls stay ≤ 3.
- **New E44 (card ids):** `#work-01` … `#work-04` on each `<article data-card>`, numbered so a project rename never breaks a shared URL.

**A bug in §9.7's own snippet, fixed in code and text:** `e.target.closest('[data-card]')` never matches. The focusable element is the `<a class="card__link">` *around* the article, so the lookup resolves up to `.card__link, [data-card]` and back down.

**My decisions where the spec is silent (written into §9.7 / §6.6):**
- **Pointer focus doesn't move the pin.** `onFocusIn` fires for every focus, clicks included. Only `:focus-visible` focus jumps, since a clicked card is already under the pointer. Every card focus returns `false`, so the smoother never re-centres one either. Measured: a mousedown on half-visible card 04 left `scrollTop` unchanged.
- **Where a focused card lands:** where card 01 rests, i.e. travel = its offset from card 01. The travel is clamped to `[1, D − 1]`: exactly on `pin.start` / `pin.end` the pin reads inactive (Shift+Tab back to card 01; card 04 at 1920, where its offset exceeds `D`), which released the chain and flipped `axis`.
- **An unplayed entrance plays on focus,** so focus never sits on a card at opacity 0 waiting for its trigger.
- **Deep links** go through a new `setHashTarget()` in `core/smoothscroll.js`, the same settable-hook pattern as `setFocusIn`. It covers the load hash, clicked in-page anchors and `hashchange`. The pinned branch maps a card to `pin.start + travel`. The ≤ 900 px stack under the smoother applies the card's `scroll-margin-top` (rail + gap), because the smoother's element form ignores it. Native jumps (reduced motion, no JS) use it directly.
- **Readout:** written in the pin's `onUpdate` / `onToggle` (8a's `drive`) and at build. Unpinned it rests as authored (`01 / 04`, empty bar), and teardown restores that.
- **Hover is for linked cards only** (01, 04), per §6.6's "no hover lift" for cards without a URL, extended to the sheen and tether.
- **Lift ease:** §9.7's table said `chain`, but the lift is a CSS transition, and §9.2's CSS rule (E-ease, 5b) says lifts are `glyph` and `back.out` stays in GSAP. So it's 1τ `--ease-glyph`, and the §9.7 cell now says so. Border 2τ metal.
- **Tags:** §9.7's 2τ metal applies only in the card-hover state (`.card__link:hover .tag`). The base `.tag` rule and its `ease` keyword are §9.10's tag micro-state, which is 9b's.
- **Keyboard twin:** `:focus-visible` parks the sheen at the card's centre and seats the tether. A `focusout` listener on the viewport retracts the tether. It never scrolls, so it can't race the smoother. It's the one listener §9.7 now names as allowed.
- **Sheen gating:** `.works--sheen` on `#works` is set from `signals.tier` (absent at LOW and NONE, per §9.7's LOW row). The pointer lerp runs on the ticker only while a card is hovered.
- **Reduced motion on desktop:** the vertical stack is CSS keyed off `html[data-motion="reduced"]` (8a's carried item), so no-JS keeps CP3's native scroller. Hover is border and colour only there (§10.1), with no lift.

**Verified** in headless Firefox (desktop pointer prefs) and chrome-headless-shell 154, against `vite preview`:
- **Focus never strands.**
  - Real Tab / Shift+Tab key presses: last lattice node → card 01 → card 04 → LINK row → back again.
  - Run at 1440×900, 1920×1080 and 1280×700 in Firefox, and at 1440 / 1920 in Chrome.
  - Every focused element is wholly in the viewport **150 ms after the key press** and again at 1.5 s. The card's opacity is 1, and card 01 / 04 rest at x = 39–40 (1440) and 209–241 (1920).
  - Screenshots checked by eye.
  - At 800 px the stack tabs natively, all in view.
  - Only cards 01 and 04 were focusable in this first pass. 02 and 03 have no link (§6.6), and the owner's manual pass found them skipped. Fixed in the follow-up below.
- **Readout never lags:** at 9 positions across the pin, the label equals §9.7's formula and the bar equals `scaleX(progress)`, and progress equals the track's `−x / D`, all read in the same frame.
- **Cards never scaled:** on hover the transform is `matrix(1, 0, 0, 1, 0, −6)`.
- **Hover:**
  - border and tags go `--hairline-blue`, and the sheen class is on at 0.22;
  - `--sheen-x` follows the pointer (20.48 % for a pointer at 0.74 of the width, matching (0.9 − f) / 0.8);
  - the tether draws 3 instances, with 2 draw calls;
  - unlinked card 02 gets nothing, and leaving retracts the tether.
- **LOW** (`hardwareConcurrency` = 4): pin kept, lift kept, no `.works--sheen`, sheen opacity 0, tether 0, 1 draw call.
- **Deep links:**
  - fresh loads of `#work-01…04` land at x = 39/40, top 257, pin active, label `0N / 04`, in Firefox and Chrome;
  - `hashchange` and a clicked `#work-02` anchor behave the same, and focus moves to the article;
  - 800 px and reduced motion land the card at top 91 / 96, below the rail;
  - no JS at 1440 / 900 / 640: 96.
- **Reduced motion (OS pref):** `flex-direction: column`, no lift, no sheen, no tether.
- **Leaks:** motion toggle ×3 mid-pin gives 27–28 children / 15–16 triggers ON and 1 / 5 OFF every cycle, the same as 8a. Focus still works after the toggles and after 1000 → 800 → 1920 → 1440 resizes.
- **No JS** at 1440 / 900 / 640: 5 sections, no hidden text, no overflow, the viewport is `overflow-x: auto` at 1440, and the sheen stays at 0.
- **Build:**
  - entry 4.31 + 2.30 + 58.91 = **65.52 kB** (≤ 66);
  - sections **5.58** (was 4.81), stage 6.08 (was 5.64), rect 0.37, late 14.55, `three` 135.68;
  - **total 227.73 kB against ≤ 228**: 0.27 kB of headroom left;
  - CSS 6.06 kB.

**Carried forward:**
- **Budget:** the ≤ 228 KB total had 0.27 kB left after this first pass. The follow-up below raised it to 232 KB.
- **9b:**
  - The base `.tag` transition still uses the plain `ease` keyword. It's §9.10's tag micro-state and yours to convert.
  - The card `.card__go` colour change is still an untransitioned CSS hover (CP3).
- **11a:**
  - 8a's "toggle OFF mid-pin lands ~D px further down" is unchanged. It lives in the registry's `setMotion`, not in WORKS.
  - `.card::after` is hidden in forced colours. Reduced transparency needs nothing more for it.
- **10:** the tether shares the chain's material, so it picks up the metal pass with no extra work.
- **Owner request, outside 8b's scope (same commit):** the LINK email row's two intent chips (`New offer`, `Personal inquiry`) are removed.
  - The row is now a plain `row__link` like rows 01, 02 and 04 (glyph and underline included), so 9b's row hover covers it.
  - Its href is `mailto:leo@omniserv.me?subject=%5BTopic%5D&body=Hi%20Leo%2C%0A%0A`: a `[Topic]` subject and a "Hi Leo," first line for the sender to overwrite.
  - Removed `.row__chips`, `.chip`, `.row__link--static` and the forced-colours `.chip` selector.
  - §2.1, §6.7 and §9.8 are updated, and **E8 is closed as moot** by the owner's decision. 9b has no chip entrance to build.
  - The DOSSIER plate's plain `mailto:` is unchanged.
- **Left alone, owned elsewhere:** E28 (11b), E3/E40 (9a, 9b), E16–E18 (10), E19 (11a), E27 (11b).

**Follow-up — every card a tab stop, every focus scroll animated** · commit `refactor(webpage): checkpoint 8b — focus every card, animate focus scrolls`

The owner's manual tab pass found two problems with the first 8b commit. Tab / Shift+Tab skipped cards 02 and 03, and focus moves *jumped*. The second came from §9.7's own `smooth: false` and from ScrollSmoother's built-in instant `scrollTo(el, false, 'center center')` for every other focus. **Owner's decision:** every card is a focus stop, and no scroll the page makes for the reader cuts.

**Cards 02 and 03.**
- Each is wrapped in `<div class="card__stop" tabindex="0" role="group" aria-labelledby="work-0N-h">`, and every card title got an id.
- It's a wrapper and not `tabindex` on the article, because `.card`'s `clip-path` would clip the article's own outline.
- The accessible name resolves to the title ("uWeMe").
- The focus ring is the only affordance: no lift, border, sheen or tether (§6.6).
- `cardOf` / `itemOf` resolve through `.card__link, .card__stop`.

**Animated focus.** `glide(target, position)` in `core/smoothscroll.js` is now the one path for:
- card focus;
- any other off-screen focus (it replaces the plugin's instant fallback via `onFocusIn`);
- clicked anchors;
- `hashchange`.

How `glide()` scrolls:
- **Under a smoothing smoother:** `scrollTo(target, true)`, i.e. the smoother's own 1.2 s catch-up. The pin scrubs the track and chain through the travel.
- **On a touch device:** ScrollSmoother does no smoothing (§9.1 sets no `smoothTouch`), so its smooth `scrollTo` is instant. `glide()` tweens the scroll position itself over 10τ with `mask`.

Two moves stay instant, both deliberate:
- **The hash at load.** There's no earlier view to travel from.
- **Reduced motion.** It's native, and a new `staticStates` branch in `projects.js` brings a partly visible focused card wholly in with `scrollIntoView({ block: 'nearest' })`. It had been taking focus half below the fold (card 03 at 875–1068 px of 900).

§9.7, §6.6 and §10.4 now say all this.

**Test-harness pitfall, for every later session:** chrome-headless-shell matches `(hover: none)`, so `ScrollTrigger.isTouch === 1` and ScrollSmoother does no smoothing: Chrome runs so far were all **touch mode** (8a's included). Launch with `--blink-settings=primaryPointerType=4,availablePointerTypes=4,primaryHoverType=2,availableHoverTypes=2` to test as a desktop. `smoother.scrollTop()` is the scroll *target*, so measure rendered motion from `#smooth-content`'s transform and the track's `x`.

**Verified**, sampling the rendered position every animation frame for ~1.9 s after each key press. The sequence is Tab from the last lattice node through 01 → 02 → 03 → 04 → LINK row 01, then Shift+Tab back.
- **Tab order and view:** all four cards are visited in both directions. Each focused element is wholly in view once settled, its card at opacity 1, and the readout reads `0N / 04`.
- **Firefox**, 1440×900 / 1920×1080 / 1280×700:
  - every move is monotonic over 43–61 distinct frames;
  - the largest single-frame step is 8–12 % of the move, up to 17 % on the ease's first frame for moves over 1100 px.
- **Chrome (desktop pointer):** glides at ~26 fps; card 01 → 02 took 833 ms along `1 → 355 → 572 → 677 → … → 784`.
- **Chrome touch mode:** glides through `glide()`'s tween, monotonic over 22–30 frames.
- **`hashchange` to `#work-03`:** 61 frames, largest step 9.4 %. A load on `#work-02` still lands at rest instantly.
- **Reduced motion:** Tab reaches 01 → 04 → LINK, with every card wholly in view.
- **No JS:** Tab reaches all four cards, but the first stop is Firefox focusing the scrollable `.works__viewport` itself. Firefox's native focus scroll leaves a partly visible card where it is (02 at 824–1544 px, 04 at 1138–1858 px of 1440): browser behaviour with no script to change it.
- **Screenshots:** cards 02 and 03 focused mid-glide and at rest, with the ring whole around the chamfer corner.
- **Regressions:**
  - motion toggle ×3: 28 / 15 ON, 1 / 5 OFF;
  - hover, LOW (no sheen, no tether, 1 draw call) and the tether (3 instances, 2 calls) are unchanged.
- **Build:**
  - entry 4.31 + 2.47 + 58.91 = **65.69 kB** (≤ 66);
  - sections 5.66, stage 6.08, rect 0.37, late 14.55, `three` 135.68;
  - **total 228.03 kB against the new ≤ 232**.

**Owner decision, §12.7:** total JS budget **228 → 232 KB**. The glide helper and the reduced-motion focus fix brought it 0.03 kB over 228 after trimming, and 232 leaves ~4 kB for 9a and 9b. Owner's manual tab pass on this build: good.

### Checkpoint 9a — Nav rail

**2026-09-28** · commit `refactor(webpage): checkpoint 9a — Nav rail`

§9.9 is built in the new `sections/nav.js`, which lives in the sections chunk (imported from `sections/index.js`). It adds the shrink, the active indicator, the item hover, and the mobile panel with its focus trap and scroll lock. All three registry branches build the same parts, and reduced motion only makes the panel instant. The rail and panel CSS in `components.css` were converted to the `--ease-*` tokens (E-ease: 9a's own keywords).

**Errata decisions (user, this session):**
- **E3 (9a's part):** the indicator Flip is 3τ `mask` (≈ expo.out), the curve §9.2 gives hairline draws. That closes every part of E3, so the §9.2 marker is gone too.
- **E40 (9a's part):** the rail item hover is `font-weight 400 → 560`, 1τ `--ease-glyph`, with the colour on `--ease-metal`. A monospace advance doesn't change with weight, so nothing in the row moves; measured below.
- **E40, widened:** §9.9's panel-item entrance `font-stretch 88% → 100%` was the same no-op in 9a's own material. The user chose to match the hover's axis: `font-weight 300 → 400` with the `y 24 → 0` rise. It's recorded in E40's row rather than as a new one.

**My decisions where the spec is silent (all written into §9.9):**
- **Indicator ranges.** Each section's trigger runs `top center` → `max`, and the active item is the last trigger started, resolved in one microtask per update.
  - The first build tiled the ranges with an `endTrigger` at the next section. WORKS's end was *not* offset by the pin spacer: the indicator dropped out for most of the pin's travel (scroll ≈ 3490 → 5750 at 1440).
  - Start-only triggers can't leave a gap.
  - Resolving once per update makes a multi-section jump one Flip, not a hide and a re-place.
- **In IDENTITY,** the indicator goes back to `.rail__nav`, where CP3's rule hides it. Moves from or to hidden are plain `appendChild`, and so is every move before `late()` has Flip.
- **An interrupted Flip is finished before the next move** (`progress(1).kill()`, after `getState` has read the mid-flight box). Killing it outright left its inline `transform` / `width` behind.
- **Shrink under reduced motion:** it still toggles, because the compact ground is what keeps the rail readable over content. §10.1's "hover: colour only" is `html[data-motion="reduced"]` resetting the weight.
- **Panel:**
  - GSAP tweens `--sweep` (still CP3's registered `<number>`), and the CSS transition and `.is-open { --sweep: 1 }` are gone. `.is-open` now only means "visible", and it holds until the close reverse completes.
  - Items start at 1τ, so the fourth one lands at 5τ with the sweep.
  - While open, `#smooth-wrapper` is `inert` and Tab / Shift+Tab cycle the toggle + panel links + panel CTA, so the menu can always be closed by keyboard.
  - Scroll lock is `smoother.paused(true)`, or `overflow: hidden` on `<html>` under reduced motion (there's no smoother).
  - A panel link closes the panel synchronously in its own click listener, which runs before the document-level anchor handler, so the glide runs unpaused and focus can land in the un-inerted page.
  - A rebuild (breakpoint, motion toggle) closes the panel instantly.

**A bug found and fixed while verifying:** on a rebuild, `ScrollTrigger.create` fires `onToggle` synchronously. The first version touched a `let` before its declaration, and the TDZ error aborted the rest of that branch on every 900 px crossing. The declaration now comes first.

**Verified** in headless Firefox (desktop pointer prefs) against `vite preview`. chrome-headless-shell is not installed on this machine any more, so Chrome was not re-run.
- **Indicator lands exactly.** Clicking through DOSSIER → LATTICE → WORKS → LINK → back, after each glide settles, the indicator's left / width equal the item `li`'s to 0.0 px:
  - 1440: 502.5/75.1, 601.6/75.1, 700.7/65.1, 789.8/65.1;
  - 1920: 742.5 … 1029.8.
  - Mid-glide it is part-way through its Flip (`translate3d(−37.2px…)`), with no inline styles left once settled.
  - Back at IDENTITY it's `display: none`.
  - A MutationObserver across a full tour shows only item-to-item moves, never a hidden gap inside the pin.
- **Before / without Flip:** with the `late-*.js` request aborted, the same tour lands on every item with the same figures.
- **Reduced motion (OS pref):**
  - the indicator follows every section;
  - hover weight stays 400;
  - the panel opens and closes instantly with `overflow: hidden`, the trap and Escape;
  - a panel link jumps natively to WORKS.
- **Shrink:** `.is-compact` at 80 px; compact computed height 56px, `blur(14px)`, ground `--void` / 0.72, hairline `--hairline`, all four transitions `cubic-bezier(0.5, 0, 0.5, 1)`.
- **Hover:** weight 560, colour `--chrome`, and every item's left / width identical before and after (742.53:75.08 … 1029.83:65.13 at 1920).
- **Panel at 800 px:**
  - Enter on the toggle gives `aria-expanded` true, the panel not inert, the wrapper inert, and focus on "02 About".
  - `--sweep` 0.77 at 80 ms and 1 by 900 ms, with the items staggering in (weight 347 → 400, y 12.6 → 0).
  - A wheel of 800 px while open leaves the scroll position unchanged (paused).
  - Tab: About → Stack → Work → Link → Dossier CTA → toggle → About. Shift+Tab reverses.
  - Escape closes it (3τ reverse), then it's inert and hidden, focus on the toggle.
  - Clicking "04 Work" closes the panel, unpauses, glides to `#works` and focuses it.
  - A resize to 1100 while open closes it cleanly: no inert wrapper, `aria-expanded` false.
- **Leaks:** motion toggle ×3 at 1440 gives OFF 2 children / 10 triggers every cycle (8b's 1 / 5, plus the shrink and four indicator triggers). ON settles at 24–25 / 24 once the once-only reveals are used up. 800 ↔ 1440 ×2 gives 31 / 24 and 29 / 24, stable.
- **No JS** at 1440 / 900 / 640: 5 sections, 0 hidden text, no horizontal overflow, toggle / panel / indicator `display: none`, rail CTA shown.
- **Build:**
  - entry 4.32 + 2.47 + 58.91 = **65.70 kB** (≤ 66);
  - sections **6.59** (was 5.66), stage 6.08, rect 0.37, late 14.55, `three` 135.68;
  - **total 228.97 kB against ≤ 232**, leaving ~3 kB for 9b.

**Carried forward:**
- **11a:** a 900 px breakpoint crossing resets the scroll position to 0 (measured at HEAD before this checkpoint too: 2400 → 0 on 800 → 1100 px). It's the registry's `mm` rebuild, not the rail's. It sits next to 8a's "toggle OFF mid-pin" item.
- **9b:**
  - `.rail__cta` shares `.btn--metal`'s rule, and its `transform var(--beat-1) ease` is §9.10's `.btn--metal` micro-state, left for you to convert;
  - the panel CTA is a `.btn--metal` too;
  - E40's §9.8 row-label part is still open.
- **11b:** the panel lock uses `inert` on `#smooth-wrapper`. §10.4's audit should confirm screen readers can't reach the page behind an open panel. E13 (§9.9's `--sweep / 100%` text) is untouched.
- **Left alone, owned elsewhere:** E13 (11b), E16–E18 (10), E19 (11a), E27/E28 (11b), E40's 9b part.
