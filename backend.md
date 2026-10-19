# Backend changes required by the iOS client

> **Status:** requirements, written 2026-10-19 against `d23f667`, derived from [`client/design.md`](client/design.md).
> Findings already listed in [`audit.md`](audit.md) are **not repeated here**. Where the client depends on one, it is cited as "audit §N" together with the resolution the client needs.
> Current behaviour is described in [`API-CONTRACT.md`](API-CONTRACT.md). Per `client.md`, each new endpoint below has a defined goal and scope. Implement it only after this document is agreed, then update API-CONTRACT.md.

## Summary

| ID | Change | Owner | Kind | Unblocks client step |
|---|---|---|---|---|
| B0 | Resolve audit §5, §6, §7 the way the client expects | api, omniscient | fix | 5, 6, 7 |
| B1 | `/add_payment`: optional payment time `?at=` | api, omniscient | extend route | 7 |
| B2 | `GET /payments/{secret}/{start}/{stop}`: list payments | api, omniscient | **new route** | 8 |
| B3 | Stable payment ids (Mongo `_id`) | omniscient | fix | 8 |
| B4 | `GET /devices/{secret}`: smartlife state | api, smartlife | **new route** | 9 |
| B5 | `/updBrightness`: validate `0…100` | api | fix | 9 |
| B6 | Serialise strip access | smartlife | fix | 9 |
| B7 | gRPC deadlines in the gateway | api | fix | 9 (and all) |
| B8 | JSON error bodies with meaningful statuses | api | fix | 10 |
| B9 | Cloudflare edge configuration for `api.omniserv.me` | infra | config | 10 (before daily use) |

The client adds **two** routes (B2, B4) and **one optional parameter** (B1). Everything else it uses already exists: `/health`, `/query`, `/add_payment`, `/updBrightness`, `/updActive`.

**Proto files** exist in several copies that must stay identical: `api/omniscient.proto`, `api/protobufs/omniscient.proto`, `omniscient/protobufs/omniscient.proto`, and `api/smartlife.proto`, `api/protobufs/smartlife.proto`, `smartlife/smartlife.proto`, `smartlife/src/protobufs/smartlife.proto`. There is no generation script. Regenerate with
`python -m grpc_tools.protoc -I protobufs --python_out=protobufs --pyi_out=protobufs --grpc_python_out=protobufs protobufs/<name>.proto`
in each service. It's worth adding that as a `make proto` target that also copies the `.proto` files.

---

## B0 — Audit prerequisites (resolution the client relies on)

| Audit | Client needs | Notes |
|---|---|---|
| §5 | `/query` `total` is euros for **all** stored documents. Stored `amount` is integer cents everywhere. | Includes a one-off migration of documents written as euro floats (detect: non-integer `amount`, or `id`/date before the cents switch). Without it the Overview donut and Summary show wrong totals; the client deliberately does not compensate. B2 depends on the same normalisation. |
| §6 | Keep the **half-open `[start, stop)`** semantics and document them as the contract. Do **not** make `stop` inclusive. Set `TZ` on the `omniscient` container to the owner's zone (same zone as smartlife's `CITY`). **In the same change**, store dates as UTC-aware (`datetime.now(timezone.utc)` instead of the naive `datetime.datetime.now()` in `omniscient/api.py:28`), and have `/query` build its day bounds in `TZ` and convert them to UTC before querying. | The client sends `stop` = the day after the last included day (client/design.md §4.5, §6.2). Changing the semantics would double-count boundaries. Setting `TZ` alone would make the naive `now()` return local time, which pymongo stores as if it were UTC, shifting every new payment by the UTC offset. Existing documents were written with the container clock at UTC, so they are already UTC and need no date migration. |
| §7 | `"12.34"` (dot, two decimals, no suffix) is parsed **exactly**: `Decimal(amount) * 100` → `int`, rejecting more than 2 decimals with `422`. | The client always sends that canonical form. Keep the NBSP-euro / comma handling for the Shortcuts automation. |
| §1 | No constraint on timing. | The client accepts both today's body `403` and a real `401`/`403` status. Fix whenever convenient. |

---

## B1 — `/add_payment`: optional payment time

**Goal:** record a check at the time the user picked in the Add form, not the time of receipt.
**Scope:** adds one optional query parameter. The route, path and response are unchanged, so the Shortcuts automation keeps working.

