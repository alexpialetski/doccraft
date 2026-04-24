#!/usr/bin/env python3
"""Re-run only the reduce pass using the raw rules saved from the last extract run.

Useful when the reduce pass produces bad output and you want to iterate on
the prompt without burning tokens on the map pass again. Reads
state/_last-run-raw-rules.txt and writes the merged wisdom file.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from extract import (  # noqa: E402
    DEFAULT_MODEL,
    DEFAULT_WISDOM_PATH,
    RAW_RULES_PATH,
    reduce_pass,
)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--wisdom-path", type=Path, default=DEFAULT_WISDOM_PATH)
    ap.add_argument("--raw-rules-path", type=Path, default=RAW_RULES_PATH)
    args = ap.parse_args()

    if not args.raw_rules_path.exists():
        print(f"error: no raw rules at {args.raw_rules_path}", file=sys.stderr)
        return 2

    raw_rules = args.raw_rules_path.read_text(encoding="utf-8")
    print(f"reading {len(raw_rules)} chars from {args.raw_rules_path.name}", flush=True)

    merged = reduce_pass(raw_rules, wisdom_path=args.wisdom_path, model=args.model)

    if not merged.startswith("#"):
        first_h = merged.find("# ")
        if first_h >= 0:
            merged = merged[first_h:]

    args.wisdom_path.parent.mkdir(parents=True, exist_ok=True)
    args.wisdom_path.write_text(merged.rstrip() + "\n", encoding="utf-8")

    lines = merged.splitlines()
    bullets = sum(1 for line in lines if line.startswith("- "))
    headings = sum(1 for line in lines if line.startswith("## "))
    print(f"wrote {args.wisdom_path} ({len(merged)} chars, {bullets} rules, {headings} categories)", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
