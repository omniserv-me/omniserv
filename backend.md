# Backend changes required by the iOS client

> **Status:** requirements, written 2026-10-19 against `d23f667`, derived from [`client/design.md`](client/design.md). Revised 2026-10-20: the client moves to a versioned `/v1` API with conventional HTTP methods and header auth (client/design.md §4.1, D1, D11).
> Findings already listed in [`audit.md`](audit.md) are **not repeated here**. Where the client depends on one, it is cited as "audit §N" together with the resolution the client needs.
> Current behaviour is described in [`API-CONTRACT.md`](API-CONTRACT.md). Per `client.md`, each new endpoint below has a defined goal and scope. Implement it only after this document is agreed, then update API-CONTRACT.md.

## Summary

| ID | Change | Owner | Kind | Unblocks client step |
|---|---|---|---|---|
| B0 | Resolve audit §5 (and, for the legacy routes, §1, §6, §7) | omniscient, api | fix | 5, 6 |
| B1 | `POST /v1/payments`: record a payment | api, omniscient | **new route** | 7 |
| B2 | `GET /v1/payments`: list and total payments | api, omniscient | **new route** | 3, 5, 6, 8 |
| B3 | Stable payment ids (Mongo `_id`) | omniscient | fix | 8 (and B1, B2) |
| B4 | `GET /v1/devices`, `GET` / `PATCH /v1/automation` | api, smartlife | **new routes** | 9 |
| B5 | `PATCH /v1/devices/{id}`: set brightness | api, smartlife | **new route** | 9 |
| B6 | Serialise strip access | smartlife | fix | 9 |
| B7 | gRPC deadlines and status mapping in the gateway | api | fix | all (part of B10 for `/v1`) |
| B8 | JSON error bodies | api | fix | all (part of B10 for `/v1`) |
| B9 | Cloudflare edge and host ports (auth phase 0, edge half) | infra | config | 3 (Access), before daily use |
| B10 | `/v1` foundation: bearer auth, conventions (auth phase 0, gateway half) | api | **new** | 3 |
| B11 | Move the Shortcuts to `/v1`, then retire the legacy routes | Shortcuts, api | migration | — (security) |

The client uses only `/v1` plus the existing unauthenticated `GET /health`: six method/path pairs on four paths. The legacy routes (`/add_payment`, `/query`, `/updStatus`, `/updActive`, `/updBrightness`) are **not changed** by B1–B10. They keep serving the Shortcuts automations until B11.

**`/v1` conventions** (`client.md`, client/design.md §4.1). Every new route follows them; reviews check against this list:
- `GET` reads and never changes state. `POST` creates. `PATCH` changes some fields of an existing resource. `DELETE` removes (none yet).
- Resource ids in the path, filters in the query string, write data in a JSON body. Secrets only in headers (B10).
- JSON responses with snake_case keys. Money as integer cents (`amount_cents`), never floats. Instants as ISO 8601, UTC, seconds precision, literal `Z`: `strftime("%Y-%m-%dT%H:%M:%SZ")`, **not** `isoformat()` (stored dates carry milliseconds, so it would emit `…:00.123000+00:00`).
- `200` with a body for reads, `201` with the created resource for `POST`, `204` without a body for `PATCH`.
- Errors: `{"detail": …}` with `401` (auth), `404` (unknown route or id), `422` (invalid input), `502` / `504` / `500` (B7, B8).
- Request models reject unknown fields (`extra="forbid"` → `422`), so a typo never becomes a silent no-op.

**Proto files** exist in several copies that must stay identical: `api/omniscient.proto`, `api/protobufs/omniscient.proto`, `omniscient/protobufs/omniscient.proto`, and `api/smartlife.proto`, `api/protobufs/smartlife.proto`, `smartlife/smartlife.proto`, `smartlife/src/protobufs/smartlife.proto`. There is no generation script. Regenerate with
`python -m grpc_tools.protoc -I protobufs --python_out=protobufs --pyi_out=protobufs --grpc_python_out=protobufs protobufs/<name>.proto`
in each service. It's worth adding that as a `make proto` target that also copies the `.proto` files. All proto changes below only **add** fields, messages and rpcs, so the legacy routes keep working unchanged.

---

## B0 — Audit prerequisites (resolution the client relies on)

Only **§5** is a client dependency now. The `/v1` routes take integer cents and UTC instants and are born with real statuses, so §1, §6 and §7 matter only for the legacy routes the Shortcuts still use. They are kept here as recommended fixes until B11 removes those routes.

