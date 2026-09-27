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

- [ ] 5. Kinetic type — design.md §5.4, §9.4 (split parts only)
      Scope: `split.js` with `document.fonts.ready` gate, hero name split+width morph, section
      heading splits, card title splits, the 102° mask-wipe utility.
      Done when: headlines animate on load with no visible reflow; resizing/re-splitting leaks no
      tweens (check `gsap.globalTimeline.getChildren()` count is stable).

- [ ] 6. Chain stage (WebGL) — design.md §7
      Scope: `js/gl/stage.js`, `chain.js`, catenary curve + phase spring + ripples, instanced
      links + material/env, `aDim` readability guard, tier probe (`tiers.js`).
      Done when: chain renders, bows at rest (~9% of H), snaps taut on fast scroll, visibly
      dims/mattes behind copy; tier probe correctly downgrades under forced LOW.

- [ ] 7. Choreography A — DOSSIER + LATTICE — design.md §9.5, §9.6
      Scope: section-header reveal, fact-plate draw + wipes, principles strip; lattice graph
      growth (BFS edge draws), hover/focus dim-and-highlight.
      Done when: both sections animate per spec; lattice hover never dims a label below the 0.60
      floor; keyboard focus on lattice nodes matches hover behaviour.

- [ ] 8. Choreography B — WORKS pinned track — design.md §9.7
      Scope: the pin (`containerAnimation`), card entrances, index scramble, hover/tether,
      progress readout, **the `onFocusIn` handler**.
      Done when: pin travels 1:1 with scroll; tabbing through cards never strands focus off-screen;
      vertical-stack fallback at ≤900px works; progress readout never lags.

- [ ] 9. Choreography C — LINK + colophon + nav rail — design.md §9.8–§9.10
      Scope: MorphSVG link-glyph hover, loop-snap once-per-visit, colophon reveal, nav
      shrink/Flip indicator, mobile panel sweep. Flip and MorphSVG are lazy (`core/lazy.js`):
      read them via `late()?.Flip` / `late()?.MorphSVGPlugin`, and the indicator's first placement
      must work without Flip (plain `appendChild`) — see checkpoint 4's log.
      Done when: glyph morph is clean (no wobble); loop snap + exposure flash fire once per visit;
      mobile panel opens/closes with focus trap and Escape handling.

- [ ] 10. Post-processing — design.md §8
      Scope: `EffectComposer` wiring, `metal.js` shader pass, `OutputPass`, exposure-flash
      uniform, CSS grain sheet.
      Done when: silver reads as brushed metal, no colour banding in dark ramps; `uAxis` flips to
      horizontal during the WORKS pin; MED/LOW tiers correctly drop the composer.

- [ ] 11. Degradation, a11y & SEO — design.md §10, §11, §14
      Scope: reduced-motion branches, `NONE`-tier CSS fallback, forced-colours block, focus-ring
      audit, JSON-LD + OG meta, `og.png` (flag as open item if no asset provided).
      Done when: every row of §10.4 verified; no-JS and no-WebGL both render complete, readable
      pages; Lighthouse a11y ≥ 95.

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
