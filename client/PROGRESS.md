# Implementation progress

Conventions (kickoff prompt, verification, errata, commit format) live in [`SESSIONS.md`](SESSIONS.md).
Read that first if you're a new session. This file is the checklist, the per-checkpoint scope,
the ownership map, the errata and the running log. The spec is [`design.md`](design.md).

## Status

| # | Checkpoint | Status | Commit |
|---|---|---|---|
| 1 | Project hygiene | ☐ todo | |
| 2 | Config & secrets | ☐ todo | |
| 3a | Wire models & request building | ☐ todo | |
| 3b | Transport & response handling | ☐ todo | |
| 3c | Gateway & Test connection | ☐ todo | |
| 4 | Settings: goal | ☐ todo | |
| 5a | Budget domain | ☐ todo | |
| 5b | Overview budget card | ☐ todo | |
| 6 | Budget › Summary | ☐ todo | |
| 7 | Add check | ☐ todo | |
| 8 | Budget › Trend | ☐ todo | |
| 9a | Lights logic | ☐ todo | |
| 9b | Lights UI | ☐ todo | |
| 10a | Polish | ☐ todo | |
| 10b | Accessibility & final audit | ☐ todo | |

Status values: `☐ todo` · `◐ in progress` · `☑ done` · `☑ done (device checks pending)`.

## Checkpoints