| Audit | Needed by | Resolution | Notes |
|---|---|---|---|
| §5 | **client** (B2 totals and rows) | Stored `amount` is integer cents everywhere. `query_date` sums `amount` as is (drop the `* 100` in `omniscient/db_handler.py:91`). | Includes a one-off migration of documents written as euro floats. Detect them by BSON type, `{"amount": {"$type": "double"}}`: `/add_payment` has always stored a Python `int`, while a euro value may be integral (`5.0`), so "non-integer amount" misses some. Don't use `id` or date as the discriminator; ids reset on rebuilds (B3). Skip documents without `amount` (`put_test` writes `{"test": 1}`). Residual risk: an older writer that stored integral euros as BSON `int` can't be told apart from cents. Use the inventory's `first`/`last` dates per type to spot `int` documents that predate the API. In the same change, fix or delete `monthly_report` / `daily_report` (`db_handler.py:54,70`), which carry the same `* 100`. First run an inventory, `aggregate([{"$group": {"_id": {"$type": "$amount"}, "n": {"$sum": 1}, "first": {"$min": "$date"}, "last": {"$max": "$date"}}}])`, to see whether any legacy documents exist at all. Without this the Overview donut and Summary show wrong totals; the client deliberately does not compensate. |
| §6 | legacy `/query` | Keep the **half-open `[start, stop)`** semantics. **Change `$lte` to `$lt`** in `query_date` (`omniscient/db_handler.py:86`): today a payment at exactly `stop` 00:00 is counted in both adjacent periods. Add `TZ` (IANA name, e.g. `Europe/Berlin`) to the `omniscient` service and validate it at startup; build `/query`'s day bounds as `datetime(…, tzinfo=ZoneInfo(os.environ["TZ"]))` converted to UTC. Add `tzdata` to `omniscient/requirements.txt`. | The client no longer calls `/query` and does its day boundaries on the device (client/design.md §4.5). **One part is required regardless:** if `TZ` is set, the naive `datetime.datetime.now()` in `omniscient/api.py:28` must become `datetime.now(timezone.utc)` in the same change. Otherwise `now()` returns local time, which pymongo stores as if it were UTC, shifting every new payment by the UTC offset. B1 writes UTC-aware dates already. Existing documents were written with the container clock at UTC and need no migration. |
| §7 | legacy `/add_payment` | `"12.34"` is parsed exactly (`Decimal(amount) * 100` → `int`, more than 2 decimals → `422`). | `POST /v1/payments` takes `amount_cents` and parses nothing. Keep the NBSP-euro / comma handling until the payment Shortcut moves (B11). |
| §1 | legacy routes | A wrong secret returns HTTP `401` JSON instead of `200` with body `403`. | Optional. `/v1` gets this from B10. If done, check that the Shortcuts don't depend on always getting `200` (client/design.md §12 Q5). |

---

## B1 — New `POST /v1/payments`

**Goal:** record one payment at the time the user picked in the Add form.
**Scope:** inserts one document into omniscient `Leo.checks`. **Not idempotent**: two identical requests create two payments.
**Owner:** omniscient (system of record). The gateway validates and proxies.
**Depends on:** B10, B3 (the returned `id`), B2 (the `PaymentItem` message).

**Request:**
```http
POST /v1/payments
Authorization: Bearer <API_SECRET>
Content-Type: application/json

{ "store": "Rewe City", "amount_cents": 1234, "at": "2026-10-18T21:30:00Z" }
```

| Field | Rules |
|---|---|
| `store` | String. Trimmed; 1…64 characters after trimming → otherwise `422`. Any character is allowed (`/`, `..`, `&`): it's JSON, not a path segment. |
| `amount_cents` | Integer, `1…10000000` (100 000,00 €) → otherwise `422`. No decimal parsing anywhere. |
| `at` | Optional ISO 8601 instant. Must carry a zone (`Z` or an offset) → otherwise `422`. Must be ≤ now + 24 h → otherwise `422`. Absent → server time. |

**Gateway model:**
```python
class NewPayment(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    store: str = Field(min_length=1, max_length=64)
    amount_cents: int = Field(ge=1, le=10_000_000)
    at: AwareDatetime | None = None
```
`AwareDatetime` rejects naive values. The handler also rejects `at > now + 24 h` with `HTTPException(422, "at is in the future")`, then forwards `at.astimezone(timezone.utc)` as an ISO string in `Payment.timestamp`. Validation lives entirely in the gateway; omniscient trusts the field.

