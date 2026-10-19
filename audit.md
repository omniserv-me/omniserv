# API audit — key findings

Findings from documenting `/api` (see [API-CONTRACT.md](API-CONTRACT.md) for the full contract). Audited at `5f61ea0`, 2026-10-19. Items marked **verified** were reproduced against the real `api/api.py` with `fastapi.testclient` and mocked gRPC stubs; the rest are read from code.

## 1. Auth failures return HTTP 200 — verified
`api/api.py:29-30` (and every protected route) does `return HTTPStatus(403)`. FastAPI serializes the enum into the body, so a wrong secret yields **status `200`, body `403`**; success is status `200`, body `200`. Clients must read the body to tell them apart.

## 2. Validation runs before auth — verified
Path params are typed (`new_status: bool`, `new_brightness: int`), so FastAPI rejects malformed values with `422` before the handler's secret check. `/updStatus/wrong/maybe` → `422`, not `403`.

## 3. The secret is written to the access log — verified
The secret is a path segment, and `log_filter` (`api/api.py:17-18`) only suppresses `/` and `/health`. Every other request is logged with its full path, secret included. It also travels over plain HTTP (no TLS, `api/api.py:87`).

## 4. `/docs`, `/redoc`, `/openapi.json` are public — verified
`FastAPI()` (`api/api.py:13`) keeps the default docs routes, unauthenticated, listing every endpoint.

## 5. `/query` totals are 100× too large for API-added payments
- `/add_payment` stores **cents**: `int(float(amount) * 100)` (`api/api.py:34`) → `Check.amount` (`omniscient/api.py:31`).
- `query_date` multiplies each stored amount by 100 again (`omniscient/db_handler.py:91`), treating it as euros.
- The gateway divides by 100 once (`api/api.py:52`).

One €12.34 payment therefore comes back as `{"total": 1234.0}`. Records stored as euro floats by earlier writers would be summed correctly, so the collection may hold mixed units.

## 6. `/query` excludes the stop date
Both dates are parsed as midnight (`omniscient/api.py:46-47`) and the filter is `date <= stop 00:00:00` (`omniscient/db_handler.py:83-88`). Payments made on `stop_date` are not counted; the effective range is `[start, stop)`. Day boundaries use the omniscient container clock (UTC by default), not local time.

## 7. `/add_payment` amount parsing is fragile — verified
| Input | Result |
|---|---|
| `0,29` | stored as **28** cents (float truncation) |
| `0,57` | stored as **56** cents |
| `12,34 €` with a regular space | `500` |
| `1.234,56` (thousands separator) | `500` |
| ≥ €21,474,836.48 | `500` (int32 overflow) |

Only the `"\xa0€"` suffix (non-breaking space + euro) is stripped (`api/api.py:33`).

## 8. `/updStatus` switches the strip even when automation is off
`updStatus` (`smartlife/src/api.py:31-35`) calls `cololight_strip.check()` unconditionally. `service_active` is only honoured by `/updActive` and the background loop, so pausing automation does not stop presence updates from actuating the strip.

## 9. The iOS client can't show strip state yet
`client.md` wants the smartlife widget to show current brightness, but no endpoint returns strip state, `owner_present` or `service_active`. There is also no endpoint listing individual payments or a breakdown — `/query` returns only a sum.

## 10. Ownership: one secret unlocks every domain
| Endpoint | Owner |
|---|---|
| `/`, `/health` | api (gateway) |
| `/add_payment`, `/query` | omniscient |
| `/updStatus`, `/updActive`, `/updBrightness` | smartlife |

A single `API_SECRET` grants all of them; there are no per-endpoint scopes or roles.

## Inferred callers (unconfirmed)
- `/add_payment` — an iOS Wallet / Shortcuts transaction automation, inferred from the `"\xa0€"` amount format.
- `/updStatus` — an iPhone home Wi-Fi presence automation, inferred from the comment in `smartlife/src/api.py:25-26`.
