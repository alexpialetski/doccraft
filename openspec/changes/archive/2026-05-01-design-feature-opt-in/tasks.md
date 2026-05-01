## 1. Config and schema support

- [x] 1.1 Add `"design"` to the feature enum in `src/utils/config-schema.ts`.
- [x] 1.2 Regenerate `schema/doccraft.schema.json` from the updated schema source.
- [x] 1.3 Ensure `doccraft init --features design` persists `"design"` in `doccraft.json`.

## 2. Designer-skills subprocess lifecycle

- [x] 2.1 Implement `runDesignerSkills(projectPath)` in `src/utils/designer-skills.ts` using the established OpenSpec subprocess pattern.
- [x] 2.2 Wire `runDesignerSkills` into `src/commands/init.ts` behind the `design` feature gate.
- [x] 2.3 Wire `runDesignerSkills` into `src/commands/update.ts` behind persisted `doccraft.json.features`.
- [x] 2.4 Add user-facing failure handling that includes the manual fallback command.

## 3. Planning-skill guidance updates

- [x] 3.1 Update `templates/skills/doccraft-story/SKILL.md` to document optional `designer` values and guidance.
- [x] 3.2 Update `templates/skills/doccraft-queue-audit/SKILL.md` to describe advisory behavior for `designer: required` with missing `.design/`.
- [x] 3.3 Verify non-design workflows remain unchanged when `designer` is omitted.

## 4. Validation and regression tests

- [x] 4.1 Add/adjust tests covering `init --features design` subprocess invocation and persistence.
- [x] 4.2 Add/adjust tests covering `update` re-invocation when `"design"` is already in `doccraft.json`.
- [x] 4.3 Add/adjust tests verifying subprocess failure messaging includes the exact fallback command.
- [x] 4.4 Run project tests and targeted command checks for init/update feature-gating behavior.
