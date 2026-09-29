# project-template — Claude Instructions

## Graphiti Memory (Knowledge Graph)
**group_id**: `project-template`

- Query the graph first before searching files:
  `search_memory_facts(query="…", group_ids=["project-template"])`.
- After significant changes, update via `add_memory` (`group_id: "project-template"`).
- Optional — skip silently if no Graphiti MCP server is available.

## Overview

This repository is the **single source of truth for project scaffolding**: a stack-agnostic
`core/` plus per-stack `modules/`, instantiated into new repositories by the `/new-project`
skill of the coding-kit plugin and kept in sync via `/update-conventions`. See `README.md`
and `MANIFEST.md`.

## Structure rules (binding)

- **Repo root = this repository itself** (its own docs, CI, settings). **`core/` and
  `modules/` = template content** that ships into projects. Never mix the two.
- The whole repo is public — template content **and** its own docs (README, CHANGELOG,
  MANIFEST) alike are **English** and **free of personal data**: no real names (people,
  customers, or concrete downstream projects), private emails, absolute local paths, IPs,
  or hostnames. In template content, identity is parameterised (`{{OWNER}}`, …) or resolved
  at runtime (`git config`, `gh api`) by the skills; in the changelog and other docs, refer
  to instantiated projects generically ("a downstream project"), never by name.
- Placeholder and marker conventions are defined in `MANIFEST.md`. Use only the documented
  placeholders; register new ones there first.
- **Sync invariant:** every change to a managed template file requires, in the same commit —
  a `VERSION` bump, a `CHANGELOG.md` entry, and (if files were added/removed/re-policied)
  a `MANIFEST.md` update. No exceptions; `/update-conventions` depends on it.
- No static tool-version claims in template *texts* (write "current LTS", not a number).
  Where pins are technically required (mise tools, action SHAs, packageManager), they are
  exact and Renovate keeps them fresh.

## Conventions

- Repo language: English (public). Conventional Commits, English, imperative mood; body ends
  with `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Commit email must be the GitHub noreply address — verify via `git config user.email`
  before any commit; resolve with `gh api user` if wrong. **Never auto-commit — ask first.**
- Checks: `just check` must be green before any commit (validates JSON/YAML, privacy lint).

## Workflow & skills

Tasks are F-numbers in `PROGRESS.md` (+ `FEATURE-INDEX` block). Use the coding-kit plugin
skills: `/add-feature` (intake), `/prep-step` (plan), `/step-done` (finish), `/audit-code`.
