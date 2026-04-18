---
id: P2.1
title: Parallel-waves split watch — structural smell in doccraft-queue-audit
status: todo
impact: L
urgency: later
tags:
  - area:skills
openspec: not-needed
updated: 2026-04-18
roadmap_ref: P2.1
depends_on: []
---

## Problem / outcome

`doccraft-queue-audit` currently bundles two distinct workflows:

1. **Audit** — reconcile graph + queue + backlog status. Triggered on
   story/depends_on edits.
2. **Parallel waves** — propose ready-in-parallel batches. Triggered on
   "what can I run in parallel" asks.

They share a graph-read step but otherwise have different triggers, inputs
(spikes table inclusion), and outputs (fix report vs. batch proposal).
During the port, parallel-waves was compressed from ~104 lines to ~50 but
kept inline because scope creep to a fifth skill at ship time was not
justified.

If telemetry or community feedback shows parallel-waves being invoked
standalone far more often than the audit, split into a separate skill
(`doccraft-parallel-waves` or similar) so each has a focused description
and the audit's trigger vocabulary doesn't carry parallel-batching
prompts it doesn't need.

## Acceptance criteria

- [ ] Establish a signal: either lightweight usage telemetry (opt-in), a
  community question to users of `doccraft-queue-audit`, or both. Goal
  is to distinguish "audit-only" invocations from "parallel-waves-only"
  invocations.
- [ ] If parallel-waves invocations exceed ~30% of total queue-audit
  invocations over a reasonable window: split into `doccraft-parallel-
  waves`. Update cross-references in `doccraft-story` and
  `doccraft-session-wrap`.
- [ ] If not: close with a note in ADR 003 (or a new ADR) that the
  combined skill serves its triggers cleanly enough, and retire this
  story.

## Notes

This is an observation task, not an active build. Re-evaluate when
external feedback accumulates or at a quarterly review cadence.
