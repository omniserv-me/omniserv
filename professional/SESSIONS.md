# Session conventions — read this first

This file is the thing to point a **new, memory-less Claude Code session** at. It has no design
content of its own — for that, see `design.md` (the spec) and `PROGRESS.md` (the checklist + log
of what's actually been built). This file only answers "how do we work across sessions".

The refactor described in `design.md` is built as **17 checkpoints, one per session, one per
commit**, in strict order — each assumes every earlier checkpoint is already committed on
`refactor/webpage`. Checkpoints 1–4 are integers; 5–11 were split into `a`/`b` halves on
2026-09-28 so each fits one session with room for fixes. A letter suffix is a full checkpoint: its
own session, its own box, its own commit (`checkpoint 5a — …`). Every part of design.md has
exactly one owner — see the **Ownership map** in `PROGRESS.md`.

design.md is not free of contradictions. Where it disagrees with itself, or leaves something
unspecified, the spot is marked `(errata E#)` inline, and `PROGRESS.md`'s **Errata** table names the
checkpoint that resolves it. An errata spot is the one place where transcribing design.md is not
enough. See **Errata** below.

## Kickoff protocol

Every session implementing a checkpoint starts the same way. The prompt to paste in:

> Read `professional/SESSIONS.md`, `professional/PROGRESS.md` and `professional/design.md`.
> Implement checkpoint N from PROGRESS.md — read the design.md sections it references closely.
> Before writing code, list every open row of PROGRESS.md's Errata table whose Owner is
> checkpoint N — only those — and ask me to decide each one: state the contradiction, give the
> options with your recommendation, and wait for my answer. Leave errata owned by other
> checkpoints alone, even where they touch this checkpoint's code. When done, verify against that
> checkpoint's "done when" criteria, record each errata decision (fix design.md's text, mark the
> row resolved, log it), check the box and add a log entry in PROGRESS.md, then commit.

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
4. Filter the **Errata** table to open rows whose Owner names checkpoint N (a row like
   "9a · 5b · 6a respectively" counts only for your part of it). Put those to the user **before
   implementing anything they affect**, one question per row. See **Errata** below.

## The checkpoint list

| # | Checkpoint | design.md refs |
|---|---|---|
| 1 | Scaffold & build config | §12.1–12.6 |
| 2 | Design tokens + base/layout CSS | §3, §4 |
| 3 | Full static HTML + copy + components.css | §2, §5.3, §6, §11 (title/meta only) |
| 4 | GSAP rig | §9.1 |
| 5a | Fonts + split rig | §5.1 (install check), §5.2, §5.4, §9.1 step 3 |
| 5b | IDENTITY choreography | §9.4 (all but split config), §3.7 |
| 6a | Chain core (WebGL) | §7.1–7.4, §7.6, §7.7, §10.2 |
| 6b | Chain movement states | §7.5 |
| 7a | Choreography — DOSSIER | §9.5 |
| 7b | LATTICE | §6.5 (geometry), §9.6 |
| 8a | WORKS pin | §9.7 (pin, entrances, branches) |
| 8b | WORKS interaction | §9.7 (focus, hover, readout, deep links) |
| 9a | Nav rail | §9.9 |
| 9b | LINK + colophon + micro-states | §9.8, §9.10 |
| 10 | Post-processing + CAST | §8, §9.3 |
| 11a | Degradation | §10.1–10.3, §10.5 |
| 11b | A11y, SEO & final audit | §10.4, §11, §12.7, §14, cross-cutting |

Full scope and "done when" criteria for each live in `PROGRESS.md`, not duplicated here — that's
the file that changes as work lands, this one doesn't.

**Checkpoint 8b (the `onFocusIn` handler) is the highest-risk single session** — the WORKS pin
was split into 8a (pin + card entrances) and 8b (focus, hover, readout) precisely so the focus
handler is never rushed. Do not ship 8b without manually tabbing through every card — this is the
one place a subtle bug is an accessibility regression, not a visual one.

**Code comments written before the split** say "checkpoint 5/6/8/9/11". Resolve them through the
ownership map, not by guessing which half.

## Errata

`PROGRESS.md`'s Errata table lists every place design.md contradicts itself or leaves behaviour
unspecified. design.md marks each spot `(errata E#)`. Neither reading of an errata spot is
authoritative until the owning checkpoint has resolved it, so **never silently pick one side.**

**Resolve your own rows, and only your own.**

- At kickoff, take the open rows owned by the current checkpoint and ask the user to decide each
  one. Quote both sides of the contradiction (or name what is missing), give the realistic options,
  and recommend one with a reason. Wait for the answer before building the affected part. Use the
  code and earlier logs to make the options concrete, not to make the decision.
- **Do not raise, decide or fix rows owned by other checkpoints**, even when your code touches the
  same area. Build around them as design.md currently reads, and note the dependency in your log.
  The owner resolves it in its own session.
- Rows marked `11b (text)` are spec-text-only fixes. Only 11b does them, and they need no user
  decision unless the correct wording is genuinely unclear.

**Recording a resolution** (all of it, before checking the box):

1. Implement the decision.
2. Correct design.md's text so it states the decision, and remove the `(errata E#)` marker from
   that spot.
3. Set the row's Status to `resolved by N — <one-line decision>`.
4. Log the decision and the user's reasoning, if they gave one, in the checkpoint's Log entry.

**Found a new contradiction?** Don't resolve it on the spot unless it is your checkpoint's own
material *and* the user agrees. Otherwise add a new row (next free `E#`) with an owner taken from
the Ownership map, add the `(errata E#)` marker in design.md, and mention it in your log. That way
every problem keeps exactly one owner.

11b cannot close until every row in the table is resolved.

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
- Never squash across checkpoints. Bisectability across the checkpoint commits is the reason to do this
  per-checkpoint instead of as one large diff — if checkpoint 9 breaks something, `git bisect`
  should be able to land exactly on it.
- If a session can't finish its checkpoint: still commit whatever passes its own sub-verification
  (WIP is fine mid-checkpoint), but leave the box unchecked in `PROGRESS.md` and write a precise
  Log entry describing what's left. Do not check the box speculatively.

## Updating PROGRESS.md

At the end of a session that finished a checkpoint:

1. Check its box — only once every Errata row it owns is resolved (see **Errata**). If the user
   has deferred a decision, leave the box unchecked and say so in the log.
2. Add a Log entry: date, commit hash, and any deviation from design.md or open question carried
   forward (e.g. "confirmed Archivo's actual wdth range is 62–125, matches spec" or "no link for
   uWeMe yet, see design.md §14 item 3").
3. If the checkpoint surfaced something the *next* checkpoint needs to know that isn't in
   design.md, put it in the Log entry — that's the handoff mechanism, there isn't another one.