```
GET /add_payment/{secret}/{store}/{amount}?at=2026-10-18T21:30:00Z
```

| Param | Rules |
|---|---|
| `at` (query, optional) | ISO 8601 instant. The client always sends UTC with `Z` (a `+hh:mm` offset would be mangled into a space in a query string). The server should still accept an explicit offset if encoded as `%2B`. Must be timezone-aware → otherwise `422`. Must be ≤ now + 24 h → otherwise `422`. Absent → server time, as today. |

**gRPC** (`omniscient.proto`): add a field, which is backward compatible:
```proto
message Payment {
  string store = 1;
  int32 amount = 2;
  string timestamp = 3;   // ISO 8601 instant; empty = now
}
```

**omniscient** (`omniscient/api.py:27` `add_payment`): if `timestamp` is set, parse it with `datetime.fromisoformat` and convert to UTC. Otherwise keep `datetime.now(timezone.utc)`. Dates are already stored as UTC and `/query` already converts its day bounds, both per B0/§6.

**Check:**
```sh
curl "https://api.omniserv.me/add_payment/$API_SECRET/Test/0.29?at=2026-10-18T21:30:00Z"   # 200
# Mongo: { amount: 29, date: ISODate("2026-10-18T21:30:00Z"), description: "Test", ... }
```

---

## B2 — New `GET /payments/{secret}/{start}/{stop}`

**Goal:** give the client the individual payments in a time range, so it can build daily/monthly spending charts in the device's calendar.
**Scope:** read-only, omniscient `Leo.checks`. No pagination; a hard cap instead (volumes are ~100 payments/month).
**Owner:** omniscient (system of record). The api gateway only proxies.

| Param | Rules |
|---|---|
| `start`, `stop` | ISO 8601 instants, UTC `Z` (e.g. `2026-09-30T22:00:00Z`). Range is **half-open `[start, stop)`**. `stop ≤ start` → `422`. Range longer than 400 days → `422`. |

**Response `200`:**
```json
{
  "payments": [
    { "id": "6713a0c2f1e4b2a9c0d1e2f3", "store": "Lidl", "amount_cents": 1234,
      "date": "2026-10-18T21:30:00Z", "currency": "EUR" }
  ],
  "total_cents": 1234,
  "truncated": false
}
```
- Sorted by `date` **descending**.
- Cap of **5 000** rows. If more match, return the newest 5 000 with `"truncated": true`. `total_cents` is always the sum over the **whole** range (computed with a Mongo `$group`, not from the returned rows).
- `amount_cents` is an integer (requires the B0/§5 normalisation). `currency` is mapped from the stored ISO numeric `978` to `"EUR"`.
- `date` is serialised as `strftime("%Y-%m-%dT%H:%M:%SZ")` on the UTC value: seconds precision, literal `Z`. Do **not** use `isoformat()`. Stored dates carry milliseconds, so it would emit `…:00.123000+00:00`, which Foundation's standard ISO 8601 decoding rejects. The client tolerates fractional seconds as a fallback (client/design.md §4.3), but the contract is the format above.
- `id` per B3.

**gRPC** (`omniscient.proto`, existing `Query` service):
```proto
message TimeRange   { string start = 1; string stop = 2; }        // ISO 8601 instants
message PaymentItem { string id = 1; string store = 2; int64 amount_cents = 3;
                      string date = 4; string currency = 5; }
message PaymentList { repeated PaymentItem payments = 1; int64 total_cents = 2; bool truncated = 3; }

service Query {
  rpc Query (DateQuery) returns (QueryResponse);
  rpc ListPayments (TimeRange) returns (PaymentList);
}
```
**omniscient:** a new `db_handler.list_checks(start, end, limit)` with `find({"date": {"$gte": start, "$lt": end}}).sort("date", -1).limit(limit)` plus an aggregate for the total. An index on `date` (`checks.create_index("date")`) is cheap and worth adding at startup.

**Check:**
```sh
curl "https://api.omniserv.me/payments/$API_SECRET/2026-09-30T22:00:00Z/2026-10-31T23:00:00Z" | jq '.total_cents'
# equals 100 × /query/…/01.10.2026/01.11.2026 .total  (with TZ=Europe/Berlin)
```

---

## B3 — Stable payment ids

