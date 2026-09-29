# Contributing to project-template

Thanks for your interest in contributing!

## What this repo is

The repository root is the template project itself; `core/` and `modules/` are **template
content** that ships into projects. Read `MANIFEST.md` before changing template content.

## The sync invariant (binding)

Every change to a managed template file requires, in the same commit:

1. a `VERSION` bump,
2. a `CHANGELOG.md` entry,
3. a `MANIFEST.md` update if files were added, removed, or re-policied.

`/update-conventions` in downstream projects depends on this — breaking it breaks updates.

## Where conventions originate

Conventions always originate **here in the template** and flow exclusively downward
(template → project) via `/new-project` and `/update-conventions`. Improvements discovered
in an instantiated project are contributed as a manually initiated adoption proposal — a
session in this repository, or a GitHub issue — never as an automatic write from a project.

## Rules for template content

- English only, free of personal data: no real names, private emails, absolute local
  paths, IPs, hostnames. Identity is parameterised (`{{OWNER}}`, …) or resolved at runtime.
- Only registered placeholders (see `MANIFEST.md`); `just check` enforces the registry.
- No static tool-version claims in prose — write "current LTS", not a number. Technical
  pins (action SHAs, mise tools) are exact; Renovate keeps them fresh.

## License of contributions

This project is licensed under **Apache-2.0** (see `LICENSE`). By submitting a
contribution you agree that it is licensed under the same terms (inbound = outbound).

## Commits

- **Conventional Commits**, English, imperative mood; explain trade-offs in the body
  (`Decision: X over Y because …`).
- End the body with `Co-Authored-By: Claude <noreply@anthropic.com>` when applicable.
- Commit emails must be GitHub noreply addresses
  (`<numeric-id>+<username>@users.noreply.github.com`) — this history is public.

## Secrets policy

Never commit secrets, tokens, private keys, private email addresses, or deployment
internals. `lefthook` runs gitleaks plus the template validator before every commit
(`just setup` installs the hooks).

## Pull requests

Target `main`; CI must be green; keep changes focused — one concern per PR. Squash-merge
is the default.
