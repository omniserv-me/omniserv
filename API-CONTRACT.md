# API Contract — `omniserv/api`

> **Status:** as-is description of the current implementation (`api/api.py`, last changed in `6fed1bf`, documented at `5f61ea0`, 2026-10-19).
> This document describes what the code *does*, including its quirks. It does not propose changes; deviations from intent are collected in [§9 Known gaps](#9-known-gaps--divergences).

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

Collected facts from the sections above, plus `ToDo`s in the code. Listed for awareness only.

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

## Appendix — Deployment facts

- Image: `api/Dockerfile` (`FROM python`, `CMD ["python", "api.py"]`, `EXPOSE 5006`); dependencies pinned in `api/requirements.txt` (FastAPI 0.128.0, uvicorn 0.40.0, grpcio 1.76.0, protobuf 6.33.4).
- Compose (`docker-compose.yaml`): env `API_SECRET`; depends on `omniscient` and `smartlife` (`service_started`); healthcheck `/health` every 5 s; external network `omniserv`.
- CI/CD: `.github/workflows/main.yml` deploys on push to `main` via self-hosted runner (`docker compose up -d --build --wait`), injecting `API_SECRET` from GitHub secrets.