**Response `201`:** the stored payment, in the same shape as a B2 row:
```json
{ "id": "6713a0c2f1e4b2a9c0d1e2f3", "store": "Rewe City", "amount_cents": 1234,
  "date": "2026-10-18T21:30:00Z", "currency": "EUR" }
```
No `Location` header: there is no single-payment route to point at.

**gRPC** (`omniscient.proto`; backward compatible, the legacy `/add_payment` keeps sending only fields 1–2):
```proto
message Payment {
  string store = 1;
  int32 amount = 2;        // cents
  string timestamp = 3;    // ISO 8601 UTC instant; empty = now
}

message PaymentResponse {
  bool success = 1;
  PaymentItem payment = 2; // the stored document (B2's message); set by the new code path
}
```

**omniscient** (`omniscient/api.py:27` `add_payment`): if `timestamp` is set, parse it with `datetime.fromisoformat`. Otherwise use `datetime.now(timezone.utc)`. Insert, then return the document as a `PaymentItem` with Mongo's `_id` (B3).

**Check:**
```sh
curl -i -X POST https://api.omniserv.me/v1/payments \
  -H "Authorization: Bearer $API_SECRET" \
  -H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"store": "AC/DC", "amount_cents": 29, "at": "2026-10-18T21:30:00Z"}'
# 201, body with "id"; Mongo: { amount: 29, date: ISODate("2026-10-18T21:30:00Z"), description: "AC/DC", ... }
```

---

## B2 — New `GET /v1/payments`

**Goal:** give the client payments and their total in a time range. With rows it builds the Trend charts in the device's calendar; without rows (`limit=0`) it replaces `/query` for the donut and Summary.
**Scope:** read-only, omniscient `Leo.checks`. No pagination; a hard cap instead (volumes are ~100 payments/month).
**Owner:** omniscient (system of record). The gateway only proxies.
**Depends on:** B10, B3, B0/§5.

| Query param | Rules |
|---|---|
| `from`, `to` | Required. ISO 8601 instants, UTC `Z` (e.g. `2026-09-30T22:00:00Z`). Range is **half-open `[from, to)`**. Naive value → `422`. `to ≤ from` → `422`. Longer than 400 days → `422`. |
| `limit` | Optional, `0…5000`, default `5000`. `0` → no rows, totals only. |

Python can't name a parameter `from`, so the gateway declares `from_: AwareDatetime = Query(alias="from")`.

**Response `200`:**
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
- Rows sorted by `date` **descending**, at most `limit`.
- `total_cents` and `count` cover the **whole** range, independent of `limit` (one Mongo `$group`, not a sum of the returned rows). `truncated` is `count > len(payments)`.
- `store` is the stored `description` field (`omniscient/check.py`).
- `amount_cents` is an integer (requires B0/§5). `currency` is mapped from the stored ISO numeric `978` to `"EUR"`.
- `date` per the `/v1` conventions (seconds, `Z`). The client tolerates fractional seconds as a fallback (client/design.md §4.3), but the contract is seconds.
- `id` per B3.

**gRPC** (`omniscient.proto`, existing `Query` service):
```proto
message TimeRange   { string start = 1; string stop = 2; int32 limit = 3; }   // ISO 8601 UTC instants
message PaymentItem { string id = 1; string store = 2; int64 amount_cents = 3;
                      string date = 4; string currency = 5; }
message PaymentList { repeated PaymentItem payments = 1; int64 total_cents = 2; int64 count = 3; }

service Query {
  rpc Query (DateQuery) returns (QueryResponse);        // legacy /query
  rpc ListPayments (TimeRange) returns (PaymentList);
}
```
The gateway always sends `limit` explicitly (its default is 5000), so proto3's default `0` never means "unspecified". It computes `truncated` itself.

**omniscient:** a new `db_handler.list_checks(start, end, limit)`: `find({"date": {"$gte": start, "$lt": end}}).sort("date", -1).limit(limit)` (skip the `find` when `limit == 0`), plus an aggregate `{"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}` over the same filter. Add an index on `date` (`checks.create_index("date")`) at startup.

**Check:**
```sh
H=(-H "Authorization: Bearer $API_SECRET" -H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET")
curl "${H[@]}" "https://api.omniserv.me/v1/payments?from=2026-09-30T22:00:00Z&to=2026-10-31T23:00:00Z&limit=0"
# {"payments": [], "total_cents": …, "count": …, "truncated": true}   (truncated whenever count > 0 with limit=0)
curl "${H[@]}" "https://api.omniserv.me/v1/payments?from=2026-09-30T22:00:00Z&to=2026-10-31T23:00:00Z" | jq '[.payments[].amount_cents] | add'
# equals .total_cents
```

