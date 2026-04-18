# ADR 001: Mirror OpenSpec install pattern; raw-file templates

**Status:** Accepted

## Context

doccraft installs skills for Claude Code and Cursor. OpenSpec already solves a
near-identical problem: it maps each supported AI tool to a `skillsDir` (e.g.
`.claude`, `.cursor`) and writes byte-identical `SKILL.md` content into
`{tool.skillsDir}/skills/<name>/SKILL.md`. Per-tool output with single-source
content, no per-tool transformation.

OpenSpec represents its template content as TypeScript getter functions
returning `SkillTemplate` objects; the skill body is a template literal inside
a `.ts` file. That pattern scales but has real costs for a small surface:
escaping backticks and YAML fences inside template literals, PR reviews that
show the wrapper not the prose, and new-skill friction (write a function,
export from an index, register in a switch).

## Decision

1. **Follow OpenSpec's per-tool install contract.** Every supported tool has a
   `skillsDir`; `installSkills()` writes the same `SKILL.md` into each
   selected tool's `skills/` directory. Tool selection follows the
   `--tools all|none|<list>` convention with auto-detect fallback.

2. **Diverge on template source: raw `.md` files under `templates/`.** Skills
   live as `templates/skills/<name>/SKILL.md`. The install pipeline reads
   the file, injects a managed-by-doccraft header between frontmatter and
   body, and writes it to the target. No TypeScript getters.

## Consequences

- + Diffs in PRs show real skill prose — review inspects the content users
  will read, not a wrapper.
- + New skills added by dropping a directory; no imports, no registry edits.
- + No escaping: SKILL.md can contain backticks, YAML frontmatter, nested
  code fences without ceremony.
- + `templates/` ships via the `files` entry in `package.json` without any
  build-step bundling; aligns with how users expect an npm package to lay
  out reference assets.
- - No compile-time check that a skill's `name:` frontmatter matches its
  directory name. Runtime tests cover this; a pre-publish lint is cheap to
  add later if drift ever bites.
- - File IO at install time instead of string constants bundled in the JS.
  Negligible cost (<1ms per file).

## Alternatives considered

- **OpenSpec's TS-getter pattern.** Rejected for scope: doccraft ships four
  skills of ~100–290 lines each. The ergonomics loss of prose-inside-template-
  literal is real; the type-safety gain is marginal at this size.
- **YAML or JSON with separately-tracked body files.** Rejected — more
  moving parts than raw Markdown, and the `SKILL.md` format is already a
  de-facto standard shared by Agent Skills consumers.