The checkpoints follow design.md §10's steps 1–10. Step 3 is split three ways and steps 5, 9 and 10
two ways, so each fits one session. Where this list and §10's table disagree on who builds what,
this list wins (e.g. `Money` and every wire DTO move into 3a, because 3a's endpoint tests need them).

- [ ] 1. Project hygiene — design.md §1, §3.2, §8.1 (tokens), §8.2
      Scope: every build-settings row of §1's table except `INFOPLIST_FILE` and the base
      configuration (→ 2); automatic signing with the owner's team (§1 "Signing"); the
      `Playgrounds` removal; `MyApp.swift` →
      `App/OmniservApp.swift` (`struct OmniservApp`); the `OmniservTests` unit-test target (Swift
      Testing) with one trivial test; the seven asset-catalog colours of §8.1 and
      `DesignSystem/Theme.swift`; `App/RootView.swift` with the four `Tab`s of §8.2 (titles + SF
      Symbols, placeholder roots, `AppTab` selection in `@SceneStorage`). Folders from §3.2 appear
      as their first file lands. Empty folders aren't tracked, so don't add placeholders.
      Done when (auto): the SESSIONS.md build/test command succeeds with zero warnings in Swift 6
      mode; only iPhone destinations are offered; the app launches in the simulator in light mode,
      portrait only, on the last-selected tab after relaunch.
      Done when (device): runs on the iPhone 15 from Xcode.

- [ ] 2. Config & secrets — design.md §1 (`INFOPLIST_FILE` + xcconfig reference), §2, §8.2
      (Settings root), §8.8 (host + edge-auth line, version/build)
      Scope: `client/Config/Omniserv.xcconfig` and `client/Config/Info.plist` (§2.2), the project's
      base-configuration reference and `INFOPLIST_FILE` (§1, last paragraph); the root `Makefile`
      `client-config` target; the `.gitignore` line; `Core/Config/AppConfig.swift` (§2.3), loaded
      once in `OmniservApp.init`. `SettingsView` as a `NavigationStack` root (§8.2) with a minimal
      About section: server host, "Edge auth: Access token / none", app version and build.
      Done when (auto): `make client-config` writes `Secrets.xcconfig` and refuses a missing
      `API_SECRET` or only one CF value; Settings shows the host and edge-auth state; with
      `Secrets.xcconfig` removed the build still succeeds and launch fails with the explicit
      "Run make client-config" message; every other §2.3 rule holds (a literal `$(…)` value or
      exactly one empty CF value → `preconditionFailure`; both CF values empty → `accessToken ==
      nil` and "Edge auth: none"), checked with a test `Bundle` or a hand-edited
      `Secrets.xcconfig`; `git status` never shows `Secrets.xcconfig`.

- [ ] 3a. Wire models & request building — design.md §3.3, §4.1 (routes), §4.2 (`Endpoint`,
      request building, encoder), §4.3 (decoder, snake-case keys), §4.5, §4.6, §5.1, §5.4 (types),
      §5.5 (wire types)
      Scope: `Money` (§5.1, no `Codable`); the decodable DTOs `Payment`, `PaymentPage`,
      `Automation`, `DeviceList`, `Device` (with the `Kind.unknown` fallback, **E2**); the bodies
      `PaymentDraft`, `NewPaymentBody`, `DevicePatch`, `AutomationPatch`; `Endpoint` with every
      `nonisolated static` factory from §4.2 (none for `owner_present`); the shared encoder and
      decoder (§4.2, §4.3 "Decoding", §4.5); `APIClient`'s `init`, `request(for:)`,
      `encodeSegment` and `authorize` (§4.6), but not `send` yet. `MoneyFormatTests` per **E1**.
      §9.1 `EndpointTests`.
      Done when (auto): `EndpointTests` covers every bullet of its §9.1 row and passes; the secret
      appears in no URL; every type follows §3.3 (no isolation warnings).

- [ ] 3b. Transport & response handling — design.md §3.5, §4.2 (`send`, session, retries),
      §4.3 (status mapping), §4.4, §9.2
      Scope: `URLSession.omniserv` (§4.2 table) and `NoRedirectDelegate`; both `send` variants with
      the §4.3 status mapping in its exact order; `APIError` with `userMessage` (the §4.4 copy) and
      `isDefiniteRejection`; `URLError`/cancellation mapping; `Core/Support/Loadable.swift` (§3.5).
      `StubURLProtocol` (§9.2) and §9.1 `ResponseDecodingTests`.
      Done when (auto): `ResponseDecodingTests` covers every case in its §9.1 row and passes; the
      §9.2 tests assert URL, method, headers and body for every route in §4.1 and that a `302`
      is not followed; `Loadable.value`/`isStale` have tests.

- [ ] 3c. Gateway & Test connection — design.md §3.4, §4.6 (device verification), §8.1
      (components), §8.8 (Test connection), §12 Q3
      Scope: `AppEnvironment` with `.live(config:)` / `.preview()` (gateway now; later checkpoints
      add their stores); `GatewayService` with `Live` and `Fake`; `DesignSystem/Card.swift` and
      `StatusBanner.swift` (§8.1); Settings › About "Test connection" (`GET /health` with latency,
      then the `limit=0` probe for today → tomorrow), showing `OK · NN ms` or the first error.
      Answers **Q3**.
      Done when (auto): previews of Settings show OK, each error class and in-flight; the Fake
      drives every outcome; tests for the probe sequence (health fails → no second call).
      Done when (device): §9.4 items 1–2; item 3 only as far as Test connection goes (airplane
      mode → "No connection"). There are no data screens yet; 5b does the rest of item 3.

- [ ] 4. Settings: goal — design.md §5.2, §8.8 (Budget section)
      Scope: `MoneyParser` (§5.2; payment and goal bounds; file per **E8**),
      `Core/Settings/SettingsStore.swift`
      (`@Observable`, `UserDefaults` key `settings.monthlyGoalCents`), added to `AppEnvironment`;
      the Settings "Monthly goal" field with inline errors, saved on submit / focus loss (**E3**).
      §9.1 `MoneyParserTests`.
      Done when (auto): `MoneyParserTests` covers its §9.1 row and passes; the goal survives a
      relaunch in the simulator.

- [ ] 5a. Budget domain — design.md §6.1, §6.2
      Scope: `Core/Domain/Period.swift` in full (all four kinds, `current`, `shifted`, custom with
      inclusive end day → `endExclusive` and the custom-range limits of **E6**,
      `isCurrentOrFuture`, **E2**) and
      `Core/Domain/BudgetMath.swift` (`plan`, pace, remaining, per-day allowance, usage % incl. the
      `G == 0` case). Pure logic, no UI. §9.1 `BudgetMathTests` and `PeriodTests`.
      Done when (auto): both suites cover their §9.1 rows and pass, including every row of §6.1's
      example table and the two Europe/Berlin DST days.

- [ ] 5b. Overview budget card — design.md §3.1 (shared stores), §5.4 (service use), §6.4, §8.2
      (card → tab), §8.3 (rules 1–3), §8.4 (budget card)
      Scope: `BudgetService` protocol with `total(for:)` + `Live`/`Fake`; `BudgetStore`
      (`Loadable` per period, in-memory cache keyed by `Period` / range, `invalidateAll()`), added
      to `AppEnvironment`; `OverviewView` and `BudgetCard` (donut, centre label, left/per-day/pace
      lines, over-budget ring, no-goal state → Settings, tap → Budget tab). Establish §8.3 rules
      1–3 here: redacted first load, `.refreshable`, `scenePhase → .active` refresh when stale
      (**E4**), `StatusBanner` with the last value kept.
      Done when (auto): previews: loaded, first load (redacted), failed with previous value, over
      budget, no goal; store tests with the Fake (cache hit, invalidation, failure keeps value,
      a cancelled load shows no error); one `BudgetStore` instance shared app-wide, so Budget
      (from 6) reuses Overview's fetch (§3.1); changing the goal recomputes the card with no
      fetch (the Fake records no call, §8.8).
      Done when (device): the month total matches a manual `curl` of
      `GET /v1/payments?…&limit=0` for the current month; §9.4 item 3 (airplane mode: the card
      keeps its value and shows "No connection", pull-to-refresh recovers); item 2's data-screen
      clause (a wrong-secret build shows "Wrong API secret" on the card).

- [ ] 6. Budget › Summary — design.md §6.1 (derived figures), §6.2 (UI rules), §8.5 (Summary)
      Scope: `BudgetView` (NavigationStack, `Summary | Trend` segmented picker, Trend a placeholder
      for now); `SummaryView`: `Month | Week | Year | Custom` selector, `‹ period ›` navigation
      ("next" disabled once the period contains today; no chevrons for Custom, which can't be
      shifted, §6.2), the two Custom `DatePicker`s with inclusive end day (**E6**), Spent /
      Planned / Difference (colours per **E5**) / Used % ("—" when the plan is 0), the progress
      bar with the pace tick only when the period contains today, the no-goal prompt. Uses
      `BudgetStore`'s cache.
      Done when (auto): hand-computed plans for three periods (one month, one week across a month
      boundary, one custom range) match the UI, written down in the log; history back and forth
      hits the cache (no second fetch); previews for loaded, over, no goal.

- [ ] 7. Add check — design.md §5.3, §5.4 (draft → body), §6.4 (invalidation), §8.4 (context
      menu), §8.5 (toolbar `+`), §8.6
      Scope: store-name normalisation (§5.3, file per **E8**); `BudgetService.add(_:)` +
      Live/Fake; `AddPaymentSheet` exactly as §8.6 (focus order, `date` set on presentation, no
      future dates, Save gating, in-flight state, success haptic (§8.3 rule 4) + dismiss +
      `invalidateAll()` + refetch of what is visible, the two failure copies by
      `isDefiniteRejection` in a `StatusBanner` inside the sheet, **E7**); opened from Budget's
      toolbar `+` and the Overview card's context menu. §9.1 `StoreNameTests`. The ambiguous-failure
      copy points at Budget › Trend, which only lands in 8.
      Done when (auto): `StoreNameTests` passes; with the Fake: a definite rejection and an
      ambiguous failure each show their copy and keep the values; double-tapping Save sends once.
      Done when (device): §9.4 item 4 except the Trend bar (Overview total +0,29 €, Mongo document,
      `AC/DC`). Keep the test payment: 8 checks its Trend bar, then does item 9.

- [ ] 8. Budget › Trend — design.md §6.3, §6.5, §8.5 (Trend)
      Scope: `BudgetService.payments(from:to:)` + Live/Fake; `Core/Domain/SpendingSeries.swift`
      (bucketing on the device calendar, zero-fill, `nil` future buckets, daily/monthly);
      `TrendView`: `Daily | Monthly` picker, `BarMark`s, dashed budget `RuleMark`,
      `chartXSelection` popover, month navigation (daily) / trailing 12 months (monthly), average
      and highest below, the `truncated` footnote. §9.1 `SpendingSeriesTests`.
      Done when (auto): `SpendingSeriesTests` passes; with the Fake, daily bars sum to the Summary
      total for the same month.
      Done when (device): the same sum check against production for the current month; §9.4
      item 4's Trend part (7's test payment appears on yesterday's daily bar), then item 9 (delete
      the test payment in Mongo).

