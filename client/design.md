# Omniserv iOS client — design

> **Status:** design, pre-implementation. Written 2026-10-19 against `d23f667`. Revised 2026-10-20: auth phase 0 (§2, §4.6) and the `/v1` HTTP API (§4.1).
> **Inputs:** [`client.md`](../client.md) (wishes), [`API-CONTRACT.md`](../API-CONTRACT.md) (as-is API), [`audit.md`](../audit.md) (API findings).
> **Backend changes this design depends on:** [`backend.md`](../backend.md), referenced as **B0–B9**, plus **B10** (the `/v1` foundation, §4.1).
> **backend.md predates the `/v1` revision.** Where its route shapes differ (B1, B2, B4, B5, B0/§1), §4.1 here is authoritative until backend.md is updated. B10 is specified only here so far.
> Approach per `client.md`: Design → Document → Implement. Nothing in §10 is built before its section here is agreed.

---

## 0. Scope

**In scope**
- Native SwiftUI app for one user (the owner), iPhone 15, iOS 27, side-loaded from Xcode.
- Read and control `omniscient` (budget) and `smartlife` (lights) through the `api` gateway.
- Four screens: Overview, Budget, Lights, Settings.

**Non-goals (for this iteration)**
- Multi-user, accounts, an auth framework (`client.md`: later, together with the server). This iteration ships only auth **phase 0**: a bearer header plus a Cloudflare Access service token (§2, §4.6).
- The legacy routes (`/query`, `/add_payment`, `/upd*`). The app uses only `/v1` (§4.1); the legacy routes stay for the Shortcuts automations.
- Currencies other than EUR.
- iOS home-screen widgets (WidgetKit) — in-app cards only; listed as a later step (§10, step 11).
- Editing or deleting payments.
- Offline write queue. Writes need a connection; failures are surfaced, not queued.
- iPad / Mac / visionOS.

**Runtime topology** (as seen by the client)

```
iPhone ──HTTPS──▶ api.omniserv.me (Cloudflare edge: Access checks the service token, §4.6)
                    │  Cloudflare Zero Trust tunnel (encrypted)
                    ▼
               cloudflared (private network; host ports: see B9.6)
                    │  plain HTTP
                    ▼
               api:5006 (checks the bearer secret) ──gRPC──▶ omniscient / smartlife
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

Because `client/Config/` is outside the synchronized group, `Omniserv.xcconfig` needs a plain file reference in the project (no target membership) before it can be chosen as the base configuration. That is the one `project.pbxproj` change beyond build settings; make it through Xcode's Info › Configurations. `INFOPLIST_FILE` is just a path and needs no reference.

---

## 2. Configuration & secret injection

`client.md`: the secrets are injected from the local `.env` at build time and shipped inside the app. This section defines the mechanism. How they are sent is §4.6.

| `.env` variable | Required | Used for |
|---|---|---|
| `API_HOST` | no (default `api.omniserv.me`) | Base URL (`https://` fixed in code). |
| `API_SECRET` | **yes** | `Authorization: Bearer …`, checked by the gateway (B10). The same value the backend gets from GitHub secrets. |
| `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET` | no; both or neither | Cloudflare Access service token, checked at the edge (B9.4). Empty → the headers aren't sent, so the app works before Access is set up. |

### 2.1 Flow

```
.env (repo root, gitignored)          API_SECRET  API_HOST  CF_ACCESS_CLIENT_ID  CF_ACCESS_CLIENT_SECRET
   │  make client-config
   ▼
client/Config/Secrets.xcconfig        (generated, gitignored)
   │  #include? from Omniserv.xcconfig (committed)
   ▼
build settings $(API_SECRET) $(API_HOST) $(CF_ACCESS_CLIENT_ID) $(CF_ACCESS_CLIENT_SECRET)
   │  substituted into client/Config/Info.plist (committed, partial)
   ▼
Bundle.main.infoDictionary            OmniservAPISecret / OmniservAPIHost / OmniservCFAccessClientId / OmniservCFAccessClientSecret
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
CF_ACCESS_CLIENT_ID =
CF_ACCESS_CLIENT_SECRET =
#include? "Secrets.xcconfig"
```
The `#include?` is optional, so a fresh clone still builds; `AppConfig` then fails loudly (§2.3) instead of the build failing obscurely.

`client/Config/Info.plist` (committed, only the custom keys; outside the synchronized `Omniserv/` group, §1):
```xml
<dict>
  <key>OmniservAPIHost</key>              <string>$(API_HOST)</string>
  <key>OmniservAPISecret</key>            <string>$(API_SECRET)</string>
  <key>OmniservCFAccessClientId</key>     <string>$(CF_ACCESS_CLIENT_ID)</string>
  <key>OmniservCFAccessClientSecret</key> <string>$(CF_ACCESS_CLIENT_SECRET)</string>
</dict>
```

**Store the host, not a URL.** In `.xcconfig` files `//` starts a comment, so `https://api.omniserv.me` would be truncated to `https:`. The scheme is fixed to `https` in code.

Root `Makefile`, new target:
```make
.PHONY: client-config
client-config:
	@test -n "$(API_SECRET)" || { echo "API_SECRET is not set in .env"; exit 1; }
	@test "$(if $(CF_ACCESS_CLIENT_ID),set)" = "$(if $(CF_ACCESS_CLIENT_SECRET),set)" \
		|| { echo "Set both CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET, or neither"; exit 1; }
	@mkdir -p client/Config
	@printf 'API_SECRET = %s\nAPI_HOST = %s\nCF_ACCESS_CLIENT_ID = %s\nCF_ACCESS_CLIENT_SECRET = %s\n' \
		"$(API_SECRET)" "$(or $(API_HOST),api.omniserv.me)" "$(CF_ACCESS_CLIENT_ID)" "$(CF_ACCESS_CLIENT_SECRET)" \
		> client/Config/Secrets.xcconfig
	@echo "wrote client/Config/Secrets.xcconfig"
```
The existing `-include .env` + `export` at the top of the Makefile already loads the variables.

`.gitignore`, new line (the existing `/.*` rule only covers root dotfiles):
```
client/Config/Secrets.xcconfig
```

**Constraint on the secrets' alphabet.** Every value is an xcconfig value, so `$`, `//` and quotes would break. Keep `API_SECRET` to `[A-Za-z0-9_-]` (e.g. `openssl rand -base64 32 | tr '+/' '-_' | tr -d '='`). Cloudflare's generated token values fit already: the client id is hex plus `.access`, the secret is hex. This is a convention for whoever rotates the secrets, not something the app enforces. Since the secret is now a header, not a path segment, URL encoding no longer matters.

### 2.3 `AppConfig`

