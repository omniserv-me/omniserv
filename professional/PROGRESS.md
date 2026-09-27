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

- [ ] 2. Design tokens + base/layout CSS — design.md §3, §4
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
