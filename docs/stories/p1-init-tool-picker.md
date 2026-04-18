---
id: P1.3
title: doccraft owns tool selection in init (3-option picker, forwards --tools to openspec)
status: done
impact: H
urgency: now
tags:
  - area:cli
  - theme:docs
openspec: not-needed
updated: 2026-04-18
roadmap_ref: P1.3
depends_on: []
adr_refs:
  - 006-doccraft-owns-tool-selection.md
---

## Problem / outcome

First-contact UX under `npx doccraft init` handed tool selection to
openspec's own interactive picker, which offers all 28 tools it
supports. doccraft brands itself as "Claude Code + Cursor" but let
openspec drive the choice anyway — the 28-option list was the first
thing a new user saw after installing doccraft.

Root cause: doccraft forwarded `--tools` to openspec only if the user
passed it explicitly. Without a flag, openspec's picker ran and
doccraft rubber-stamped whatever got installed.

## Acceptance criteria

- [x] `doccraft init` with no `--tools` flag and a TTY prompts for
  Claude Code / Cursor / Both, scoped to doccraft's actual target
  set (not openspec's 28 tools).
- [x] `doccraft init --tools <value>` bypasses the prompt.
- [x] `doccraft init` with no TTY (piped input, CI) defaults to both
  supported tools without prompting.
- [x] `--tools all` expands to the explicit list `claude,cursor`
  before being forwarded to openspec, so openspec's `all` (= 28
  tools) semantics do not leak into doccraft.
- [x] The resolved selection is passed to both openspec (via
  `--tools`) and `installDoccraftSkills` — one source of truth, no
  ordering dependency on openspec creating a tool directory first.
- [x] `doccraft init` prints the resolved selection on one line
  (`Tools: Claude Code, Cursor`) before any subprocess runs.
- [x] Tests cover every non-interactive branch (passthrough, `all`
  expansion, `none`, case/dedup normalisation, unknown-tool error,
  non-TTY default). Prompt branch covered by manual E2E.
- [x] ADR 006 captures the design decision and rejected
  alternatives.

## Notes

`doccraft update` deliberately left alone — its natural default is
detect-existing-install, not a prompt. Users running update on an
already-installed project know their tools already; a prompt on
every update would be friction, not clarity.

`--consolidate` (P1.2) and this story are orthogonal: the consolidate
flag consumes the same resolved tools string this story produces.
Landing this first means P1.2 has a stable resolver to build on.