```swift
nonisolated struct AppConfig: Sendable {
    nonisolated struct AccessToken: Sendable { let clientId: String; let clientSecret: String }

    let baseURL: URL            // https://<API_HOST>
    let secret: String
    let accessToken: AccessToken?   // nil = Cloudflare Access headers not sent

    static func load(from bundle: Bundle = .main) -> AppConfig
}
```
- Reads all four keys from `bundle.infoDictionary`.
- If host or secret is missing, empty, or still the literal `$(…)`: `preconditionFailure("Run make client-config …")`, in every configuration. A side-loaded personal app has no Release audience to protect.
- The two Access values are both empty → `accessToken = nil`. Exactly one empty → `preconditionFailure`, same as above (the Makefile already rejects that, this guards hand-edited xcconfigs).
- Loaded once in `OmniservApp.init` and passed into `APIClient` — never read from `Bundle` anywhere else.

**Accepted risk** (per `client.md`): the secrets are plaintext inside the `.app` bundle on the device and in Xcode's build products. Moving them to the Keychain would not help while they are bundled anyway. Anyone who can read the bundle already holds the unlocked phone or the Mac. Rotation costs a rebuild, which the 7-day/1-year re-signing (§1) forces regularly anyway. Revisit when `client.md`'s triggers apply: a second user, another client, or exposure outside Cloudflare.

**Rotation.** `API_SECRET`: update the GitHub secret → deploy → `.env` → `make client-config` → run from Xcode. The Shortcuts still use the same secret on the legacy routes, so update them in the same go. Access token: create a new service token in Cloudflare, add it to the Access policy, rebuild the app, then delete the old token. Nothing is down in between.

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
- **APIClient** is the only type that knows about the secrets, HTTP methods, URL shapes and status mapping.

### 3.2 Folder layout (`client/Omniserv/`)

```
App/            OmniservApp.swift, AppEnvironment.swift, RootView.swift (TabView)
Core/
  Config/       AppConfig.swift
  Networking/   APIClient.swift, Endpoint.swift, APIError.swift, NoRedirectDelegate.swift
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

- **Domain models** (`Money`, `Payment`, `Device`, DTOs): declare `nonisolated struct … : Sendable, Codable` (or just the half they need: `Decodable` for responses, `Encodable` for request bodies). Otherwise their `Decodable` init is main-actor-isolated and can't be used from `APIClient`.
- **`APIClient` and live services**: `nonisolated final class … : Sendable`, holding only `let` properties (`URLSession`, `AppConfig`, `JSONDecoder` created per call or held as `let`).
- **Shared statics used by the networking layer** (`URLSession.omniserv`, `Endpoint` factories, date-format and decoder helpers): declare them `nonisolated static`. An unannotated `extension URLSession { static let omniserv }` is main-actor-isolated, so the `nonisolated` `APIClient.init` couldn't even use it as a default argument.
- **Stores**: stay main-actor (the default), `@Observable final class`.
- **Decoding** happens in the `nonisolated async` service method. Under approachable concurrency it runs on the caller's actor (main). Payloads here are tiny (largest is the `/v1/payments` list, ~1 500 rows/year), so that's acceptable; if profiling ever shows a hitch, mark the decode helper `@concurrent`.
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

### 4.1 The `/v1` API

The app talks only to a new, versioned set of routes under `/v1` (D1). The legacy routes stay unchanged for the Shortcuts automations and are removed once those move to `/v1` (§4.7). `/health` stays at the root, unauthenticated.

**Conventions** (`client.md`, "Endpoints"):
- **Methods:** `GET` reads and never changes state. `POST` creates a resource. `PATCH` changes some fields of an existing one. `DELETE` removes (none yet). Only `POST` is non-idempotent.
- **Inputs:** resource ids in the path, filters in the query string, write data in a JSON body (`Content-Type: application/json`). Never secrets: auth is headers only (§4.6).
- **Outputs:** JSON with snake_case keys. Money is integer cents (`amount_cents`), never floats. Instants are ISO 8601 in UTC, seconds precision, literal `Z` (`2026-10-18T21:30:00Z`). Every `/v1` response carries `Cache-Control: no-store`.
- **Statuses:** `200` with a body for reads, `201` with the created resource for `POST`, `204` without a body for `PATCH`. Errors always have a JSON body `{"detail": …}`:

| Status | Meaning |
|---|---|
| `401` | Missing or wrong bearer secret. `{"detail": "unauthorized"}` and `WWW-Authenticate: Bearer`. Checked before input validation, so an unauthenticated caller never learns about parameters (audit §2). |
| `404` | Unknown route or unknown resource id (e.g. `PATCH /v1/devices/7`). |
| `422` | Invalid input. FastAPI's list form for schema errors; a string for the handlers' own checks. |
| `502` | A downstream service or the strip is unavailable (B7). `detail` names which: `"omniscient unavailable"`, `"smartlife unavailable"`, `"strip unreachable"` (B8). |
| `504` | A downstream call exceeded its deadline (B7). |
| `500` | Anything else. No stack traces. |

**Routes used by the client:**

| Client action | Method and path | Success | Replaces (legacy) | Backend |
|---|---|---|---|---|
| Connection test (Settings) | `GET /health` | `200` | — | — |
| Spent in a period (Overview donut, Budget Summary) | `GET /v1/payments?from=…&to=…&limit=0` | `200` totals only | `/query` | B10, B2 |
| Spending trend (Budget Trend) | `GET /v1/payments?from=…&to=…` | `200` list + totals | — | B10, B2, B3 |
| Add a check | `POST /v1/payments` | `201` | `/add_payment` | B10, B1 |
| Device state (Overview, Lights) | `GET /v1/devices` | `200` | — | B10, B4 |
| Set brightness / on / off | `PATCH /v1/devices/{id}` | `204` | `/updBrightness` | B10, B5, B6 |
| Automation and presence state | `GET /v1/automation` | `200` | — | B10, B4 |
| Pause / resume automation | `PATCH /v1/automation` | `204` | `/updActive` | B10 |

Defined for the presence Shortcut, **never sent by the app:** `PATCH /v1/automation` with `owner_present` (replaces `/updStatus`; the app must never fake presence). Not used: `/docs`, `/redoc`, `/openapi.json` (disabled by B10).

That is six method/path pairs on four paths, the same number of operations the client needed before (four legacy routes plus B2 and B4). `/query` has no `/v1` successor: `GET /v1/payments` with `limit=0` returns the same total (§6.5).

#### `GET /v1/payments`

**Goal:** payments and their total in a time range. **Scope:** read-only, omniscient `Leo.checks`. **Owner:** omniscient; the gateway proxies.

| Query param | Rules |
|---|---|
| `from`, `to` | Required. Instants, UTC `Z`. Half-open `[from, to)`. `to ≤ from` → `422`. Longer than 400 days → `422`. |
| `limit` | Optional, `0…5000`, default `5000`. `0` → no rows, totals only. |

```json
{
  "payments": [
    { "id": "6713a0c2f1e4b2a9c0d1e2f3", "store": "Lidl", "amount_cents": 1234,
      "date": "2026-10-18T21:30:00Z", "currency": "EUR" }
  ],
  "total_cents": 1234,
  "count": 1,
  "truncated": false
}
```
- Rows sorted by `date` descending. `total_cents` and `count` cover the **whole** range, independent of `limit`. `truncated` = `count > payments.count`.
- Everything else as B2 (`id` per B3, `store` from `description`, `currency` mapped from `978`, date format, B0/§5 cents normalisation).

#### `POST /v1/payments`

**Goal:** record one payment. **Scope:** inserts one document into `Leo.checks`. Not idempotent.

```json
{ "store": "Rewe City", "amount_cents": 1234, "at": "2026-10-18T21:30:00Z" }
```
| Field | Rules |
|---|---|
| `store` | String, trimmed, 1…64 characters. Any character is allowed: it is JSON, not a path segment. |
| `amount_cents` | Integer, `1…10000000` (100 000,00 €). No decimal parsing on the server at all. |
| `at` | Optional instant. Must carry a zone (`422` otherwise) and be ≤ now + 24 h. Absent → server time. Stored as UTC (B0/§6 storage change, B1). |

Response `201`: the created payment in the same shape as a `GET` row. No `Location` header: there is no single-payment route to point at.

#### `GET /v1/devices` · `PATCH /v1/devices/{id}`

**Goal:** read device state; set a device's brightness. **Owner:** smartlife (proxy for the device).

`GET` → `200`:
```json
{ "devices": [ { "id": 0, "kind": "cololight_strip", "name": "Strip",
                 "reachable": true, "on": true, "brightness": 40 } ] }
