# Session conventions — read this first

This file is the thing to point a **new, memory-less Claude Code session** at. It has no design
content of its own — for that, see `design.md` (the spec) and `PROGRESS.md` (the checklist + log
of what's actually been built). This file only answers "how do we work across sessions".

The refactor described in `design.md` is built as **11 checkpoints, one per session, one per
commit**, in strict order — each assumes every earlier checkpoint is already committed on
`refactor/webpage`.

## Kickoff protocol

Every session implementing a checkpoint starts the same way. The prompt to paste in:

> Read `professional/SESSIONS.md`, `professional/PROGRESS.md` and `professional/design.md`.
> Implement checkpoint N from PROGRESS.md — read the design.md sections it references closely.
> When done, verify against that checkpoint's "done when" criteria, check the box and add a log
> entry in PROGRESS.md, then commit.

Concretely, at the start of the session:

1. Read `PROGRESS.md` — find the first unchecked box. That's checkpoint N. Read its Log section
   for any note left by a prior session (an unchecked box can still have partial work and a note
   describing exactly what's left — don't assume a checked box's contents are correct without
   reading its log entry too, if one exists).
2. Read the `design.md` sections that checkpoint references. Re-read them closely — this repo's
   whole point is that design.md is meant to be transcribed, not reinterpreted.
3. `git log --oneline` to see prior checkpoint commits, and skim the diff of the most recent one
   (`git show --stat HEAD`) to see the actual code shape already in place, not just its description
   in the log.

## The checkpoint list

| # | Checkpoint | design.md refs |
|---|---|---|
| 1 | Scaffold & build config | §12.1–12.6 |
| 2 | Design tokens + base/layout CSS | §3, §4 |
| 3 | Full static HTML + copy + components.css | §2, §5.3, §6, §11 (title/meta only) |
| 4 | GSAP rig | §9.1 |
| 5 | Kinetic type | §5.4, §9.4 (split parts only) |
| 6 | Chain stage (WebGL) | §7 |
| 7 | Choreography A — DOSSIER + LATTICE | §9.5, §9.6 |
| 8 | Choreography B — WORKS pinned track | §9.7 |
| 9 | Choreography C — LINK + colophon + nav rail | §9.8–§9.10 |
| 10 | Post-processing | §8 |
| 11 | Degradation, a11y & SEO | §10, §11, §14 |

Full scope and "done when" criteria for each live in `PROGRESS.md`, not duplicated here — that's
the file that changes as work lands, this one doesn't.

**Checkpoint 8 (WORKS pinned track) is the highest-risk single session** — the pin, the
`containerAnimation` card triggers and the `onFocusIn` handler together are the trickiest
interaction in the spec. If a session runs long there, it's the one to split further
(pin + card entrances, then hover + focus handling + progress readout as a follow-up session)
rather than rushing the focus handler. Do not ship checkpoint 8 without manually tabbing through
every card — this is the one place a subtle bug is an accessibility regression, not a visual one.

## Verification

Every checkpoint has explicit "done when" criteria in `PROGRESS.md` — check every one of them
before committing, not just the ones that are visually obvious. Where a criterion says something
like "no leaked tweens" or "AA contrast holds", actually check it (`gsap.globalTimeline.getChildren()`
count before/after a re-split; compute the contrast ratio) rather than eyeballing it.

Baseline for every checkpoint from 1 onward: `npm run build` succeeds. From checkpoint 3 onward:
the page must still be complete and readable with JavaScript disabled (invariant I1/I3 in
design.md §1.3) — re-check this at every later checkpoint too, since it's easy for a later
session's JS to accidentally become load-bearing for content that must ship in the HTML.

## Commit convention

- One commit per checkpoint. Message: `refactor(webpage): checkpoint N — <name>`.
- Commit body may list deviations from design.md or open questions — but the durable record of
  those belongs in `PROGRESS.md`'s Log section, not only in the commit message, since that's what
  the next session reads first.
- Never squash across checkpoints. Bisectability across the 11 commits is the reason to do this
  per-checkpoint instead of as one large diff — if checkpoint 9 breaks something, `git bisect`
  should be able to land exactly on it.
- If a session can't finish its checkpoint: still commit whatever passes its own sub-verification
  (WIP is fine mid-checkpoint), but leave the box unchecked in `PROGRESS.md` and write a precise
  Log entry describing what's left. Do not check the box speculatively.

## Updating PROGRESS.md

At the end of a session that finished a checkpoint:

1. Check its box.
2. Add a Log entry: date, commit hash, and any deviation from design.md or open question carried
   forward (e.g. "confirmed Archivo's actual wdth range is 62–125, matches spec" or "no link for
   uWeMe yet, see design.md §14 item 3").
3. If the checkpoint surfaced something the *next* checkpoint needs to know that isn't in
   design.md, put it in the Log entry — that's the handoff mechanism, there isn't another one.
