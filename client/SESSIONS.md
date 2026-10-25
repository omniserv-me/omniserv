# Session conventions — read this first

This file is what to point a **new, memory-less Claude Code session** at. It holds no design
content: the spec is `design.md`, and the checklist plus the log of what has actually been built is
`PROGRESS.md`. This file answers only "how do we work across sessions".

The client in `design.md` is built as **15 checkpoints, one per session, one per commit**, in
strict order. Each checkpoint assumes every earlier one is committed on `feat/client`. They follow
design.md §10's steps 1–10; step 3 is split into `a`/`b`/`c` and steps 5, 9 and 10 into `a`/`b`,
logic and tests first, UI and wiring second, so each fits one session. A letter suffix is a full checkpoint: its own session, its
own box, its own commit. Every part of design.md has exactly one owner, listed in PROGRESS.md's
**Ownership map**.

design.md is not free of contradictions. Where it disagrees with itself or leaves something
unspecified, the spot carries an inline `(errata E#)` marker and PROGRESS.md's **Errata** table
names the checkpoint that resolves it. An errata spot is the one place where transcribing design.md
is not enough. See **Errata** below.

## Kickoff prompt

Paste this into a fresh session:

> Read `client/SESSIONS.md`, `client/PROGRESS.md` and `client/design.md`. Implement the next
> unchecked checkpoint in PROGRESS.md (or checkpoint N if I name one) — read the design.md
> sections it references closely. Before writing code, list the open Errata rows owned by that
> checkpoint and ask me to decide each one: state the problem, give the options with your
> recommendation, and wait. Leave rows owned by other checkpoints alone. Check the backend
> dependencies as SESSIONS.md describes and build against the fake services where a route isn't
> deployed yet. When done, build and run the tests, verify every "Done when" criterion, give me the
> on-device checks I have to do myself, record the errata decisions, update PROGRESS.md (box,
> status table, log entry), then commit.

Concretely, at the start of the session:

1. Read `PROGRESS.md`. The first unchecked box is checkpoint N. Read its Log entry if one exists:
   an unchecked box can hold partial work with a note saying exactly what is left.
2. Read the design.md sections that checkpoint references, closely. design.md is meant to be
   transcribed, not reinterpreted.
3. `git log --oneline` for the prior checkpoint commits, and `git show --stat HEAD` to see the code
   shape actually in place, not just its description in the log.
4. Filter the **Errata** table to open rows whose Owner names checkpoint N (a row owned by
   "3a · 5a" counts only for your part). Put them to the user **before building anything they
   affect**, one question per row.
5. Check the backend routes this checkpoint needs (see **Backend dependencies**).

## The checkpoint list

| # | Checkpoint | design.md refs |
|---|---|---|
| 1 | Project hygiene | §1, §3.2, §8.1 (tokens), §8.2 |
| 2 | Config & secrets | §1 (`INFOPLIST_FILE` + xcconfig reference), §2, §8.2 (Settings root), §8.8 (host + edge-auth line, version/build) |
| 3a | Wire models & request building | §3.3, §4.1 (routes), §4.2 (`Endpoint`, request building, encoder), §4.3 (decoder, snake-case keys), §4.5, §4.6, §5.1, §5.4 (types), §5.5 (wire types) |
| 3b | Transport & response handling | §3.5, §4.2 (`send`, session, retries), §4.3 (status mapping), §4.4, §9.2 |
| 3c | Gateway & Test connection | §3.4, §4.6 (device verification), §8.1 (components), §8.8 (Test connection), §12 Q3 |
| 4 | Settings: goal | §5.2, §8.8 (Budget section) |
| 5a | Budget domain | §6.1, §6.2 |
| 5b | Overview budget card | §3.1 (shared stores), §5.4 (service use), §6.4, §8.2 (card → tab), §8.3 (rules 1–3), §8.4 (budget card) |
| 6 | Budget › Summary | §6.1 (derived figures), §6.2 (UI rules), §8.5 (Summary) |
| 7 | Add check | §5.3, §5.4 (draft → body), §6.4 (invalidation), §8.4 (context menu), §8.5 (toolbar `+`), §8.6 |
| 8 | Budget › Trend | §6.3, §6.5, §8.5 (Trend) |
| 9a | Lights logic | §5.5 (`SmartlifeState`), §7.1, §7.2, §7.3 (logic) |
| 9b | Lights UI | §7.2 (binding rules), §7.3 (UI), §8.2 (card → tab, Lights root), §8.4 (lights card), §8.7, §12 Q2 |
| 10a | Polish | §8.3 (rules 4–6) |
| 10b | Accessibility & final audit | §8.9, §9.3, §9.4, cross-cutting rules |

