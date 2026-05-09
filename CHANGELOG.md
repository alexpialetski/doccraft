# doccraft

## 3.3.0

### Minor Changes

- Add optional `story.modelHints` in `doccraft.json` — a project-root-relative path to a markdown **model hints registry**. New scaffolds ship `docs/reference/model-hints.md` as a neutral starter and pre-wire the field. When set, the rendered `doccraft-story` skill includes a **Model hints** integration block; when unset, behaviour matches previous releases. Existing projects are guided via a single `doccraft llm` migration entry (`<3.3.0` → `>=3.3.0`, i.e. every stamp below 3.3.0 upgrading into 3.3.0+); `doccraft update` creates the registry file only if it does not already exist.

## 0.1.9

### Patch Changes

- [`357b851`](https://github.com/alexpialetski/doccraft/commit/357b85182daf00c69122dd5601491ed6679feb3f) - Link the CHANGELOG file from the README. Also serves as the first end-to-end test of the automated release pipeline (Changesets → Version PR → npm publish).

## 0.1.8

### Patch Changes

- First published release under the current scaffold. Versions 0.1.0–0.1.7 were published and unpublished during earlier experimentation — those version numbers are permanently reserved by npm, so this scaffold starts at 0.1.8.
- Initial release: `doccraft init` and `doccraft update` (alias: `upgrade`) commands that wrap `openspec init` / `openspec update`. Skill templates will ship in the next release.
- Fix `bin` field so the `doccraft` CLI is exposed to the published package.
