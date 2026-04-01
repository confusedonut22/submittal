from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, cast

from authoritative_blackjack import MockBlackjackService
from backend_config import BackendConfig, load_backend_config


def read_json(handler: BaseHTTPRequestHandler) -> Dict[str, Any]:
    length = int(handler.headers.get("content-length", "0"))
    raw = handler.rfile.read(length) if length else b"{}"
    return json.loads(raw.decode("utf-8") or "{}")


def write_json(handler: BaseHTTPRequestHandler, status: int, payload: Dict[str, Any]) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class MockRGSHandler(BaseHTTPRequestHandler):
    @property
    def service(self) -> MockBlackjackService:
        return cast(MockBlackjackService, self.server.service)

    def do_OPTIONS(self) -> None:
        write_json(self, 200, {"ok": True})

    def do_GET(self) -> None:
        if self.path == "/health":
            return write_json(self, 200, {
                "ok": True,
                "service": "mock-rgs",
                "storagePath": str(self.server.config.storage_path),
            })

        # Official Stake Bet Replay endpoint:
        # GET /bet/replay/{game}/{version}/{mode}/{event}
        parts = self.path.lstrip("/").split("/")
        if len(parts) == 6 and parts[0] == "bet" and parts[1] == "replay":
            # parts: ["bet", "replay", game, version, mode, event]
            # /bet/replay/{game}/{version}/{mode}/{event}
            event_id = parts[5]
            try:
                result = self.service.replay_by_event_id(event_id)
                return write_json(self, 200, result)
            except ValueError as exc:
                return write_json(self, 404, {"error": str(exc)})
            except Exception as exc:  # pragma: no cover
                return write_json(self, 500, {"error": str(exc)})

        return write_json(self, 404, {"error": "Not Found"})

    def do_POST(self) -> None:
        try:
            payload = read_json(self)
            session_id = str(payload.get("sessionID", "")).strip()
            if not session_id:
                raise ValueError("Missing sessionID")

            if self.path == "/wallet/authenticate":
                return write_json(self, 200, self.service.authenticate(session_id))
            if self.path == "/wallet/balance":
                return write_json(self, 200, self.service.balance(session_id))
            if self.path == "/wallet/play":
                return write_json(
                    self,
                    200,
                    self.service.play(
                        session_id=session_id,
                        amount=int(payload.get("amount", 0)),
                        mode=str(payload.get("mode", "BASE")),
                        hand_configs=payload.get("handConfigs", []),
                    ),
                )
            if self.path == "/bet/event":
                return write_json(self, 200, self.service.event(session_id, str(payload.get("event", ""))))
            if self.path == "/wallet/end-round":
                return write_json(self, 200, self.service.end_round(session_id))
            if self.path == "/replay/event":
                return write_json(self, 200, self.service.replay(session_id, str(payload.get("event", ""))))
            return write_json(self, 404, {"error": "Not Found"})
        except ValueError as exc:
            return write_json(self, 400, {"error": str(exc)})
        except Exception as exc:  # pragma: no cover - defensive local scaffolding
            return write_json(self, 500, {"error": str(exc)})

    def log_message(self, format: str, *args: Any) -> None:
        return


def run_server(
    host: str = "127.0.0.1",
    port: int = 8787,
    *,
    service: MockBlackjackService | None = None,
    storage_path: str | None = None,
    config: BackendConfig | None = None,
) -> ThreadingHTTPServer:
    if config is None:
        defaults = load_backend_config()
        resolved_config = BackendConfig(
            host=host,
            port=port,
            storage_path=defaults.storage_path if storage_path is None else Path(storage_path),
            seed=defaults.seed,
        )
    else:
        resolved_config = config
    effective_storage = storage_path or str(resolved_config.storage_path)
    server = ThreadingHTTPServer((resolved_config.host, resolved_config.port), MockRGSHandler)
    server.config = resolved_config
    server.service = service or MockBlackjackService(
        seed=resolved_config.seed,
        storage_path=effective_storage,
    )
    return server


if __name__ == "__main__":
    config = load_backend_config()
    server = run_server(config=config)
    print(f"Mock RGS listening on http://{config.host}:{config.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
