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

- [ ] 3. Full static HTML + copy + components.css — design.md §2, §5.3, §6, §11 (title/meta only)
      Scope: all six `<section>`s in `index.html` with final copy verbatim from §6.2–6.8,
      `components.css`, legacy-hash map script inline, base `<title>`/`<meta description>`.
      Done when: page is complete, styled and readable with **zero JavaScript beyond the hash-map
      snippet** — this is invariant I1/I3's baseline. Every row of design.md §2.1 is accounted for.

- [ ] 4. GSAP rig — design.md §9.1
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
      shrink/Flip indicator, mobile panel sweep.
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