**Problem (not in audit.md):** `Check.id` comes from the `.state` counter file in omniscient's container working directory (`omniscient/common.py:7`). The CI deploy runs `docker compose up -d --build` on every push to `main`, which recreates the container and resets the counter to `0`. Ids are therefore **not unique** across deploys. The `Check.id` type hint is also `str` while the value is `int` (`omniscient/check.py`).
**Why the client cares:** SwiftUI lists and chart selection key on `Payment.id` (client/design.md §5.4). Duplicate ids cause rows to be dropped or merged.

**Change:**
- B2 returns Mongo's `_id` as a 24-char hex string in `id`.
- Stop writing the counter `id` for new documents (or keep it as a legacy field, but never expose it).
- Remove the `.state` file / `State` class once nothing reads it. `delete_check` / `is_check_in_db` (`omniscient/db_handler.py:19-23`) should switch to `_id` if they are ever wired up.

---

## B4 — New `GET /devices/{secret}`

**Goal:** let the client show current device state (on/off, brightness, reachability) and the automation flags.
**Scope:** read-only. Queries the strip over the LAN once and reads the in-memory flags. It must **not** run `check()` or actuate anything.
**Owner:** smartlife (system of record for flags; proxy for device state).

**Response `200`:**
```json
{
  "automation": { "active": true, "owner_present": true },
  "devices": [
    { "id": 0, "kind": "cololight_strip", "name": "Strip",
      "reachable": true, "on": true, "brightness": 40 }
  ]
}
```
- `id` is the existing `ColoStrip.id` (`smartlife/src/devices.py`, currently `0`).
- `name`: new optional env `STRIP_NAME`, default `"Strip"`.
- `brightness`: `0…100` when reachable, `null` when not. `on: false` → report the last read brightness, or `null`.
- **An unreachable strip is not an error.** Return `200` with `reachable: false, on: false, brightness: null`, so the app can render everything else. `5xx` is reserved for smartlife itself being down (→ B7/B8).
- Bound the device query: one `strip.state()` attempt with a ~2 s socket timeout. Do **not** reuse `check_connection()` (`smartlife/src/colo_strip.py:19`), which retries with `sleep(1)` and raises.

**gRPC** (`smartlife.proto`, existing `StateUpdate` service):
```proto
message StateRequest {}
message DeviceState { int32 id = 1; string kind = 2; string name = 3;
                      bool reachable = 4; bool on = 5; optional int32 brightness = 6; }
message StateResponse { bool service_active = 1; bool owner_present = 2; repeated DeviceState devices = 3; }

service StateUpdate {
  // existing rpcs …
  rpc GetState (StateRequest) returns (StateResponse);
}
```
**smartlife:** a new `ColoStrip.snapshot()` → `(reachable, on, brightness)` that takes the B6 lock, calls `self.strip.state()` once, and reads `self.strip.on` / `self.strip.brightness`. The existing `get_state()` (`colo_strip.py:118`) only prints and can be replaced by it.

**Check:**
```sh
curl "https://api.omniserv.me/devices/$API_SECRET" | jq
# with the strip unplugged: 200, "reachable": false
```

---

## B5 — `/updBrightness`: validate range

**Problem (not in audit.md):** `new_brightness` is forwarded unchecked; negatives and values > 100 go to the device library (API-CONTRACT §6.3).
**Change:** type it as `Annotated[int, Path(ge=0, le=100)]` in `api/api.py:76`, which gives `422` outside the range. Mirror the check in `smartlife/src/api.py:44` (`updBrightness`) for non-HTTP callers. Confirm the device's real range is 0–100 first (client/design.md §12 Q2).

---

## B6 — Serialise strip access

**Problem (not in audit.md):** the smartlife gRPC server runs 3 worker threads (`smartlife/src/api.py:47`) and the automation loop calls `check()` from the asyncio thread. Nothing serialises `ColoStrip`, so a `state()` read and a set from two threads can interleave on the same UDP device. Each `on()` / `off()` is itself a `state()` + set sequence (`colo_strip.py:108-116`).
**Why the client cares:** the client already sends brightness changes strictly one at a time (client/design.md §7.2). The automation loop and other callers (the presence Shortcut) still race with it.
**Change:** add a `threading.RLock` on `ColoStrip`. Hold it for the whole of `check()`, `on()`, `off()`, `updBrightness()` and `snapshot()` (B4). It must be an `RLock` because `check()` calls `on()` / `off()`. The asyncio loop calls `check()` synchronously, so the lock works across both. Any future smartlife thread pool size stays safe.