```
Field semantics, the unreachable-is-not-an-error rule and the bounded strip read are as in B4.

`PATCH /v1/devices/{id}` with `{"brightness": 40}`:
- `brightness` integer `0…100` (`422` outside, B5). `0` = off; `1…100` = on at that level.
- Unknown `id` → `404`. Strip unreachable → `502` `"strip unreachable"` (B7).
- Success → `204`. Idempotent: sending the same value twice leaves the same state.
- The body is a partial device. Only `brightness` is writable for now; other fields → `422`.

#### `GET /v1/automation` · `PATCH /v1/automation`

**Goal:** read and change the automation flags. **Owner:** smartlife (system of record for both flags).

`GET` → `200` `{"active": true, "owner_present": true}`. `owner_present` is `null` until the first presence report after a smartlife start (B4).

`PATCH` with any non-empty subset of `{"active": bool, "owner_present": bool}`; an empty object → `422`. Success → `204`.
- `active: true` sets the flag, then runs `check()`. A `502` from an unreachable strip still leaves the flag set.
- `owner_present` records presence and runs `check()` only while `active` (B4's fix of audit §8).

#### B10 — `/v1` foundation (backend; to be added to backend.md)

- `APIRouter(prefix="/v1", dependencies=[Depends(require_bearer)])`. `require_bearer` reads `Authorization: Bearer …` (`HTTPBearer(auto_error=False)`), compares with `hmac.compare_digest`, and raises `401` with `WWW-Authenticate: Bearer`. Add a test that a request with a bad secret *and* bad input gets `401`, not `422`.
- B7 deadlines and B8 JSON errors apply to every `/v1` route from the first deploy. They are part of B10, not follow-ups.
- `Cache-Control: no-store` on all `/v1` responses.
- `FastAPI(docs_url=None, redoc_url=None, openapi_url=None)` (audit §4).
- Nothing logs request headers. uvicorn's access log doesn't, so the secret no longer reaches it (audit §3 is fixed for `/v1`).
- Edge and host: the Cloudflare Access application (B9.4) and dropping the host `ports:` (B9.6) belong to the same phase (§4.6).
- Legacy routes are untouched by B10. B0/§1 (`401` on legacy routes) is no longer a client dependency.

### 4.2 `APIClient`

```swift
nonisolated final class APIClient: Sendable {
    init(config: AppConfig, session: URLSession = .omniserv)

    func send<T: Decodable & Sendable>(_ endpoint: Endpoint, as: T.Type) async throws(APIError) -> T  // 200/201 with JSON
    func send(_ endpoint: Endpoint) async throws(APIError)                                            // 204; any body ignored
}

nonisolated struct Endpoint: Sendable {
    nonisolated enum Method: String, Sendable { case get = "GET", post = "POST", patch = "PATCH" }

    var method: Method = .get
    var path: [String]                          // ["v1", "devices", "0"], unencoded
    var query: [URLQueryItem] = []
    var body: (any Encodable & Sendable)? = nil // JSON; only for .post / .patch
    var authorized: Bool = true                 // false only for /health
}
```
Endpoints are built by `nonisolated static` factories (`.health`, `.payments(from:to:limit:)`, `.addPayment(_:)`, `.devices`, `.setBrightness(_:device:)`, `.automation`, `.setAutomation(active:)`), so services never assemble paths or bodies themselves. There is no factory for `owner_present`.

**Request building — the only place secrets are used:**
```swift
private func request(for e: Endpoint) -> URLRequest {
    var c = URLComponents(url: config.baseURL, resolvingAgainstBaseURL: false)!
    c.percentEncodedPath = "/" + e.path.map(Self.encodeSegment).joined(separator: "/")
    c.queryItems = e.query.isEmpty ? nil : e.query
    var r = URLRequest(url: c.url!)
    r.httpMethod = e.method.rawValue
    if let body = e.body {
        r.httpBody = try! Self.encoder.encode(body)   // our own Encodable types: a failure is a programming error
        r.setValue("application/json", forHTTPHeaderField: "Content-Type")
    }
    authorize(&r, bearer: e.authorized)               // ← single auth hook (§4.6)
    return r
}