---

## B3 — Stable payment ids

**Problem (not in audit.md):** `Check.id` comes from the `.state` counter file in omniscient's container working directory (`omniscient/common.py:7`). The CI deploy runs `docker compose up -d --build` on every push to `main`. Whenever that rebuilds omniscient's image (any change under `omniscient/`), the container is recreated and the counter resets to `0`. Ids are therefore **not unique** across deploys. The `Check.id` type hint is also `str` while the value is `int` (`omniscient/check.py`).
**Why the client cares:** SwiftUI lists and chart selection key on `Payment.id` (client/design.md §5.4). Duplicate ids cause rows to be dropped or merged.

**Change:**
- B1 and B2 return Mongo's `_id` as a 24-char hex string in `id`.
- Stop writing the counter `id` for new documents (or keep it as a legacy field, but never expose it).
- Remove the `.state` file / `State` class once nothing reads it. `delete_check` / `is_check_in_db` (`omniscient/db_handler.py:19-23`) should switch to `_id` if they are ever wired up (a future `DELETE /v1/payments/{id}`).

---

## B4 — New `GET /v1/devices`, `GET /v1/automation`, `PATCH /v1/automation`

**Owner:** smartlife (system of record for the automation flags; proxy for device state). **Depends on:** B10, B6 (the lock).

### `GET /v1/devices`

**Goal:** current device state (on/off, brightness, reachability).
**Scope:** read-only. Queries the strip over the LAN once. It must **not** run `check()` or actuate anything.

**Response `200`:**
```json
{ "devices": [ { "id": 0, "kind": "cololight_strip", "name": "Strip",
                 "reachable": true, "on": true, "brightness": 40 } ] }
```
- `id` is the existing `ColoStrip.id` (`smartlife/src/devices.py`, currently `0`).
- `name`: new optional env `STRIP_NAME`, default `"Strip"`. Wire it through `docker-compose.yaml` and the deploy workflow like `STRIP_IP`.
- `brightness`: `0…100` when reachable, `null` when not. `on: false` → report the last read brightness, or `null`.
- **An unreachable strip is not an error.** Return `200` with `reachable: false, on: false, brightness: null`, so the app can render everything else. `5xx` is reserved for smartlife itself being down (B7).
- Bound the device query: one `strip.state()` attempt with a ~2 s socket timeout (confirm `pycololighto` allows setting it, client/design.md §12 Q6). Do **not** reuse `check_connection()` (`smartlife/src/colo_strip.py:19`), which retries with `sleep(1)` and raises.

### `GET /v1/automation`

**Goal:** the automation flags. **Scope:** read-only, in-memory; no device access, so it answers instantly even with the strip unreachable.

**Response `200`:** `{"active": true, "owner_present": true}`. `owner_present` is `null` until the first presence report after a smartlife start (see below).

### `PATCH /v1/automation`

**Goal:** pause/resume the automation (the app) and report presence (the presence Shortcut after B11).
**Scope:** writes `state.service_active` and/or `state.owner_present`; may actuate the strip through `check()`.

**Request:** a non-empty subset of `{"active": bool, "owner_present": bool}`. Empty object, unknown fields, or `null` values → `422`.
```python
class AutomationPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    active: StrictBool | None = None
    owner_present: StrictBool | None = None
    # model validator: at least one field set, else 422
```

**Behaviour:** apply both fields, then run `check()` **once** if `service_active` is true afterwards. That matches the legacy routes' semantics (`updActive(true)` checks; presence checks only while active, see audit §8 below) without checking twice when both fields come in one request. A `502` from an unreachable strip during `check()` (B7) still leaves the flags set; the client knows this (client/design.md §7.3).

**Response:** `204`.