- [ ] 9a. Lights logic — design.md §5.5 (`SmartlifeState`), §7.1, §7.2, §7.3 (logic)
      Scope: `SmartlifeService` (devices, automation, set brightness, set automation) + Live/Fake;
      `LightsStore` (concurrent `async let` load, partial-failure handling, refresh triggers,
      the 1 s reconcile after a burst, optimistic automation toggle with rollback/refetch);
      `BrightnessSender` exactly as §7.2; `lastNonZeroBrightness` per device in `UserDefaults`
      fed from both sources (§7.3); the power action through the sender with `force: true`. Added
      to `AppEnvironment`. §9.1 `BrightnessSenderTests`. **Highest-risk session**, see SESSIONS.md.
      Done when (auto): every `BrightnessSenderTests` case in §9.1 passes; `LightsStore` tests
      with the Fake for one-of-two read failures, definite vs ambiguous write failure (rollback vs
      keep + reconcile), a new `submit` cancelling the pending 1 s reconcile, and the power restore
      value.

- [ ] 9b. Lights UI — design.md §7.2 (binding rules), §7.3 (UI), §8.2 (card → tab, Lights root),
      §8.4 (lights card), §8.7, §12 Q2
      Scope: `LightsView` as a `NavigationStack` root (adaptive grid, automation section with
      toggle, presence line and the override hint); `DeviceTile` (dot, big %, power button, slider
      bound through the §7.2 `Binding` — never `.onChange` — with `onEditingChanged`, inline error,
      disabled when unreachable, `Kind.unknown` showing name + reachability only); `LightsCard` on
      Overview (one row per device: dot, name, % or "Off" / "Unreachable", and a power button
      through the same per-device `BrightnessSender`; automation/presence line; tap → Lights tab).
      Answers **Q2**.
      Done when (auto): previews: loaded, unreachable, unknown kind, failed with previous value;
      a refresh while not dragging moves the thumb and sends nothing (Fake records calls).
      Done when (device): §9.4 items 5–8.

