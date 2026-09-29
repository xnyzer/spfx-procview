# private/

Operational internals that must never enter the (potentially public) history — secrets,
deployment notes, customer or personal data, local paths, source prompts, scratch material.

Everything in this directory is gitignored **except this README** (see the `private/*` /
`!private/README.md` rules in `.gitignore`). The directory is tracked only so the convention
stays discoverable; its contents are not.

## What goes here

- Secrets and credentials not already provided via env / `.env` (which is itself ignored).
- Deployment internals: real hostnames, IPs, server names, infrastructure notes.
- Personal or customer data, real names, private email addresses.
- Working material with private context (e.g. the original project brief) that must stay out
  of the tracked tree.

## blocklist.txt

Optional: `private/blocklist.txt` — one project-private term per line (`#` starts a
comment): real project names, codenames, customer identifiers. The pre-commit privacy lint
(`scripts/privacy-lint.sh`) blocks any commit whose staged files contain a listed term
(case-insensitive). Like everything here it is gitignored; where it is absent (e.g. in CI),
only the lint's generic patterns run.

## Rules

- **Never** copy anything from here into a tracked file. The living docs (README, PROGRESS,
  …) stay free of private information so the project is publishable at any time.
- If something private slips into the tree, move it here and scrub the history before any
  publish.
