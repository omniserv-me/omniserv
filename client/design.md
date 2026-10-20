# Omniserv iOS client — design

> **Status:** design, pre-implementation. Written 2026-10-19 against `d23f667`.
> **Inputs:** [`client.md`](../client.md) (wishes), [`API-CONTRACT.md`](../API-CONTRACT.md) (as-is API), [`audit.md`](../audit.md) (API findings).
> **Backend changes this design depends on:** [`backend.md`](../backend.md), referenced as **B0–B9**.
> Approach per `client.md`: Design → Document → Implement. Nothing in §10 is built before its section here is agreed.

---

## 0. Scope

**In scope**
- Native SwiftUI app for one user (the owner), iPhone 15, iOS 27, side-loaded from Xcode.
- Read and control `omniscient` (budget) and `smartlife` (lights) through the `api` gateway.
- Four screens: Overview, Budget, Lights, Settings.

**Non-goals (for this iteration)**
- Multi-user, accounts, an auth framework (`client.md`: later, together with the server).
- Currencies other than EUR.
- iOS home-screen widgets (WidgetKit) — in-app cards only; listed as a later step (§10, step 11).
- Editing or deleting payments.
- Offline write queue. Writes need a connection; failures are surfaced, not queued.
- iPad / Mac / visionOS.

**Runtime topology** (as seen by the client)

```
iPhone ──HTTPS──▶ api.omniserv.me (Cloudflare edge)
                    │  Cloudflare Zero Trust tunnel (encrypted)
                    ▼
               cloudflared (private network; host ports: see B9.6)
                    │  plain HTTP
                    ▼
               api:5006 ──gRPC──▶ omniscient / smartlife
```

TLS terminates at Cloudflare, so the app talks plain `https://` to a public CA certificate. **No App Transport Security exception is needed.**

---

## 1. Project setup

The Xcode project (`client/Omniserv.xcodeproj`) is the untouched multiplatform template. Changes, all in target build settings:

| Setting | Now | Target | Why |
|---|---|---|---|
| `TARGETED_DEVICE_FAMILY` | `1,2,7` | `1` | iPhone only. |
| `SUPPORTED_PLATFORMS` | `iphoneos iphonesimulator macosx xros xrsimulator` | `iphoneos iphonesimulator` | This is what drops the macOS/visionOS destinations; `SDKROOT` alone doesn't. |
| `SDKROOT` | `auto` | `iphoneos` | Consistent with the above. |
| `MACOSX_/XROS_/TVOS_/WATCHOS_/DRIVERKIT_DEPLOYMENT_TARGET` | set | removed | Unused platforms. |
| `ENABLE_APP_SANDBOX`, `ENABLE_USER_SELECTED_FILES` | set | removed | macOS-only keys. |
| `IPHONEOS_DEPLOYMENT_TARGET` | `27.0` | `27.0` | Keep. iOS 27 SwiftUI/Charts APIs without availability checks. (Language features come from the compiler, not the deployment target.) |
| `SWIFT_VERSION` | `5.0` | `6.0` | Strict concurrency checking as errors. |
| `SWIFT_DEFAULT_ACTOR_ISOLATION` | `MainActor` | `MainActor` | Keep. UI code is main-actor by default; networking opts out explicitly (§3.3). |
| `SWIFT_APPROACHABLE_CONCURRENCY` | `YES` | `YES` | Keep. `nonisolated async` functions run on the caller's actor unless marked `@concurrent`. |
| `INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone` | portrait + landscape | `UIInterfaceOrientationPortrait` | Layouts are designed for portrait only. |
| `INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad` | all four | removed | No iPad. |
| `INFOPLIST_KEY_UIUserInterfaceStyle` | — | `Light` | White/light-blue theme (§8.1). |
| `PRODUCT_BUNDLE_IDENTIFIER` | `devplaceholder.…` | `me.omniserv.client` | Stable id; the owner's domain. |
| `INFOPLIST_FILE` | — | `Config/Info.plist` | Partial plist for config keys (§2). Merged with the generated one (`GENERATE_INFOPLIST_FILE` stays `YES`). Lives outside `Omniserv/` on purpose, see below. |
| base configuration | — | `Config/Omniserv.xcconfig` (Debug and Release) | Config injection (§2). |

Other housekeeping:
- `ContentView.swift`: remove `import Playgrounds` and the `#Playground` block; the file is replaced in step 3 anyway.
- Rename `MyApp.swift` → `App/OmniservApp.swift`, `struct OmniservApp`.
- Add a unit test target **`OmniservTests`** (Swift Testing). No UI test target; SwiftUI previews and the manual checklist (§9.4) cover UI.
- **Signing:** automatic signing with the owner's team. With a free Apple ID the provisioning profile expires after 7 days and the app must be re-run from Xcode; with a paid membership it lasts a year. No code change either way, just an operational note.
- **Dependencies:** none. SwiftUI, Observation, Swift Charts, Foundation/URLSession and Swift Testing cover everything below.

The project uses file-system-synchronized groups (`objectVersion = 90`), so new folders and files under `client/Omniserv/` are picked up without editing `project.pbxproj`. The flip side: every file in that folder becomes a target member, so files that must not be bundled as resources live in `client/Config/` instead. An `Info.plist` inside `Omniserv/` would also land in Copy Bundle Resources and fail the build with "Multiple commands produce …/Info.plist".

---

## 2. Configuration & secret injection

`client.md`: the secret is injected from the local `.env` at build time and shipped inside the app. This section defines the mechanism.

### 2.1 Flow

```
.env (repo root, gitignored)          API_SECRET=…   API_HOST=api.omniserv.me
   │  make client-config
   ▼
client/Config/Secrets.xcconfig        (generated, gitignored)
   │  #include? from Omniserv.xcconfig (committed)
   ▼
build settings $(API_SECRET) $(API_HOST)
   │  substituted into client/Config/Info.plist (committed, partial)
   ▼
Bundle.main.infoDictionary            OmniservAPISecret / OmniservAPIHost
   │  AppConfig.load()
   ▼
APIClient
```

### 2.2 Files

`client/Config/Omniserv.xcconfig` (committed):
```
// Values come from Secrets.xcconfig, generated by `make client-config`.
API_HOST = api.omniserv.me
API_SECRET =
#include? "Secrets.xcconfig"
```
The `#include?` is optional, so a fresh clone still builds; `AppConfig` then fails loudly (§2.3) instead of the build failing obscurely.

`client/Config/Info.plist` (committed, only the custom keys; outside the synchronized `Omniserv/` group, §1):
```xml
<dict>
  <key>OmniservAPIHost</key>   <string>$(API_HOST)</string>
  <key>OmniservAPISecret</key> <string>$(API_SECRET)</string>
</dict>
```

**Store the host, not a URL.** In `.xcconfig` files `//` starts a comment, so `https://api.omniserv.me` would be truncated to `https:`. The scheme is fixed to `https` in code.