---

## B7 — gRPC deadlines in the gateway

**Problem (not in audit.md):** the gateway's stub calls have no `timeout=` (`api/api.py:28-85`). A slow strip or a hung omniscient holds the HTTP request open until the client or Cloudflare (100 s) gives up.
**Change:**
- Pass `timeout=5` on every stub call. That is below the client's 10 s request timeout (client/design.md §4.2).
- Map `grpc.StatusCode.DEADLINE_EXCEEDED` → HTTP **504**.
- Map `UNAVAILABLE` → **502**.
- Map `INVALID_ARGUMENT` → **422** (omniscient should raise it for bad dates and amounts instead of a bare exception).
- Map anything else → **500**.

---

## B8 — JSON error bodies

**Problem (not in audit.md):** errors surface as a bare `500 Internal Server Error` text body with no indication of which layer failed (API-CONTRACT §2.3).
**Change:** one FastAPI exception handler (`@app.exception_handler(grpc.RpcError)` + a generic `Exception` handler) that returns
```json
{ "detail": "smartlife unavailable" }
```
with the B7 status mapping. That is `Content-Type: application/json` always. Keep FastAPI's own `422` shape; the client accepts both list and string `detail`. Don't include stack traces.
The client uses `detail` only to choose between messages like "Lights are unreachable" and "Budget service is down" (client/design.md §4.4). It degrades gracefully without B8: the client classifies errors by HTTP status first (502/530, 504, other 5xx), so today's `text/plain` 500 still shows as a server error, just without the per-service wording.

---

## B9 — Cloudflare edge configuration (`api.omniserv.me`)

Requests reach the gateway through Cloudflare and a Zero Trust tunnel. Edge settings the client depends on:

1. **No caching.** Every route is a `GET`, including writes. Add a Cache Rule: hostname `api.omniserv.me` → *Bypass cache*. Cloudflare doesn't cache JSON by default, but an explicit rule guards against a zone-wide "Cache Everything" ever applying here. Adding `Cache-Control: no-store` to all gateway responses gives the same protection one layer deeper.
2. **No browser challenges.** Bot Fight Mode / Super Bot Fight Mode, WAF managed challenges and "Under Attack" mode answer non-browser clients with an HTML challenge. `URLSession` can't solve it, and every call would fail (the client reports it as "Unexpected response"). Add a WAF *Skip* rule for `api.omniserv.me` (optionally narrowed to `User-Agent` starting with `Omniserv-iOS/`), or disable Bot Fight Mode for the zone.
3. **The secret also reaches Cloudflare.** Because it is a path segment, it appears in Cloudflare's request logs and analytics (Logpush, Security Events), in addition to the gateway's access log covered by audit §3. Treat Cloudflare as a party that sees the secret until auth moves to a header.
4. **Option for the auth phase.** A Cloudflare Access application on `api.omniserv.me` with a **service token** would reject unauthenticated traffic at the edge before it reaches the tunnel. The app would send `CF-Access-Client-Id` / `CF-Access-Client-Secret` headers, injected exactly like `API_SECRET` (client/design.md §2, §12 Q3). Not required now, but it is the cheapest strong layer available.
5. Cloudflare's 100 s origin timeout is irrelevant once B7 is in (5 s).

---

## Not needed

- **Monthly allowance on the server.** The goal is a client setting and all planning maths run in the client (client/design.md §6, D2). The `spending_trajectory` / `configure_monthly_allowance` stubs (`omniscient/api.py:55-61`) are not needed by the client.
- **Payment edit/delete routes.** Out of scope for this iteration.
- **Downstream health in `/health`.** The client's connection test only needs the gateway. B4 already reports device reachability, and B7/B8 identify a down service per request.

## Suggested order

1. **B0** (correct numbers; unblocks client steps 5–6) and **B9** (before using the app daily).
2. **B6 → B5 → B4 → B7** (safe and observable lights; client step 9). B6 first, because B4 reuses its lock.
3. **B3 → B2** (trend; client step 8). B2 exposes the B3 id.
4. **B1** (dated checks; client step 7).
5. **B8** (error detail; client step 10).
6. Update `API-CONTRACT.md` for B1, B2, B4, B5, B7 and B8.
