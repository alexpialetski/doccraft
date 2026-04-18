# ADR 003: Ship Cursor rule stubs; no rule equivalents for Claude Code

**Status:** Accepted

## Context

Cursor has `.cursor/rules/*.mdc` files — glob-scoped rules that auto-attach
to the model's context when the user edits a matching file. This is the
primary Cursor-native primitive for "when editing `docs/stories/**`, follow
this procedure" workflows. Claude Code has no equivalent file-glob
primitive; its skills trigger on description matching against the whole
conversation, not on file-edit events. Projects using both tools want
coherent planning-artifact workflows without duplicating behavior.

The audio-stage project (doccraft's parent) shipped `.cursor/rules/*.mdc`
files that mostly said "follow the sibling skill under `.cursor/skills/`".
Porting these verbatim would duplicate content that already lives in the
skill body.

## Decision

Ship three Cursor-only rule stubs under `templates/rules/`:

- `planning-stories.mdc` — globs `docs/stories/**/*.md`
- `planning-adrs.mdc` — globs `docs/adr/**/*.md`
- `planning-queue.mdc` — globs `docs/queue.md`

Each stub is a thin pointer to the corresponding installed skill plus the
handful of enforcement rules that apply on every file edit (don't invent
enum values, never renumber published ADRs, invoke `doccraft-queue-audit`
after `depends_on` changes). Rules are installed only into tools that
advertise a `rulesDir` — Claude Code does not, so it gets skills only.

`doccraft-session-wrap` gets no rule stub: it's invoked explicitly at the
end of a thread, not on file edit.

## Consequences

- + Cursor users get the auto-attach-on-glob primitive they're used to.
  Claude users get description-match skill triggering. Same project serves
  both without duplicating behavior.
- + Rule bodies are thin (pointer + enforcement lines). Updates to skill
  content don't require touching rule files.
- + `SkillTool` interface gained an optional `rulesDir` field; future tools
  with a similar primitive extend the list, no special-casing.
- - If Claude Code later adds a file-glob primitive, we'll need a second
  port. Acceptable; at that point the skill-description layer and rule
  layer become genuinely separate concerns.

## Alternatives considered

- **Don't ship rules at all.** Rejected: attach-on-glob is the Cursor-native
  primitive for this class of workflow; not using it would make Cursor users
  manually invoke the skill every edit.
- **Ship the original audio-stage rule bodies verbatim.** Rejected: content
  was already duplicated between skill and rule in audio-stage (known
  maintenance smell), and rules should be thin pointers, not a second copy.
- **Install rules into Claude Code too, pretending its skill triggers work
  like Cursor rules.** Rejected: it doesn't, and shipping dead files would
  confuse users.