Root `Makefile`, new target:
```make
.PHONY: client-config
client-config:
	@test -n "$(API_SECRET)" || { echo "API_SECRET is not set in .env"; exit 1; }
	@mkdir -p client/Config
	@printf 'API_SECRET = %s\nAPI_HOST = %s\n' "$(API_SECRET)" "$(or $(API_HOST),api.omniserv.me)" \
		> client/Config/Secrets.xcconfig
	@echo "wrote client/Config/Secrets.xcconfig"
```
The existing `-include .env` + `export` at the top of the Makefile already loads the variables.

`.gitignore`, new line (the existing `/.*` rule only covers root dotfiles):
```
client/Config/Secrets.xcconfig
```

**Constraint on the secret's alphabet.** The secret is a URL path segment and an xcconfig value. Keep it to `[A-Za-z0-9_-]` so it needs neither percent-encoding nor xcconfig escaping (`$`, `//`, quotes would break). This is a convention for whoever rotates the secret, not something the app enforces.

### 2.3 `AppConfig`

```swift
nonisolated struct AppConfig: Sendable {
    let baseURL: URL      // https://<API_HOST>
    let secret: String

    static func load(from bundle: Bundle = .main) -> AppConfig
}
```
- Reads both keys from `bundle.infoDictionary`.
- If a key is missing, empty, or still the literal `$(…)`: `preconditionFailure("Run `make client-config` …")` in Debug. A side-loaded personal app has no Release audience to protect, so the same check applies in Release.
- Loaded once in `OmniservApp.init` and passed into `APIClient` — never read from `Bundle` anywhere else.

**Accepted risk** (per `client.md`): the secret is plaintext inside the `.app` bundle on the device and in Xcode's build products. Moving it to the Keychain would not help while it is bundled anyway. It is revisited together with server-side auth (step 11).

---

## 3. Architecture

### 3.1 Layers

```
Features (SwiftUI views)          Overview · Budget · Lights · Settings
     │ read/drive
Stores (@Observable, @MainActor)  BudgetStore · LightsStore · SettingsStore
     │ call
Services (protocols)              BudgetService · SmartlifeService · GatewayService
     │ implemented by
APIClient (nonisolated, Sendable) URL building, auth, transport, decoding, errors
```

- **Views** hold no networking or business logic. They render a store's state and forward intents (`store.refresh()`, `store.setBrightness(_:)`).
- **Stores** own screen state, loading/error state and pure domain calculations (via `Core/Domain` helpers). Stores are **shared app-wide**: Overview and Budget read the same `BudgetStore`, so switching tabs never triggers a duplicate fetch.
- **Services** are protocols, so previews and tests use fakes. The live implementations are thin adapters from domain types to `APIClient` calls.
- **APIClient** is the only type that knows about the secret, URL shapes and the legacy response quirks.

### 3.2 Folder layout (`client/Omniserv/`)

```
App/            OmniservApp.swift, AppEnvironment.swift, RootView.swift (TabView)
Core/
  Config/       AppConfig.swift
  Networking/   APIClient.swift, Endpoint.swift, APIError.swift, LegacyStatus.swift
  Domain/       Money.swift, Payment.swift, Period.swift, BudgetMath.swift,
                SpendingSeries.swift, Device.swift, SmartlifeState.swift
  Services/     BudgetService.swift, SmartlifeService.swift, GatewayService.swift (+ Live*, Fake*)
  Settings/     SettingsStore.swift
  Support/      Loadable.swift, SnapshotCache.swift
Features/
  Overview/     OverviewView.swift, BudgetCard.swift, LightsCard.swift
  Budget/       BudgetView.swift, SummaryView.swift, TrendView.swift, AddPaymentSheet.swift, BudgetStore.swift
  Lights/       LightsView.swift, DeviceTile.swift, LightsStore.swift, BrightnessSender.swift
  Settings/     SettingsView.swift
DesignSystem/   Theme.swift, Card.swift, StatusBanner.swift
Assets.xcassets AccentColor, AccentSoft, Background, Surface, Ink, InkSecondary, Warning
```
(`Info.plist` and the xcconfigs live in `client/Config/`, §1–2.)

### 3.3 Concurrency under `MainActor`-by-default

With `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor`, every unannotated type is main-actor-isolated — including model structs and their `Codable` conformances. Rules:

- **Domain models** (`Money`, `Payment`, `Device`, DTOs): declare `nonisolated struct … : Sendable, Codable`. Otherwise their `Decodable` init is main-actor-isolated and can't be used from `APIClient`.
- **`APIClient` and live services**: `nonisolated final class … : Sendable`, holding only `let` properties (`URLSession`, `AppConfig`, `JSONDecoder` created per call or held as `let`).
- **Shared statics used by the networking layer** (`URLSession.omniserv`, `Endpoint` factories, date-format and decoder helpers): declare them `nonisolated static`. An unannotated `extension URLSession { static let omniserv }` is main-actor-isolated, so the `nonisolated` `APIClient.init` couldn't even use it as a default argument.
- **Stores**: stay main-actor (the default), `@Observable final class`.
- **Decoding** happens in the `nonisolated async` service method. Under approachable concurrency it runs on the caller's actor (main). Payloads here are tiny (largest is the B2 list, ~1 500 rows/year), so that's acceptable; if profiling ever shows a hitch, mark the decode helper `@concurrent`.
- **`BrightnessSender`** is a `@MainActor` class with a synchronous `submit` (§7.2), so slider values keep their order.
- Cancellation: store loads run in `.task {}` / `.refreshable {}`, so SwiftUI cancels them when views disappear. `URLSession` honours task cancellation; `APIClient` maps `CancellationError`/`URLError.cancelled` to `APIError.cancelled`, which stores swallow silently (§4.4).

### 3.4 Dependency injection

```swift
@MainActor @Observable
final class AppEnvironment {
    let settings: SettingsStore
    let budget: BudgetStore
    let lights: LightsStore
    let gateway: GatewayService

    static func live(config: AppConfig) -> AppEnvironment
    static func preview() -> AppEnvironment   // fake services with canned data
}
```
`OmniservApp` builds `.live(config:)` once and injects each store with `.environment(store)`. Views read them via `@Environment(BudgetStore.self)`. Previews use `.preview()`.

### 3.5 Load state

```swift
enum Loadable<Value> {
    case idle
    case loading(previous: Value?)
    case loaded(Value, at: Date)
    case failed(APIError, previous: Value?)

    var value: Value? { … }            // latest known value in any state
    func isStale(after: Duration) -> Bool
}
```
Views always render `value` when present — a refresh or a failure never blanks the screen (§8.3).

---

## 4. Networking

### 4.1 Endpoints used by the client

The client reuses existing routes wherever they fit. It needs only two new routes and one optional parameter, all specified in `backend.md`.

| Client action | Route | Exists? | Backend dependency |
|---|---|---|---|
| Connection test (Settings) | `GET /health` | yes | — |
| Spent in a period (Overview donut, Budget Summary) | `GET /query/{secret}/{dd.MM.yyyy}/{dd.MM.yyyy}` | yes | B0 |
| Add a check | `GET /add_payment/{secret}/{store}/{amount}?at={ISO8601}` | yes + new optional `at` | B0, B1 |
| Spending trend (Budget Trend) | `GET /payments/{secret}/{startISO}/{stopISO}` | **new** | B2, B3 |
| Device + automation state (Overview, Lights) | `GET /devices/{secret}` | **new** | B4 |
| Set brightness / on / off | `GET /updBrightness/{secret}/{0…100}` | yes | B5, B6 |
| Pause / resume automation | `GET /updActive/{secret}/{true\|false}` | yes | — |