- [ ] 10a. Polish — design.md §8.3 (rules 4–6)
      Scope: `Core/Support/SnapshotCache.swift` (last Overview data as JSON in Caches, read
      synchronously at launch, "Updated … ago" marker until the refresh lands); the rest of rule
      4's haptics (`.selection` on slider release, `.error` on rollback; 7 already added
      `.success`); `.contentTransition(.numericText())` and `.animation(.smooth, value:)` per rule 5,
      nothing over ~300 ms.
      Done when (auto): a relaunch in the simulator shows cached numbers on the first frame with
      the "Updated" marker; a corrupt or missing snapshot falls back to the redacted state.
      Done when (device): cold launch on the iPhone shows cached numbers.

- [ ] 10b. Accessibility & final audit — design.md §8.9, §9.3, §9.4, cross-cutting rules
      Scope: every §8.9 bullet (spoken amounts, donut label, `AXChartDescriptorRepresentable` on
      Trend, slider value + adjustable action through `BrightnessSender`, Dynamic Type up to
      `.accessibility2` with `ViewThatFits`, no colour-only information); the complete §9.3
      preview matrix; the cross-cutting audit from SESSIONS.md over the whole codebase (including
      §0 non-goals and the §8.1 contrast rule); every
      Errata row resolved; design.md's status line updated to "implemented"; the Pending device
      checks list empty or explicitly carried forward by the user.
      Done when (auto): accessibility inspector pass in the simulator; every preview renders;
      audit clean or logged; Errata table fully resolved.
      Done when (device): VoiceOver walkthrough; the full §9.4 checklist (items 1–10) once more on
      the final build.

## Backlog (design.md §10 step 11 — not checkpoints)

Auth beyond phase 0 (§4.6 "Later": per-client tokens, Access JWT check, `Idempotency-Key`);
WidgetKit extension reusing `Core/` via an App Group; payment list and `DELETE /v1/payments/{id}`.
Each needs a design.md section first (`client.md`: Design → Document → Implement).

## Ownership map

Every `##`/`###` heading of design.md with the checkpoint that owns it. A row split across
checkpoints names each part. "Reference" sections add no implementation of their own.

