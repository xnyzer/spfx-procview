# Changelog

All notable changes to the **template content** (`core/` + `modules/`) are documented here.
Every entry corresponds to a `VERSION` bump. `/update-conventions` reads this file to
explain pending updates to projects.

## [0.13.2] — 2026-08-11

### Changed
- `core/HOW-TO-CODE-WITH-CLAUDE.md`: three skill rows now mention that a standards fragment
  can require a change in the project itself, not just the text in the `§13` slot —
  `/choose-stack` (the change is made in the same step and confirmed with it),
  `/update-conventions` (re-checked even when the fragment text is unchanged, the only route
  that reaches a project which adopted a fragment before it carried the requirement) and
  `/prep-step` (the change becomes part of the plan). Counterpart: coding-kit plugin 0.18.0
  / its F-022, which formulates the mechanism once in `/choose-stack` and references it from
  the other skills. `/step-done` is deliberately left as it stands — its backstop only
  reports gaps and its row is terse by design.

### Not changed (recorded decision)
- The catalog does **not** get a column or marker announcing that a fragment carries such a
  requirement, and `MANIFEST.md` gets no field for it. The requirement lives in the fragment
  prose, which is also what the kit reads; any marker would be a second assertion about that
  prose which no check can enforce — "contains a requirement" is not mechanically decidable,
  so the validator cannot catch drift. A fragment that gains a requirement without gaining
  its marker would then be skipped silently, trading a cheap read of seven fragments for a
  fail-open gap. Revisit when several fragments carry requirements or one is missed in
  practice; the form to prefer then is a declaration line *inside the fragment*, next to the
  prose it summarises, rather than a catalog column — co-location is what keeps the two from
  drifting apart.

## [0.13.1] — 2026-08-11

### Fixed
- `modules/standards/nextjs.md`: the `agentRules` rule described the wrong branch of Next's
  agent-file routing. It claimed the managed block always lands in `AGENTS.md` with only an
  import added to `CLAUDE.md` — that is the greenfield path, taken only when **neither** file
  exists. A project from this template always has a `CLAUDE.md` and never an `AGENTS.md`, so it
  hits the branch that writes the block **into `CLAUDE.md`**, rewriting the governance file on
  every `next dev` — the exact outcome the rule meant to prevent. The rule now states the
  routing by file state and requires `AGENTS.md` to be created when Next is adopted, before the
  first `next dev`, which is what makes the block land in `AGENTS.md`.
- Same rule: added the remediation order. Once the block sits in `CLAUDE.md`, adding an
  `AGENTS.md` afterwards does not move it — Next keeps updating whichever file hosts it, so the
  block has to be removed from `CLAUDE.md` in the same step. A project currently holding
  `agentRules: false` can drop that override once it creates `AGENTS.md`.

## [0.13.0] — 2026-08-11

### Changed
- `core/.claude/settings.json`: the env enumeration introduced in 0.12.0 is replaced by a
  deny set that carves the `.env.example` exception out by hand, using positive character
  classes that exclude one letter each (`**/.env.[0-9a-df-z_-]*`, `**/.env.e[0-9a-wy-z_-]*`,
  `**/.env.ex[0-9b-z_-]*`, `**/.env.example?*`, plus `**/.env` and `**/.env[0-9a-z_-]*` for
  the undotted forms such as `.envrc`). Six patterns per tool; `.env.example` is the only
  spelling no deny rule matches, and its allow entries are back in force. The placeholder
  keeps its conventional name.
- `core/.gitignore`: `.env` + `.env.*` collapse to `.env*`, keeping `!.env.example`.
- `core/.claude/README.md`: the F-001 caveat about `.env.example` possibly being blocked is
  replaced by the rationale for the deny set, including the two matcher properties it depends
  on (no negation; case-insensitive matching) and the known residual.
- `modules/standards/nextjs.md`: the `agentRules` rule is reversed — the generator stays **on**.
  It writes a managed block into `AGENTS.md` and an import into `CLAUDE.md`, upserting both, so
  content outside the markers survives; the block is committed with the work rather than
  deleted. `AGENTS.md` is framework-owned, `CLAUDE.md` keeps its governance role. Turning the
  generator off is now the documented exception, not the rule.