Not used: `/updStatus` (owned by the presence automation; the app must never fake presence) and `/docs`.

### 4.2 `APIClient`

```swift
nonisolated final class APIClient: Sendable {
    init(config: AppConfig, session: URLSession = .omniserv)

    func get<T: Decodable & Sendable>(_ endpoint: Endpoint, as: T.Type) async throws(APIError) -> T
    func send(_ endpoint: Endpoint) async throws(APIError)          // legacy mutating routes
}

nonisolated struct Endpoint: Sendable {
    var route: String                 // "query", "add_payment", …
    var authorized: Bool = true
    var segments: [String] = []       // path params after the secret
    var query: [URLQueryItem] = []
    var mutating: Bool = false        // informs retry policy + logging
}
```

**URL building — the only place the secret is used:**
```swift
private func url(for e: Endpoint) -> URL {
    var parts = [e.route]
    if e.authorized { parts.append(config.secret) }   // ← single auth hook (see §4.6)
    parts += e.segments
    var c = URLComponents(url: config.baseURL, resolvingAgainstBaseURL: false)!
    c.percentEncodedPath = "/" + parts.map(Self.encodeSegment).joined(separator: "/")
    c.queryItems = e.query.isEmpty ? nil : e.query
    return c.url!
}

/// RFC 3986 path segment: urlPathAllowed minus "/" (a decoded "/" would split the segment).
static func encodeSegment(_ s: String) -> String
```
Callers never percent-encode themselves. Example: store `Rewe City` → `Rewe%20City`; amount `12.34` stays as is.

**Session configuration (`URLSession.omniserv`):**

| Setting | Value | Why |
|---|---|---|
| `timeoutIntervalForRequest` | 10 s | Above the backend gRPC deadline (B7, 5 s) so the server's 504 normally arrives before the client gives up. |
| `timeoutIntervalForResource` | 20 s | |
| `requestCachePolicy` | `.reloadIgnoringLocalCacheData` | Every route is a `GET`, including mutating ones. A cached response must never stand in for a write or a fresh read. |
| `urlCache` | `nil` | Same reason. |
| `waitsForConnectivity` | `false` | Fail fast; the UI shows the error and offers a retry. |
| `httpAdditionalHeaders` | `Accept: application/json`, `User-Agent: Omniserv-iOS/<version>` | A stable UA makes a Cloudflare skip rule easy to write (B9). |

**Retries:** none automatically. For reads, the user retries (pull-to-refresh or the "Retry" button). For writes (`add_payment`, `updBrightness`, `updActive`), an automatic retry after a timeout could double-apply: `add_payment` is not idempotent.

### 4.3 Response decoding

