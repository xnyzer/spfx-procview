# .claude/

Claude Code project configuration.

## settings.json (managed by the template)

Hardened permissions: a tight allow-list (`just`, `mise`, read-only git, hooks/scanner)
plus a deny-list for secret material (`.env*`, key files, `.ssh/`, `.aws/`, `secrets/`,
`credentials/`) and for `git push --force`.

**Why the env deny rules look the way they do.** Deny beats allow and a deny rule cannot
carry an exception, so a broad `Read(**/.env*)` would shadow the `.env.example` allow entry
and make the tracked placeholder unusable. Narrowing the deny to a list of known names is
worse: whatever is not on the list (`.env.bak` — a literal copy of a real `.env` — `.env.prod`,
`.env.ci`) becomes readable *without a prompt*, because read-only tools need no approval inside
the working directory.

The rules therefore carve the exception out by hand, with positive character classes that
exclude one letter each, so `.env.example` is the only spelling that no deny rule matches.
Two properties of the matcher make this work, both measured rather than assumed:

- **There is no negation.** `[!e]` and `[^e]` are *not* negated classes — they are read as
  positive sets containing `e`, so such a rule blocks `.env.example` and allows everything
  else, the exact inverse of the intent. Never write one.
- **Matching is case-insensitive**, so the lowercase ranges also cover `.env.PROD`. Adding
  `A-Z` to a class breaks it: the uppercase range then swallows the lowercase letter the class
  was meant to exclude.

Known residual: a suffix starting with `exa` that is not `example` (`.env.exact`) and exact
truncations (`.env.exa`) are not matched. Neither is a real env filename; closing them would
cost one pattern per prefix letter.

## settings.local.json (never committed)

Machine-local settings and permission grants accumulate here; it is gitignored and must
never be committed or copied between machines — it tends to collect local paths and
project internals.

## convention-overrides.md

The registry of deliberate project-local deviations from template conventions.
`/update-conventions` reads it and leaves registered files/sections untouched.

## template-version

Stamped by `/new-project`; records which template `VERSION` this project was instantiated
from. `/update-conventions` uses it to compute pending updates. Do not edit by hand.

## skills/

**Project-specific skills only.** The generic workflow skills (`/add-feature`,
`/prep-step`, `/step-done`, `/audit-code`, …) come from the coding-kit plugin — do not
copy them here, or you'll shadow updates.
