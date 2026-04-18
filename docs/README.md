# docs

Planning documentation managed with [doccraft](https://www.npmjs.com/package/doccraft).
Four skills are installed in your AI tool of choice (Claude Code, Cursor, or
both) to keep these artifacts consistent.

| Skill | Use for |
|-------|---------|
| `doccraft-story` | Authoring / updating product stories in [`stories/`](stories/) |
| `doccraft-adr` | Authoring / updating architecture decision records in [`adr/`](adr/) |
| `doccraft-session-wrap` | Proposing what (if anything) is worth capturing from a chat thread |
| `doccraft-queue-audit` | Reconciling the dependency graph, queue order, and backlog status |

## Map

| Where | What |
|-------|------|
| [`stories/`](stories/) | Product story specs (acceptance criteria, `depends_on`, `roadmap_ref`) |
| [`adr/`](adr/) | Architecture decision records (Nygard-style Context / Decision / Consequences) |
| [`queue.md`](queue.md) | Working queue — "what next", edited by hand |
| [`backlog.md`](backlog.md) | Full prioritised backlog (P0–P4) + Story files index |

## Getting started

1. **Record a decision** — ask your agent to "create an ADR for <decision>";
   it will invoke `doccraft-adr`.
2. **Track a story** — ask "create a story for <scope>"; it will invoke
   `doccraft-story`.
3. **After a story with `depends_on`** — ask "sanity-check the queue" to
   reconcile the dependency graph via `doccraft-queue-audit`.
4. **End of a design thread** — ask "wrap this session" for a proposal of
   what to capture via `doccraft-session-wrap`.

## Planning completion (ship checklist)

When implementation of a tracked item finishes, update planning artifacts in
one pass:

1. **Story** — `status: done` (or abandoned with reason in **Notes**); bump
   `updated:` if you use it.
2. **Backlog** — matching **Status** in [`backlog.md`](backlog.md) P-tier row.
3. **Queue** — remove or reorder the row in [`queue.md`](queue.md) if it was
   listed in **Suggested order**.
4. **Dependents** — any story with `depends_on` containing this `id`: either
   prerequisites are now satisfied (no edit) or adjust `depends_on` / Notes if
   the graph changed.
5. **Follow-up** — invoke `doccraft-queue-audit` if the graph or queue might
   be stale.

## See also

- The installed `SKILL.md` files under `.claude/skills/` or `.cursor/skills/`
  are the authoritative reference for each skill.
- [doccraft on npm](https://www.npmjs.com/package/doccraft)