Full scope and "Done when" criteria live in `PROGRESS.md` only — that file changes as work lands,
this one doesn't. The refs above must stay identical to PROGRESS.md's checkpoint headings.

**9a (`BrightnessSender`) is the highest-risk single session.** §7.2's ordering, dedupe and
`force` rules are subtle, and a bug there leaves the real strip at a stale value. Don't check 9a's
box until every `BrightnessSenderTests` case from §9.1 passes, including the "force while the same
value is in flight" case.

## Cross-cutting rules

Every checkpoint obeys these for the code it adds; 10b runs the final audit.

- §0 non-goals stay out: no legacy routes, no iPad/Mac/visionOS, no WidgetKit, no editing or
  deleting payments, no offline write queue, EUR only. Step 11 items are the Backlog in PROGRESS.md.
- §3.3 isolation under `MainActor`-by-default: models, DTOs, `APIClient`, live services and the
  networking statics are `nonisolated`, and so are **nested types** (§5.5). Stores stay main-actor
  `@Observable`.
- §3.1 layering: views hold no networking or business logic; only `APIClient` knows secrets, URLs
  and statuses. §3.2 folder layout.
- Secrets are read only by `AppConfig.load()` and used only in `APIClient.authorize` (§2.3, §4.6).
  Never log a request, header or secret.
- §5.1 money is integer cents; `Decimal` only for ratios and display. No floats. Amounts are
  displayed via `.currency(code: "EUR")` (device locale).
- §8.1 typography and colour: SF Rounded (`.fontDesign(.rounded)`) for big numbers,
  `.monospacedDigit()` on every amount; colours only through `Theme`; Accent on white only for
  large/bold text and non-text elements; default system tab and navigation bars, no custom chrome.
- D8: no third-party packages.
- §8.3 rules 1–3 for every screen that loads data: render cached state immediately, redacted
  placeholders on first load (no spinners), `.task` on first appearance, `.refreshable`, the
  stale `scenePhase → .active` refresh (as E4 resolves it), inline non-destructive errors.
- §3.3/§4.4: stores swallow `APIError.cancelled` silently; it is never shown.
- Every new feature view gets `#Preview`s on `AppEnvironment.preview()` (§9.3) for the states it
  has so far. 10b completes the matrix.
- Services are protocols with a `Live*` and a `Fake*` implementation (§3.1).

## Errata

`PROGRESS.md`'s Errata table lists every place design.md contradicts itself or leaves behaviour
unspecified, plus the open questions from §12 that a client checkpoint can answer. Neither reading
of an errata spot is authoritative until its owner has resolved it, so **never silently pick a
side.**

**Resolve your own rows, and only your own.**

- At kickoff, ask the user to decide each open row your checkpoint owns. Quote both sides (or name
  what is missing), give the realistic options and recommend one with a reason. Wait for the answer
  before building the affected part.
- **Don't raise, decide or fix rows owned by other checkpoints**, even when your code touches the
  same area. Build around them as design.md currently reads and note the dependency in your log.
- Rows marked `(text)` are spec-text fixes: the rule elsewhere in design.md wins, so they need no
  user decision unless the right wording is genuinely unclear.
- Open questions (`Q#`) are answered by observation (on the device, against production), not by
  the user's preference. Ask the user to observe and report, record the answer.