### Fixed
- 0.12.0 traded the template's documented fail-safe posture for a fail-open one: with the
  enumerated deny, unlisted variants such as `.env.bak` (a literal copy of a real `.env`),
  `.env.prod`, `.env.ci` or `.env.keys` were readable **without a prompt**, since read-only
  tools need no approval inside the working directory. The new deny set restores the
  fail-closed behaviour F-001 intended *and* keeps `.env.example` writable — 0.12.0 could
  only have one of the two.

## [0.12.0] — 2026-08-11

### Added
- `modules/standards/nextjs.md`: new catalog fragment `nextjs` for the App Router — the
  server/client boundary (`"use client"` as a leaf, `server-only` on credential-bearing
  modules, `NEXT_PUBLIC_*` as a publication decision, Server Actions as public endpoints),
  routing & caching, assets & build (standalone `HOSTNAME`, `agentRules: false`), the
  `NODE_ENV`/`PORT` and `instrumentation.ts` configuration traps, and the extensionless-import
  exception to the `ts-node` fragment. Catalog row in `modules/standards/README.md`
  (trigger: `next`).
- No module pulls the fragment by default. Like `react` and `prisma` it is retrofitted per
  project via `/choose-stack` or `/prep-step`: `ts-node` stays framework-neutral, and its
  `.js`-extension rule directly contradicts Next's bundler resolution — declaring `nextjs` on
  the module would ship two contradictory import rules to every plain TypeScript project.

### Fixed
- `core/.claude/settings.json`: the tracked `.env.example` placeholder was unreadable and
  unwritable. `permissions.deny` carried the broad `Read(**/.env.*)` / `Edit(**/.env.*)`,
  which shadowed the explicit `Read(**/.env.example)` / `Edit(**/.env.example)` allow entries —
  deny wins over allow, and a deny rule cannot carry allowlist exceptions. The broad pattern is
  replaced by the secret-bearing variants (`.env.local`, `.env.*.local`, `.env.development`,
  `.env.production`, `.env.test`, `.env.staging`), so every real env file stays blocked while
  the placeholder that `.gitignore` includes via `!.env.example` can be created and edited.

## [0.11.3] — 2026-08-11

### Fixed
- `modules/ts-node`: a freshly instantiated project no longer starts with a red
  `just check` — `files/src/index.test.ts` and `files/vitest.config.ts` used single
  quotes while Biome (no quote-style override) formats to double quotes, so the very
  first `biome ci` failed on two format errors.

### Changed
- `modules/ts-node/files/biome.json`: `$schema` now resolves from
  `./node_modules/@biomejs/biome/configuration_schema.json` instead of a version-pinned
  biomejs.dev URL, so it always matches the installed CLI and cannot drift when Renovate
  bumps the dependency; `linter.rules.recommended` replaced by `linter.rules.preset`
  (the former is deprecated and goes away in the next Biome major).

## [0.11.2] — 2026-07-20

### Added
- `core/HOW-TO-CODE-WITH-CLAUDE.md`: new maintenance-table row for `/go-public` —
  the guided, fail-closed transition of a private or local-only project to public
  (blocking preflight audit, file catch-up before the switch, per-run push
  approval; counterpart: coding-kit plugin 0.17.0).

## [0.11.1] — 2026-07-20

### Changed
- `core/HOW-TO-CODE-WITH-CLAUDE.md`: the `/update-conventions` row now reflects the
  seed-section sync — updates arrive per managed file, per standards fragment and per
  marked seed section (`section:NAME`); seed files are never replaced as a whole
  (counterpart: coding-kit plugin 0.15.0).

## [0.11.0] — 2026-07-20

