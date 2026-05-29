## REMOVED Requirements

### Requirement: doccraft-story SKILL.md activates a model-hints integration block when configured
**Reason**: ADR 013 replaces the `{{MODEL_HINTS_INTEGRATION_BLOCK}}` placeholder with the generic `<!-- doccraft:inject point=... -->` marker mechanism. The bespoke per-skill block rendering, the `applyModelHintsBlock` helper in `src/utils/skills.ts`, and the `story.modelHints` config field that drove activation are all deleted.
**Migration**: Audio-stage authors `docs/.doccraft/extensions/model-hints/extension.yaml` with a fragment containing the prior model-hints prose (suitably edited to reference its own registry path) targeting `story.instructions` or `story.body.sections`. The extension is registered in `doccraft.json.extensions[]`. Audio-stage removes `story.modelHints` from its `doccraft.json` in the same change.

### Requirement: Registry file content is project-owned and unvalidated by doccraft
**Reason**: With the field removed, doccraft no longer touches any registry file path during install/update. The non-validation guarantee becomes vacuously true. The extension scaffold mechanism similarly does not validate file contents — preserving the same project-ownership stance without a dedicated requirement.
**Migration**: Audio-stage's model-hints extension MAY include a `scaffold[]` entry that copies an initial registry skeleton to a chosen project path. Updates to the registry remain entirely project-owned; doccraft never reads or rewrites it.
