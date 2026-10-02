# spfx-procview — Claude Instructions

<!-- template:optional:graphiti -->
<!-- section:claude-graphiti -->
## Graphiti Memory (Knowledge Graph)
**group_id**: `spfx-procview`

- **Query the graph first** before searching files:
  `search_memory_facts(query="…", group_ids=["spfx-procview"])`,
  `search_nodes(query="…", group_ids=["spfx-procview"])`.
- **After significant changes**, update via `add_memory` (`group_id: "spfx-procview"`,
  `source: "text"`, descriptive `name`). Split dense content into multiple episodes.
- Requires a running Graphiti MCP server — skip silently if none is available.
<!-- /section:claude-graphiti -->
<!-- /template:optional:graphiti -->

## Overview

SPFx web part to embed SAP Signavio process diagrams in SharePoint with adjustable size.

SharePoint's built-in embed web part only supports iframes, so the size of an embedded
SAP Signavio diagram cannot be controlled from the page. This SharePoint Framework (SPFx)
web part takes the **"Simple image" link** of a shared Signavio diagram (the embed code is
rejected with a hint), renders the image directly (no iframe, no referrer) with a
configurable size, an optional caption and an optional link to the Signavio Collaboration
Hub (below the diagram or as corner overlay), and shows clear empty/error states per
display mode. Optional zoom and pan, a full-screen view and a colour behind the transparent
PNG; colours follow the section theme (and the Teams theme in a Teams tab); texts in
EN/DE/FR/ES. Target users: SharePoint site owners and editors; the solution package is
deployed tenant-wide by IT. Signavio is the only supported tool for now — a provider
interface (`src/providers/`) keeps the door open for further process tools. Stack: SPFx
1.23.2 (no-framework template, Heft toolchain, npm), Node 22 via mise; see
`CODING-STANDARDS.md` §13. Full context: README.md

## Status & where to start

Bootstrapped from project-template 0.13.2 with the SPFx-generated web part scaffold;
requirements defined (`REQUIREMENTS.md`, roadmap F-001–F-021 in `PROGRESS.md`). All planned
features are done (710 Jest tests, 75 script tests): Signavio link validation and provider
contract (F-001), configuration pane, sizing and caption (F-002), Collaboration Hub link
(F-003), empty and error states (F-004), section theme colours (F-005), zoom and pan — "Offer
zoom", default off (F-006), full-screen view — "Offer full screen", default on (F-007), Teams
tab following the Teams theme, no personal app (F-008), local testing via the SPFx Local
Workbench extension (F-011), texts in EN/DE/FR/ES — FR/ES Signavio labels unverified (F-012),
repository link in the pane (F-013), own Teams app icons via `just icons` (F-014), background
behind the diagram — default on and white (F-015), and the audit before the first release
(F-016: settings module with injection tests, lifecycle guard, licence check and third-party
notices in `just check`), diagram alignment — centred by default — and the property pane in
the editors' order (F-018), the zoom and full-screen fixes from the audit (F-017), and the
fixes from the control audit of 2026-10-02 (F-019: web part and pane tests on SharePoint
stand-ins, pane focus kept, `just check` guarding source characters and deriving the licence
notices from the build, zoom and full-screen remainders), and the README with screenshots and
tables for settings, controls and messages (F-020: images in `docs/images/`), the release
tooling (F-009: one version in `package.json` checked in `just check`, `just release x.y.z`, the
release workflow — read-only build, publish only for a pushed tag, an ancestry check against
`main` — immutable releases with a signed attestation, the IT guide `docs/deployment.md`) and
the fixes from the release control audit (F-021: release path and GitHub settings, stored values
normalised in `onAfterDeserialize`, zoom teardown tests, the page behind full screen kept
still). **Release 1.0.0 is published** (2026-10-02; README badges from GitHub and shields.io).
Next: F-010 waits for SPFx 1.24 (Node 24/26, GA targeted for October 2026).

## Project notes (learned the hard way)

- **Node 22 only via mise** — the owner's shell provides Node 24 (nvm); run recipes as
  `mise exec -- just …`.
- **Dev server vs. checks:** `just check`/`just build` clean the folders the dev server
  serves from (the workbench then fails with a 404). While the owner's dev server runs, run
  the checks in an isolated copy (rsync without build folders and `node_modules`) — never in
  the project folder. Give the copy a real `node_modules` (on macOS a copy-on-write clone,
  `cp -cR`): the licence check's `npm query` does not follow a symlinked `node_modules`.
  Clone it again after dependency changes.
- **Texts:** every new string goes into `loc/mystrings.d.ts`, **every** language file in
  `loc/` (`en-us.js`, `de-de.js`, …) and the completeness list in `linkErrors.test.ts`
  (typed, so a gap fails the build; the tests check every file listed in `LOCALES` for
  missing/extra keys and placeholders). A new language: add the file, extend `LOCALES` and
  `SIMPLE_IMAGE_TAB` in that test and the manifest's `title`/`description`/`group`. Signavio
  menu labels follow the Signavio UI of that language; German avoids "Sie"/"du". Test a
  language locally with `just dev de-de`. The dev server must be restarted after `loc/` or
  manifest changes.
- **Defaults** of settings live as initial values in the web part manifest and must match
  the code fallbacks — the property pane selects what is stored. A setting that defaults to
  **on** needs three places: the manifest value, a code fallback that treats a missing value
  as on (`isOnByDefault` in `settings.ts`, for web parts saved before the setting existed) and
  `checked:` on the `PropertyPaneToggle` (`propertyPane.ts`), so the pane shows it on.
  `manifestDefaults.test.ts` compares the manifest with the fallbacks — a new setting with a
  manifest value goes into its list.
