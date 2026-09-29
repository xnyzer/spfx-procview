# project-template — Progress

Living task list. **Done table** at the top, **open tasks in execution order** below,
**feature index** at the very end.

How it works: `/add-feature` intakes new tasks (F-number), `/prep-step` prepares and
decomposes, `/step-done` finishes (review, docs, commit question).

---

## Done

| Step | Description | Completed |
|------|-------------|-----------|
| F-001 | Initial template build → **core/ + modules (docs-only, ts-node, python, go; stubs swift-ios/java), MANIFEST format 1, validator + CI, all checks green.** Detail in `PROGRESS-ARCHIVE.md`. | 2026-07-07 |
| F-002a | Composable CODING-STANDARDS: fragment contract + catalog scaffold. Detail in `PROGRESS-ARCHIVE.md`. | 2026-07-17 |
| F-002b | Composable CODING-STANDARDS: migrate existing modules to the fragment scheme. Detail in `PROGRESS-ARCHIVE.md`. | 2026-07-17 |
| F-002c | Composable CODING-STANDARDS: validator support (fragment markers + declarations). Detail in `PROGRESS-ARCHIVE.md`. | 2026-07-17 |
| F-003a | Web-standards fragments: react + prisma. Detail in `PROGRESS-ARCHIVE.md`. | 2026-07-17 |
| F-003b | Web-standards fragments: api-design + docker + nginx. Detail in `PROGRESS-ARCHIVE.md`. | 2026-07-17 |
| F-004a | Real-name leak remediation: history rewrite + force-push, residual risk accepted. Detail in `PROGRESS-ARCHIVE.md`. | 2026-07-18 |
| F-004b | Real-name leak prevention: private blocklist check in the validator. Detail in `PROGRESS-ARCHIVE.md`. | 2026-07-18 |
| F-005 | Core concurrency rules: in-flight dedup + completion marker last (§7, VERSION 0.6.0). Detail in `PROGRESS-ARCHIVE.md`. | 2026-07-18 |
| F-006 | Standards fragment `audit-logging` + characteristic triggers in the catalog (VERSION 0.7.0). Detail in `PROGRESS-ARCHIVE.md`. | 2026-07-18 |
| F-007 | Repo docs refreshed for the fragment catalog: root README structure, modules/README pointer (VERSION 0.7.1). Detail in `PROGRESS-ARCHIVE.md`. | 2026-07-18 |
| F-008 | Privacy lint + private blocklist shipped to projects: core script + lefthook gate (VERSION 0.8.0). Detail in `PROGRESS-ARCHIVE.md`. | 2026-07-18 |
| F-009 | Docs aligned with the current coding-kit skill set; sync direction made explicitly downward-only (VERSION 0.9.0). Detail in `PROGRESS-ARCHIVE.md`. | 2026-07-19 |
| F-010 | Per-dimension language matrix: Languages block in core/CLAUDE.md with five `{{LANG_*}}` placeholders, visibility-coupled default removed (VERSION 0.10.0). Detail in `PROGRESS-ARCHIVE.md`. | 2026-07-19 |
| F-011a | Seed section-marker contract: `section:NAME` registered in MANIFEST (§ Markers, seed policy, § Seed sections inventory), validator check generalized (VERSION 0.11.0). Detail in `PROGRESS-ARCHIVE.md`. | 2026-07-20 |
| F-011b | Section markers applied to all six seed skeletons per the MANIFEST inventory (wrappers only, no prose changes; shipped with VERSION 0.11.0). Detail in `PROGRESS-ARCHIVE.md`. | 2026-07-20 |
| F-012 | ts-node seed files ship Biome-clean: quotes fixed in `index.test.ts` / `vitest.config.ts`, `$schema` resolved from node_modules, deprecated `rules.recommended` → `rules.preset` (VERSION 0.11.3). Detail in `PROGRESS-ARCHIVE.md`. | 2026-08-11 |
| F-013 | Catalog fragment `nextjs`: App Router boundaries, routing & caching, assets/build, configuration traps; retrofit-only, no module declares it (VERSION 0.12.0). Detail in `PROGRESS-ARCHIVE.md`. | 2026-08-11 |
| F-014 | Permission fix: broad `**/.env.*` deny shadowed the `.env.example` allow entries in both settings files; replaced by the secret-bearing variants (shipped with VERSION 0.12.0). Superseded by F-015. Detail in `PROGRESS-ARCHIVE.md`. | 2026-08-11 |
| F-015 | Env deny set carves the `.env.example` exception via positive character classes — fail-closed again without renaming the placeholder; `agentRules` rule reversed to vendor-aligned (VERSION 0.13.0). Detail in `PROGRESS-ARCHIVE.md`. | 2026-08-11 |
| F-016 | `nextjs` fragment: `agentRules` rule described the greenfield branch; corrected to the routing that actually applies to template projects, plus the `AGENTS.md` requirement and remediation order (VERSION 0.13.1). Detail in `PROGRESS-ARCHIVE.md`. | 2026-08-11 |
| F-017 | HOW-TO rows for `/choose-stack`, `/update-conventions` and `/prep-step` cover fragment companion actions; catalog marker deliberately not introduced (VERSION 0.13.2). Detail in `PROGRESS-ARCHIVE.md`. | 2026-08-11 |

---

## Open tasks — work top to bottom

_No prepared tasks. Plan a backlog item via `/prep-step`._

---

## Feature ideas (backlog)

_Intake new ideas via `/add-feature` — they get the next F-number._

---

<!-- FEATURE-INDEX
next-feature: F-018
F-001 Initial template build (DONE)
F-002 Composable CODING-STANDARDS fragments (DONE)
F-003 Web-standards fragments (DONE)
F-004 Remediate already-published real-name leaks (DONE)
F-005 Async in-flight / promise-dedup concurrency standard (DONE)
F-006 Audit / activity-logging standard (DONE)
F-007 Refresh repo docs for the fragment catalog (DONE)
F-008 Ship the privacy lint + private blocklist to projects (DONE)
F-009 Align docs with the current coding-kit skill set (DONE)
F-010 Per-dimension language matrix (DONE)
F-011 Section-marker contract for updatable zones in seed files (DONE)
F-012 ts-node seed files ship Biome-clean (DONE)
F-013 Standards fragment nextjs (App Router) (DONE)
F-014 Fix .env.example shadowed by the broad env deny rule (DONE)
F-015 Fail-closed env deny set + vendor-aligned agentRules rule (DONE)
F-016 Correct the agentRules routing in the nextjs fragment (DONE)
F-017 HOW-TO sync for fragment companion actions (DONE)
-->