### Added
- Section-marker contract for updatable zones in seed files: seed files stay living
  documents, but template-owned zones are wrapped in `<!-- section:NAME -->` …
  `<!-- /section:NAME -->` markers that `/update-conventions` may diff and offer
  individually — never the whole file. `MANIFEST.md` registers the marker, adjusts the
  seed policy wording, and documents the contract plus the zone inventory in a new
  § Seed sections (CLAUDE.md Graphiti/startup/conventions/workflow zones; the PROGRESS,
  PROGRESS-ARCHIVE and REQUIREMENTS head notes; the README getting-started block; the
  convention-overrides head). `manifest-format` stays 1 — the change is additive and the
  kit feature-detects by marker presence. The validator's balanced-marker check now
  covers `section:` markers alongside `fragment:` and enforces unique section names per
  file. All six seed skeletons carry their markers (wrappers only, no prose changed).

## [0.10.0] — 2026-07-19

Per-dimension language matrix — project languages are chosen at instantiation and
decoupled from repo visibility.

### Changed
- `core/CLAUDE.md`: the single living-doc language line becomes a **Languages block**
  with five independently chosen dimensions — living docs (`{{LANG_LIVING_DOCS}}`),
  CLAUDE.md prose (`{{LANG_CLAUDE_MD}}`), code comments & docstrings
  (`{{LANG_COMMENTS}}`), commit-message prose (`{{LANG_COMMITS}}`), README & public
  docs (`{{LANG_README}}`). Identifiers, Conventional-Commit tokens, status tokens,
  and governance docs stay English regardless. The git convention bullet now reads
  "Conventional Commits (tokens English), prose in {{LANG_COMMITS}}".
- `core/PROGRESS.md`, `core/REQUIREMENTS.md`, `core/HOW-TO-CODE-WITH-CLAUDE.md`:
  reference the new placeholders instead of `LIVING_DOC_LANGUAGE`.
- `MANIFEST.md` placeholder registry: `LIVING_DOC_LANGUAGE` replaced by the five
  `{{LANG_*}}` placeholders; the former visibility-coupled default
  ("German (private) / English (public)") is gone — values come from the
  `/new-project` language preset (default: English). Downstream, the coding-kit
  interview offers presets (all-English, working-language docs with English
  outward-facing content, all-working-language, custom per dimension).

### Migration note
- Projects instantiated before 0.10.0 carry the old single-line language convention;
  `/update-conventions` migrates it to the Languages block (existing living-doc
  language kept, other dimensions defaulting to English).

## [0.9.0] — 2026-07-19

Docs alignment with the current coding-kit skill set; no rule text or file set changed.

### Changed
- `core/HOW-TO-CODE-WITH-CLAUDE.md`: refresh the skill overview for the current coding-kit —
  `/prep-step` additionally checks standards coverage when a task introduces new
  frameworks/dependencies (matching the catalog's dependency signals **and** characteristic
  triggers; proposes appending missing catalog fragments, or authoring a project-local
  fragment with a manual adoption proposal for the template); `/step-done` gains a
  non-blocking, diff-based standards-coverage backstop (new manifest dependencies or signal
  files without a fragment are reported with an append proposal); `/choose-stack` composes
  the module's declared catalog fragments (append, idempotent per `fragment:NAME` marker)
  and retrofits characteristic fragments after confirmation; `/update-conventions` syncs
  fragment-granular and downward only, never touching project-local fragments;
  `/define-requirements` asks the catalog's characteristic triggers in the interview.
- `modules/standards/README.md`: describe trigger evaluation as implemented — `/prep-step`
  matches both signal types; characteristic triggers are asked in the requirements
  interview, at feature planning, and retrofittable via `/choose-stack`.
- Sync direction made explicit across the docs (`MANIFEST.md` § Sync direction, root
  `README.md`, root `CONTRIBUTING.md`): convention flow is exclusively downward
  (template → project); the former upstream/promote path is gone — contributions from
  projects arrive as manually initiated adoption proposals (template session or GitHub
  issue), never as automatic writes.

## [0.8.0] — 2026-07-18