**Smartlife behaviour B4 has to fix to report the truth** (not in audit.md):
- **Startup with the strip unreachable.** `ColoStrip.__init__` calls `check_connection()`, which raises (`colo_strip.py:58`). `cololight_strip` is created at import time (`devices.py:7`), so smartlife doesn't start at all and every lights route fails. The container then stays exited, because no service in `docker-compose.yaml` has a `restart:` policy, and the deploy's `docker compose up --wait` fails. Add `restart: unless-stopped` to the services. "Unreachable is not an error" must also hold at startup: create the `PyCololight` object without the connection check and let `snapshot()` / `check()` discover reachability.
- **Presence after a restart.** `owner_present` starts as `False` (`smartlife/src/common.py:5`). After every smartlife deploy the app would show "At home: no", and `check()` switches the strip off every 10 minutes until the presence Shortcut next reports. Start with `owner_present = None` (unknown), have `check()` take no presence-based action while it is `None`, and report it as `null`.
- **The automation loop dies on the first strip error.** `check()` raises when the strip is unreachable. In `run()` (`smartlife/src/main.py:21-22`) the exception escapes `asyncio.gather` and `asyncio.run` raises it. `__main__` logs it as critical, and the non-daemon gRPC thread keeps the process alive. From then on there is no automation while `service_active` still reads `true`. Catch and log exceptions around `check()` inside the loop.
- **Paused automation still actuates (audit §8).** The legacy `updStatus` (`smartlife/src/api.py:31-35`) calls `check()` even while `service_active` is false. Fix it there too (record `owner_present`, call `check()` only when active), so "Automation off" in the app is true while the Shortcut still uses the legacy route.

**gRPC** (`smartlife.proto`, existing `StateUpdate` service):
```proto
message Empty {}
message DeviceState     { int32 id = 1; string kind = 2; string name = 3;
                          bool reachable = 4; bool on = 5; optional int32 brightness = 6; }
message DeviceList      { repeated DeviceState devices = 1; }
message AutomationState { bool active = 1; optional bool owner_present = 2; }
message AutomationPatch { optional bool active = 1; optional bool owner_present = 2; }

service StateUpdate {
  // existing (legacy) rpcs …
  rpc GetDevices (Empty) returns (DeviceList);
  rpc GetAutomation (Empty) returns (AutomationState);
  rpc UpdateAutomation (AutomationPatch) returns (UpdateResponse);
}
```
Two read rpcs rather than one, so `GET /v1/automation` never waits on the strip.

**smartlife:** a new `ColoStrip.snapshot()` → `(reachable, on, brightness)` that takes the B6 lock, calls `self.strip.state()` once, and reads `self.strip.on` / `self.strip.brightness`. The existing `get_state()` (`colo_strip.py:118`) only prints and can be replaced by it.

**Check:**
```sh
curl "${H[@]}" https://api.omniserv.me/v1/devices | jq      # strip unplugged: 200, "reachable": false
curl "${H[@]}" https://api.omniserv.me/v1/automation | jq   # instant, even with the strip unplugged
curl "${H[@]}" -X PATCH -H "Content-Type: application/json" -d '{"active": false}' \
  https://api.omniserv.me/v1/automation -i                  # 204
curl "${H[@]}" -X PATCH -H "Content-Type: application/json" -d '{}' \
  https://api.omniserv.me/v1/automation -i                  # 422
```

---

## B5 — New `PATCH /v1/devices/{id}`

**Goal:** set a device's brightness; `0` switches it off.
**Scope:** actuates the device only; no stored state. Idempotent.
**Owner:** smartlife. **Depends on:** B10, B6. Replaces the app's use of `/updBrightness`, whose missing range check (not in audit.md: negatives and values > 100 go to the device library, API-CONTRACT §6.3) the new route doesn't inherit.

**Request:** `{"brightness": 40}`.
```python
class DevicePatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    brightness: int = Field(ge=0, le=100)   # required: it is the only writable field so far
```
- `brightness` outside `0…100`, missing, or any other field → `422`.
- Unknown `id` → `404`.
- Strip unreachable → `502` `"strip unreachable"` (B7).
- Success → `204`.

**gRPC:** add the device id; legacy callers leave it at `0`, which is the strip:
```proto
message BrightnessRequest {
  int32 brightness = 1;
  int32 device_id = 2;     // 0 = the strip (legacy callers don't set it)
}
```
**smartlife** (`smartlife/src/api.py:44` `updBrightness`): look up the device by `device_id`; unknown → `context.abort(grpc.StatusCode.NOT_FOUND, "unknown device")`. Mirror the `0…100` check (`INVALID_ARGUMENT`) for non-HTTP callers. Confirm the device's real range is 0–100 first (client/design.md §12 Q2). Optionally add the range check to the legacy `/updBrightness` too.

