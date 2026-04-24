from .common import Message, Parser
from .telegram_html import TelegramHtmlParser

__all__ = ["Message", "Parser", "TelegramHtmlParser", "get_parser"]


def get_parser(format_name: str) -> Parser:
    if format_name == "telegram-html":
        return TelegramHtmlParser()
    raise ValueError(f"Unknown format: {format_name}")