### Added
- `core/scripts/privacy-lint.sh` plus a `privacy-lint` pre-commit job in
  `core/lefthook.yml`: every project now blocks commits that would leak private
  identifiers. Generic patterns (absolute local paths, IPs and email addresses outside
  the documentation allowlists) always apply; an optional gitignored
  `private/blocklist.txt` adds project-private terms and is silently skipped where
  absent (e.g. in CI). POSIX sh + grep only — no new toolchain dependency. Convention
  documented in `core/private/README.md`; the secrets-policy section in
  `core/CONTRIBUTING.md` now names the full pre-commit gate; registered as a managed
  file in `MANIFEST.md`.

## [0.7.1] — 2026-07-18

### Changed
- `modules/README.md`: clarify that `standards/` is not a stack module but the
  cross-cutting catalog of reusable CODING-STANDARDS fragments, with a pointer to its
  own README.

## [0.7.0] — 2026-07-18

### Added
- Standards fragment `audit-logging` in the `modules/standards/` catalog: accountability
  trail for services with user/admin mutations — what must be logged (domain mutations,
  permission/role changes, auth and admin operations, including denied attempts), what an
  entry carries (actor, action, target, timestamp, outcome — never secrets or full
  payloads), properties (append-only, coupled to the mutation, queryable, deliberate
  retention), and the separation from application logging.

### Changed
- `modules/standards/README.md`: the catalog mapping now supports **project-characteristic
  triggers** alongside dependency signals — for fragments (like `audit-logging`) that no
  package manifest can reveal; evaluating those triggers stays coding-kit logic.

## [0.6.0] — 2026-07-18

### Added
- `core/CODING-STANDARDS.md` §7 (heading extended to "Error handling, resilience &
  concurrency"): two language-agnostic concurrency rules — deduplicate concurrent async
  work via an in-flight promise/future that every concurrent caller awaits (applies where
  shared mutable state, several independent async triggers, and expensive or side-effectful
  work meet; cheap idempotent reads need no guard), and set the completion marker only
  after the awaited work finishes, so concurrent readers never observe a half-finished
  state as done. No section renumbering.

## [0.5.0] — 2026-07-17

### Added
- Standards fragments `api-design`, `docker`, and `nginx` in the `modules/standards/` catalog,
  completing the initial web set. `api-design` covers thin-routes/fat-services, URL/method/
  status conventions, schema-validated request/response, and the web security boundary
  (explicit authorization, rate limiting, forbidden patterns, credentials & data protection,
  security headers); `docker` covers multi-stage images, non-root runtime, layer caching,
  healthchecks, PID-1 signal handling, compose and entrypoint/startup; `nginx` covers the
  reverse-proxy hardening (per-location header re-declaration, WebSocket, compression, SPA
  cache strategy, HSTS placement). Generalized and senior-hardened; registered in the mapping.

## [0.4.0] — 2026-07-17

### Added
- Standards fragments `react` and `prisma` in the `modules/standards/` catalog (the first
  entries), generalized from real full-stack sources and senior-hardened: `react` covers
  function-component/hooks discipline, component size, design-token/slot-based styling,
  accessibility, i18n and performance; `prisma` covers deliberate querying (no N+1,
  paginate, transactions, one client, explicit constraint handling) and immutable
  migrations with DB-enforced integrity. Registered in the framework→fragment mapping.

## [0.3.1] — 2026-07-17

### Changed
- Migrated the existing stack modules to the fragment scheme: each module's
  `CODING-STANDARDS.part.md` (go/python/ts-node) is now wrapped in `<!-- fragment:<module> -->`
  … `<!-- /fragment:<module> -->` markers (content otherwise unchanged), and each `MODULE.md`
  declares its (empty) `Standards fragments` set. Makes the parts conform to the append
  contract without changing any rule text.

## [0.3.0] — 2026-07-17

### Added
- Composable CODING-STANDARDS fragments — contract + scaffold. The §13 stack slot is now
  append-capable: standards fragments are each wrapped in `<!-- fragment:NAME -->` …
  `<!-- /fragment:NAME -->` and appended inside `<!-- module:coding-standards -->`, so a project
  composes several language/framework fragments instead of a single inserted block. Adds the
  `modules/standards/` catalog (`README.md` with the framework→fragment mapping; the fragments
  themselves are authored next) and documents the marker, the module `Standards fragments:`
  declaration, and the catalog in `MANIFEST.md`. Migrating the existing go/python/ts-node parts
  and validator support follow separately.

## [0.2.0] — 2026-07-17

Refinements surfaced by running `/update-conventions` against an instantiated project, and
one template bug it exposed. Project-specific divergences there (a pnpm toolchain, filled
`template:adapt` slots, a fuller stack-specific CODING-STANDARDS, a bilingual HOW-TO) stay as
registered overrides in that project and were not promoted.

### Added
- `core/AI-DISCLOSURE.md`: a general "Why this matters" section (human/AI collaboration
  model), present for every project.
- `core/CODING-STANDARDS.md`: new language-agnostic section 5 "Comments & documentation"
  (comment the *why*; document the public surface; English identifiers) — sections 6–13
  renumbered accordingly.
- `core/CODING-STANDARDS.md` §8: the "never commit" list now names real identifiers
  (people, customers, concrete projects) alongside secrets and deployment internals.

### Changed
- `core/CLAUDE.md`: add `/build-step` to the build chain in both "Status & where to start"
  (`prep-step → build-step → step-done`) and the "Workflow & skills" skill list.
- `core/CLAUDE.md`: scale the startup reading guidance — read `README`/`REQUIREMENTS` and
  `PROGRESS.md`'s open tasks + `FEATURE-INDEX`; scan (don't fully read) a large Done
  table/backlog; consult `PROGRESS-ARCHIVE.md` on demand, not at startup. Saves context.