/// RFC 3986 path segment: urlPathAllowed minus "/".
static func encodeSegment(_ s: String) -> String
```
`Self.encoder` is a `JSONEncoder` with `.convertToSnakeCase` and a date strategy that writes `ISO8601FormatStyle()` (UTC, seconds, `Z`). Path segments are now only fixed names and numeric ids, but `encodeSegment` stays as the one place that would handle anything else.

**Session configuration (`URLSession.omniserv`):**

| Setting | Value | Why |
|---|---|---|
| `timeoutIntervalForRequest` | 10 s | Above the backend gRPC deadline (B7, 5 s) so the server's 504 normally arrives before the client gives up. |
| `timeoutIntervalForResource` | 20 s | |
| `requestCachePolicy` | `.reloadIgnoringLocalCacheData` | A cached `GET` must never stand in for a fresh read. (`POST`/`PATCH` aren't cached anyway.) |
| `urlCache` | `nil` | Same reason. |
| `waitsForConnectivity` | `false` | Fail fast; the UI shows the error and offers a retry. |
| `httpAdditionalHeaders` | `Accept: application/json`, `User-Agent: Omniserv-iOS/<version>` | A stable UA makes a Cloudflare skip rule easy to write (B9.2). Auth headers are **not** set here but per request (§4.6), so `/health` can go without the bearer. |
| delegate | `NoRedirectDelegate` | `urlSession(_:task:willPerformHTTPRedirection:newRequest:)` returns `nil`, so a `3xx` reaches `APIClient` as is. The API never redirects; a redirect is Cloudflare Access sending an unauthenticated request to its login page. Following it would turn a rejected `POST` into a `GET` of an HTML page. |

**Retries:** none automatically. For reads, the user retries (pull-to-refresh or the "Retry" button). `PATCH` is idempotent, but brightness already has its own latest-wins sender (§7.2) and automation refetches on error (§7.3). `POST /v1/payments` is not idempotent: an automatic retry after a timeout could create the payment twice (D5).

### 4.3 Response handling

**Decoding.** `JSONDecoder` with `.convertFromSnakeCase` and a custom date strategy. It parses with `Date.ISO8601FormatStyle()` and falls back to `.iso8601.includingFractionalSeconds`. The contract pins seconds precision with `Z`, but the stored dates carry milliseconds, so one `isoformat()` slip on the server must not fail the whole list (Foundation's `.iso8601` strategy rejects fractional seconds).

**Status mapping**, shared by both `send` variants, in this order. Status comes before `Content-Type`, because Cloudflare's own errors (Access, tunnel) are HTML.
1. `3xx` → `.edgeRejected` (see `NoRedirectDelegate`, §4.2).
2. `502` / `530` → `.unreachableService(detail?)`; `504` → `.timeout`; any other `5xx` → `.server(status, detail?)`. `detail` is read only when the body is JSON, otherwise `nil` (a `530` or HTML `502` comes from cloudflared, not the gateway).
3. `401` with a JSON body → `.unauthorized` (wrong `API_SECRET`).
4. `401` / `403` with a non-JSON body → `.edgeRejected`: Cloudflare Access refused the service token, or a WAF/bot challenge (B9.2). The gateway itself never sends `403`.
5. `400` / `422` → `.invalidInput(detail)`. The `detail` is FastAPI's list form or a string.
6. `404` → `.notFound`: unknown device id, or a route the deployed backend doesn't have yet (client and backend steps proceed in parallel, §10).
7. Any other `4xx` (e.g. a Cloudflare `429`) → `.server(status, detail?)`.
8. `2xx`:
   - `send(_:as:)`: requires `Content-Type: application/json` and decodes `T`. Anything else, or a decoding failure, → `.unexpectedResponse`. A decoding failure is a developer error.
   - `send(_:)`: success for any `2xx`; the body is ignored.

**Snake-case keys.** With `.convertFromSnakeCase` the decoder converts keys *before* matching `CodingKeys`, so custom keys must be the camelCase form (`case amountCents`, `ownerPresent`, `totalCents`). A raw value `"amount_cents"` never matches. The encoder's `.convertToSnakeCase` works the other way round: Swift `amountCents` goes out as `amount_cents`.

### 4.4 `APIError`

```swift
nonisolated enum APIError: Error, Sendable, Equatable {
    case offline                       // URLError.notConnectedToInternet, .networkConnectionLost, .dataNotAllowed
    case cannotConnect                 // URLError.cannotFindHost, .cannotConnectToHost, .dnsLookupFailed, .secureConnectionFailed, any other URLError
    case timeout                       // URLError.timedOut, or a 504 from B7
    case notFound                      // 404: unknown resource, or route not deployed yet (§4.3 rule 6)
    case unauthorized                  // 401 JSON: wrong API_SECRET (rebuild with the right .env)
    case edgeRejected                  // 3xx, or 401/403 HTML: Cloudflare Access token or a WAF challenge
    case invalidInput(String?)         // 422, 400
    case server(status: Int, detail: String?)
    case unreachableService(String?)   // 502 from B7 (omniscient/smartlife down, or "strip unreachable" on a write), 502/530 from cloudflared
    case unexpectedResponse            // 2xx that isn't the expected JSON
    case cancelled                     // swallowed by stores, never shown

    var userMessage: LocalizedStringResource { … }
    var isDefiniteRejection: Bool { … }  // true only for .unauthorized, .edgeRejected, .invalidInput, .notFound
}
```
User-facing copy is short and actionable: "No connection", "Can't reach the server", "The server didn't answer in time", "Wrong API secret — rebuild the app", "Blocked by Cloudflare — check the Access token, then rebuild", "Lights are unreachable", "The server doesn't support this yet — update the backend".

`isDefiniteRejection` matters for the non-idempotent `POST`. These four cases prove the server didn't apply the request: the edge or the auth dependency stopped it, validation rejected it, or no handler matched. Every other error after the request left the device may hide a success: `.offline` includes `networkConnectionLost`, and a `500` can follow a completed insert. Write callers use it to choose between "not saved" and "may have been saved" (§8.6).

### 4.5 Dates on the wire

One format: an ISO 8601 instant in **UTC with `Z`**, seconds precision, e.g. `2026-09-30T22:00:00Z`. Built with `ISO8601FormatStyle()` (default is UTC, `Z`). Used for the `from`/`to` query parameters, the `at` body field and every `date` in responses.

**UTC `Z` instead of a `+02:00` offset** because a literal `+` in a query string decodes to a space, so `?from=…+02:00` would arrive broken. In JSON bodies the `+` would be safe, but one format everywhere is simpler.

**No server time-zone dependency.** The client turns its local periods into instants with the device calendar (§6.2) and buckets returned dates on the device (§6.3). The server only compares instants. B0/§6's server `TZ` is still right for the legacy `/query`, but the client doesn't depend on it.

### 4.6 Auth (phase 0)

```swift
private func authorize(_ r: inout URLRequest, bearer: Bool) {
    if bearer {
        r.setValue("Bearer \(config.secret)", forHTTPHeaderField: "Authorization")
    }
    if let token = config.accessToken {                     // edge auth: on every request, /health included
        r.setValue(token.clientId, forHTTPHeaderField: "CF-Access-Client-Id")
        r.setValue(token.clientSecret, forHTTPHeaderField: "CF-Access-Client-Secret")
    }
}
```

Two independent layers:

| Layer | Checks | Rejection the app sees | Protects against |
|---|---|---|---|
| **Cloudflare Access** (B9.4): a self-hosted application on `api.omniserv.me/v1` with a *Service Auth* policy for the app's service token | `CF-Access-Client-Id` / `-Secret` | HTML `403` (or a `302` to the login page if the policy also allows identity login) → `.edgeRejected` | Internet traffic never reaches the tunnel without the token. |
| **Gateway** (B10) | `Authorization: Bearer <API_SECRET>` | JSON `401` → `.unauthorized` | Anything that reaches `api:5006` without passing the edge: a misconfigured Access policy, or the LAN while host ports are still published (B9.6). |

- **Where the secrets appear:** request headers only. They are no longer in any URL, so they stay out of uvicorn's access log and Cloudflare's request logs and analytics (B9.3). Cloudflare terminates TLS and can see headers, but doesn't log them unless a Logpush job is set up to. The app never logs requests.
- **Access scope.** The Access application starts on the `/v1` path, so the Shortcuts on the legacy routes keep working. Once they move to `/v1` (§4.7), widen it to the whole hostname. The app already sends the headers on every request, so it needs no change.
- **Host ports (B9.6).** Phase 0 also drops the `ports:` entries for `api`, `omniscient`, `smartlife` and `mongo` that only the `omniserv` network needs. Otherwise the edge layer can be bypassed from the LAN, and gRPC and Mongo have no auth at all. This is a backend change, but the threat model in §2 assumes it.
- **Later** (§10, step 11; triggers in `client.md`): separate tokens per client (app vs. Shortcuts) so one can be revoked alone; the gateway validating Cloudflare's `Cf-Access-Jwt-Assertion` so it only trusts edge traffic; an `Idempotency-Key` header on `POST /v1/payments` to remove the "may have been saved" case (§8.6).

### 4.7 Legacy routes

`/add_payment`, `/query`, `/updStatus`, `/updActive`, `/updBrightness` are not called by the app and are not changed by the client's backend work. They keep the path secret, `GET` writes and the `200`/body-`403` quirk (audit §1–3) until the Shortcuts automations move to `/v1`. Shortcuts' "Get Contents of URL" action supports any method, headers and a JSON body:
- Payment Shortcut → `POST /v1/payments`, with `amount_cents` computed in the Shortcut (Apple Pay's amount × 100). The NBSP-euro parsing then disappears from the server.
- Presence Shortcut → `PATCH /v1/automation` with `{"owner_present": true|false}`.

Then delete the legacy routes, rotate `API_SECRET` (it has been in access and Cloudflare logs), and widen the Access application to the whole host (§4.6). Until then, the secret's exposure through legacy URLs remains, which is a second reason to migrate the Shortcuts early.

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
  - Every `/v1` route uses integer cents: `amount_cents` / `total_cents` in responses, `amount_cents` in the `POST` body (§4.1). No floats and no decimal strings in either direction, so the legacy parsing problems (audit §7) don't apply.
  - The stored amounts must be cents everywhere for the totals to be right (B0/§5). The client does **not** compensate, so a bug there stays visible rather than masked.

### 5.2 Parsing user input (`MoneyParser`)

Used by the Add sheet and by Settings (goal). It works on a `String` field with `.keyboardType(.decimalPad)`. We don't use `TextField(value:format:.currency)`, because it reformats while typing and rejects partial input.

1. Trim whitespace; strip `€` and spaces (incl. NBSP).
2. Accept exactly one decimal separator, `,` or `.`; reject grouping separators (`1.234,56` → invalid: ambiguous).
3. Regex `^\d{1,6}([.,]\d{1,2})?$`.
4. `Decimal(string: normalized, locale: Locale(identifier: "en_US_POSIX"))` → `× 100`. Exact because there are ≤ 2 decimals → `Int`.
5. Bounds: payment `0 < x ≤ 100 000,00 €`; goal `0 ≤ x ≤ 999 999,99 €` (the regex's six integer digits).

Errors are inline under the field ("Use up to 2 decimals", "Amount must be above 0").

### 5.3 Store name rules

- Trim, collapse inner whitespace, 1…64 characters (the server enforces the same limit, §4.1).
- Any other character is fine (`/`, `..`, spaces, umlauts, `&`, `#`, `?`). The name travels in the JSON body of `POST /v1/payments`, not in the path, so the legacy route's restrictions (a `/` 404s, dot-only names are resolved as path segments by Cloudflare) no longer apply.