**JSON routes** (`/query`, `/payments`, `/devices`, `/health`): `JSONDecoder` with `.convertFromSnakeCase` and a custom date strategy. It parses with `Date.ISO8601FormatStyle()` and falls back to `.iso8601.includingFractionalSeconds`. B2 pins seconds precision with `Z`, but the stored dates carry milliseconds, so one `isoformat()` slip on the server must not fail the whole list (Foundation's `.iso8601` strategy rejects fractional seconds).

**Legacy status routes** (`/add_payment`, `/updBrightness`, `/updActive`): the body is the JSON integer `200` or `403` (audit §1). `send(_:)` handles both today's behaviour and the fixed one, so the client doesn't have to change in lock-step with B0:

```
HTTP 2xx + body 200        → success
HTTP 2xx + body 403        → .unauthorized
HTTP 2xx + empty body      → success                (any Content-Type)
HTTP 2xx + {"status":"ok"} → success
HTTP 2xx + anything else   → .unexpectedResponse
```

**Wrong secret on JSON routes.** Until B0/§1 is deployed, `/query` with a wrong secret also answers HTTP `200` with body `403`. `get(_:as:)` therefore checks for a body that is exactly the integer `403` before decoding `T` and maps it to `.unauthorized`. Without that check a wrong secret on a read would surface as "Unexpected response". After B0/§1 every protected route answers HTTP `401` with JSON instead (rule 2 below).

Response checks shared by all routes, in this order. Status comes first: today every downstream failure is a `text/plain` `500` (API-CONTRACT §2.3), and Cloudflare's tunnel errors are HTML, so a Content-Type-first check would turn all of them into "Unexpected response".
1. Status `502` / `530` → `.unreachableService(detail?)`; `504` → `.timeout`; any other `5xx` → `.server(status, detail?)`. `detail` is read only when the body is JSON (B8), otherwise `nil`.
2. Status `401` / `403`: JSON body → `.unauthorized` (after audit §1 is fixed); non-JSON body → `.unexpectedResponse`. An HTML `403` is a Cloudflare challenge (B9), not a wrong secret.
3. Status `400` / `422` → `.invalidInput(detail)`. The `detail` comes from the body: FastAPI's list form today; the string form once B8 is in.
4. Status `2xx` with a `Content-Type` other than `application/json` → `.unexpectedResponse` (except the empty legacy body above).
5. Body exactly `403` → `.unauthorized` (both `get` and `send`). Otherwise decode `T`, or apply the legacy rules above. A decoding failure is a developer error, mapped to `.unexpectedResponse` ("Unexpected response").

### 4.4 `APIError`

```swift
nonisolated enum APIError: Error, Sendable, Equatable {
    case offline                       // URLError.notConnectedToInternet, .networkConnectionLost
    case timeout                       // URLError.timedOut, or a 504 from B7
    case unauthorized                  // wrong secret (rebuild with the right .env)
    case invalidInput(String?)         // 422, 400
    case server(status: Int, detail: String?)
    case unreachableService(String?)   // 502 from B7 (omniscient/smartlife down, or "strip unreachable" on a write), 502/530 from cloudflared
    case unexpectedResponse            // non-JSON 2xx / Cloudflare challenge / unknown shape
    case cancelled                     // swallowed by stores, never shown

    var userMessage: LocalizedStringResource { … }
    var isDefiniteRejection: Bool { … }  // true only for .unauthorized, .invalidInput
}
```
User-facing copy is short and actionable: "No connection", "The server didn't answer in time", "Wrong API secret — rebuild the app", "Lights are unreachable".

`isDefiniteRejection` matters for non-idempotent writes. Only those two cases prove the server didn't apply the request. Every other error after the request left the device may hide a success: `.offline` includes `networkConnectionLost`, and a `500` can follow a completed insert. Write callers use it to choose between "not saved" and "may have been saved" (§8.6).

### 4.5 Dates on the wire

Two formats, each confined to the service layer:

| Use | Format | Time zone | Builder |
|---|---|---|---|
| `/query` day range | `dd.MM.yyyy` | `Calendar.current.timeZone` (device) | `Date.FormatStyle` / `DateFormatter` with `Locale(identifier: "en_US_POSIX")`. Always POSIX: a user locale with another calendar or digits would corrupt the path. |
| `/payments` range, `/add_payment?at=` | ISO 8601 instant in **UTC with `Z`**, e.g. `2026-09-30T22:00:00Z` | UTC | `ISO8601FormatStyle()` (default is UTC, `Z`) |

**UTC `Z` instead of a `+02:00` offset** because a literal `+` in a query string decodes to a space, so `?at=…+02:00` would arrive broken. `Z` sidesteps the encoding question in both path and query.

`/query` treats each date as midnight in the server's time zone, with a half-open range (audit §6). The client's period `[start, endExclusive)` maps to `/query/…/start/endExclusive` (§6.2). This is correct only if the server zone equals the device zone, which B0 requires. This is the one place the client depends on server-side time-zone config. Everything else uses exact instants. B0 also moves omniscient to UTC-aware storage in the same change. Setting `TZ` alone would make today's naive `datetime.now()` store local time as if it were UTC, shifting every new payment by the UTC offset.

### 4.6 Moving auth to a header later

All auth goes through `url(for:)` (the `if e.authorized` line). When the backend accepts e.g. `Authorization: Bearer …`, the change is to drop that line and add the header in the request builder. No service, store or view changes.

---

## 5. Domain: money, payments, devices

### 5.1 `Money`

```swift
nonisolated struct Money: Sendable, Hashable, Comparable {
    var cents: Int                         // EUR only; Int is 64-bit — no overflow concerns
    static let zero = Money(cents: 0)
    var decimal: Decimal { Decimal(cents) / 100 }
    static func + (…), - (…)
}
```
- All arithmetic is in integer cents. Ratios (proration, pie fractions) go through `Decimal` and round only at the end (§6.1).
- **Display:** `money.decimal.formatted(.currency(code: "EUR"))` uses the device locale (`12,34 €` on a German-region phone).
- **On the wire:** `Money` is deliberately not `Codable`. Each route has its own representation, so the owning DTO or `init(from:)` converts explicitly. A synthesized conformance would expect `{"cents": …}`, which no route sends.
  - `/query` returns `{"total": <float euros>}`, converted with `Money(cents: Int((total * 100).rounded()))`. Correct only once audit §5 is fixed (B0); the client does **not** compensate, so the bug stays visible rather than masked.
  - `/payments` returns `amount_cents` / `total_cents` integers (B2). No floats.
  - `/add_payment` is sent as a canonical string: `String(format: "%ld.%02ld", cents / 100, cents % 100)` → `12.34`. Always a dot, always two decimals, no currency sign, no grouping. That makes the request independent of the NBSP-suffix handling, and exact once audit §7 is fixed (B0).

### 5.2 Parsing user input (`MoneyParser`)

Used by the Add sheet and by Settings (goal). It works on a `String` field with `.keyboardType(.decimalPad)`. We don't use `TextField(value:format:.currency)`, because it reformats while typing and rejects partial input.

1. Trim whitespace; strip `€` and spaces (incl. NBSP).
2. Accept exactly one decimal separator, `,` or `.`; reject grouping separators (`1.234,56` → invalid: ambiguous).
3. Regex `^\d{1,6}([.,]\d{1,2})?$`.
4. `Decimal(string: normalized, locale: Locale(identifier: "en_US_POSIX"))` → `× 100`. Exact because there are ≤ 2 decimals → `Int`.
5. Bounds: payment `0 < x ≤ 100 000,00 €`; goal `0 ≤ x ≤ 999 999,99 €` (the regex's six integer digits).

Errors are inline under the field ("Use up to 2 decimals", "Amount must be above 0").

### 5.3 Store name rules

- Trim, collapse inner whitespace, 1…64 characters.
- Reject `/` with an inline message ("Store name can't contain /"). Even percent-encoded as `%2F`, Starlette decodes it before routing and the request 404s (API-CONTRACT §2.7). Silently substituting another character would make the stored name differ from what was typed.
- Reject names made only of dots (`.`, `..`, …) with "Store name can't be just dots". Cloudflare's URL normalization decodes `%2E` and resolves dot segments, so `/add_payment/{secret}/../12.34` would reach a different route.
- Everything else (spaces, umlauts, `&`, `#`, `?`, dots inside a name like `Dr. Oetker`) is fine; `encodeSegment` handles it.

### 5.4 Payments

```swift
nonisolated struct Payment: Sendable, Identifiable, Hashable, Decodable {
    let id: String        // Mongo ObjectId hex (B3) — unique, stable across deploys
    let store: String
    let amount: Money     // from amount_cents
    let date: Date        // UTC instant

    init(from decoder: Decoder) throws   // maps amount_cents → amount; ignores currency (EUR only)
}

nonisolated struct PaymentPage: Sendable { let payments: [Payment]; let total: Money; let truncated: Bool }

nonisolated struct PaymentDraft: Sendable { var store: String; var amount: Money; var date: Date }
```

### 5.5 Smartlife

```swift
nonisolated struct SmartlifeState: Sendable, Decodable {
    struct Automation: Sendable, Decodable { let active: Bool; let ownerPresent: Bool? }  // nil = unknown since smartlife restarted (B4)
    let automation: Automation
    let devices: [Device]
}

nonisolated struct Device: Sendable, Identifiable, Decodable {
    enum Kind: String, Decodable, Sendable { case cololightStrip = "cololight_strip"; case unknown }
    let id: Int
    let kind: Kind
    let name: String
    let reachable: Bool
    let on: Bool
    let brightness: Int?  // 0…100; nil when unreachable, may be nil when off (B4)
}
```
`Kind.unknown` (via a custom `init(from:)` fallback) lets a newer backend add device kinds without breaking an older app build: the tile then shows name and reachability only.

---

## 6. Budget logic (client-side)

`client.md` puts the monthly goal in a frontend setting. All planning maths therefore live in the client (`Core/Domain/BudgetMath.swift`). The backend only answers "how much was spent" (`/query`) and "which payments" (`/payments`).

### 6.1 Planned budget for an arbitrary period

Monthly goal `G`. For a period `[start, end)` in local calendar days:

```
plan(start, end) = Σ over each calendar month M overlapping [start, end):
                     G × overlapDays(M) / daysIn(M)
```
Computed in `Decimal` and rounded once at the end to cents (`.bankers`).

Examples with `G = 600,00 €`:

| Period | Calculation | Plan |
|---|---|---|
| October (full) | 600 × 31/31 | 600,00 € |
| 1–15 Oct | 600 × 15/31 | 290,32 € |
| Week 26 Oct – 1 Nov (Mon–Sun) | 600 × 6/31 + 600 × 1/30 | 136,13 € |
| Custom 27 Oct – 2 Nov | 600 × 5/31 + 600 × 2/30 | 136,77 € |
| Year 2026 | 12 × 600 | 7 200,00 € |

Day counts come from `Calendar.current.dateComponents([.day], from:to:)` on start-of-day dates. Never divide seconds by 86 400: DST days are 23 or 25 hours long.

Derived figures:
- **Pace (expected by today):** `plan(monthStart, startOfTomorrow)`.
- **Remaining:** `G − spent` (may be negative).
- **Per-day allowance left:** `max(0, remaining) / daysLeft`, where `daysLeft` includes today.
- **Usage %:** `spent / plan`, uncapped (shows 130 % when over). Undefined when `plan == 0` (`G == 0`): shown as "—", and Summary shows the same "Set a monthly goal" prompt as the Overview card (§8.4).

### 6.2 Periods

```swift
nonisolated struct Period: Sendable, Hashable {
    enum Kind: Sendable { case month, week, year, custom }
    let kind: Kind
    let start: Date          // start of day, local
    let endExclusive: Date   // start of the day after the last included day

    static func current(_ kind: Kind, calendar: Calendar = .current, now: Date = .now) -> Period
    func shifted(by n: Int, calendar: Calendar = .current) -> Period    // history navigation
    var isCurrentOrFuture: Bool
}
```
- Weeks use `Calendar.current.firstWeekday` (Monday in a German region).
- `custom` comes from two `DatePicker`s (inclusive end day in the UI, converted to `endExclusive`). It can't be shifted.
- History: chevrons shift by one unit. "Next" is disabled once the period contains today.
- To `/query`: `start` → `dd.MM.yyyy`, `endExclusive` → `dd.MM.yyyy`. To `/payments`: both as UTC instants.

### 6.3 Spending series (Trend)

Input: the `[Payment]` from `/payments` for the visible range. Output: `[Bucket(start: Date, total: Money?)]` (`nil` = future, see below).

| Granularity | Visible range | Buckets |
|---|---|---|
| Daily | one month (navigable) | each local day of the month |
| Monthly | 12 months ending with the current one | each calendar month |

- Bucketing: `calendar.dateInterval(of: .day | .month, for: payment.date)!.start` as the key. Uses the **device** calendar and time zone, so a 23:30 payment lands on the right day regardless of server time zone.
- **Zero-fill** every bucket in range (`calendar.enumerateDates` over the period) so bars align and empty days are visible.
- Future buckets of the current month are emitted with `total = nil` and not drawn (the axis still spans the month).
- Reference line: daily budget `G / daysIn(month)`, or monthly `G`.
- If `PaymentPage.truncated` is true (B2 cap), the chart shows a footnote "Showing the latest N payments". B2 returns rows newest first, so the earliest buckets are the incomplete ones. At ~100 payments/month this needs 4+ years in one range, which the 400-day limit rules out; the footnote is a safeguard.

### 6.4 What is fetched when

| Screen | Request(s) |
|---|---|
| Overview donut | `/query` for the current month |
| Budget › Summary | `/query` for the selected period (+ current month, already cached) |
| Budget › Trend daily | `/payments` for the selected month |
| Budget › Trend monthly | `/payments` for the last 12 months |
| After adding a check | invalidate all budget caches, refetch what is visible |

`BudgetStore` caches results keyed by `Period` / range, in memory, for the session. That makes history navigation back and forth instant.

### 6.5 Why `/query` and `/payments` both exist

`/query` is the existing route and does exactly what the donut and Summary need: one number. `/payments` is added only because a trend can't be built from a single sum without N calls (31 for a month), each logged with the secret. A consequence: totals come from two routes. They agree as long as both use the same half-open ranges and the server zone equals the device zone (B0). If they ever disagree in practice, the fallback is to derive Summary totals from `/payments` and retire the client's use of `/query`. That is a client-only change in `LiveBudgetService`.

---

## 7. Smartlife logic

### 7.1 Reading state

`LightsStore` loads `GET /devices` (B4) on first appearance of Overview or Lights, on pull-to-refresh, when the app becomes active (§8.3), and once after brightness changes settle (§7.2). There is no polling timer. Outside the app the strip changes only through the automation loop (every ~10 min) and the presence Shortcut (`/updStatus` on leaving/arriving), and a refresh on foregrounding is enough for a personal app.

An unreachable device comes back as `reachable: false` (B4), not as an HTTP error, so the tile can render "Unreachable" while the rest of the screen works.

### 7.2 Brightness slider: "sets new brightness on any change"

`client.md` asks for every slider change to be sent. A naive `.onChange` → request would fire ~60 requests/s while dragging. They would run concurrently against a strip with no locking (B6), arrive out of order, and could leave the strip at a stale value. Design:

```swift
@MainActor
final class BrightnessSender {
    private var pending: Int?
    private var lastSent: Int?                   // dedupe within one burst only
    private var loop: Task<Void, Never>?
    private let send: @Sendable (Int) async throws(APIError) -> Void
    private let onSettled: (Result<Int, APIError>) -> Void

    /// Called synchronously for every slider change. Never more than one request in flight; latest value wins.
    /// `force` bypasses the duplicate check (power button, §7.3).
    func submit(_ value: Int, force: Bool = false) {
        if force { lastSent = nil }
        pending = value
        guard loop == nil else { return }        // the running loop will pick it up
        loop = Task { await drain() }
    }

    private func drain() async {
        var lastResult: Result<Int, APIError>?
        while let next = pending {
            pending = nil
            guard next != lastSent else { continue }
            do throws(APIError) {
                try await send(next)
                lastSent = next
                lastResult = .success(next)
            } catch {
                lastResult = .failure(error)
            }
        }
        loop = nil
        lastSent = nil                           // burst over: the strip may change outside the app
        if let lastResult { onSettled(lastResult) }
    }
}
```

Properties:
- **"On any change" is kept.** Every change is submitted. While a request is in flight, intermediate values collapse to the newest. The round-trip time (phone → Cloudflare → tunnel → gRPC → strip, ~100–300 ms) is the natural throttle. No timer is needed.
- **Ordering:** strictly sequential, so the strip ends at the last value the user chose.
- **Only user input submits.** `submit` is called from the slider's `Binding` setter, the power button and the accessibility adjustable action, never from `.onChange(of:)`. The displayed value is also written by code: a store refresh while the user isn't dragging, or a rollback after a failure. An `.onChange` hook would fire on those writes too and send them back to the strip; a rollback would actively re-send the old value. The tile therefore binds the slider to `Binding(get: { displayed }, set: { displayed = $0; sender.submit(Int($0)) })` and assigns `displayed` directly for refreshes and rollbacks.
- **Why main actor, not an `actor`:** `submit` is synchronous and called directly from the binding setter / `onEditingChanged`, so values are recorded in the order the slider produced them. With an `actor`, every call would need `Task { await sender.submit(v) }`, and unstructured tasks hopping onto an actor aren't guaranteed to run in creation order. A stale value could then overtake the final one. The state is a few scalars. The network wait is an `await`, so the main thread is never blocked.
- **Duplicates:** a value equal to the last one sent in the *same burst* is skipped (e.g. the release event after the last drag value). `lastSent` is cleared when the burst ends, because the automation can change the strip between bursts. `force: true` always sends.
- **Typed throws:** `do throws(APIError)` is needed. Without the `FullTypedThrows` feature, a plain `do`/`catch` binds `error` as `any Error`.
- **Release:** `Slider(onEditingChanged:)` with `false` submits the final value. That is a no-op while the burst is still running. If the burst has already ended, it costs one redundant set, which is idempotent and harmless.
- **Reconcile:** `onSettled` schedules one `/devices` refresh after 1 s, cancelled if a new submit arrives. It does so on success *and* failure. The tile then reflects what the strip actually reports.
- **Failure:** `onSettled(.failure)` shows an inline error on the tile. If `error.isDefiniteRejection` (§4.4), the slider rolls back to the last confirmed brightness at once. For any other error (timeout, `5xx`, connection lost) the write may have been applied: the slider keeps the value the user chose and the reconcile refresh decides. A blind rollback could show a value the strip no longer has.
- The slider's displayed value is local UI state (`@State`). It is only overwritten by store state when the user isn't dragging, so a refresh never yanks the thumb.

Slider spec: `0…100`, step 1, sent as `Int`. `0` means off (`/updBrightness/0`), per API-CONTRACT §6.3. Range validation is B5.

### 7.3 Power and automation

- **Power button** on the tile: if on → send `0`; if off → send `lastNonZeroBrightness`. That is persisted in `UserDefaults` per device id, default `25`, matching the automation's default in `ColoStrip.on`. It goes through the same `BrightnessSender` with `force: true`. The automation may have changed the strip since the app last sent a value, so "restore 40" must be sent even if 40 was the last value sent.
- **Automation switch** (Lights screen, below the tiles): `GET /updActive/{true|false}`. The toggle flips optimistically. On a definite rejection it rolls back; on any other error it refetches `/devices`. `updActive(true)` sets the flag on the server *before* it runs `check()`, so a `502` from an unreachable strip (B7) still leaves automation on. Shown with the read-only line "Owner at home: yes / no / unknown" from `automation.ownerPresent` (`nil` = unknown until the presence Shortcut reports after a smartlife restart, B4).
- **Override hint** (footer text): "Automation checks every 10 minutes and may switch the lights off at bedtime or when you leave." Without it, a manual change being reverted would look like a bug.
- The client never calls `/updStatus`.

---

## 8. UI

### 8.1 Theme — white / light blue

Forced light appearance (`UIUserInterfaceStyle = Light`, §1). Colors are asset-catalog colors referenced through `Theme`:

| Token | Value | Use |
|---|---|---|
| `AccentColor` | `#3D9BFF` | Tint, primary buttons, slider track, "spent" sector |
| `AccentSoft` | `#D6EAFF` | "Remaining" sector, chips, selected segment background |
| `Background` | `#F4F8FD` | Screen background (very light blue, so white cards stand out) |
| `Surface` | `#FFFFFF` | Cards, tiles |
| `Ink` | `#0F1B2D` | Primary text |
| `InkSecondary` | `#5A6B82` | Secondary text, axis labels |
| `Warning` | `#E5484D` | Over budget, errors |

`Ink` on `Surface` and `InkSecondary` on `Surface` both pass WCAG AA for body text. Accent on white is used only for large or bold text and non-text elements.

Typography: system font, SF Rounded for big numbers (`.fontDesign(.rounded)`), `.monospacedDigit()` on every amount so values don't jitter while updating.

Components (`DesignSystem/`):
- `Card { … }`: `Surface` background, 20 pt continuous corner radius, 16 pt padding, soft shadow (`black 6 %`, y 2, radius 8).
- `StatusBanner`: inline error row with message and retry button, `Warning`-tinted icon.

The system tab bar and navigation bars keep their default iOS 27 materials. No custom chrome.

### 8.2 Navigation

`RootView` is a `TabView(selection:)` with four `Tab`s. The tab bar is the "easily accessible menu" from `client.md`, always one tap away:

| Tab | SF Symbol | Root |
|---|---|---|
| Overview | `square.grid.2x2` | `OverviewView` |
| Budget | `chart.pie` | `BudgetView` (NavigationStack) |
| Lights | `lightbulb` | `LightsView` (NavigationStack) |
| Settings | `gearshape` | `SettingsView` (NavigationStack) |

`AppTab` selection is a `@SceneStorage` value, so the app reopens on the last tab. Overview cards switch tabs by writing the selection binding. They don't push, so Budget and Lights each have a single home.

### 8.3 "Responsive and light-weight" rules

1. **Never block on the network.** Screens render immediately from cached state. On first ever load they show the real layout with `.redacted(reason: .placeholder)` and placeholder values, not spinners.
2. **Refresh triggers:** `.task` on first appearance; `.refreshable` everywhere; `scenePhase → .active` refreshes visible stores if older than 30 s (`Loadable.isStale`).
3. **Errors are inline and non-destructive.** A `StatusBanner` sits inside the affected card; the last good value stays visible. No modal alerts except for a failed add (the sheet stays open).
4. **Feedback:** `.sensoryFeedback(.success, trigger:)` on a saved check; `.selection` on slider release; `.error` on rollback.
5. **Motion:** numbers animate with `.contentTransition(.numericText())`; chart data changes animate with `.animation(.smooth, value:)`. Nothing animates longer than ~300 ms.
6. **Cold launch (step 10):** `SnapshotCache` writes the last `Overview` data (month total, devices) as JSON to the Caches directory and reads it synchronously at launch. The first frame shows real, slightly stale numbers marked "Updated 2 h ago" until the refresh lands.

### 8.4 Overview

```
┌───────────────────────────────┐
│ Overview                      │
│ ┌───────────────────────────┐ │
│ │ October budget         ›  │ │
│ │      ╭──────╮             │ │
│ │     │ 372 € │  of 600 €   │ │  donut: spent (Accent) / remaining (AccentSoft)
│ │      ╰──────╯             │ │
│ │ 228 € left · 19 €/day     │ │  (on 20 Oct: 12 days left incl. today)
│ │ 15 € under pace           │ │  (pace 600 × 20/31 = 387 €)
│ └───────────────────────────┘ │
│ ┌───────────────────────────┐ │
│ │ Lights                 ›  │ │
│ │ ● Strip       40 %   [⏻]  │ │
│ │ Automation on · At home   │ │
│ └───────────────────────────┘ │
└───────────────────────────────┘
```

**Budget card**
- `Chart` with two `SectorMark(angle: .value("Amount", …), innerRadius: .ratio(0.68), angularInset: 2)` marks, `.cornerRadius(4)`. The centre label sits in `.chartBackground`.
- Over budget: a single full ring in `Warning`; centre shows spent, and the subtitle reads "Over by 37 €".
- No goal set (`G == 0`): the card shows "Set a monthly goal" and the button goes to Settings.
- Tap → Budget tab. Context menu → "Add check" opens the Add sheet (§8.6).

**Lights card**
- One row per device: reachability dot, name, brightness % or "Off" / "Unreachable", and a power button (§7.3).
- A second line shows automation and presence.
- Tap → Lights tab.

### 8.5 Budget

A `Picker` with `.segmented` style switches **Summary | Trend**. The toolbar has a `+` button that opens the Add sheet (§8.6). That keeps entry one tap away from both views, and the same sheet opens from the Overview card's context menu.

**Summary** (`client.md` view 1):
- Period selector: segmented `Month | Week | Year | Custom` plus a `‹ October 2026 ›` row.
- Big numbers: **Spent**, **Planned** (prorated, §6.1), **Difference** (green under / `Warning` over), **Used %**.
- A horizontal progress bar (spent / planned), with a tick at "pace" when the period contains today.
- History is navigated with the chevrons; each period is cached once loaded.

**Trend** (`client.md` view 2):
- Picker `Daily | Monthly` (`client.md`: adjustable by user).
- `BarMark(x: .value("Day", bucket.start, unit: .day), y: .value("Spent", bucket.total.decimal))`. The month variant uses `unit: .month`.
- `RuleMark(y: dailyBudget)` dashed in `InkSecondary`, annotated "Budget/day".
- `.chartXSelection(value: $selectedDate)` shows a `RuleMark` and a popover with the date and amount of the touched bar.
- Daily view: `‹ October 2026 ›` navigation, same as Summary. Monthly view: a fixed trailing 12 months.
- Below the chart: "Average per day / month" and "Highest day / month".

### 8.6 Add check sheet

`client.md` view 3: store, amount in EUR, datetime defaulting to now.

```
Form {
  TextField("Store", text: $store)          .textInputAutocapitalization(.words) .submitLabel(.next)
  TextField("0,00", text: $amount)          .keyboardType(.decimalPad)  + "€" trailing label
  DatePicker("Date", selection: $date, in: ...Date.now, displayedComponents: [.date, .hourAndMinute])
}
toolbar: Cancel · Save
```
- `date` is initialised to `.now` when the sheet is presented, not when the view type is created. Dates in the future are not selectable.
- Focus starts on Store; Return moves to Amount (`@FocusState`).
- **Save** is enabled only when store and amount are valid (§5.2, §5.3) and no request is in flight. While saving, the button shows a `ProgressView` and the form is disabled. This guards against a double submit, which would create two payments because the route isn't idempotent.
- Success: success haptic, dismiss, `BudgetStore.invalidateAll()` and refetch of what is visible.
- Failure: the sheet stays open with values intact and a `StatusBanner` at the top. The copy depends on `APIError.isDefiniteRejection` (§4.4):
  - `.unauthorized` / `.invalidInput`: the normal error message. Nothing was saved, and retrying is safe once the cause is fixed.
  - Any other error (`.timeout`, `.offline`, `.server`, …): "The server didn't confirm — it may have been saved. Check that day's bar in Budget › Trend before retrying." A failed non-idempotent write is ambiguous. There is no payment list yet (§10, step 11), so the Trend bar for the payment's day is where to check.
- Sent as `/add_payment/{secret}/{store}/{12.34}?at={UTC ISO}` (B1).

### 8.7 Lights

- `LazyVGrid(columns: [GridItem(.adaptive(minimum: 160))])` of `DeviceTile`s. With one device it is a single wide tile; the layout is ready for more (`client.md`: tiles).
- `DeviceTile`:
  - Name and a reachability dot.
  - A big brightness number (`40 %`) and a power button.
  - A full-width `Slider(value:in:0...100, step: 1, onEditingChanged:)`.
  - An inline error row when needed.
  - Disabled and greyed when unreachable.
- Below the grid, an "Automation" section: a `Toggle` and the presence line, plus the override hint (§7.3).

### 8.8 Settings

`client.md`: currently only the monthly goal.

| Section | Content |
|---|---|
| Budget | "Monthly goal" text field (§5.2). It is saved on submit or when the field loses focus, and persisted in `UserDefaults` under `settings.monthlyGoalCents`. A change recomputes plans immediately and needs no fetch. |
| About | Server host (read-only, from `AppConfig`), app version and build, "Test connection" button → `GET /health` with latency in ms, then `GET /devices` to check the secret (`/health` is unauthenticated, so on its own it passes with a wrong secret). Shows `OK · NN ms` or the first error. |

`SettingsStore` is `@Observable` and backed by `UserDefaults.standard`. It isn't `@AppStorage`, because non-view code (stores) reads the goal too.

### 8.9 Accessibility

- Every amount has a spoken label from `.currency` formatting ("372 euros 30 cents").
- The donut is `.accessibilityElement(children: .ignore)` with the label "October budget: 372 euros spent of 600, 228 left".
- Trend charts provide an `AXChartDescriptorRepresentable` (bucket series), so VoiceOver's audio graph works.
- The slider has `.accessibilityValue("40 percent")`, and `.accessibilityAdjustableAction` steps by 5. Every step goes through `BrightnessSender`.
- Dynamic Type up to `.accessibility2`: the Overview cards' rows reflow vertically via `ViewThatFits`.
- No information is conveyed by colour alone: over budget is also stated in text.

---

## 9. Testing

### 9.1 Unit tests (`OmniservTests`, Swift Testing)

| Suite | Cases |
|---|---|
| `MoneyParserTests` | `12,34` / `12.34` / `12` / `0,29` → exact cents; rejects `1.234,56`, `12,345`, `-1`, empty, `abc`; `0` rejected as a payment, accepted as a goal; goal `999999,99` accepted, `1000000` rejected; strips `€`/NBSP. |
| `MoneyFormatTests` | canonical wire string (`5` → `0.05`, `1234` → `12.34`, `100000` → `1000.00`). |
| `BudgetMathTests` | the table in §6.1; leap February; a period across a year boundary; `G = 0`; pace on the 1st and last day. |
| `PeriodTests` | week start honours `firstWeekday`; `shifted` across years; `endExclusive` correct on DST-change days (Europe/Berlin, 2026-03-29 and 2026-10-25) with a fixed calendar injected. |
| `SpendingSeriesTests` | zero-fill; a 23:30 local payment lands on that local day; future buckets are `nil`; monthly buckets over 12 months. |
| `StoreNameTests` | trim/collapse; 64-char limit; `/` rejected; `.` and `..` rejected; `Dr. Oetker` accepted. |
| `EndpointTests` | segment encoding (space, `&`, `?`, `#`, `ü`, `%`); the secret appears exactly once and only for authorized routes; `?at=` contains no `+`. |
| `ResponseDecodingTests` | legacy `200`, `403`, empty 2xx body; HTTP 200 + body `403` on a JSON route (`get`) → `.unauthorized`; HTTP 401 JSON → `.unauthorized`; `/devices` with `owner_present: null`; HTML 403 from Cloudflare → `.unexpectedResponse`; 422 list detail, 422 string detail; `text/plain` 500 → `.server`; HTML 502/530 → `.unreachableService`; 504 → `.timeout`; `/payments` dates with and without fractional seconds; `isDefiniteRejection` per case. |
| `BrightnessSenderTests` | with a fake `send` that suspends: at most one in flight; 100 synchronous submits → ≤ 3 sends, last = final value, order preserved; failure → `onSettled(.failure)`; duplicate of `lastSent` not resent within a burst; same value resent after the burst ends; `force: true` always sends. |

### 9.2 `APIClient` tests

`URLProtocol` subclass `StubURLProtocol` registered on an ephemeral `URLSessionConfiguration`. It asserts the exact request URL and returns canned status, headers and body. It covers every row of §4.1.

### 9.3 Previews

Every feature view has `#Preview`s on `AppEnvironment.preview()` covering these states: loaded, first load (redacted), failed with previous value, over budget, no goal, device unreachable.

### 9.4 Manual end-to-end checklist (on device, against production)

1. Fresh clone → `make client-config` → build & run → Settings › Test connection shows `OK · NN ms`.
2. Build with a wrong secret → any screen and Settings › Test connection show "Wrong API secret".
3. Airplane mode → screens keep the last values and show "No connection"; pull-to-refresh recovers.
4. Add a check `Test 0,29 €` dated yesterday 23:30 (not on the 1st: yesterday would be in the previous month) → the Overview total rises by exactly 0,29 €. Trend daily shows it on yesterday's bar. Mongo has `amount: 29` and the right UTC date.
5. Drag the slider quickly from 0 to 100 and back to 37 → the strip ends at 37; the server log shows a short sequential series of `/updBrightness` calls, not dozens. Then change the brightness with `curl` and pull to refresh → the slider moves to the new value and **no** `/updBrightness` call follows.
6. Power off and on → restores the previous brightness.
7. Unplug the strip → the tile shows "Unreachable" and the rest of the app works.
8. Toggle automation off → `/devices` reports `active: false` after a refresh.
9. Delete the test payment manually in Mongo (no delete route by design).

---

## 10. Implementation steps

Each step ends in a buildable app that does something verifiable. Backend dependencies refer to `backend.md`.

| # | Step | Deliverable | Verify | Backend |
|---|---|---|---|---|
| 1 | **Project hygiene** | §1 build settings, folder skeleton (§3.2), test target, `Theme` tokens in the asset catalog, `RootView` with four empty tabs. | Builds in Swift 6 mode with no warnings; runs on iPhone 15. | — |
| 2 | **Config** | `Makefile` target, xcconfigs and partial `Info.plist` in `client/Config/`, `.gitignore` line, `AppConfig` (§2). | Settings shows the host; launching without `Secrets.xcconfig` fails with the explicit message. | — |
| 3 | **Networking core** | `APIClient`, `Endpoint`, `APIError`, decoding rules (§4); `GatewayService`; Settings › Test connection. Tests §9.1 `EndpointTests` and `ResponseDecodingTests`, plus §9.2. | Checklist items 1–3. | — |
| 4 | **Settings: goal** | `MoneyParser` (§5.2), `SettingsStore`, goal field. | Value survives relaunch; parser tests pass. | — |
| 5 | **Overview budget card** | `Money`, `Period`, `BudgetMath`, `BudgetService.total`, `BudgetStore`, donut card, empty/over/no-goal states. | Matches a manual `curl /query` for the month. | **B0** for correct numbers (the card works without it, but shows the audit §5 values). |
| 6 | **Budget › Summary** | Period selector, history navigation, plan vs actual, pace. | Hand-computed plan for three periods matches the UI. | B0 |
| 7 | **Add check** | `AddPaymentSheet`, validation, submit flow, invalidation (§8.6). | Checklist item 4. | **B1**, deployed first. FastAPI ignores unknown query parameters, so before B1 `?at=` is silently dropped and the payment gets the server time. The app can't detect that. If step 7 has to ship earlier, hide the date picker behind a build setting (`ENABLE_PAYMENT_DATE`) and turn it on once B1 is live. |
| 8 | **Budget › Trend** | `BudgetService.payments`, `SpendingSeries`, charts, selection (§6.3, §8.5). | Daily bars sum to the Summary total for the same month. | **B2, B3** |
| 9 | **Lights** | `SmartlifeService`, `LightsStore`, `BrightnessSender`, tiles, power, automation, Overview lights card (§7, §8.7). | Checklist items 5–8. | **B4** (state), **B5, B6** (safe slider), B7 (bounded waits) |
| 10 | **Polish** | `SnapshotCache`, haptics, number transitions, accessibility pass (§8.9), Dynamic Type check, all previews. | VoiceOver walkthrough; cold launch shows cached numbers. | B8 (better error copy), B9 (edge config, before daily use) |
| 11 | **Later** (not planned in detail) | Header-based auth (§4.6) with server-side auth; WidgetKit extension reusing `Core/` via an App Group; payment list/delete. | — | future |

Steps 1–6 need no backend work beyond B0, so client and backend work can proceed in parallel. B1–B4 are what unblock steps 7–9.

---

## 11. Decision log

| # | Decision | Alternatives rejected | Reason |
|---|---|---|---|
| D1 | Reuse existing routes; add only `/payments` and `/devices` plus `?at=` on `/add_payment`, in the existing path-secret style. | A new `/v1` REST namespace. | `client.md`: use existing endpoints wherever possible, keep the set slim. Auth is isolated (§4.6), so the style can change later cheaply. |
| D2 | Budget goal and all planning maths in the client. | Server-side allowance (`configure_monthly_allowance` stub). | `client.md` makes it a frontend setting; it avoids another endpoint and backend state. |
| D3 | Trend built client-side from a payment list. | Server-side bucketing route; N × `/query`. | One general read route serves both granularities and future lists. Device-local day boundaries come free. Volumes are tiny. |
| D4 | Slider sends latest-wins, one in flight. | Debounce (sends only after the user stops); fire every change. | Keeps "on any change" responsiveness without flooding an unlocked device. |
| D5 | No automatic retries for writes. | URLSession / custom retry. | Routes are non-idempotent `GET`s. |
| D6 | `TabView` as the menu. | Hamburger/side menu; Overview as a hub that pushes. | Platform-standard, always visible, one tap. |
| D7 | Forced light mode. | Light + dark palettes. | `client.md` specifies a white/light-blue theme. Revisit if dark mode is wanted. |
| D8 | No third-party packages. | Alamofire, Charts libraries. | First-party APIs cover everything; zero maintenance for a side-loaded app. |
| D9 | iPhone-only, portrait. | Keep the multiplatform template. | `client.md`: iPhone 15. Less to test. |
| D10 | Wire instants in UTC `Z`. | Local offsets. | Avoids the `+`-in-query encoding trap (§4.5). |

## 12. Open questions

1. **Owner time zone.** B0 sets omniscient's `TZ` to the owner's zone, and the client assumes the device is in the same zone. Is the phone ever used for budget entry while abroad? If so, switch Summary to `/payments` totals (§6.5).
2. **Strip brightness range.** The design assumes 0–100 (`pycololighto` 2.1.1). Confirm on the device; the slider range and B5 follow from it.
3. **Cloudflare Access.** Is a Zero Trust Access policy in front of `api.omniserv.me`? If yes, the app needs `CF-Access-Client-Id` / `CF-Access-Client-Secret` service-token headers. That is the same injection path as §2 and a one-line addition in `APIClient`.
4. **Shortcuts automation and `/payments`.** Older documents may hold euro floats (audit §5). B0's inventory query shows whether any exist; its migration decides whether historic months are shown.
5. **Shortcuts and a real `401`.** B0/§1 changes a wrong secret from `200` to `401`. Confirm that the payment and presence Shortcuts don't depend on always getting `200`.
