---
name: business-insights-extractor
description: >-
  Maintainer-facing tool that ingests external source material (Telegram HTML
  exports, markdown articles, etc.) and distils it into the canonical
  startup-wisdom.md file consumed by the `doccraft-business` skill. Use whenever the
  user mentions extracting insights, ingesting a new channel export,
  refreshing startup wisdom, adding a source, processing a telegram export,
  re-running the reduce pass, updating the distilled rules, or anything else
  that produces or updates `startup-wisdom.md`. Do NOT use when the user is
  asking for business advice, working through requirements, setting
  priorities, or interviewing on target audience / milestones — that is the
  `business` skill's job.
---

# business-insights-extractor

> **Maintainer tool, not a user tool.** This skill runs locally to produce
> `startup-wisdom.md`, which is then committed as part of the
> `doccraft-business` skill template and shipped via doccraft. End users
> never need to run this — they get the curated output for free.

## Purpose

Take noisy long-form source material (e.g. 400+ Telegram posts from a
founder channel) and distil it into ~100 crisp imperative rules of thumb,
organised into 6–8 categories, capped at ~15 rules per category.

The output file (`startup-wisdom.md`) is the knowledge base that the
`doccraft-business` skill reads when advising on project priorities or
interviewing the user about requirements.

## When to invoke this skill

Positive triggers:

- "Add this Telegram export to the startup wisdom"
- "Ingest messages.html"
- "Re-run the reduce pass" / "the wisdom file came out wrong, retry"
- "Update business-insights from new articles"
- "Extract insights from this source"
- "What's in the sources manifest?"

Explicit non-triggers (delegate to the `doccraft-business` skill instead):

- "What should I build next?"
- "Is this the right priority?"
- "Help me define the target audience"
- Anything that consults wisdom rather than producing it.

## Skill layout

```
business-insights-extractor/
├── SKILL.md                 ← this file
├── scripts/
│   ├── extract.py           ← full pipeline (parse → map → reduce → write)
│   ├── retry_reduce.py      ← re-run only the reduce pass from saved raw rules
│   ├── prompts.py           ← MAP_PROMPT + REDUCE_PROMPT (iterate here)
│   └── parsers/             ← format adapters
│       ├── common.py        ← Message dataclass + Parser protocol
│       └── telegram_html.py ← Telegram export HTML → Message[]
└── state/                   ← maintainer state, committed to doccraft repo but NOT shipped to end-user projects
    ├── _sources.json        ← manifest: file hashes, message hashes, timestamps
    └── _last-run-raw-rules.txt  ← map-pass output, enables cheap reduce-retry
```

**Output target (cross-skill):**

The extractor writes to
`../templates/skills/doccraft-business/references/startup-wisdom.md` by
default — i.e., the canonical skill template's references directory.
Override with `--wisdom-path` if your working copy is elsewhere.

## Usage

### Full pipeline (new source, or updated source)

```bash
python3 scripts/extract.py <source-path> [--format telegram-html]
```

What it does:
1. Parses the source via the format adapter.
2. Loads `state/_sources.json`; skips any messages already ingested (by
   content hash).
3. Batches new messages (default 40 per batch).
4. Map pass — one `claude -p` call per batch using `MAP_PROMPT`, produces
   raw rules. Saves combined output to `state/_last-run-raw-rules.txt`.
5. Reduce pass — one `claude -p` call with `REDUCE_PROMPT`, merges raw
   rules with existing `startup-wisdom.md`, enforces caps.
6. Writes updated `startup-wisdom.md` + `_sources.json`.

Useful flags:
- `--force` — reprocess all messages, ignoring what's in the manifest
- `--dry-run` — parse + diff only, skip Claude calls
- `--model <id>` — default `claude-sonnet-4-6`
- `--batch-size <N>` — default 40
- `--wisdom-path <path>` — override the output location

### Retry only the reduce pass

When the synthesis step produces bad output (wrong format, truncation,
model misinterprets instructions), you do not need to re-run the 12 map
batches. `state/_last-run-raw-rules.txt` has the intermediate output:

```bash
python3 scripts/retry_reduce.py
```

Reads the saved raw rules, runs only `REDUCE_PROMPT`, overwrites
`startup-wisdom.md`. Cheap — one Claude call.

### Iterating on prompts

Edit `scripts/prompts.py`. The two prompts there are the whole surface
area:

- `MAP_PROMPT` — per-batch extraction. Shapes rule style (imperative,
  English, 180-char cap, no war stories / hedges / attribution).
- `REDUCE_PROMPT` — synthesis. Shapes the final file (intro sentence,
  category structure, merge logic, structural caps).

Both prompts were hand-tuned after an initial bug where the reduce pass
output a meta-description of the file instead of the file contents,
caused by literal interpretation of placeholder syntax like
`<intro sentence>`. The current version uses concrete examples and
explicit negatives (`do not wrap in code fences`, `the last line is the
last bullet`).

## Authentication

`claude --print` uses the user's existing Claude Code OAuth session. No
`ANTHROPIC_API_KEY` env var needed. Do not use `--bare` — that mode
explicitly rejects OAuth and requires an API key.

## State files and shipping discipline

- `state/_sources.json` — **commit** in the doccraft repo. It's how we
  know what has been ingested across runs. Small, no secrets.
- `state/_last-run-raw-rules.txt` — **commit** is optional. Useful if
  someone else wants to re-run the reduce pass without spending tokens
  on the map. Roughly 50KB per full run.
- **Do not ship `state/` to end-user projects.** When this skill is
  promoted into the doccraft npm package, the packaging step should
  exclude `state/` — users have no reason to see which sources the
  maintainer ingested, and the raw rules file is maintainer debug data.

## Format adapters

Adding a new source format:

1. Create `scripts/parsers/<format>.py` exporting a class with
   `format_name` and `parse(path) -> list[Message]`.
2. Register it in `scripts/parsers/__init__.py` `get_parser()`.
3. Invoke with `--format <format_name>`.

The `Message` dataclass (in `parsers/common.py`) hashes the text content,
which is how dedupe/incremental logic works across formats. Any new
adapter automatically benefits.