### 5.4 Payments

```swift
nonisolated struct Payment: Sendable, Identifiable, Hashable, Decodable {
    let id: String        // Mongo ObjectId hex (B3) — unique, stable across deploys
    let store: String
    let amount: Money     // from amount_cents
    let date: Date        // UTC instant

    init(from decoder: Decoder) throws   // maps amount_cents → amount; ignores currency (EUR only)
}

nonisolated struct PaymentPage: Sendable, Decodable {   // GET /v1/payments
    let payments: [Payment]   // empty for limit=0
    let total: Money          // from total_cents
    let count: Int
    let truncated: Bool
}

nonisolated struct PaymentDraft: Sendable { var store: String; var amount: Money; var date: Date }

/// POST /v1/payments body. Encodes as {"store", "amount_cents", "at"}.
nonisolated struct NewPaymentBody: Sendable, Encodable { let store: String; let amountCents: Int; let at: Date }
```
`PaymentDraft` is what the sheet edits; the `addPayment` endpoint factory maps it to `NewPaymentBody`. The app always sends `at`, even when the user left it at "now", so the stored time is the time on the form.

### 5.5 Smartlife

```swift
nonisolated struct Automation: Sendable, Decodable {   // GET /v1/automation
    let active: Bool
    let ownerPresent: Bool?   // nil = unknown since smartlife restarted (B4)
}

nonisolated struct DeviceList: Sendable, Decodable { let devices: [Device] }   // GET /v1/devices

/// What LightsStore holds: the two reads combined (§7.1). Not decoded as a whole.
nonisolated struct SmartlifeState: Sendable {
    let automation: Automation
    let devices: [Device]
}

/// PATCH bodies. Encode as {"brightness": n} and {"active": b}.
nonisolated struct DevicePatch: Sendable, Encodable { let brightness: Int }
nonisolated struct AutomationPatch: Sendable, Encodable { let active: Bool }   // no ownerPresent on purpose: the app never reports presence

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
Nested types are marked `nonisolated` explicitly. Under `MainActor` default isolation, don't rely on them inheriting it from the enclosing type.

`Kind.unknown` (via a custom `init(from:)` fallback) lets a newer backend add device kinds without breaking an older app build: the tile then shows name and reachability only.

---

## 6. Budget logic (client-side)

`client.md` puts the monthly goal in a frontend setting. All planning maths therefore live in the client (`Core/Domain/BudgetMath.swift`). The backend only answers "how much was spent" and "which payments", both through `GET /v1/payments` (§6.5).

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
- To `/v1/payments`: `from = start`, `to = endExclusive`, both as UTC instants (§4.5). Local midnights become instants on the device, so DST and the device's zone are handled here and the server needs no time-zone setting.

### 6.3 Spending series (Trend)

Input: the `[Payment]` from `GET /v1/payments` for the visible range. Output: `[Bucket(start: Date, total: Money?)]` (`nil` = future, see below).

| Granularity | Visible range | Buckets |
|---|---|---|
| Daily | one month (navigable) | each local day of the month |
| Monthly | 12 months ending with the current one | each calendar month |

- Bucketing: `calendar.dateInterval(of: .day | .month, for: payment.date)!.start` as the key. Uses the **device** calendar and time zone, so a 23:30 payment lands on the right day regardless of server time zone.
- **Zero-fill** every bucket in range (`calendar.enumerateDates` over the period) so bars align and empty days are visible.
- Future buckets of the current month are emitted with `total = nil` and not drawn (the axis still spans the month).
- Reference line: daily budget `G / daysIn(month)`, or monthly `G`.
- If `PaymentPage.truncated` is true (5 000-row cap, §4.1), the chart shows a footnote "Showing the latest N payments". Rows come newest first, so the earliest buckets are the incomplete ones. At ~100 payments/month this needs 4+ years in one range, which the 400-day limit rules out; the footnote is a safeguard.

### 6.4 What is fetched when

| Screen | Request(s) |
|---|---|
| Overview donut | `GET /v1/payments?…&limit=0` for the current month |
| Budget › Summary | `GET /v1/payments?…&limit=0` for the selected period (+ current month, already cached) |
| Budget › Trend daily | `GET /v1/payments` (rows) for the selected month |
| Budget › Trend monthly | `GET /v1/payments` (rows) for the last 12 months |
| After adding a check | invalidate all budget caches, refetch what is visible |

`BudgetStore` caches results keyed by `Period` / range, in memory, for the session. That makes history navigation back and forth instant.

### 6.5 One read route for totals and lists

`/query` has no `/v1` successor. `GET /v1/payments` returns `total_cents` for the whole range whatever `limit` is, so totals and rows come from the same route, the same half-open range and the same instants:
- The donut and Summary send `limit=0` and get only the totals (one `$group` on the server, no rows).
- Trend sends no `limit` and gets the rows too.
- Daily Trend bars therefore always sum to the Summary total for the same month (§10, step 8 checks this). Under the legacy design the two numbers came from different routes with different date semantics and only agreed if the server's zone matched the device's.

---

## 7. Smartlife logic

### 7.1 Reading state

`LightsStore` loads `GET /v1/devices` and `GET /v1/automation` concurrently (`async let`) and combines them into `SmartlifeState` (§5.5). It does so on first appearance of Overview or Lights, on pull-to-refresh, when the app becomes active (§8.3), and once after brightness changes settle (§7.2). There is no polling timer. Outside the app the strip changes only through the automation loop (every ~10 min) and the presence Shortcut (on leaving/arriving), and a refresh on foregrounding is enough for a personal app.

An unreachable device comes back as `reachable: false` (B4), not as an HTTP error, so the tile can render "Unreachable" while the rest of the screen works. If only one of the two reads fails, the store keeps the other's fresh value and the previous value of the failed one, and shows the error inline (§8.3).

### 7.2 Brightness slider: "sets new brightness on any change"

`client.md` asks for every slider change to be sent. A naive `.onChange` → request would fire ~60 requests/s while dragging. They would run concurrently against a strip with no locking (B6), arrive out of order, and could leave the strip at a stale value. Design:

```swift
@MainActor
final class BrightnessSender {
    private var pending: Int?
    private var pendingForced = false            // `pending` must be sent even if it equals `lastSent`
    private var lastSent: Int?                   // dedupe within one burst only
    private var loop: Task<Void, Never>?
    private let send: @Sendable (Int) async throws(APIError) -> Void
    private let onSettled: (Result<Int, APIError>) -> Void

