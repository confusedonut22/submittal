from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class BackendConfig:
    host: str = "127.0.0.1"
    port: int = 8787
    storage_path: Path = Path("/Users/gerryturnbow/degen-blackjack/mock_rgs_state.json")
    seed: int = 1337


def load_backend_config(env: dict[str, str] | None = None) -> BackendConfig:
    source = env or os.environ
    host = source.get("MOCK_RGS_HOST", "127.0.0.1").strip() or "127.0.0.1"
    port = int(source.get("MOCK_RGS_PORT", "8787"))
    storage = Path(
        source.get(
            "MOCK_RGS_STORAGE",
            "/Users/gerryturnbow/degen-blackjack/mock_rgs_state.json",
        )
    )
    seed = int(source.get("MOCK_RGS_SEED", "1337"))
    return BackendConfig(host=host, port=port, storage_path=storage, seed=seed)