- **Settings are untrusted:** every property is read in `settings.ts` (types, defaults, invisible
  characters); the renderers only get checked values. A new setting goes there, with hostile
  cases in `injection.test.ts`. SharePoint's pane shows a stored toggle or choice value before
  its `checked:` default, so `onAfterDeserialize` turns values the page cannot read into what it
  reads (`normalizeStoredSettings`) — a new toggle, choice or text setting goes into its lists.
- **Invisible characters in source:** write them as `\u` escapes. A raw U+200B/U+202E/U+00A0
  can slip in when a file is written, and a typed dash can arrive as escape text. `just check`
  fails on raw ones in `src/` and `scripts/` (`scripts/source-chars-check.mjs`); stray escapes
  in comments still need a look — Prettier keeps escapes as they are. Lines
  full of escapes (e.g. a regex) are safest written with a placeholder that perl turns into
  the backslash; in tests, build such characters with `String.fromCharCode`.
- **Web part tests:** the real SPFx packages do not load under Jest (`sp-core-library` needs
  SharePoint's internal `@msinternal/ecs-flight`). Tests of `ProcViewWebPart.ts` and
  `propertyPane.ts` replace them with `spfxTestDoubles.ts` via `jest.mock(…)` at the very top,
  before the imports — Jest runs the compiled CommonJS without hoisting; `startWebPart` /
  `disposeWebParts` set the web part up and take it down again.
- **Workbench theme line:** the SPFx Local Workbench writes
  `"spfxLocalWorkbench.theme.current"` into `.vscode/settings.json` on every theme switch —
  revert that line, never commit it.
- **Real Signavio links never enter the repository** (model ids/authkeys; they are kept only
  locally under `private/`, gitignored, and blocked by the privacy-lint blocklist). Tests use
  placeholders — low-entropy keys (e.g. `'ab12'.repeat(16)`) so gitleaks stays quiet;
  attacker hosts in examples only `example.com`.
- **Local workbench limits** (SPFx Local Workbench 0.2.0): `propertyPane.open/refresh` are
  no-ops, text values containing `:` arrive as objects (known bug, see README — the owner's
  installation carries a one-condition local patch, so it shows diagrams; an extension update
  undoes the patch and the bug returns), no live reload — confirm those behaviours in a
  SharePoint test site, plus two-finger pinch zoom (needs a touch device) and Teams (no Teams
  simulation locally; tab, themes incl. high contrast). Its stand-in `BaseClientSideWebPart`
  has no `instanceId` getter — use `this.context.instanceId` — and it renders a custom pane
  field again only when the field's `key` changes, so keys must be unique per web part
  instance.
- **Browser checks outside VS Code:** the local workbench is a VS Code webview (Chromium only).
  For Firefox and Safari, a local test page outside the repository bundles the compiled diagram,
  zoom and full-screen modules from `lib/` (the private `browser-check` page — rebuild it after
  `just check` or with the dev server running). Safari reaches buttons with Tab only with
  Option + Tab (its default setting).
- **Releases are immutable:** a published version can never be replaced or published again, not
  even after deleting its release — a broken release is followed by the next patch version. Cut
  a release with the dev server stopped (`mise exec -- just release x.y.z`) and push it with
  `git push --atomic origin main vx.y.z`; README "Versioning and releases" has the details.

<!-- section:claude-startup -->
Read `README.md` and `REQUIREMENTS.md` (while it exists). Then `PROGRESS.md`: its open-tasks
section and the `FEATURE-INDEX` block are the working context — read those; when the file
has grown large, scan the Done table and backlog instead of reading every entry. Skip
`PROGRESS-ARCHIVE.md` at startup — consult it only for the rationale of a specific finished
task. **To continue: open `PROGRESS.md`, take the first open task, run `/prep-step` to plan,
`/build-step` to implement, then `/step-done` to finish.** Work the open tasks top to bottom.
<!-- /section:claude-startup -->

<!-- section:claude-conventions -->
## Conventions

- **Languages** (chosen at instantiation, independent of repo visibility — identifiers,
  Conventional-Commit tokens, status tokens, and governance docs are always English):
  - Living docs (PROGRESS, REQUIREMENTS, decision logs): **English**
  - CLAUDE.md prose (project parts of this file): **English**
  - Code comments & docstrings: **English**
  - Commit-message prose: **English**
  - README & public docs: **English**
- Git: **Conventional Commits** (tokens English), prose in English,
  imperative mood; body ends with
  `Co-Authored-By: Claude <noreply@anthropic.com>`. Commit email = **GitHub noreply**
  (verify `git config user.email`; fix via `gh api user`). **Never auto-commit — ask first.**
- License: **Apache-2.0**; dependencies must be permissive-licensed (no GPL/AGPL) —
  deviations only as a conscious, documented decision.
- Toolchain: **mise + just + lefthook** are mandatory; all checks run via **`just check`**
  and it must be green before any commit.
- Secrets and private material never enter the tree; operational internals go to
  `private/` (gitignored). Living docs stay free of private info (names, customers, local
  paths, IPs) — the project must remain publishable at any time.
<!-- /section:claude-conventions -->

<!-- section:claude-workflow -->
## Workflow & skills

Tasks are F-numbers in `PROGRESS.md` (+ `FEATURE-INDEX` block); finished work is archived
in `PROGRESS-ARCHIVE.md`. Skills come from the **coding-kit plugin**: `/add-feature`
(intake), `/prep-step` (plan + decompose), `/build-step` (implement the plan), `/step-done`
(review, secrets scan, docs, commit question), `/audit-code` (full audit). Details:
`HOW-TO-CODE-WITH-CLAUDE.md`.
Coding rules: `CODING-STANDARDS.md`. Project-local deviations from template conventions
are registered in `.claude/convention-overrides.md`.
<!-- /section:claude-workflow -->