**Check:**
```sh
curl "${H[@]}" -X PATCH -H "Content-Type: application/json" -d '{"brightness": 40}' https://api.omniserv.me/v1/devices/0 -i    # 204
curl "${H[@]}" -X PATCH -H "Content-Type: application/json" -d '{"brightness": 101}' https://api.omniserv.me/v1/devices/0 -i   # 422
curl "${H[@]}" -X PATCH -H "Content-Type: application/json" -d '{"brightness": 40}' https://api.omniserv.me/v1/devices/7 -i    # 404
```

---

## B6 — Serialise strip access

**Problem (not in audit.md):** the smartlife gRPC server runs 3 worker threads (`smartlife/src/api.py:48`) and the automation loop calls `check()` from the asyncio thread. Nothing serialises `ColoStrip`, so a `state()` read and a set from two threads can interleave on the same UDP device. Each `on()` / `off()` is itself a `state()` + set sequence (`colo_strip.py:108-116`).
**Why the client cares:** the client already sends brightness changes strictly one at a time (client/design.md §7.2). The automation loop and other callers (the presence Shortcut) still race with it.
**Change:** add a `threading.RLock` on `ColoStrip`. Hold it for the whole of `check()`, `on()`, `off()`, `updBrightness()` and `snapshot()` (B4). It must be an `RLock` because `check()` calls `on()` / `off()`. The asyncio loop calls `check()` synchronously, so the lock works across both. Any future smartlife thread pool size stays safe.
- `snapshot()` acquires with a timeout (`acquire(timeout=2.5)`). A `check()` that is waiting on an unreachable strip can hold the lock for several socket timeouts. Without the bound, `GET /v1/devices` would hit the B7 deadline and return `504` instead of answering. On timeout, report the device as `reachable: false`.
- `RLock` is not FIFO. A write whose gateway call already timed out (B7) keeps waiting for the lock, and it can still be applied after a newer write. The client copes by refetching `GET /v1/devices` after any write that ended in an error (client/design.md §7.2). Strict ordering across timeouts is not a requirement.

---

## B7 — gRPC deadlines and status mapping in the gateway

