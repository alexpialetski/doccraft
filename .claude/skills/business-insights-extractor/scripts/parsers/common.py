from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol


@dataclass
class Message:
    text: str
    date: str | None = None
    id: str | None = None
    hash: str = field(init=False)

    def __post_init__(self) -> None:
        self.hash = hashlib.sha1(self.text.encode("utf-8")).hexdigest()[:16]


class Parser(Protocol):
    format_name: str

    def parse(self, path: Path) -> list[Message]: ...