- `core/HOW-TO-CODE-WITH-CLAUDE.md`: refresh the skill overview to match the current
  coding-kit — add `/build-step`, `/teach-step` and a grouped "project maintenance" table
  (`/choose-stack`, `/choose-license`, `/update-conventions`, define/refine-requirements);
  note `/audit-code`'s optional scope; rewrite Workflow 2 as the `prep-step → build-step →
  step-done` loop with the `BACKLOG → PLANNED → done` status markers.
- `modules/{go,python,ts-node}`: section cross-references follow the renumbering above —
  `CODING-STANDARDS.part.md` (§6→§7 errors, §9→§10 tests, §7→§8 licenses) and `MODULE.md`
  (§12→§13, the stack slot). References to §1–§4 are unaffected.

### Removed
- `core/AI-DISCLOSURE.md`: the optional `security-tool` block. Its content was
  engineering-practice claims (vetted libraries, fail-closed, mandatory security review),
  not AI disclosure, and it duplicated `CODING-STANDARDS.md` §7/§8; the security policy
  belongs in `SECURITY.md`. The file is now identical in every project — `MANIFEST.md`
  updated accordingly (the `template:optional` mechanism remains, used by `graphiti`).

### Fixed
- `core/private/README.md` now exists. `MANIFEST.md` listed it as a managed source and
  `.gitignore` whitelists it (`!private/README.md`), but the file was missing — every
  instantiation lacked the `private/` convention marker.

## [0.1.0] — 2026-07-07

### Added
- Initial `core/`: governance documents (CODING-STANDARDS, CONTRIBUTING, SECURITY,
  HOW-TO-CODE-WITH-CLAUDE, AI-DISCLOSURE, CODE_OF_CONDUCT), PROGRESS/PROGRESS-ARCHIVE
  skeletons with FEATURE-INDEX, REQUIREMENTS template, hardened `.claude/settings.json`,
  convention-overrides registry, issue forms + PR template, hardened CI (`just check`),
  CodeQL toggle workflow, justfile/mise/lefthook/renovate/editorconfig/gitattributes/
  gitignore, `private/` convention, ADR scaffold, README scaffold, LICENSE default.
- Initial modules: `docs-only`, `ts-node`, `python`, `go` (full); `swift-ios`, `java` (stubs).
- `MANIFEST.md` (manifest-format 1) with placeholder/marker conventions and file policies.