| design.md | Owner |
|---|---|
| §0 Scope | reference; non-goals are cross-cutting |
| §1 Project setup | 1 (INFOPLIST_FILE + xcconfig reference: 2) |
| §2.1 Flow, §2.2 Files, §2.3 `AppConfig` | 2 |
| Header status line | 10b ("implemented") |
| §3.1 Layers | cross-cutting · 5b (one shared `BudgetStore`) |
| §3.2 Folder layout | 1 (start), cross-cutting · E8: 4, 7 |
| §3.3 Concurrency | 3a (first types), cross-cutting |
| §3.4 Dependency injection | 3c (created); 4, 5b, 9a add their stores |
| §3.5 Load state | 3b |
| §4.1 The `/v1` API | 3a (endpoint factories, DTOs); reference for the backend |
| §4.2 `APIClient` | 3a (`Endpoint`, request building, encoder) · 3b (`send`, session, delegate, retries) |
| §4.3 Response handling | 3a (decoder, snake-case keys) · 3b (status mapping) |
| §4.4 `APIError` | 3b |
| §4.5 Dates on the wire | 3a |
| §4.6 Auth (phase 0) | 3a (`authorize`) · 3c (device verification) |
| §4.7 Legacy routes | reference (never called by the app) |
| §5.1 `Money` | 3a |
| §5.2 `MoneyParser` | 4 |
| §5.3 Store name rules | 7 |
| §5.4 Payments | 3a (types) · 7 (draft → body in the sheet flow) |
| §5.5 Smartlife | 3a (wire types) · 9a (`SmartlifeState`) |
| §6.1 Planned budget | 5a (maths) · 6 (display) |
| §6.2 Periods | 5a · 6 (chevrons, Custom pickers) · E6: 5a, 6 |
| §6.3 Spending series | 8 |
| §6.4 What is fetched when | 5b (cache) · 6 · 7 (invalidation) · 8 |
| §6.5 One read route | 8 (sum check) |
| §7.1 Reading state | 9a |
| §7.2 Brightness slider | 9a (`BrightnessSender`) · 9b (binding) |
| §7.3 Power and automation | 9a (logic) · 9b (UI) |
| §8.1 Theme | 1 (colours, `Theme`) · 3c (`Card`, `StatusBanner`); typography, contrast, no custom chrome cross-cutting |
| §8.2 Navigation | 1 (`RootView`) · 2, 6, 9b (`NavigationStack` roots) · 5b, 9b (card → tab) |
| §8.3 Responsive rules | 5b (rules 1–3, then cross-cutting) · 7 (rule 4 `.success`; E7) · 10a (rules 4–6) |
| §8.4 Overview | 5b (budget card) · 7 (context menu) · 9b (lights card) |
| §8.5 Budget | 6 (view, Summary; E5) · 7 (toolbar `+`) · 8 (Trend) |
| §8.6 Add check sheet | 7 |
| §8.7 Lights | 9b |
| §8.8 Settings | 2 (About: host, edge auth, version) · 3c (Test connection) · 4 (goal) |
| §8.9 Accessibility | 10b |
| §9.1 Unit tests | per suite: `EndpointTests`, `MoneyFormatTests` 3a · `ResponseDecodingTests` 3b · `MoneyParserTests` 4 · `BudgetMathTests`, `PeriodTests` 5a · `StoreNameTests` 7 · `SpendingSeriesTests` 8 · `BrightnessSenderTests` 9a |
| §9.2 `APIClient` tests | 3b |
| §9.3 Previews | cross-cutting · 10b (complete matrix) |
| §9.4 Manual checklist | items 1–2: 3c · 2 (data screens): 5b · 3: 3c (Test connection), 5b (screens) · 4: 7, 8 (Trend bar) · 9: 8 · 5–8: 9b · 10: 10b (backend B9.6) · all once more: 10b |
| §10 Implementation steps | this file |
| §11 Decision log | reference |
| §12 Open questions | Errata table below |

## Errata

