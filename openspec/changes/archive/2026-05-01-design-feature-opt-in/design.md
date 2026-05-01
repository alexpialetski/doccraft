## Context

`doccraft init` and `doccraft update` already orchestrate optional workflow setup
for OpenSpec. The design feature extends that lifecycle by integrating upstream
designer-skills installation as an opt-in module keyed by `doccraft.json.features`.

The change spans command flow (`init`/`update`), config schema validation, and
skill-template guidance used by planning workflows. The install path from
`npx ... --agent claude-code` already matches doccraft's canonical
`.claude/skills/` convention, so no relocation layer is needed.

## Goals / Non-Goals

**Goals:**

- Add a `design` feature that is persisted in `doccraft.json` and respected on
  later `doccraft update` runs.
- Install designer-skills via subprocess during `init` and `update` when the
  feature is enabled.
- Provide clear error messaging with a manual fallback command on subprocess
  failures.
- Add planning-level guidance for a `designer` story field and queue advisory
  behavior when design artifacts are absent.

**Non-Goals:**

- Vendor upstream designer-skills into doccraft templates.
- Enforce a hard build-time or runtime block when `.design/` is missing.
- Introduce a new package manager abstraction beyond existing `npx` usage.

## Decisions

### Feature-gated subprocess lifecycle

`runDesignerSkills(projectPath)` is introduced under `src/utils/` and follows
the existing `runOpenspec` subprocess shape so `init` and `update` can invoke it
with consistent logging and error handling patterns.

**Alternatives considered:**

- Install skills directly from in-repo templates: rejected (would create a fork).
- Require manual install command outside doccraft lifecycle: rejected (weak
  integration and no persistent configuration link).

### Persisted configuration as source of truth

`schema/doccraft-schema.json` and its TS source gain `"design"` in the
`features` enum. `doccraft init --features design` persists the value so update
can replay installation without an explicit flag.

**Alternatives considered:**

- Non-persisted transient flag on init only: rejected because update cannot
  deterministically reapply feature setup.

### Soft planning gate for design readiness

The `doccraft-story` template adds optional `designer` guidance mirroring
`openspec` semantics (`not-needed`, `recommended`, `required`). Queue-audit
template guidance emits advisory output if `designer: required` is present and
`.design/` is missing.

**Alternatives considered:**

- Hard-fail queue-audit: rejected due to heuristic filesystem check and backward
  compatibility concerns for existing projects.

## Risks / Trade-offs

- Network/package registry failures during `npx skills add` -> provide a clear
  failure message with the exact manual fallback command.
- Upstream package behavior changes over time -> accepted trade-off for avoiding
  a maintained fork and staying aligned with upstream updates.
- `.design/` directory as readiness signal can be imperfect -> keep output as an
  advisory rather than a hard gate.
- Additional subprocess step increases setup duration -> only paid by projects
  opting into `design`.

## Migration Plan

1. Extend config schema and CLI config handling to support `"design"` in
   `features`.
2. Add `runDesignerSkills` utility and wire it into `init` and `update` when
   feature-gated.
3. Update skill templates (`doccraft-story`, `doccraft-queue-audit`) to include
   `designer` guidance and advisory logic documentation.
4. Add tests for init/update feature gating, persistence, and failure messaging.

Rollback strategy: disable or remove `"design"` from `features`; skip calling
`runDesignerSkills` while leaving existing installed skills untouched.
