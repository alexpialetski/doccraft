# Backlog

Full prioritised backlog. The working queue ("what next") lives in
[`queue.md`](queue.md); detailed story specs live under [`stories/`](stories/).

When a story ships or is dropped, update the **Status** column in the matching
P-row below. See the `doccraft-queue-audit` skill for the reconciliation
rules and the Story-files coverage invariant.

## Priority tiers

### P0 — this cycle (blocker / must-have)

| ID | Item | Status |
|----|------|--------|
| P0.1 | Externalize project vocabulary to `docs/config.yaml` so user edits survive `doccraft update` | done |

### P1 — next cycle (high value, scheduled soon)

| ID | Item | Status |
|----|------|--------|
| P1.1 | Spike: does Cursor discover `.claude/skills/` out of the box? If yes, ship `--consolidate` flag | done |
| P1.2 | Ship `--consolidate` install flag for dual-tool projects (per ADR 005) | done (superseded by P1.4) |
| P1.3 | doccraft owns tool selection in init (3-option picker, forwards `--tools` to openspec) | done |
| P1.4 | Default skill install to `.claude/skills/`; remove `--consolidate` (per ADR 007) | done |
| P1.5 | Assisted setup and migration — JSON config, `doccraft llm`, `doccraft-config` / `doccraft-update` skills (per ADR 009) | done |

### P2 — backlog (known valuable, not scheduled)

| ID | Item | Status |
|----|------|--------|
| P2.1 | Parallel-waves split watch — observe whether parallel-waves deserves its own skill | planned |
| P2.2 | Docs-maintenance skill family (freshness audits, cross-ref integrity, doc-tree search) | planned |
| P2.3 | Design feature opt-in — subprocess install of designer-skills + `designer:` story field | planned |

### P3 — speculative (ideas, may be cut)

| ID | Item | Status |
|----|------|--------|
|    |      |        |

### P4 — later / platform

| ID | Item | Status |
|----|------|--------|
|    |      |        |

## Story files (incremental migration)

Detailed acceptance criteria for the items above. Queue rows in
[`queue.md`](queue.md) must link to files listed here.

| ID | Story |
|----|-------|
| P0.1 | [Externalize project vocabulary to docs/config.yaml](stories/p0-docs-config-externalization.md) |
| P1.1 | [Spike — Cursor discovery of .claude/skills/](stories/p1-cursor-consolidation-spike.md) |
| P1.2 | [Ship --consolidate install flag](stories/p1-consolidate-install-flag.md) |
| P1.3 | [doccraft owns tool selection in init](stories/p1-init-tool-picker.md) |
| P1.4 | [Default skill install to .claude/skills/; remove --consolidate](stories/p1-default-to-claude-skills.md) |
| P1.5 | [Assisted setup and migration — JSON config, doccraft llm, config/update skills](stories/p1-assisted-setup-and-migration.md) |
| P2.1 | [Parallel-waves split watch](stories/p2-parallel-waves-split-watch.md) |
| P2.2 | [Docs-maintenance skill family](stories/p2-docs-maintenance-skills.md) |
| P2.3 | [Design feature opt-in — subprocess install + designer story field](stories/p2-design-feature.md) |

## NFRs and cross-cutting

| Kind | Item | Status |
|------|------|--------|
|      |      |        |