**Problem (not in audit.md):** the gateway's stub calls have no `timeout=` (`api/api.py:28-85`). A slow strip or a hung omniscient holds the HTTP request open until the client or Cloudflare (100 s) gives up.
**Change** (required for every `/v1` route from its first deploy, as part of B10; recommended for the legacy routes):
- Pass `timeout=5` on every stub call. That is below the client's 10 s request timeout (client/design.md §4.2).
- Map `grpc.StatusCode.DEADLINE_EXCEEDED` → HTTP **504**.
- Map `UNAVAILABLE` → **502**.
- Map `NOT_FOUND` → **404** (B5's unknown device).
- Map `INVALID_ARGUMENT` → **422** (omniscient should raise it for bad input instead of a bare exception; with the gateway's request models it is a backstop).
- Map anything else → **500**.
- **Unreachable strip on a write.** Today `updBrightness` / `updActive` / `updStatus` let the `pycololighto` exception escape. gRPC turns that into `UNKNOWN`, which maps to `500`, and the app could only say "server error". smartlife should catch device errors and `context.abort(grpc.StatusCode.UNAVAILABLE, "strip unreachable")` → **502** with that `detail` (B8), so the app shows "Lights are unreachable". This applies to `BrightnessUpdate` and `UpdateAutomation` (B4, B5). `UpdateAutomation` sets the flags *before* `check()` runs, so a `502` there doesn't mean nothing changed.

---

## B8 — JSON error bodies

**Problem (not in audit.md):** errors surface as a bare `500 Internal Server Error` text body with no indication of which layer failed (API-CONTRACT §2.3).
**Change** (part of B10 for `/v1`): one FastAPI exception handler (`@app.exception_handler(grpc.RpcError)` + a generic `Exception` handler) that returns
```json
{ "detail": "smartlife unavailable" }
```
with the B7 status mapping. That is `Content-Type: application/json` always. `detail` names the failing part: `"omniscient unavailable"`, `"smartlife unavailable"`, `"strip unreachable"`, `"unknown device"`, `"timeout"`. Keep FastAPI's own `422` shape; the client accepts both list and string `detail`. Don't include stack traces.
The client uses `detail` only to choose between messages like "Lights are unreachable" and "Budget service is down" (client/design.md §4.4). It classifies errors by HTTP status first (502/530, 504, other 5xx).

---

## B9 — Cloudflare edge and host ports

Requests reach the gateway through Cloudflare and a Zero Trust tunnel. Items 4 and 6 are the edge half of auth phase 0 (`client.md`, client/design.md §4.6, D11) and are **required** before daily use; the rest are edge settings the client depends on.

1. **No caching.** Add a Cache Rule: hostname `api.omniserv.me` → *Bypass cache*. `POST`/`PATCH` are never cached, but the legacy routes are `GET` writes, and `/v1` `GET`s must never be answered from a cache either. Cloudflare doesn't cache JSON by default; the explicit rule guards against a zone-wide "Cache Everything". B10's `Cache-Control: no-store` gives the same protection one layer deeper.
2. **No browser challenges.** Bot Fight Mode / Super Bot Fight Mode, WAF managed challenges and "Under Attack" mode answer non-browser clients with an HTML challenge. `URLSession` can't solve it, and every call would fail (the client reports it as "Blocked by Cloudflare"). Add a WAF *Skip* rule for `api.omniserv.me` (optionally narrowed to `User-Agent` starting with `Omniserv-iOS/`), or disable Bot Fight Mode for the zone.
3. **Secrets in Cloudflare's logs.** On `/v1` the secret is a header, which Cloudflare doesn't log unless a Logpush job is configured to include request headers; don't configure one that does. The legacy routes still carry it in the path, so it appears in Cloudflare's request logs and analytics until B11.
4. **Cloudflare Access (required).**
   - Zero Trust → Access → Service Auth → **create a service token** `omniserv-ios`. Note the client id and secret (shown once) and put them in the owner's `.env` as `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` (client/design.md §2). Choose a long duration and put the expiry in a calendar: an expired token makes every app request fail with "Blocked by Cloudflare".
   - Zero Trust → Access → Applications → **self-hosted application**: domain `api.omniserv.me`, path `v1`. Policy: action **Service Auth**, include *Service Token* `omniserv-ios`. No identity-login policy on this application, so a missing token should get a `403`, not a redirect to a login page. Confirm on setup (client/design.md §12 Q3); the app handles either.
   - Scope: `/v1` only for now, so the Shortcuts on the legacy routes keep working. B11 widens it to the whole hostname.
   - The app sends the two headers on every request, `/health` included, so widening the scope needs no client change.
   - Later (not required): the gateway validates the `Cf-Access-Jwt-Assertion` header, so it only trusts traffic that passed the edge.
5. Cloudflare's 100 s origin timeout is irrelevant once B7 is in (5 s).
6. **Close the host ports (required).** `docker-compose.yaml` publishes `5006` (api, plain HTTP), `5003` / `5002` (omniscient / smartlife gRPC, no auth at all) and `27017` (Mongo) on the host. Anything on the LAN can bypass the edge and, through gRPC, the bearer check too. The cloudflared setup isn't in the repo (`docker-compose.proxy.yaml` is empty). Change:
   - `omniscient`, `smartlife`: drop `ports:`. Only `api` talks to them, over the `omniserv` network.
   - `mongodb`: replace `"27017:27017"` with `"127.0.0.1:27017:27017"`. Manual intervention still works on the host or through an SSH tunnel.
   - `api`: drop `ports:` if cloudflared runs as a container on the `omniserv` network (it then reaches `api:5006` directly). If cloudflared runs on the host, use `"127.0.0.1:5006:5006"`.
   - Check from another LAN machine: `nc -zv <host> 5002 5003 5006 27017` → all refused (client/design.md §9.4 item 10).

---

## B10 — `/v1` foundation

**Goal:** the routing, auth and conventions every `/v1` route shares, so B1, B2, B4 and B5 contain only their own logic. This is the gateway half of auth phase 0.
**Scope:** `api` only. The legacy routes are not touched.

**Auth middleware** (`api/api.py`):
```python
import hmac

API_SECRET = common.api_secret
if not API_SECRET:
    sys.exit("API_SECRET is not set")          # fail at startup, not on every request

@app.middleware("http")
async def require_bearer(request: Request, call_next):
    path = request.url.path
    if not (path == "/v1" or path.startswith("/v1/")):
        return await call_next(request)
    scheme, _, token = request.headers.get("authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not hmac.compare_digest(token.encode(), API_SECRET.encode()):
        response = JSONResponse({"detail": "unauthorized"}, status_code=401,
                                headers={"WWW-Authenticate": "Bearer"})
    else:
        response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    return response
```
- A middleware rather than a route dependency, so it runs **before** routing and validation. An unauthenticated caller gets `401` for any `/v1` path: never `422` (audit §2) and never a `404` that would reveal which routes exist.
- `hmac.compare_digest` gives a constant-time comparison.
- Today an unset `API_SECRET` silently rejects everything (API-CONTRACT §2.2); exiting at startup makes the deploy's `--wait` fail visibly instead.

**Routes:** `v1 = APIRouter(prefix="/v1")` with B1, B2, B4, B5, then `app.include_router(v1)`. Request bodies are Pydantic models with `extra="forbid"`; responses are built explicitly in the `/v1` format (snake_case, cents, UTC `Z`).

**Also part of B10:**
- B7 and B8 for every `/v1` route (deadlines, status mapping, JSON errors).
- `FastAPI(docs_url=None, redoc_url=None, openapi_url=None)` (audit §4). The docs listed every route, unauthenticated.
- No request-header logging anywhere. uvicorn's access log records only method, path and status, so on `/v1` the secret no longer reaches it (audit §3).

**Check:**
```sh
curl -i https://api.omniserv.me/v1/payments -H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET"
# 401 {"detail":"unauthorized"}, WWW-Authenticate: Bearer   (no bearer: 401, not 422)
curl -i https://api.omniserv.me/v1/payments
# 403 HTML from Cloudflare Access (B9.4)
curl -i "${H[@]}" https://api.omniserv.me/docs
# 404
```
A gateway test covers bad secret + bad input → `401`, and unknown `/v1` path without auth → `401`.

---

## B11 — Move the Shortcuts to `/v1`, retire the legacy routes

**Goal:** one API, no secret in any URL, Access on the whole host.
**Why:** until this is done, every legacy call still writes the secret into uvicorn's access log and Cloudflare's logs (audit §3, B9.3), and Access can't cover `/` without breaking the Shortcuts.

Steps:
1. **Payment Shortcut** → "Get Contents of URL": method `POST`, URL `https://api.omniserv.me/v1/payments`, headers `Authorization: Bearer …`, `CF-Access-Client-Id`, `CF-Access-Client-Secret` (a second service token, `omniserv-shortcuts`, so the two clients can be revoked separately), JSON body `store`, `amount_cents` (the Apple Pay amount × 100, rounded, computed in the Shortcut).
2. **Presence Shortcut** → `PATCH https://api.omniserv.me/v1/automation` with `{"owner_present": true|false}`, same headers.
3. Watch the access log for a week: no legacy route is called.
4. Delete the legacy routes and their now-unused code: `/add_payment`, `/query`, `/updStatus`, `/updActive`, `/updBrightness`; the NBSP-euro parsing (audit §7); the legacy rpcs `Query`, `StatusUpdate`, `ActiveUpdate` if nothing else uses them.
5. Widen the Access application (B9.4) from path `v1` to the whole hostname, with both service tokens in the policy.
6. **Rotate `API_SECRET`.** The old one has been in logs for a long time. GitHub secret → deploy → `.env` → rebuild the app → update the Shortcuts.

Not a client dependency. The app never uses the legacy routes (client/design.md §4.7).

---

## Not needed

- **A `/v1` successor for `/query`.** `GET /v1/payments?limit=0` returns the same total with instant-based ranges (client/design.md §6.5, D12).
- **Monthly allowance on the server.** The goal is a client setting and all planning maths run in the client (client/design.md §6, D2). The `spending_trajectory` / `configure_monthly_allowance` stubs (`omniscient/api.py:55-61`) are not needed by the client.
- **Payment edit/delete routes.** Out of scope for this iteration. A future `DELETE /v1/payments/{id}` would use B3's `_id`.
- **Idempotency keys, per-client bearer secrets, the Access JWT check.** Later auth work (client/design.md §4.6), triggered by `client.md`'s revisit conditions.
- **Downstream health in `/health`.** The client's connection test only needs the gateway. `GET /v1/devices` reports device reachability, and B7/B8 identify a down service per request.

## Suggested order

1. **B10 + B9.4 + B9.6** (auth phase 0; nothing to call without it), together with **B7/B8** for `/v1`.
2. **B0/§5 → B3 → B2** (`GET /v1/payments`; unblocks client steps 3, 5, 6, 8). B2 exposes the B3 id and sums B0/§5's cents.
3. **B1** (`POST /v1/payments`; client step 7). Reuses B2's `PaymentItem`.
4. **B6 → B5 → B4** (lights; client step 9). B6 first, because B4 and B5 take its lock.
5. **B9.1–B9.3** before daily use.
6. **B11** once the app is in daily use; B0/§1, §6, §7 only if B11 is far off.
7. Update `API-CONTRACT.md` for B1, B2, B4, B5, B7, B8, B10 (and B11 when the legacy routes go).