**Recording a resolution** (all of it, before checking the box):

1. Implement the decision.
2. Correct design.md's text so it states the decision, and remove the `(errata E#)` marker.
3. Set the row's Status to `resolved by N — <one-line decision>`.
4. Log the decision, and the user's reasoning if given, in the checkpoint's Log entry.

**Found a new contradiction?** Don't resolve it on the spot unless it is your checkpoint's own
material *and* the user agrees. Otherwise add a row (next free `E#`) with an owner from the
Ownership map, put the `(errata E#)` marker in design.md and mention it in your log.

10b can't close until every row is resolved.

## Backend dependencies

From 3c on, checkpoints talk to `/v1` routes that `../backend.md` (B0–B11) specifies. **Backend
work is not part of these checkpoints** and a client session doesn't implement it unless the user
asks. Instead:

1. Probe the routes the checkpoint needs, with the values from the root `.env`:
   ```sh
   curl -s -o /dev/null -w '%{http_code}\n' https://$API_HOST/health
   curl -s -w '\n%{http_code}\n' -H "Authorization: Bearer $API_SECRET" \
        -H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET" \
        "https://$API_HOST/v1/payments?from=2026-10-01T00:00:00Z&to=2026-10-02T00:00:00Z&limit=0"
   ```
   Read-only probes (`GET`) only. Never `POST` or `PATCH` against production from a session; those
   are the user's device checks.
2. Record what you saw in PROGRESS.md's **Backend status** table (date, checkpoint, status code).
3. If a route isn't deployed (`404` → `.notFound`, §4.3 rule 6), the checkpoint still ships: build
   and verify against the `Fake*` service, and move the device criteria that need the route into
   **Pending device checks**.

## Verification

Xcode's command-line tools aren't the active developer directory on this Mac, and there is no
iPhone 15 simulator for iOS 27 — iPhone 17 is the stand-in. Build and test with:

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild \
  -project client/Omniserv.xcodeproj -scheme Omniserv \
  -destination 'platform=iOS Simulator,name=iPhone 17' build test
```

(`test` needs the `OmniservTests` target, which checkpoint 1 adds. If the simulator name is gone
after an Xcode update, pick another from `xcrun simctl list devices available` and update this
line.)

**Baseline for every checkpoint:** builds in Swift 6 mode with **zero warnings**, all tests pass.

Each checkpoint's "Done when" has two parts:
- **auto** — the session verifies it itself: build, tests, simulator runs, previews, reading the
  code against the spec. Check every criterion, not only the visible ones; where one says "matches
  the table", compute it.
- **device** — only the user can: the real iPhone, the production backend, the §9.4 checklist
  items. List them for the user at the end of the session, exactly and numbered.

## Updating PROGRESS.md

At the end of a session that finished a checkpoint:

1. Check its box and fill its row in the **Status** table — once the auto criteria pass, every
   Errata row it owns is resolved, and the user has confirmed the device items **or explicitly
   deferred them**. Deferred items go into **Pending device checks**, naming the checkpoint.
2. Add a Log entry: date, commit hash, deviations from design.md, decisions, and anything the
   *next* checkpoint needs to know that isn't in design.md. That is the only handoff mechanism.
3. Update the **Backend status** table with what you probed.
4. Tick any **Pending device checks** the user confirmed in this session.

If a session can't finish: commit whatever passes its own sub-verification (WIP is fine), leave
the box unchecked, set its status to `in progress`, and write a precise Log entry of what is left.
Never check a box speculatively.

## Commit convention

- One commit per checkpoint on `feat/client`. Message: `feat(client): checkpoint N — <name>`
  (e.g. `feat(client): checkpoint 3a — networking core`).
- The PROGRESS.md update goes in the same commit, so the box and the code land together. The
  commit hash is filled into the Status table/log in the next checkpoint's commit (or a follow-up
  `docs(client): …` commit).
- The commit body may list deviations, but the durable record is the Log in PROGRESS.md.
- Never squash across checkpoints: `git bisect` should land on exactly one.
