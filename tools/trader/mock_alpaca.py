#!/usr/bin/env python3
"""
Faithful local stand-in for the Alpaca endpoints alpaca_mirror.py actually calls.

Why this exists: the executor moves the owner's own money, and until now it had
never been run — not once, not even a syntax check, because the session sandbox
refuses to execute order-placing code. This mock closes that gap. It speaks the
same JSON shapes on 127.0.0.1, so `test_mirror.py` can drive the real executor
end to end (plan maths, guards, MOC/fractional split, idempotency, kill lines)
without an account, without a key, and without a single order leaving the box.

It is a TEST DOUBLE. It is never imported by the executor, never shipped, and
never reachable from the workflow — `agi-trader.yml` passes no ALPACA_BASE_URL,
so the executor talks to Alpaca. Run standalone:

    python3 tools/trader/mock_alpaca.py --port 8899 --state /tmp/mock.json

Endpoints implemented (exactly the set the executor uses):
    GET    /v2/clock
    GET    /v2/account
    GET    /v2/positions
    GET    /v2/orders?status=&after=&limit=
    POST   /v2/orders
    DELETE /v2/positions/{symbol}
    DELETE /v2/positions?cancel_orders=true
    GET    /v2/stocks/trades/latest?symbols=&feed=iex     (data host, same port)

Behaviours copied from the real API because the executor depends on them:
  * `time_in_force: cls` is REJECTED (HTTP 422) between 15:50 and 19:00 ET, and
    rejected outright for notional/fractional orders — that pair of rules is the
    whole reason the executor splits whole shares from the remainder.
  * orders come back with a `status`, and the executor's idempotency check reads
    exactly that field.
  * DELETE /v2/positions/{symbol} liquidates fractional quantity too.
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

STATE = {}


def load_state(path: str) -> dict:
    with open(path, encoding="utf-8") as f:
        s = json.load(f)
    s.setdefault("orders", [])
    s.setdefault("positions", [])
    s.setdefault("prices", {})
    s.setdefault("equity", 1000.0)
    s.setdefault("last_equity", 1000.0)
    s.setdefault("is_open", True)
    s.setdefault("minutes_to_close", 40.0)
    s.setdefault("reject_cls", False)   # simulate the 15:50–19:00 ET window
    s.setdefault("fail_sells", False)   # simulate a broker-side sell rejection
    s.setdefault("untradable", [])      # halted / delisted symbols
    return s


def save_state(path: str, s: dict) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(s, f, indent=1)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):  # keep the test output clean
        pass

    # ---------------------------------------------------------------- helpers
    def _send(self, code: int, payload):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _state(self) -> dict:
        return load_state(self.server.state_path)

    def _put(self, s: dict) -> None:
        save_state(self.server.state_path, s)

    # -------------------------------------------------------------------- GET
    def do_GET(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        s = self._state()

        if u.path == "/v2/clock":
            nc = datetime.now(timezone.utc) + timedelta(minutes=float(s["minutes_to_close"]))
            return self._send(200, {
                "is_open": bool(s["is_open"]),
                "next_close": nc.isoformat().replace("+00:00", "Z"),
                "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            })

        if u.path == "/v2/account":
            return self._send(200, {
                "equity": f"{s['equity']:.2f}",
                "last_equity": f"{s['last_equity']:.2f}",
                "cash": f"{s['equity']:.2f}",
                "status": "ACTIVE",
            })

        if u.path == "/v2/positions":
            return self._send(200, s["positions"])

        if u.path == "/v2/orders":
            after = (q.get("after") or [""])[0][:10]
            out = [o for o in s["orders"] if not after or o["submitted_at"][:10] >= after]
            return self._send(200, out[: int((q.get("limit") or ["200"])[0])])

        if u.path == "/v2/stocks/trades/latest":
            syms = [x for x in (q.get("symbols") or [""])[0].split(",") if x]
            trades = {sym: {"p": s["prices"][sym]} for sym in syms if sym in s["prices"]}
            return self._send(200, {"trades": trades})

        return self._send(404, {"message": "not found"})

    # ------------------------------------------------------------------- POST
    def do_POST(self):
        u = urlparse(self.path)
        if u.path != "/v2/orders":
            return self._send(404, {"message": "not found"})
        n = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(n) or b"{}")
        s = self._state()

        sym = body.get("symbol", "")
        tif = body.get("time_in_force")
        notional = body.get("notional")
        side = body.get("side")

        if sym in s["untradable"]:
            return self._send(422, {"message": f"{sym} is not tradable"})
        # real API: cls is unavailable to notional/fractional orders
        if tif == "cls" and notional is not None:
            return self._send(422, {"message": "notional orders only support time_in_force day"})
        # real API: cls rejected inside the late window
        if tif == "cls" and s["reject_cls"]:
            return self._send(422, {"message": "cls orders are not accepted at this time"})
        if side == "sell" and s["fail_sells"]:
            return self._send(422, {"message": "insufficient qty available for order"})

        px = s["prices"].get(sym, 0.0)
        qty = float(body["qty"]) if body.get("qty") else (float(notional) / px if px else 0.0)
        delta = qty * px * (1 if side == "buy" else -1)

        pos = {p["symbol"]: p for p in s["positions"]}
        cur = float(pos.get(sym, {}).get("market_value", 0.0))
        newv = cur + delta
        if abs(newv) < 0.01:
            s["positions"] = [p for p in s["positions"] if p["symbol"] != sym]
        elif sym in pos:
            pos[sym]["market_value"] = f"{newv:.2f}"
            pos[sym]["qty"] = f"{newv / px:.6f}" if px else "0"
        else:
            s["positions"].append({"symbol": sym, "market_value": f"{newv:.2f}",
                                   "qty": f"{newv / px:.6f}" if px else "0",
                                   "asset_class": "us_equity"})
        s["orders"].append({
            "id": f"mock-{len(s['orders']) + 1}", "symbol": sym, "side": side,
            "qty": body.get("qty"), "notional": notional, "type": body.get("type"),
            "time_in_force": tif, "status": "accepted",
            "submitted_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        })
        self._put(s)
        return self._send(200, s["orders"][-1])

    # ----------------------------------------------------------------- DELETE
    def do_DELETE(self):
        u = urlparse(self.path)
        s = self._state()
        if u.path == "/v2/positions":
            s["positions"] = []
            s["orders"].append({"id": f"mock-liq-{len(s['orders']) + 1}", "symbol": "*",
                                "side": "sell", "status": "accepted", "type": "liquidate_all",
                                "submitted_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")})
            self._put(s)
            return self._send(207, [])
        if u.path.startswith("/v2/positions/"):
            sym = u.path.rsplit("/", 1)[-1]
            s["positions"] = [p for p in s["positions"] if p["symbol"] != sym]
            s["orders"].append({"id": f"mock-close-{len(s['orders']) + 1}", "symbol": sym,
                                "side": "sell", "status": "accepted", "type": "close_position",
                                "submitted_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")})
            self._put(s)
            return self._send(200, s["orders"][-1])
        return self._send(404, {"message": "not found"})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8899)
    ap.add_argument("--state", required=True)
    a = ap.parse_args()
    if not os.path.exists(a.state):
        save_state(a.state, {})   # load_state() fills every default on read
    srv = ThreadingHTTPServer(("127.0.0.1", a.port), Handler)
    srv.state_path = a.state
    print(f"mock alpaca on 127.0.0.1:{a.port} state={a.state}", flush=True)
    srv.serve_forever()


if __name__ == "__main__":
    main()
