#!/usr/bin/env python3
"""Extract distilled startup rules from an external source into startup-wisdom.md.

Pipeline:
  1. Parse source via format adapter.
  2. Load manifest (_sources.json); diff message hashes.
  3. If nothing new, exit clean.
  4. Batch new messages; map pass (one `claude -p` per batch) produces raw rules.
  5. Reduce pass merges raw rules with existing startup-wisdom.md.
  6. Write updated wisdom + manifest.

Claude invocation: `claude --print --model <model>` with prompt on stdin.
Uses the user's existing Claude Code OAuth. No API key env var needed.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from parsers import Message, get_parser  # noqa: E402
from prompts import MAP_PROMPT, REDUCE_PROMPT  # noqa: E402

SKILL_DIR = SCRIPTS_DIR.parent
STATE_DIR = SKILL_DIR / "state"
SOURCES_PATH = STATE_DIR / "_sources.json"
RAW_RULES_PATH = STATE_DIR / "_last-run-raw-rules.txt"

SKILLS_DIR = SKILL_DIR.parent
REPO_ROOT = SKILLS_DIR.parent.parent
DEFAULT_WISDOM_PATH = REPO_ROOT / "templates" / "skills" / "doccraft-business" / "references" / "startup-wisdom.md"

DEFAULT_MODEL = "claude-sonnet-4-6"
DEFAULT_BATCH_SIZE = 40


def load_manifest() -> dict:
    if not SOURCES_PATH.exists():
        return {"sources": {}}
    return json.loads(SOURCES_PATH.read_text(encoding="utf-8"))


def save_manifest(manifest: dict) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    SOURCES_PATH.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def file_sha1(path: Path) -> str:
    h = hashlib.sha1()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def run_claude(prompt: str, model: str, timeout: int = 300) -> str:
    """Invoke `claude --print --bare` with prompt on stdin. Return stdout."""
    cmd = ["claude", "--print", "--model", model]
    proc = subprocess.run(
        cmd,
        input=prompt,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(
            f"claude exited {proc.returncode}\nstderr: {proc.stderr[:500]}"
        )
    return proc.stdout.strip()


def format_batch(batch: list[Message]) -> str:
    return "\n\n".join(f"[{i + 1}] {m.text}" for i, m in enumerate(batch))


def map_pass(batches: list[list[Message]], model: str) -> str:
    rules: list[str] = []
    total = len(batches)
    for i, batch in enumerate(batches, 1):
        print(f"  map pass {i}/{total} ({len(batch)} messages)...", flush=True)
        prompt = MAP_PROMPT.format(messages=format_batch(batch))
        out = run_claude(prompt, model=model)
        batch_rules = [line.strip() for line in out.splitlines() if line.strip()]
        batch_rules = [r.lstrip("-*•").strip() for r in batch_rules]
        batch_rules = [r for r in batch_rules if len(r) > 10]
        print(f"    -> {len(batch_rules)} rules", flush=True)
        rules.extend(batch_rules)
    return "\n".join(rules)


def reduce_pass(new_rules: str, wisdom_path: Path, model: str) -> str:
    existing = wisdom_path.read_text(encoding="utf-8") if wisdom_path.exists() else ""
    existing_for_prompt = existing.strip() if existing.strip().startswith("#") else "(file does not exist yet)"
    prompt = REDUCE_PROMPT.format(existing=existing_for_prompt, new_rules=new_rules)
    print(f"  reduce pass ({len(new_rules)} chars of raw rules, existing={len(existing_for_prompt)} chars)...", flush=True)
    return run_claude(prompt, model=model, timeout=600)


def batches_of(items: list, size: int) -> list[list]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("source", type=Path, help="Path to source file (e.g. messages.html)")
    ap.add_argument("--format", default="telegram-html", help="Source format (default: telegram-html)")
    ap.add_argument("--model", default=DEFAULT_MODEL, help=f"Claude model (default: {DEFAULT_MODEL})")
    ap.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    ap.add_argument("--force", action="store_true", help="Re-process all messages, ignoring manifest")
    ap.add_argument("--dry-run", action="store_true", help="Parse + diff only; skip Claude calls")
    ap.add_argument("--wisdom-path", type=Path, default=DEFAULT_WISDOM_PATH,
                    help=f"Where to write the merged wisdom file (default: {DEFAULT_WISDOM_PATH})")
    args = ap.parse_args()

    if not args.source.exists():
        print(f"error: source not found: {args.source}", file=sys.stderr)
        return 2

    parser = get_parser(args.format)
    print(f"parsing {args.source} via {args.format}...", flush=True)
    messages = parser.parse(args.source)
    print(f"  -> {len(messages)} messages (>=80 chars)", flush=True)

    manifest = load_manifest()
    source_key = str(args.source.resolve())
    prior = manifest["sources"].get(source_key, {})
    seen_hashes = set() if args.force else set(prior.get("message_hashes", []))

    new_messages = [m for m in messages if m.hash not in seen_hashes]
    print(f"  -> {len(new_messages)} new (seen: {len(seen_hashes)})", flush=True)

    if not new_messages:
        print("nothing new. exiting clean.", flush=True)
        return 0

    if args.dry_run:
        print(f"dry-run: would process {len(new_messages)} messages in {(len(new_messages) + args.batch_size - 1) // args.batch_size} batches")
        return 0

    batches = batches_of(new_messages, args.batch_size)
    print(f"map pass: {len(batches)} batches, batch-size={args.batch_size}, model={args.model}", flush=True)
    new_rules = map_pass(batches, model=args.model)

    STATE_DIR.mkdir(parents=True, exist_ok=True)
    RAW_RULES_PATH.write_text(new_rules, encoding="utf-8")
    print(f"  raw rules saved to state/{RAW_RULES_PATH.name}", flush=True)

    print("reduce pass...", flush=True)
    merged = reduce_pass(new_rules, wisdom_path=args.wisdom_path, model=args.model)

    if not merged.startswith("#"):
        first_h = merged.find("# ")
        if first_h > 0:
            merged = merged[first_h:]

    args.wisdom_path.parent.mkdir(parents=True, exist_ok=True)
    args.wisdom_path.write_text(merged.rstrip() + "\n", encoding="utf-8")
    print(f"wrote {args.wisdom_path}", flush=True)

    manifest["sources"][source_key] = {
        "path": str(args.source),
        "format": args.format,
        "file_hash": file_sha1(args.source),
        "message_count": len(messages),
        "message_hashes": sorted({m.hash for m in messages}),
        "last_run": datetime.now(timezone.utc).isoformat(),
        "model": args.model,
    }
    save_manifest(manifest)
    print(f"wrote {SOURCES_PATH}", flush=True)
    print("done.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
