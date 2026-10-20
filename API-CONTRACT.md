# API Contract — `omniserv/api`

> **Status:** as-is description of the current implementation (`api/api.py`, last changed in `6fed1bf`, documented at `5f61ea0`, 2026-10-19).
> §1–§9 describe what the code *does*, including its quirks; deviations from intent are collected in [§9 Known gaps](#9-known-gaps--divergences).
> [§10 Proposed implementation](#10-proposed-implementation--v1-not-yet-implemented) describes the planned `/v1` API (from [`backend.md`](backend.md)). It is **not implemented**; nothing in §1–§9 changes until it ships.

---

## 1. Overview

`api` is a thin REST gateway (FastAPI + uvicorn) in front of two internal gRPC services. It owns no data of its own: every non-health endpoint authenticates the caller, translates path parameters into a protobuf message and forwards it to the service that owns the domain.

```
                        HTTP :5006 (published on host)
  client ───────────────────────────────▶ api  (FastAPI, python api.py)
                                            │
             gRPC, insecure, omniscient:5003│        gRPC, insecure, smartlife:5002
                     ┌──────────────────────┴───────────────────────┐
                     ▼                                              ▼
               omniscient                                      smartlife
        (payments / spending)                         (smart-home automation)
                     │                                              │
          MongoDB  mongodb:27017                       Cololight strip  (STRIP_IP, LAN)
          db "Leo", collection "checks"                in-memory flags owner_present /
          + ".state" file (id counter)                 service_active
```

| Component | Address (docker network `omniserv`) | Role |
|---|---|---|
| `api` | `api:5006`, host `:5006` | REST gateway, auth, input parsing |
| `omniscient` | `omniscient:5003` | gRPC services `AddPayment`, `Query`; system of record for payments |
| `smartlife` | `smartlife:5002` | gRPC service `StateUpdate`; owns presence/activity flags and controls the LED strip |

---

## 2. Global conventions

### 2.1 Transport
- Plain **HTTP**, no TLS (`# ToDo: add ssl` in `api.py`). uvicorn binds `0.0.0.0:5006`; `docker-compose.yaml` publishes `5006:5006` on the host.
- **Every route is `GET`**, including those that mutate state. No request bodies, no query strings are read — all input is in the path.
- Responses are JSON (`application/json`).

### 2.2 Authentication & authorization
- A single shared secret, passed as the **first path segment after the route name** (`/<route>/{secret}/...`).
- Compared with `secret != API_SECRET`, where `API_SECRET` is read once at import from the environment (`api/common.py`; set via compose from `$API_SECRET` / GitHub secret).
- **No scopes, roles or per-endpoint permissions**: the one secret grants every protected operation (payments write, payments read, smart-home control).
- If `API_SECRET` is unset, it is `None`; no string path segment ever equals it, so **all protected routes always reject** (verified).
- Health/docs routes are unauthenticated.

### 2.3 Response & error semantics
The handlers return `http.HTTPStatus` enum members rather than raising `HTTPException`. FastAPI serializes the enum as its integer value **in the body**, and the HTTP status stays `200`:

| Situation | HTTP status | Body |
|---|---|---|
| Success (mutating routes) | `200` | `200` |
| Wrong / missing secret | **`200`** | `403` |
| Path parameter fails type validation (`bool`/`int`) | `422` | `{"detail":[{"type":"bool_parsing"\|"int_parsing", "loc":["path","<param>"], ...}]}` |
| Unparseable amount, out-of-range int32, gRPC error, downstream exception | `500` | `Internal Server Error` (text) |
| Unknown route, or a path segment containing `/` (incl. `%2F`) | `404` | `{"detail":"Not Found"}` |

Consequences for clients:
- **Clients must inspect the body**, not the status code, to distinguish success (`200`) from auth failure (`403`).
- **Validation runs before the secret check**: an unauthenticated caller with a malformed `bool`/`int` gets `422`, not `403`.
- The gRPC `success` fields returned by downstream services are **ignored**; `200` in the body only means "the RPC returned without raising".
- gRPC calls have **no deadline**; if a downstream handler blocks (e.g. the strip is slow to respond), the HTTP request blocks with it. If the downstream is unreachable, the call fails fast → `500`.

### 2.4 Logging
- uvicorn's access log is filtered (`log_filter`) to drop `/` and `/health`. **Every other request is logged with its full path — including the secret** (verified).
- `/query` additionally `print`s the raw gRPC response to stdout.

### 2.5 Auto-generated documentation (unauthenticated)
FastAPI defaults are left enabled: `GET /docs` (Swagger UI), `GET /redoc`, `GET /openapi.json` are served without auth and enumerate all routes.

### 2.6 Execution model & runtime constraints
- Handlers are synchronous `def`s → run in Starlette's thread pool; downstream calls block that worker thread.
- gRPC channels/stubs (`add_payment_stub`, `query_stub`, `smartlife_stub`) are created **only under `if __name__ == "__main__"`**. The service must be started as `python api.py` (as `api/Dockerfile` does). Importing the app via `uvicorn api:app` / `fastapi run` would make every proxied route fail with `NameError` → `500`.

### 2.7 Path-parameter encoding
- Parameters are URL-decoded by Starlette before matching. A decoded `/` (incl. `%2F`) splits the segment → `404`.
- Spaces and non-ASCII must be percent-encoded (`Rewe%20City`, `%C2%A0%E2%82%AC`).

---

## 3. Endpoint summary

| # | Route | Goal | Owner (system of record) | Scope | Auth |
|---|---|---|---|---|---|
| 1 | `GET /`, `GET /health` | Liveness probe | **api** | None — no downstream call, no state | none |
| 2 | `GET /add_payment/{secret}/{store}/{amount}` | Record one card payment | **omniscient** | **Write**: inserts one document into Mongo `Leo.checks`; increments `.state` id counter | secret |
| 3 | `GET /query/{secret}/{start_date}/{stop_date}` | Total spent in a date range | **omniscient** | **Read**: aggregates `Leo.checks` | secret |
| 4 | `GET /updStatus/{secret}/{new_status}` | Report owner presence at home | **smartlife** | **Write**: `state.owner_present`; **actuates** strip (immediate check) | secret |
| 5 | `GET /updActive/{secret}/{new_active}` | Enable/disable automation | **smartlife** | **Write**: `state.service_active`; **actuates** strip when enabling | secret |
| 6 | `GET /updBrightness/{secret}/{new_brightness}` | Manually set strip on/brightness/off | **smartlife** | **Actuates** strip only (no stored state) | secret |
| — | `GET /docs`, `/redoc`, `/openapi.json` | FastAPI defaults | api (framework) | Read-only route metadata | none |

"Owner" = the service that holds the data or implements the behaviour; `api` only proxies. "Intended caller" per endpoint is given below; items marked *(inferred)* are deduced from code, not stated anywhere.

---

## 4. Endpoints — api (gateway-owned)

### 4.1 `GET /` · `GET /health`

| | |
|---|---|
| **Goal** | Report that the gateway process is up. |
| **Scope** | Gateway process only. Does **not** check `omniscient`, `smartlife`, MongoDB or the strip. |
| **Ownership** | `api`. Caller: the Docker Compose healthcheck (`curl -f http://api:5006/health`, every 5 s); any monitor. |
| **Auth** | None. |
| **Response** | `200` `{"message": "Ok"}` |
| **Logging** | Excluded from access log. |

```sh
curl http://<host>:5006/health
# {"message":"Ok"}
```

---

## 5. Endpoints — omniscient (payments)

### 5.1 `GET /add_payment/{secret}/{store}/{amount}`

| | |
|---|---|
| **Goal** | Record a single payment (a "check") at the current time. |
| **Scope** | Write-only, one record. Inserts one document into MongoDB `Leo.checks` and advances omniscient's persistent id counter (`.state` file). No dedup, no update/delete. |
| **Ownership** | System of record: **omniscient** (`omniscient/api.py: add_payment`, `db_handler.put_check`). Caller *(inferred)*: an iOS Shortcuts / Wallet transaction automation — the amount parser strips the `"\xa0€"` suffix (non-breaking space + euro sign) produced by iOS-localised currency strings. |

**Path parameters**

| Name | Type | Format / rules |
|---|---|---|
| `secret` | string | Must equal `API_SECRET`. |
| `store` | string | Free text, stored as `description`. Must not contain `/`. Percent-encode spaces/non-ASCII. |
| `amount` | string | Euro amount. Parsed by the gateway (see below). |

**Amount parsing (gateway)**
1. Remove the literal substring `"\xa0€"` (URL: `%C2%A0%E2%82%AC`).
2. Replace `,` with `.`.
3. `int(float(x) * 100)` → integer **cents** (truncated, not rounded).

| Input | Sent to omniscient | Notes |
|---|---|---|
| `12,34%C2%A0%E2%82%AC` | `1234` | intended format |
| `12,34` / `12.34` | `1234` | |
| `0,29` | **`28`** | float truncation loses a cent (`0.29*100 = 28.999…`) |
| `0,57` | **`56`** | same |
| `12,34%20%E2%82%AC` (regular space) | — → `500` | only the NBSP form is stripped |
| `1.234,56` (thousands separator) | — → `500` | |
| ≥ `21474836,48` | — → `500` | exceeds `int32` cents |

**Processing**
1. Gateway → `omniscient.AddPayment(Payment{store, amount})`.
2. omniscient builds `Check(id=state.get_new_id(), amount=<cents>, date=datetime.now(), description=store, currency=978)` and inserts its `__dict__`:
   ```json
   { "id": 41, "amount": 1234, "date": ISODate(...), "description": "Lidl", "currency": 978 }
   ```
   - `id`: integer from `.state` counter (typed `str` in `Check`, actually `int`); the counter lives in omniscient's container filesystem, not in Mongo.
   - `date`: server time of receipt, naive datetime in omniscient's container clock (UTC unless `TZ` is set; compose sets none). The payment's own time is not accepted.
   - `currency`: always `978` (EUR). There is no currency parameter.
3. Returns `PaymentResponse{success: true}` (always `true`; ignored by the gateway).

**Responses:** `200`/`200` success · `200`/`403` bad secret · `500` parse/RPC/DB error · `404` if `store` contains `/`.

```sh
curl "http://<host>:5006/add_payment/$API_SECRET/Rewe%20City/12,34%C2%A0%E2%82%AC"
# 200
```

---

### 5.2 `GET /query/{secret}/{start_date}/{stop_date}`

| | |
|---|---|
| **Goal** | Return the total amount spent between two dates. |
| **Scope** | Read-only aggregate over `Leo.checks`. Returns only a sum — no individual records, count, per-store or currency breakdown. |
| **Ownership** | System of record: **omniscient** (`omniscient/api.py: query`, `db_handler.query_date`). Caller: the planned iOS client's monthly-budget widget (`client.md`); any consumer. |

**Path parameters**

| Name | Type | Format |
|---|---|---|
| `secret` | string | Must equal `API_SECRET`. |
| `start_date` | string | `dd.mm.YYYY` (e.g. `01.10.2026`). Parsed by **omniscient**, not the gateway. |
| `stop_date` | string | `dd.mm.YYYY`. |

**Processing**
1. Gateway → `omniscient.Query(DateQuery{start_date, stop_date})` (strings passed through unvalidated).
2. omniscient parses both with `strptime("%d.%m.%Y")` → naive datetimes at **00:00:00**.
3. Mongo filter: `date >= start 00:00:00 AND date <= stop 00:00:00`.
   - Effective range is **`[start_date, stop_date)`** — payments made *on* `stop_date` are excluded (except any at exactly midnight). To include all of October, send `01.10.2026/01.11.2026`.
   - Day boundaries are in omniscient's container clock (UTC by default), not the owner's local time.
4. Sum = Σ `int(doc.amount * 100)` → `QueryResponse{success: true, amount: <sum>}` (`int32`).
5. Gateway returns `{"total": amount / 100}` (always a JSON float).

**⚠ Unit inconsistency (current behaviour).** `query_date` (and the unused `monthly_report`/`daily_report`) treat a stored `amount` as **euros** and multiply by 100; `/add_payment` stores **cents**. For records written through this API, `total` is therefore expressed in **cents** (100× too large): one `/add_payment/…/12,34` followed by a query yields `{"total": 1234.0}`, not `12.34`. Records stored as euro floats (by other/earlier writers) would be reported correctly. The `# ToDo: dont forget to convert money from float to int and back` at the top of `api.py` refers to this area.

**Limits:** the summed value must fit `int32` (2 147 483 647) or omniscient raises → `500`. With cents-stored records this caps a range at ≈ 214 748 € of actual spending.

**Responses:** `200` `{"total": <float>}` · `200`/`403` bad secret · `500` bad date format, overflow, RPC/DB error.

```sh
curl "http://<host>:5006/query/$API_SECRET/01.10.2026/01.11.2026"
# {"total":1234.0}
```

---

## 6. Endpoints — smartlife (smart-home)

### 6.0 Shared smartlife behaviour

- **State** lives in memory in the smartlife process (`smartlife/src/common.py`) and **resets on restart**:

  | Flag | Meaning | Default after restart |
  |---|---|---|
  | `owner_present` | Owner's iPhone is on the home network | `False` |
  | `service_active` | Automation may act on the real world | `True` |

- **`check()`** (`colo_strip.py`), the automation rule, run after some updates and by a background loop every ~600 s while `service_active` is true:
  - **Turn on** (brightness 25) if `now ≥ sunset − 30 min` **and** strip is off **and** `now < 23:30` **and** `owner_present`.
  - **Turn off** if (`now ≥ 23:30` or `now ≤ 07:00`) and strip is on, **or** if `not owner_present` (regardless of time).
  - Times use the configured `CITY` timezone; sunset via `astral`.
- Every smartlife RPC is **synchronous**: the HTTP request waits until the strip has been queried/updated over the LAN. Strip unreachable → exception → `500`.
- RPCs always return `UpdateResponse{success: true}` (ignored by the gateway).
- No locking between the gRPC worker threads (pool of 3) and the background loop; concurrent calls may interleave strip commands.

### 6.1 `GET /updStatus/{secret}/{new_status}`

| | |
|---|---|
| **Goal** | Tell smartlife whether the owner is at home. |
| **Scope** | Writes `state.owner_present`; then **always** runs `check()` immediately — **even when `service_active` is `false`** (the activity flag only gates `/updActive` and the background loop). |
| **Ownership** | **smartlife** (`smartlife/src/api.py: updStatus`). Caller *(inferred from code comments)*: the owner's iPhone presence automation (joining/leaving home Wi-Fi). |

| Param | Type | Accepted values (FastAPI bool parsing, case-insensitive) |
|---|---|---|
| `new_status` | bool | true: `true`, `1`, `yes`, `on`, `y`, `t` · false: `false`, `0`, `no`, `off`, `n`, `f`; anything else → `422` |

**Effect:** `true` → strip may switch on if it is evening and before 23:30. `false` → strip switches off.

**Responses:** `200`/`200` · `200`/`403` · `422` bad bool · `500` strip/RPC error.

```sh
curl "http://<host>:5006/updStatus/$API_SECRET/true"
```

### 6.2 `GET /updActive/{secret}/{new_active}`

| | |
|---|---|
| **Goal** | Enable or pause the automation. |
| **Scope** | Writes `state.service_active`. If set to `true`, runs `check()` immediately. If `false`, nothing is actuated; the strip stays as it is and the background loop skips its checks. |
| **Ownership** | **smartlife** (`smartlife/src/api.py: updActive`). Caller: owner, manually / planned iOS client. |

| Param | Type | Values |
|---|---|---|
| `new_active` | bool | as §6.1 |

**Responses:** as §6.1.

```sh
curl "http://<host>:5006/updActive/$API_SECRET/false"
```

### 6.3 `GET /updBrightness/{secret}/{new_brightness}`

| | |
|---|---|
| **Goal** | Manually switch the strip on at a brightness, or off. |
| **Scope** | Actuates the Cololight strip directly (`ColoStrip.updBrightness`). Does not touch `owner_present`/`service_active` and stores nothing. |
| **Ownership** | **smartlife**. Caller: owner, manually / planned iOS client's smartlife widget. |

| Param | Type | Rules |
|---|---|---|
| `new_brightness` | int | `0` → **off**; any non-zero → **on at that brightness**. Not range-checked by api or smartlife (negatives are forwarded to the device library). Outside `int32` → `500`; non-integer → `422`. The device's valid range is presumably 1–100 (not enforced). |

**Persistence:** none. The next automated `check()` (≤ ~10 min, if `service_active`) can override it — e.g. switch off at bedtime or when `owner_present` is `false`. It will not turn the strip *on* again if it is already on, so a manual brightness survives in the evening while the owner is present and before 23:30.

**Responses:** `200`/`200` · `200`/`403` · `422` bad int · `500` strip/RPC/range error.

```sh
curl "http://<host>:5006/updBrightness/$API_SECRET/40"   # on, 40
curl "http://<host>:5006/updBrightness/$API_SECRET/0"    # off
```

---

## 7. Internal gRPC contracts

Source: `api/omniscient.proto`, `api/smartlife.proto` (identical to the copies in `omniscient/` and `smartlife/`). Generated stubs: `api/protobufs/*_pb2*.py`. All channels are `grpc.insecure_channel`.

### 7.1 `package omniscient` — `omniscient:5003`

| Service.RPC | Request | Response | Used by |
|---|---|---|---|
| `AddPayment.AddPayment` | `Payment { string store = 1; int32 amount = 2; }` (amount in cents) | `PaymentResponse { bool success = 1; }` | `/add_payment` (response ignored) |
| `Query.Query` | `DateQuery { string start_date = 1; string stop_date = 2; }` (`dd.mm.YYYY`) | `QueryResponse { bool success = 1; int32 amount = 2; }` | `/query` (reads `amount` only) |

### 7.2 `package smartlife` — `smartlife:5002`

| Service.RPC | Request | Response | Used by |
|---|---|---|---|
| `StateUpdate.StatusUpdate` | `StatusRequest { bool status = 1; }` | `UpdateResponse { bool success = 1; }` | `/updStatus` |
| `StateUpdate.ActiveUpdate` | `ActiveRequest { bool active = 1; }` | `UpdateResponse` | `/updActive` |
| `StateUpdate.BrightnessUpdate` | `BrightnessRequest { int32 brightness = 1; }` | `UpdateResponse` | `/updBrightness` |

All `success` fields are hard-coded `true` by the servers and ignored by the gateway.

---

## 8. Ownership & state matrix

| State | Owner | Persistence | Written by | Read by |
|---|---|---|---|---|
| `Leo.checks` documents | omniscient | MongoDB (bind mount `${DATA_DIR}`) | `/add_payment` | `/query` |
| Check id counter (`.state`) | omniscient | file in container working dir (lost on rebuild) | `/add_payment` | — |
| `owner_present` | smartlife | memory (default `False`) | `/updStatus` | `check()` |
| `service_active` | smartlife | memory (default `True`) | `/updActive` | `/updActive`, background loop |
| Strip power/brightness | the device | device | `/updBrightness`, `check()` (via `/updStatus`, `/updActive`, loop) | `check()` internally; **not exposed** |
| `API_SECRET` | api | env var, read at start | — | all protected routes |

---

## 9. Known gaps / divergences

Collected facts from the sections above, plus `ToDo`s in the code. §10.9 maps each gap to its proposed resolution.

**Security**
1. Single shared secret, no scopes: any holder can write payments, read spending and control devices.
2. Secret travels in the URL path over plain HTTP and is written to the access log.
3. State-changing operations are `GET` (prefetchers, link previews or retries can trigger them).
4. `/docs`, `/redoc`, `/openapi.json` are public.
5. Input validation (`422`) happens before authentication.

**Contract / semantics**
6. Auth failures and successes both return HTTP `200`; the outcome is only in the body (`403`/`200`).
7. Downstream `success` flags are ignored; errors surface only as generic `500`s with no error body.
8. `/query` unit mismatch: totals for API-written payments are in cents, labelled as euros (§5.2). Related `ToDo`: "convert money from float to int and back".
9. `/query` `stop_date` is effectively exclusive; day boundaries in container time (UTC).
10. `/add_payment` truncates cents via float math (`0,29` → 28) and only accepts the NBSP-euro suffix.
11. Payment timestamp = time of receipt; currency fixed to EUR (`# ToDo: handle currency`).
12. `/updStatus` actuates the strip even while the service is deactivated.
13. smartlife flags reset on restart; omniscient id counter is not stored with the data.
14. No gRPC deadlines; slow strip ⇒ slow HTTP call.
15. App only works when launched as `python api.py` (stubs defined in `__main__`).

**Missing for the planned iOS client** (`client.md`)
16. No endpoint returns smartlife state (current brightness, on/off, `owner_present`, `service_active`) — the widget's "current brightness" cannot be read today.
17. No endpoint lists payments or returns a breakdown; monthly allowance/trajectory functions exist only as stubs in `omniscient/api.py` (`spending_trajectory`, `configure_monthly_allowance`).
18. No health signal for downstream services (`/health` covers the gateway only).

---

## 10. Proposed implementation — `/v1` (not yet implemented)

> **Status:** proposal, 2026-10-20. Nothing in this section exists in the code yet. Sources: [`backend.md`](backend.md) (B0–B11, the implementation spec) and [`client/design.md`](client/design.md) §4 (the client's view). `client.md` sets the rules: secrets never in URLs, conventional HTTP methods, slim set of endpoints.
> When an item ships, move its description into §1–§8 as the as-is contract and remove it here.

### 10.1 Summary

A versioned set of routes under `/v1` **alongside** the existing ones. The legacy routes (§4–§6) stay unchanged until the Shortcuts automations move to `/v1` (§10.8); then they are removed. Everything in §10 is additive: no existing route, response or gRPC field changes meaning.

```
  iOS app / Shortcuts
        │ HTTPS
        ▼
  Cloudflare edge  api.omniserv.me      ← Access: CF-Access-Client-Id/-Secret (service token)   [B9.4]
        │ Zero Trust tunnel
        ▼
  cloudflared ──HTTP──▶ api:5006        ← Authorization: Bearer <API_SECRET> on /v1/*            [B10]
                          │                no host port published (or 127.0.0.1 only)            [B9.6]
          gRPC, 5 s deadline (both)        │
             ┌────────────┴───────────────┐
             ▼                            ▼
       omniscient:5003               smartlife:5002      ← no host ports                          [B9.6]
             │                            │
       mongodb:27017 (127.0.0.1 only)   Cololight strip (LAN), access serialised by a lock         [B6]
```

### 10.2 Global conventions (`/v1`)

**Transport**
- HTTPS to Cloudflare; TLS ends at the edge. Origin traffic stays plain HTTP, but only inside the tunnel and the `omniserv` docker network once host ports are closed (B9.6).
- `GET /health` stays at the root, unauthenticated, unchanged (§4.1).

**Authentication** (auth "phase 0"; two independent layers)

| Layer | Credential | Covers | Failure |
|---|---|---|---|
| Cloudflare Access (B9.4) | `CF-Access-Client-Id` + `CF-Access-Client-Secret` headers (service token; one per client after §10.8) | path `/v1` at first; whole host after §10.8 | Cloudflare's HTML `403`, request never reaches the origin |
| Gateway middleware (B10) | `Authorization: Bearer <API_SECRET>` | every path `/v1` and `/v1/*` | `401` `{"detail":"unauthorized"}` + `WWW-Authenticate: Bearer` |

- The bearer check is a middleware: it runs **before routing and validation**. Without a valid secret every `/v1` path answers `401`, never `422` and never `404`.
- Constant-time comparison (`hmac.compare_digest`). The gateway refuses to start if `API_SECRET` is unset (today it silently rejects everything, §2.2).
- Still no scopes or roles: a valid secret grants every `/v1` operation.

**Methods**

| Method | Meaning | Idempotent | Success |
|---|---|---|---|
| `GET` | Read. Never changes state. | yes | `200` + JSON |
| `POST` | Create a resource. | **no** | `201` + the created resource |
| `PATCH` | Change some fields of an existing resource. | yes | `204`, no body |
| `DELETE` | Remove a resource. None defined yet. | yes | `204` |

**Inputs**
- Resource ids in the path, filters in the query string, write data in a JSON body (`Content-Type: application/json`). Never secrets.
- Request bodies reject unknown fields (`422`), so a misspelled field is never silently ignored.
- Instants are ISO 8601 with a zone. Clients send UTC with `Z` (a literal `+` in a query string decodes to a space).

**Outputs**
- JSON, snake_case keys. Money as integer cents (`amount_cents`, `total_cents`), never floats. Instants as UTC, seconds precision, literal `Z` (`2026-10-18T21:30:00Z`).
- `Cache-Control: no-store` on every `/v1` response.

**Errors.** Always `Content-Type: application/json`, body `{"detail": <string | FastAPI's list form for schema errors>}`, never a stack trace:

| Status | When | Example `detail` |
|---|---|---|
| `401` | Missing or wrong bearer | `"unauthorized"` |
| `404` | Unknown route or resource id | `"unknown device"` |
| `422` | Invalid input (schema, range, unknown field, empty patch) | list form, or `"at is in the future"` |
| `502` | Downstream service unavailable, or the strip unreachable on a write (gRPC `UNAVAILABLE`) | `"smartlife unavailable"`, `"strip unreachable"` |
| `504` | Downstream call exceeded the 5 s deadline (gRPC `DEADLINE_EXCEEDED`) | `"timeout"` |
| `500` | Anything else | `"internal error"` |

**Logging and docs**
- The secret is a header, which uvicorn's access log doesn't record, so `/v1` requests no longer leak it (§2.4).
- `/docs`, `/redoc`, `/openapi.json` are disabled (§2.5).

### 10.3 Endpoint summary

| # | Route | Goal | Owner (system of record) | Scope | Replaces |
|---|---|---|---|---|---|
| P1 | `GET /v1/payments?from&to&limit` | Payments and their total in a time range | **omniscient** | **Read**: `Leo.checks` | `/query` |
| P2 | `POST /v1/payments` | Record one payment | **omniscient** | **Write**: inserts one document | `/add_payment` |
| P3 | `GET /v1/devices` | Current device state | **smartlife** (proxy for the device) | **Read**: one bounded strip query; no actuation | — (gap 16) |
| P4 | `PATCH /v1/devices/{id}` | Set brightness / on / off | **smartlife** | **Actuates** the device; stores nothing | `/updBrightness` |
| P5 | `GET /v1/automation` | Automation flags | **smartlife** | **Read**: in-memory, no device access | — (gap 16) |
| P6 | `PATCH /v1/automation` | Pause/resume automation; report presence | **smartlife** | **Write**: `service_active`, `owner_present`; may actuate via `check()` | `/updActive`, `/updStatus` |

Callers: the iOS client (P1–P6, except `owner_present` on P6); the payment Shortcut (P2) and presence Shortcut (P6 with `owner_present`) after §10.8.

---

### 10.4 Endpoints — omniscient (payments)

#### P1 `GET /v1/payments`

| | |
|---|---|
| **Goal** | Return the payments and their total in a time range. With rows, clients build daily/monthly charts in their own calendar; with `limit=0`, it is a plain total (successor of `/query`). |
| **Scope** | Read-only, `Leo.checks`. No pagination; hard cap of 5 000 rows. |
| **Ownership** | **omniscient** (`ListPayments` rpc, `db_handler.list_checks`). The gateway validates and proxies. Spec: backend.md B2. |

| Query param | Type | Rules |
|---|---|---|
| `from` | instant | Required. Inclusive. Must carry a zone. |
| `to` | instant | Required. **Exclusive** (half-open `[from, to)`). `to ≤ from` → `422`. Range > 400 days → `422`. |
| `limit` | int | Optional, `0…5000`, default `5000`. `0` → no rows, totals only. |

**Response `200`**
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
- Rows newest first, at most `limit`. `total_cents` and `count` always cover the **whole** range. `truncated` = `count > len(payments)`.
- `id`: Mongo `_id` as 24-char hex, stable across deploys (B3). `store`: stored `description`. `currency`: `978` mapped to `"EUR"`.
- Correct totals require all stored amounts to be cents (B0/§5, fixes gap 8).

**Responses:** `200` · `401` · `422` bad/missing range or limit · `502`/`504` omniscient down/slow.

```sh
H=(-H "Authorization: Bearer $API_SECRET" -H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET")
curl "${H[@]}" "https://api.omniserv.me/v1/payments?from=2026-09-30T22:00:00Z&to=2026-10-31T23:00:00Z&limit=0"
# {"payments":[],"total_cents":37230,"count":41,"truncated":true}
```

#### P2 `POST /v1/payments`

| | |
|---|---|
| **Goal** | Record one payment at a given time. |
| **Scope** | Write, one document in `Leo.checks`. **Not idempotent**: a repeated request creates a second payment. No update/delete. |
| **Ownership** | **omniscient** (`AddPayment` rpc). Validation entirely in the gateway. Spec: backend.md B1. |

**Body**

| Field | Type | Rules |
|---|---|---|
| `store` | string | Trimmed, 1…64 characters. Any character, including `/` (it's JSON, not a path segment). |
| `amount_cents` | int | `1…10000000`. No decimal parsing (fixes gap 10). |
| `at` | instant | Optional. Must carry a zone; ≤ now + 24 h. Absent → server time. Stored as UTC (fixes gap 11, except currency). |

**Response `201`:** the stored payment in P1's row shape. No `Location` header (there is no single-payment route).

**Responses:** `201` · `401` · `422` invalid body · `502`/`504`. After a `5xx` or a timeout the payment **may** have been stored; clients must not retry blindly.

```sh
curl "${H[@]}" -X POST -H "Content-Type: application/json" \
  -d '{"store": "Rewe City", "amount_cents": 1234, "at": "2026-10-18T21:30:00Z"}' \
  https://api.omniserv.me/v1/payments
# 201 {"id":"…","store":"Rewe City","amount_cents":1234,"date":"2026-10-18T21:30:00Z","currency":"EUR"}
```

---

### 10.5 Endpoints — smartlife (smart-home)

**Changes to shared smartlife behaviour (§6.0)** that come with these routes (backend.md B4, B6, B7):
- `owner_present` starts as **unknown** (`null`) after a restart instead of `False`; `check()` takes no presence-based action while it is unknown. `service_active` still resets to `true`.
- Presence reports run `check()` **only while `service_active`** (fixes gap 12, for `/updStatus` too).
- Strip access is serialised by a lock across gRPC threads and the background loop.
- An unreachable strip no longer stops smartlife from starting, and no longer kills the background loop. Services get `restart: unless-stopped`.
- Device errors on writes become gRPC `UNAVAILABLE` → HTTP `502` `"strip unreachable"` instead of `500`.

#### P3 `GET /v1/devices`

| | |
|---|---|
| **Goal** | Report each device's reachability, power and brightness. |
| **Scope** | Read-only. One `state()` query per device, ~2 s socket timeout, lock wait ≤ 2.5 s. Never runs `check()` or actuates. |
| **Ownership** | **smartlife** (`GetDevices` rpc, `ColoStrip.snapshot()`). Spec: backend.md B4. |

**Response `200`**
```json
{ "devices": [ { "id": 0, "kind": "cololight_strip", "name": "Strip",
                 "reachable": true, "on": true, "brightness": 40 } ] }
```
- `name` from env `STRIP_NAME` (default `"Strip"`).
- `brightness`: `0…100` when reachable; `null` when unreachable; last read value or `null` when off.
- **Unreachable is not an error:** `200` with `reachable: false, on: false, brightness: null`. `5xx` means smartlife itself is down.

**Responses:** `200` · `401` · `502`/`504` smartlife down/slow.

#### P4 `PATCH /v1/devices/{id}`

| | |
|---|---|
| **Goal** | Set a device's brightness; `0` switches it off. |
| **Scope** | Actuates the device; stores nothing. Idempotent. The next automated `check()` may still override it (as §6.3). |
| **Ownership** | **smartlife** (`BrightnessUpdate` rpc with the new `device_id`). Spec: backend.md B5. |

| | Name | Rules |
|---|---|---|
| path | `id` | int, a device id from P3. Unknown → `404`. |
| body | `brightness` | Required int, `0…100` → otherwise `422`. Only writable field; any other field → `422`. |

**Responses:** `204` · `401` · `404` unknown device · `422` · `502` strip unreachable or smartlife down · `504`.

```sh
curl "${H[@]}" -X PATCH -H "Content-Type: application/json" -d '{"brightness": 40}' https://api.omniserv.me/v1/devices/0   # 204, on at 40
curl "${H[@]}" -X PATCH -H "Content-Type: application/json" -d '{"brightness": 0}'  https://api.omniserv.me/v1/devices/0   # 204, off
```

#### P5 `GET /v1/automation`

| | |
|---|---|
| **Goal** | Report the automation flags. |
| **Scope** | Read-only, in-memory. No device access, so it answers instantly even with the strip unreachable. |
| **Ownership** | **smartlife** (`GetAutomation` rpc). Spec: backend.md B4. |

**Response `200`:** `{"active": true, "owner_present": true}`. `owner_present` is `null` until the first presence report after a smartlife restart.

**Responses:** `200` · `401` · `502`/`504`.

#### P6 `PATCH /v1/automation`

| | |
|---|---|
| **Goal** | Pause or resume the automation (iOS client); report the owner's presence (presence Shortcut). |
| **Scope** | Writes `service_active` and/or `owner_present`, then runs `check()` **once** if `service_active` is true afterwards. |
| **Ownership** | **smartlife** (`UpdateAutomation` rpc). Spec: backend.md B4. |

| Body field | Type | Rules |
|---|---|---|
| `active` | bool | Optional. Strict JSON boolean. |
| `owner_present` | bool | Optional. Strict JSON boolean. The iOS client never sends it. |

At least one field; `{}`, `null` values or unknown fields → `422`.

**Responses:** `204` · `401` · `422` · `502` (strip unreachable during `check()`; **the flags are still set**) · `504`.

```sh
curl "${H[@]}" -X PATCH -H "Content-Type: application/json" -d '{"active": false}'       https://api.omniserv.me/v1/automation   # pause
curl "${H[@]}" -X PATCH -H "Content-Type: application/json" -d '{"owner_present": true}' https://api.omniserv.me/v1/automation   # presence
```

---

### 10.6 gRPC additions

All additive; legacy callers keep working without regenerating anything they don't use. The proto copies listed in §7 must stay identical.

**`package omniscient`**

| Change | Definition | Used by |
|---|---|---|
| `Payment` gains a field | `string timestamp = 3;` (ISO 8601 UTC; empty = now) | P2 |
| `PaymentResponse` gains a field | `PaymentItem payment = 2;` (the stored document) | P2 |
| new messages | `TimeRange { string start = 1; string stop = 2; int32 limit = 3; }` · `PaymentItem { string id = 1; string store = 2; int64 amount_cents = 3; string date = 4; string currency = 5; }` · `PaymentList { repeated PaymentItem payments = 1; int64 total_cents = 2; int64 count = 3; }` | P1, P2 |
| new rpc | `Query.ListPayments (TimeRange) returns (PaymentList)` | P1 |

**`package smartlife`**

| Change | Definition | Used by |
|---|---|---|
| `BrightnessRequest` gains a field | `int32 device_id = 2;` (`0` = the strip, which is what legacy callers send implicitly) | P4 |
| new messages | `Empty {}` · `DeviceState { int32 id = 1; string kind = 2; string name = 3; bool reachable = 4; bool on = 5; optional int32 brightness = 6; }` · `DeviceList { repeated DeviceState devices = 1; }` · `AutomationState { bool active = 1; optional bool owner_present = 2; }` · `AutomationPatch { optional bool active = 1; optional bool owner_present = 2; }` | P3, P5, P6 |
| new rpcs | `StateUpdate.GetDevices (Empty) returns (DeviceList)` · `StateUpdate.GetAutomation (Empty) returns (AutomationState)` · `StateUpdate.UpdateAutomation (AutomationPatch) returns (UpdateResponse)` | P3, P5, P6 |

Every gateway stub call gets `timeout=5`. Status mapping: `DEADLINE_EXCEEDED` → `504`, `UNAVAILABLE` → `502`, `NOT_FOUND` → `404`, `INVALID_ARGUMENT` → `422`, other → `500` (B7).

---

### 10.7 Ownership & state matrix (proposed)

| State | Owner | Persistence | Written by | Read by |
|---|---|---|---|---|
| `Leo.checks` documents | omniscient | MongoDB; `date` indexed | P2 (legacy: `/add_payment`) | P1 (legacy: `/query`) |
| Payment id | omniscient | Mongo `_id` (the `.state` counter is retired, B3) | P2 | P1 |
| `owner_present` | smartlife | memory (default **unknown**) | P6 (legacy: `/updStatus`) | P5, `check()` |
| `service_active` | smartlife | memory (default `true`) | P6 (legacy: `/updActive`) | P5, `check()`, background loop |
| Strip power/brightness | the device | device | P4, `check()` (legacy: `/updBrightness`) | P3 (**now exposed**), `check()` |
| `API_SECRET` | api | env var; startup fails if unset | — | `/v1` middleware, legacy routes |
| Access service tokens | Cloudflare | Zero Trust config; expiring | — | Cloudflare edge |

---

### 10.8 Legacy routes and migration (B11)

Until migration, §4–§6 apply unchanged to `/add_payment`, `/query`, `/updStatus`, `/updActive`, `/updBrightness`, except for the shared smartlife fixes in §10.5 (presence only acts while active; `owner_present` unknown after restart; `502` for an unreachable strip). The legacy routes keep the secret-in-path problem (gap 2), so migration is the security step:

1. Payment Shortcut → P2, with `amount_cents` computed in the Shortcut and its own Access service token.
2. Presence Shortcut → P6 with `{"owner_present": …}`, same token.
3. One week with no legacy calls in the access log.
4. Remove the legacy routes, the NBSP-euro parsing and the unused legacy rpcs (`Query.Query`, `StatusUpdate`, `ActiveUpdate`).
5. Widen the Access application from `/v1` to the whole hostname.
6. Rotate `API_SECRET`: the old value has been in access and Cloudflare logs.

---

### 10.9 Resolution of known gaps (§9)

| Gap | Resolution | Item |
|---|---|---|
| 1 Single secret, no scopes | Partly: two layers (Access + bearer); separate Access tokens per client after §10.8. Scopes still not planned. | B9.4, B10, B11 |
| 2 Secret in URL, plain HTTP, logged | Header auth on `/v1`; HTTPS to the edge, origin unreachable from outside the tunnel. Legacy routes until §10.8. | B10, B9.6, B11 |
| 3 State changes via `GET` | `POST` / `PATCH` on `/v1`. | B1, B4, B5 |
| 4 Public `/docs` | Disabled. | B10 |
| 5 Validation before auth | Middleware checks auth before routing. | B10 |
| 6 Auth failure is HTTP `200` | `401` JSON on `/v1`; optional for legacy routes. | B10 (B0/§1) |
| 7 Generic `500`s | `502` / `504` / `404` / `422` with a JSON `detail`. | B7, B8 |
| 8 `/query` unit mismatch | Stored amounts normalised to cents; `/v1` returns integer cents. | B0/§5 |
| 9 `/query` day boundaries | `/v1` takes instants, half-open; no server time zone involved. `/query` itself: optional B0/§6. | B2 |
| 10 Float truncation, NBSP only | `amount_cents` integer; nothing to parse. | B1 |
| 11 Receipt time, EUR only | `at` field. Currency stays EUR-only. | B1 |
| 12 Presence actuates while paused | Fixed for legacy and `/v1`. | B4 |
| 13 Flags reset, id counter | `owner_present` unknown after restart (`service_active` still resets); ids are Mongo `_id`. | B3, B4 |
| 14 No gRPC deadlines | 5 s on every call. | B7 |
| 15 Only runs as `python api.py` | Not addressed. | — |
| 16 No smartlife state | P3, P5. | B4 |
| 17 No payment list | P1. Allowance/trajectory not needed: planning runs in the client. | B2 |
| 18 No downstream health | Not planned; per-request `502` / `504` with `detail` instead. | — |

---

## Appendix — Deployment facts

- Image: `api/Dockerfile` (`FROM python`, `CMD ["python", "api.py"]`, `EXPOSE 5006`); dependencies pinned in `api/requirements.txt` (FastAPI 0.128.0, uvicorn 0.40.0, grpcio 1.76.0, protobuf 6.33.4).
- Compose (`docker-compose.yaml`): env `API_SECRET`; depends on `omniscient` and `smartlife` (`service_started`); healthcheck `/health` every 5 s; external network `omniserv`.
- CI/CD: `.github/workflows/main.yml` deploys on push to `main` via self-hosted runner (`docker compose up -d --build --wait`), injecting `API_SECRET` from GitHub secrets.
