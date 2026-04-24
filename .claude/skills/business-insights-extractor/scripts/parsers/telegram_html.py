from __future__ import annotations

import html
import html.parser
import re
from pathlib import Path

from .common import Message


class _TelegramExportParser(html.parser.HTMLParser):
    """Parse the `.text` div inside each `.message.default` in a Telegram HTML export.

    The export structure is flat: each post is a `<div class="message default ...">`
    with a child `<div class="text">` holding the message body. Nested divs inside
    text are rare but handled via depth tracking.
    """

    def __init__(self) -> None:
        super().__init__()
        self._in_text = False
        self._depth = 0
        self._buffer: list[str] = []
        self._current_date: str | None = None
        self._current_id: str | None = None
        self._pending_id: str | None = None
        self._pending_date: str | None = None
        self.messages: list[Message] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = {k: (v or "") for k, v in attrs}
        classes = set(a.get("class", "").split())

        if tag == "div" and "message" in classes and "default" in classes:
            self._pending_id = a.get("id")

        if tag == "div" and "text" in classes and not self._in_text:
            self._in_text = True
            self._depth = 1
            self._buffer = []
            self._current_id = self._pending_id
            self._current_date = self._pending_date
            return

        if self._in_text:
            if tag == "div":
                self._depth += 1
            elif tag == "br":
                self._buffer.append(" ")

    def handle_endtag(self, tag: str) -> None:
        if not self._in_text or tag != "div":
            return
        self._depth -= 1
        if self._depth == 0:
            text = _normalize(" ".join(self._buffer))
            if text:
                self.messages.append(
                    Message(text=text, date=self._current_date, id=self._current_id)
                )
            self._in_text = False
            self._buffer = []

    def handle_data(self, data: str) -> None:
        if self._in_text:
            self._buffer.append(data)

    def handle_entityref(self, name: str) -> None:
        if self._in_text:
            self._buffer.append(html.unescape(f"&{name};"))

    def handle_charref(self, name: str) -> None:
        if self._in_text:
            self._buffer.append(html.unescape(f"&#{name};"))


_WS = re.compile(r"\s+")


def _normalize(s: str) -> str:
    return _WS.sub(" ", s).strip()


class TelegramHtmlParser:
    format_name = "telegram-html"

    def parse(self, path: Path, min_chars: int = 80) -> list[Message]:
        parser = _TelegramExportParser()
        parser.feed(path.read_text(encoding="utf-8"))
        return [m for m in parser.messages if len(m.text) >= min_chars]