    /// Called synchronously for every slider change. Never more than one request in flight; latest value wins.
    /// `force` bypasses the duplicate check (power button, §7.3).
    func submit(_ value: Int, force: Bool = false) {
        pending = value
        pendingForced = force                    // a newer non-forced value supersedes an older forced one
        guard loop == nil else { return }        // the running loop will pick it up
        loop = Task { await drain() }
    }

    private func drain() async {
        var lastResult: Result<Int, APIError>?
        while let next = pending {
            let forced = pendingForced
            pending = nil
            pendingForced = false
            guard forced || next != lastSent else { continue }
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
- **Duplicates:** a value equal to the last one sent in the *same burst* is skipped (e.g. the release event after the last drag value). `lastSent` is cleared when the burst ends, because the automation can change the strip between bursts. `force: true` always sends, even when the same value is in flight at that moment. The flag travels with the pending value, so the in-flight completion setting `lastSent` can't swallow it.
- **Typed throws:** `do throws(APIError)` is needed. Without the `FullTypedThrows` feature, a plain `do`/`catch` binds `error` as `any Error`.
- **Release:** `Slider(onEditingChanged:)` with `false` submits the final value. That is a no-op while the burst is still running. If the burst has already ended, it costs one redundant set, which is idempotent and harmless.
- **Reconcile:** `onSettled` schedules one `GET /v1/devices` refresh after 1 s, cancelled if a new submit arrives. It does so on success *and* failure. The tile then reflects what the strip actually reports.
- **Failure:** `onSettled(.failure)` shows an inline error on the tile. If `error.isDefiniteRejection` (§4.4), the slider rolls back to the last confirmed brightness at once. For any other error (timeout, `5xx`, connection lost) the write may have been applied: the slider keeps the value the user chose and the reconcile refresh decides. A blind rollback could show a value the strip no longer has.
- The slider's displayed value is local UI state (`@State`). It is only overwritten by store state when the user isn't dragging, so a refresh never yanks the thumb.

Slider spec: `0…100`, step 1. Each value is sent as `PATCH /v1/devices/{id}` with `{"brightness": n}`; `0` means off (§4.1). The server rejects values outside the range with `422` (B5).

### 7.3 Power and automation

- **Power button** on the tile: if on → send `0`; if off → send `lastNonZeroBrightness`. That is persisted in `UserDefaults` per device id, default `25`, matching the automation's default in `ColoStrip.on`. It is updated from two sources: every non-zero value the app sends successfully, and every non-zero `brightness` that `GET /v1/devices` reports with `on: true`. A level set by the automation or another caller is therefore restored as well. It goes through the same `BrightnessSender` with `force: true`. The automation may have changed the strip since the app last sent a value, so "restore 40" must be sent even if 40 was the last value sent.
- **Automation switch** (Lights screen, below the tiles): `PATCH /v1/automation` with `{"active": true|false}`. The toggle flips optimistically. On a definite rejection it rolls back; on any other error it refetches `GET /v1/automation`. `active: true` sets the flag on the server *before* it runs `check()`, so a `502` from an unreachable strip (B7) still leaves automation on. Shown with the read-only line "Owner at home: yes / no / unknown" from `automation.ownerPresent` (`nil` = unknown until the presence Shortcut reports after a smartlife restart, B4).
- **Pausing means pausing.** "Automation off" must also stop presence reports (legacy `/updStatus`, later `owner_present` on `PATCH /v1/automation`) from switching the strip. Today they still run `check()` (audit §8). backend.md B4 fixes that; until it ships, the toggle only pauses the 10-minute loop.
- **Override hint** (footer text): "Automation checks every 10 minutes and may switch the lights off at bedtime or when you leave." Without it, a manual change being reverted would look like a bug.
- The client never reports presence: it calls neither `/updStatus` nor `PATCH /v1/automation` with `owner_present` (`AutomationPatch` has no such field).

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
- **Save** is enabled only when store and amount are valid (§5.2, §5.3) and no request is in flight. While saving, the button shows a `ProgressView` and the form is disabled. This guards against a double submit, which would create two payments because `POST` isn't idempotent.
- Success: success haptic, dismiss, `BudgetStore.invalidateAll()` and refetch of what is visible.
- Failure: the sheet stays open with values intact and a `StatusBanner` at the top. The copy depends on `APIError.isDefiniteRejection` (§4.4):
  - `.unauthorized` / `.edgeRejected` / `.invalidInput` / `.notFound`: the normal error message. Nothing was saved, and retrying is safe once the cause is fixed.
  - Any other error (`.timeout`, `.offline`, `.server`, …): "The server didn't confirm — it may have been saved. Check that day's bar in Budget › Trend before retrying." A failed non-idempotent write is ambiguous. There is no payment list yet (§10, step 11), so the Trend bar for the payment's day is where to check.
- Sent as `POST /v1/payments` with `{"store": …, "amount_cents": …, "at": "<UTC ISO>"}` (§4.1). Success is `201` with the stored payment.

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
| About | Server host (read-only, from `AppConfig`), app version and build, "Test connection" button → `GET /health` with latency in ms, then `GET /v1/payments` for today → tomorrow with `limit=0` to check the secret (`/health` has no bearer check, so on its own it passes with a wrong secret). The probe is read-only and cheap. It tells apart a wrong `API_SECRET` (`401`), a missing or wrong Access token (`.edgeRejected`) and a backend without `/v1` yet (`.notFound`). Also shows "Edge auth: Access token / none" from `AppConfig.accessToken`. Shows `OK · NN ms` or the first error. |

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
| `StoreNameTests` | trim/collapse; 64-char limit; `AC/DC`, `..` and `Dr. Oetker` accepted. |
| `EndpointTests` | method and path per factory (`GET`/`POST`/`PATCH`, §4.1); the secret never appears in any URL; `Authorization: Bearer …` on every route except `/health`; `CF-Access-*` headers on every route when `accessToken` is set and on none when it's `nil`; JSON bodies exactly `{"store","amount_cents","at"}`, `{"brightness"}`, `{"active"}`; `from`/`to`/`at` contain no `+`; segment encoding (space, `&`, `?`, `#`, `ü`, `%`). |
| `ResponseDecodingTests` | `201` with a payment body; `204` with an empty body for `send(_:)`; `200` with a non-JSON body for `send(_:as:)` → `.unexpectedResponse`; HTTP 401 JSON → `.unauthorized`; HTML 401/403 and `302` → `.edgeRejected`; `/v1/automation` with `owner_present: null`; 422 list detail, 422 string detail; JSON 404 → `.notFound`; 429 → `.server`; `URLError.cannotFindHost` → `.cannotConnect`; `text/plain` 500 → `.server`; HTML 502/530 → `.unreachableService`; 504 → `.timeout`; `/v1/payments` dates with and without fractional seconds; `isDefiniteRejection` per case. |
| `BrightnessSenderTests` | with a fake `send` that suspends: at most one in flight; 100 synchronous submits → ≤ 3 sends, last = final value, order preserved; failure → `onSettled(.failure)`; duplicate of `lastSent` not resent within a burst; same value resent after the burst ends; `force: true` always sends, including while the same value is in flight. |

### 9.2 `APIClient` tests

`URLProtocol` subclass `StubURLProtocol` registered on an ephemeral `URLSessionConfiguration`. It asserts the exact request URL, method, headers and body, and returns canned status, headers and body. It covers every route in §4.1. A test also checks that `NoRedirectDelegate` stops a `302`.

### 9.3 Previews

Every feature view has `#Preview`s on `AppEnvironment.preview()` covering these states: loaded, first load (redacted), failed with previous value, over budget, no goal, device unreachable.

### 9.4 Manual end-to-end checklist (on device, against production)

1. Fresh clone → `make client-config` → build & run → Settings › Test connection shows `OK · NN ms`.
2. Build with a wrong secret → Settings › Test connection shows "Wrong API secret" (from step 5 on, every data screen does too). Build with the Access values emptied while the Access policy is on → "Blocked by Cloudflare".
3. Airplane mode → screens keep the last values and show "No connection"; pull-to-refresh recovers.
4. Add a check `Test 0,29 €` dated yesterday 23:30 (not on the 1st: yesterday would be in the previous month) → the Overview total rises by exactly 0,29 €. Trend daily shows it on yesterday's bar. Mongo has `amount: 29` and the right UTC date. A store named `AC/DC` saves as typed.
5. Drag the slider quickly from 0 to 100 and back to 37 → the strip ends at 37; the server log shows a short sequential series of `PATCH /v1/devices/0` calls, not dozens. Then change the brightness with `curl` and pull to refresh → the slider moves to the new value and **no** `PATCH` follows.
6. Power off and on → restores the previous brightness.
7. Unplug the strip → the tile shows "Unreachable" and the rest of the app works.
8. Toggle automation off → `GET /v1/automation` reports `active: false` after a refresh.
9. Delete the test payment manually in Mongo (no delete route by design).
10. `docker compose logs api | grep -c "$API_SECRET"` → no line from the app's requests (only legacy Shortcut calls, until §4.7 is done). From another machine on the LAN, ports `5002`, `5003`, `5006`, `27017` on the host are closed (B9.6).

---

## 10. Implementation steps

Each step ends in a buildable app that does something verifiable. Backend dependencies refer to `backend.md`.

| # | Step | Deliverable | Verify | Backend |
|---|---|---|---|---|
| 1 | **Project hygiene** | §1 build settings, folder skeleton (§3.2), test target, `Theme` tokens in the asset catalog, `RootView` with four empty tabs. | Builds in Swift 6 mode with no warnings; runs on iPhone 15. | — |
| 2 | **Config** | `Makefile` target, xcconfigs and partial `Info.plist` in `client/Config/`, `.gitignore` line, `AppConfig` (§2). | Settings shows the host and the edge-auth state; launching without `Secrets.xcconfig` fails with the explicit message. | — |
| 3 | **Networking core** | `APIClient`, `Endpoint`, `NoRedirectDelegate`, `APIError`, status mapping and auth headers (§4); `GatewayService`; Settings › Test connection (`/health` + `/v1/payments` probe, §8.8). Tests §9.1 `EndpointTests` and `ResponseDecodingTests`, plus §9.2. | Checklist items 1–3. | **B10** and `GET /v1/payments` (B2) for the probe; Cloudflare Access (B9.4) for the edge half of item 2. Before they ship, the probe shows "update the backend". |
| 4 | **Settings: goal** | `MoneyParser` (§5.2), `SettingsStore`, goal field. | Value survives relaunch; parser tests pass. | — |
| 5 | **Overview budget card** | `Money`, `Period`, `BudgetMath`, `BudgetService.total`, `BudgetStore`, donut card, empty/over/no-goal states. | Matches a manual `curl` of `GET /v1/payments?…&limit=0` for the month. | B10, B2; **B0/§5** for correct numbers (the card works without it, but shows the audit §5 values). |
| 6 | **Budget › Summary** | Period selector, history navigation, plan vs actual, pace. | Hand-computed plan for three periods matches the UI. | B10, B2, B0/§5 |
| 7 | **Add check** | `AddPaymentSheet`, validation, submit flow, invalidation (§8.6). | Checklist item 4. | `POST /v1/payments` (B1's `at` is part of the new route from the start, so there is no window where the date is silently dropped). |
| 8 | **Budget › Trend** | `BudgetService.payments`, `SpendingSeries`, charts, selection (§6.3, §8.5). | Daily bars sum to the Summary total for the same month. | **B2** (rows), **B3** |
| 9 | **Lights** | `SmartlifeService`, `LightsStore`, `BrightnessSender`, tiles, power, automation, Overview lights card (§7, §8.7). | Checklist items 5–8. | **B4** (`GET /v1/devices`, `/v1/automation`, `PATCH /v1/automation`), **B5, B6** (`PATCH /v1/devices/{id}`, safe slider), B7 (bounded waits, part of B10) |
| 10 | **Polish** | `SnapshotCache`, haptics, number transitions, accessibility pass (§8.9), Dynamic Type check, all previews. | VoiceOver walkthrough; cold launch shows cached numbers. | B8 (better error copy), B9 (edge config, before daily use) |
| 11 | **Later** (not planned in detail) | Auth beyond phase 0 (§4.6: per-client tokens, Access JWT check, `Idempotency-Key`); WidgetKit extension reusing `Core/` via an App Group; payment list and `DELETE /v1/payments/{id}`. | — | future |

Steps 1, 2 and 4 need no backend work. Everything from step 3 on talks to `/v1`, so the backend starts with **B10 plus `GET /v1/payments`** (and B9.4/B9.6, the edge half of phase 0). Client steps 1–2 and backend B10 can proceed in parallel. After that, `POST /v1/payments` unblocks step 7 and the smartlife routes unblock step 9.

---

## 11. Decision log

| # | Decision | Alternatives rejected | Reason |
|---|---|---|---|
| D1 | *(revised 2026-10-20)* The app uses only a new `/v1` namespace with conventional methods, JSON bodies and header auth (§4.1). Legacy routes stay for the Shortcuts until they migrate, then are removed (§4.7). | Reuse the legacy routes and add `/payments`, `/devices` in the path-secret, `GET`-for-writes style (the original D1). Change the legacy routes in place. | `client.md`: secrets never in URLs, conventional methods. The client needed two new routes anyway, and building them in the legacy style would mean migrating the app later. Changing legacy routes in place would break the Shortcuts on deploy. `/v1` also lets Cloudflare Access cover the new routes first, by path. Cost: backend work (B10) now precedes client step 3. |
| D2 | Budget goal and all planning maths in the client. | Server-side allowance (`configure_monthly_allowance` stub). | `client.md` makes it a frontend setting; it avoids another endpoint and backend state. |
| D3 | Trend built client-side from a payment list. | Server-side bucketing route; N × `/query`. | One general read route serves both granularities and future lists. Device-local day boundaries come free. Volumes are tiny. |
| D4 | Slider sends latest-wins, one in flight. | Debounce (sends only after the user stops); fire every change. | Keeps "on any change" responsiveness without flooding an unlocked device. |
| D5 | No automatic retries for writes. | URLSession / custom retry. | `POST /v1/payments` is not idempotent. The `PATCH`es are, but brightness and automation already reconcile with a refetch (§7). |
| D6 | `TabView` as the menu. | Hamburger/side menu; Overview as a hub that pushes. | Platform-standard, always visible, one tap. |
| D7 | Forced light mode. | Light + dark palettes. | `client.md` specifies a white/light-blue theme. Revisit if dark mode is wanted. |
| D8 | No third-party packages. | Alamofire, Charts libraries. | First-party APIs cover everything; zero maintenance for a side-loaded app. |
| D9 | iPhone-only, portrait. | Keep the multiplatform template. | `client.md`: iPhone 15. Less to test. |
| D10 | Wire instants in UTC `Z`. | Local offsets. | Avoids the `+`-in-query encoding trap and keeps the server time-zone-agnostic (§4.5). |
| D11 | Auth phase 0: bearer header checked by the gateway **and** a Cloudflare Access service token checked at the edge, both bundled from `.env` (§2, §4.6). | Path secret (legacy). Access only. Keychain storage. Accounts / OAuth. | Takes the secret out of every log for two small changes. Two independent layers: Access keeps internet traffic off the tunnel, the bearer covers anything that gets past the edge. Keychain adds nothing while the value is bundled. Accounts are out of proportion for one user (`client.md`). |
| D12 | Totals from `GET /v1/payments?limit=0`; `/query` gets no `/v1` successor. | A separate `/v1/payments/total`. Port `/query` with server-local days. | One route, one range semantics, no server time-zone dependency. Summary and Trend can't disagree (§6.5). |

## 12. Open questions

1. ~~**Owner time zone.**~~ Resolved by the `/v1` revision: every range is a pair of instants computed on the device (§4.5, D12), so the server's zone no longer matters to the client.
2. **Strip brightness range.** The design assumes 0–100 (`pycololighto` 2.1.1). Confirm on the device; the slider range and B5 follow from it.
3. **Cloudflare Access.** Decided: part of phase 0 (§4.6, D11). Open detail: confirm on setup what Access returns for a missing or wrong service token on a *Service Auth*-only policy (expected: HTML `403`). §4.3 treats `3xx` and HTML `401`/`403` the same, so the app copes either way, but the checklist (§9.4 item 2) should see the real one.
4. **Shortcuts automation and `/payments`.** Older documents may hold euro floats (audit §5). B0's inventory query shows whether any exist; its migration decides whether historic months are shown.
5. **Shortcuts and a real `401`.** Only relevant if B0/§1 is still done on the legacy routes; the client no longer needs it. If it is, confirm that the payment and presence Shortcuts don't depend on always getting `200`.
6. **Strip read timeout.** B4 and B6 budget a ~2 s single `state()` read plus a 2.5 s lock wait, inside B7's 5 s deadline. Confirm that `pycololighto` 2.1.1 lets the socket timeout be set (or wraps it). If it doesn't, B4 needs its own bounded read.
7. **Shortcut migration (§4.7).** When do the payment and presence Shortcuts move to `/v1`? Until then the secret keeps appearing in legacy URLs and logs, and Access can't cover the whole host. Rotate `API_SECRET` right after.