| # | Where | Problem | Owner | Status |
|---|---|---|---|---|
| E1 | §9.1 `MoneyFormatTests` | Tests a "canonical wire string" (`5` → `0.05`), but §5.1 says every `/v1` route uses integer cents and `Money` has no wire string. Drop the suite, or repurpose it as a display-format test (`.currency(code: "EUR")` in a fixed locale)? | 3a | open |
| E2 | §5.5 `Device.Kind`, §6.2 `Period.Kind` | Snippets declare nested enums without `nonisolated`, contradicting §5.5's own rule ("Nested types are marked `nonisolated` explicitly"). The rule wins; fix the snippets. | 3a · 5a (text) | open |
| E3 | §8.8 Budget row | The goal field "is saved on submit or when the field loses focus" — unspecified what happens to **invalid** input on focus loss: revert to the stored goal, or keep the text with the inline error and save nothing. | 4 | open |
| E4 | §8.3 rule 2 | "`scenePhase → .active` refreshes **visible** stores if older than 30 s" — how a store knows it is visible is unspecified (selected tab from `RootView`, per-view `onAppear` counters, or refresh every stale store regardless). | 5b | open |
| E5 | §8.5 Summary | "Difference (green under / `Warning` over)", but §8.1 has no green token. Add a token (e.g. `Positive`), use an existing one (`Ink` / `AccentColor`), or system green? | 6 | open |
| E6 | §6.2 `custom`, §4.1 `GET /v1/payments` | Nothing constrains a custom range: end before start, or longer than the 400 days the server allows (`422`). Clamp the `DatePicker` ranges, or allow any range and show an inline error? | 5a · 6 | open |
| E7 | §8.3 rule 3 vs §8.6 | Rule 3 says "No modal alerts except for a failed add", which implies an alert; §8.6 specifies a `StatusBanner` inside the sheet that stays open. §8.6 wins; reword rule 3. | 7 (text) | open |
| E8 | §3.2 Folder layout | No file is listed for `MoneyParser` (§5.2) or the store-name normalisation (§5.3). Proposed: `Core/Domain/MoneyParser.swift`, `Core/Domain/StoreName.swift`. | 4 · 7 (text) | open |
| Q2 | §12 item 2 | Strip brightness range: design assumes 0–100. Confirm on the device; slider range and B5 follow. | 9b | open |
| Q3 | §12 item 3 | What Cloudflare Access really returns for a missing/wrong service token on a Service Auth policy (expected HTML `403`). Observe during §9.4 item 2. | 3c | open |
| — | §12 items 4–7 | Backend questions (historic euro floats, Shortcuts and `401`, strip read timeout, Shortcut migration). | backend.md, not tracked here | — |

## Backend status

What the client checkpoints observed of [`../backend.md`](../backend.md). Sessions update this
after probing (SESSIONS.md, **Backend dependencies**); backend work itself is tracked in
backend.md.

| ID | Change | Needed by | Observed |
|---|---|---|---|
| B0 | Audit §5 cents normalisation | 5b, 6 (correct numbers) | unknown |
| B1 | `POST /v1/payments` | 7 | unknown |
| B2 | `GET /v1/payments` | 3c (probe), 5b, 6, 8 | unknown |
| B3 | Stable payment ids | 8 | unknown |
| B4 | `GET /v1/devices`, `GET`/`PATCH /v1/automation` | 9a, 9b | unknown |
| B5 | `PATCH /v1/devices/{id}` | 9a, 9b | unknown |
| B6 | Serialised strip access | 9b (device item 5) | unknown |
| B7 | Deadlines and status mapping | 3b onwards (504/502) | unknown |
| B8 | JSON error bodies | 3b onwards (`detail`) | unknown |
| B9 | Cloudflare edge (B9.4 Access) and host ports (B9.6) | 3c (device item 2), 10b (item 10) | unknown |
| B10 | `/v1` foundation, bearer auth | 3c onwards | unknown |
| B11 | Shortcuts to `/v1`, legacy retired | — (security) | unknown |

## Pending device checks

Device criteria the user deferred. Format: `- [ ] <checkpoint> — §9.4 item N / criterion (deferred YYYY-MM-DD)`.

_(none yet)_

## Log

One `###` entry per checkpoint as it lands: date, commit, deviations from design.md, errata
decisions with the user's reasoning, backend observations, and anything the next checkpoint needs
to know.

_(no checkpoints yet)_
