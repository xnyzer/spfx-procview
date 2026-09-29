# Contributing to {{PROJECT_NAME}}

Thanks for your interest in contributing!

## Setup

Toolchain management is via [mise](https://mise.jdx.dev) — it provides every tool this
repo needs (including `just`, `lefthook`, `gitleaks` and the stack toolchain):

```
mise install   # install pinned toolchain
just setup     # install dependencies + git hooks
just check     # full gate: format check, lint, types, tests — must be green
```

If you work with Claude Code, read `HOW-TO-CODE-WITH-CLAUDE.md` — it documents the
project workflow and the coding-kit plugin skills this repo is built around.

## License of contributions

This project is licensed under **{{LICENSE_SPDX}}** (see `LICENSE`). By submitting a
contribution you agree that it is licensed under the same terms (inbound = outbound).

## Commit email policy

This repository's history may be public. Commit emails must use the GitHub noreply format:

```
<numeric-id>+<github-username>@users.noreply.github.com
```

Do not use a private or corporate email address. If a real email slips into history, it
has to be scrubbed with `git filter-repo` and force-pushed — preventing is far cheaper
than cleaning.

## Commit messages

- **Conventional Commits** (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, …),
  English, imperative mood.
- Where a commit involves a design choice, describe the *why* briefly in the body
  (`Decision: X over Y because …`).
- End the body with `Co-Authored-By: Claude <noreply@anthropic.com>` when applicable.

## Secrets policy

Never commit secrets, tokens, passwords, private keys, private email addresses, or
deployment internals (IPs, hostnames, key names). Operational internals belong in the
gitignored `private/` directory. The pre-commit hook runs gitleaks (secrets) and a
privacy lint (local paths, IPs, emails, plus terms from an optional gitignored
`private/blocklist.txt` — see `private/README.md`) on staged changes.

## Code style

Follow `CODING-STANDARDS.md` — it is the binding reference, including the stack-specific
section at the end. Run `just check` before committing.

## Pull requests

- Target the `main` branch; CI must be green.
- Describe the change and the reasoning. Keep changes focused — one concern per PR.
- Squash-merge is the default; branches are deleted after merge.
