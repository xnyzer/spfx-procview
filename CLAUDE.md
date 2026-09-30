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
web part takes the shared/embed link of a Signavio process, renders the diagram directly
with a configurable size, and optionally shows a link to the Signavio Collaboration Hub
below it. Target users: SharePoint site owners and editors; the solution package is
deployed tenant-wide by IT. Signavio is the only supported tool for now — the design
should allow further process tools to be added later. Stack: SPFx 1.23.2 (no-framework
template, Heft toolchain, npm), Node 22 via mise; see `CODING-STANDARDS.md` §13.
Full context: README.md

## Status & where to start

Bootstrapped from project-template 0.13.2 with the SPFx-generated web part scaffold;
requirements defined (`REQUIREMENTS.md`, roadmap F-001–F-011 in `PROGRESS.md`). Done: F-001
(provider contract and Signavio link validation in `src/providers/`, 44 Jest tests, not yet
wired into the web part) and F-011 (local testing via the SPFx Local Workbench extension; no
online workbench). Next: `/build-step F-002` (configuration pane + diagram display, PLANNED).

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
