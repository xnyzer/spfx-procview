# project-template

A stack-agnostic GitHub project template: one **core** every project gets, plus per-stack
**modules**. It is the single source of truth for project scaffolding and conventions,
designed to be instantiated by the `/new-project` skill from
[coding-kit](https://github.com/xnyzer/coding-kit) and kept up to date in existing projects
via `/update-conventions`.

> The user-facing documentation of the whole system (in German) lives in the
> [coding-kit](https://github.com/xnyzer/coding-kit) README. This file only documents the
> template repository itself.

## Structure

```
core/       Files every project receives (governance docs, .claude/, .github/, tooling).
            English, personal-data-free, parameterised with `{{…}}` placeholder tokens.
modules/    Per-stack additions (docs-only, ts-node, python, go; stubs: swift-ios, java).
            A module contributes its justfile, mise tools, gitignore entries, CI parts,
            and its language fragment (plus any declared catalog fragments) composed
            into CODING-STANDARDS.md. modules/standards/ holds the cross-cutting
            catalog of reusable standards fragments with the trigger→fragment mapping.
MANIFEST.md Which files are managed by the template (core vs. module), their update
            policy, and the placeholder/marker conventions.
VERSION     Template version, stamped into projects as .claude/template-version.
CHANGELOG.md What changed between template versions.
```

Everything else at the repository root belongs to this repository itself (its own
CLAUDE.md, PROGRESS.md, CI) — it is never copied into projects.

## Usage

Intended path: run `/new-project` (from the coding-kit plugin) — it creates a repository
from this template, fills the placeholders, instantiates one stack module, and stamps the
template version. Using GitHub's "Use this template" button works too, but leaves you with
raw placeholders and all modules; instantiation is manual in that case (see MANIFEST.md).

## Versioning

Semantic versioning of the template itself: any change to a managed file bumps `VERSION`
and gets a `CHANGELOG.md` entry. `/update-conventions` uses the stamped version plus
`MANIFEST.md` to diff a project against the template baseline.

Convention flow is exclusively downward (template → project). Conventions originate here;
improvements discovered in a downstream project come back only as a manually initiated
adoption proposal (a session in this repository, or a GitHub issue) — never as an
automatic write. See `MANIFEST.md` (§ Sync direction).

## License

Apache-2.0 — see [LICENSE](LICENSE).
