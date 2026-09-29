# project-template — Progress Archive

Finished tasks with their full write-up: what was implemented, which files were touched,
and notable decisions. Newest entries at the top. The living list is `PROGRESS.md`.

---

## F-017 — HOW-TO sync for fragment companion actions (2026-08-11)

**Problem:** coding-kit 0.18.0 (its F-022) built the counterpart to 0.13.1 — a generic
mechanism that reads a fragment's install-time requirement at runtime and executes it in the
same step, formulated once in `/choose-stack § Begleithandlungen beim Fragment-Einbau` and
referenced from `new-project`, `prep-step § 2a`, `step-done § 1a` and `update-conventions`
step 6. `core/HOW-TO-CODE-WITH-CLAUDE.md`, which describes the skills for project users,
mentioned none of it.

**What was built (1 file + sync):**

`core/HOW-TO-CODE-WITH-CLAUDE.md`, three rows, each one clause: `/choose-stack` and
`/update-conventions` in the maintenance table, `/prep-step` in the dev-loop table. Sync
invariant: `VERSION` 0.13.2 + `CHANGELOG.md` naming the counterpart. `MANIFEST.md` untouched
— no files added, removed or re-policied.

**Notable decisions:**

- **`/prep-step` yes, `/step-done` no** — the discretionary call the task left open. Both
  tables answer "what will this skill do to my project", and `/prep-step` produces a plan the
  user confirms item by item; a fragment that also changes a project file makes the plan
  contain a change the row did not lead them to expect. `/step-done`'s backstop only *reports*
  a gap and never blocks, so nothing new reaches the user through it, and its row is one of
  the terse ones. Adding the clause there would have cost brevity for no user-visible effect.
- **No kit jargon in the rows.** They say "a fragment can require a change in the project
  itself", never "companion action" — the tables are written from the user's side, and the
  term belongs to the kit's internal vocabulary.
- **The optional catalog marker was declined.** Rationale in the `CHANGELOG` under *Not
  changed*: the requirement lives in the fragment prose, which is what the kit reads, and a
  marker would be a second assertion about that prose that no check can enforce — whether a
  text "contains a requirement" is not mechanically decidable, so the validator cannot catch
  drift, and a fragment gaining a requirement without its marker would be skipped silently.
  That trades a cheap read of seven fragments for a fail-open gap. Recorded together with the
  revisit trigger (several fragments carrying requirements, or one missed in practice) and the
  form to prefer then — a declaration line inside the fragment rather than a catalog column,
  because co-location is what stops the two from drifting.
- Consequently **no follow-up is requested in the kit.** The offer to exploit a marker there
  (check only marked fragments) lapses with the marker itself.

**Verification:** the counterpart was read in the coding-kit working tree at the named commit
rather than reconstructed from the task text — the plugin cache here still holds 0.17.0, so
the installed copy could not have answered it. That reading is what settled two points: the
kit hardcodes nothing and takes what to do from the fragment prose itself, which is the
argument against a second marker; and `update-conventions` checks per fragment in the slot
even when the text is unchanged, which is what the `/update-conventions` row now states.
`just check` green; both tables re-read after the edits, rows intact and still one line each.

---

## F-016 — Correct the `agentRules` routing in the `nextjs` fragment (2026-08-11)

**Problem:** reported from a downstream sync (0.11.2 → 0.13.0) and confirmed here. The
`agentRules` rule written in F-015 described Next's agent-file routing wrongly: it claimed the
managed block always lands in `AGENTS.md` with only an import added to `CLAUDE.md`. That is the
greenfield path, taken only when **neither** file exists — the `create-next-app` case. Projects
from this template always ship a `CLAUDE.md` and never an `AGENTS.md`, so they systematically
hit the other branch, which writes the block **into `CLAUDE.md`** and rewrites it on every
`next dev`. The rule therefore produced the exact outcome it was written to prevent.

**What was built (1 file + sync):**

`modules/standards/nextjs.md`: the single `agentRules` bullet becomes two. The first states the
routing by file state and makes the actionable requirement explicit — create `AGENTS.md` when
adopting Next, before the first `next dev`, because that is what moves the block out of the
governance file. The second carries the remediation order and the `agentRules: false` fallback,
and points at the installed source for verification, since the routing is not public API.
Sync invariant: `VERSION` 0.13.1 + `CHANGELOG.md`. `MANIFEST.md` untouched — no files added,
removed or re-policied.

**Notable decisions:**

- **Rescue the rule rather than reverse it.** Reverting to `agentRules: false` would have
  discarded the version-matched docs pointer a second time — the very thing the fragment's lead
  rule demands. Creating `AGENTS.md` satisfies the branch condition and keeps the benefit.
- **State the branching, not just the happy path.** The reporter offered "create `AGENTS.md`" or
  "describe the behaviour honestly and recommend `agentRules: false`" as alternatives; the rule
  now does both jobs, because the requirement alone becomes a trap for a project that already
  ran `next dev` once.
- **No version numbers in the rule text**, per the repo convention: it points at
  `node_modules/next/dist/server/lib/generate-agent-files.js` in the installed version instead of
  naming the release the behaviour was measured on.
- The reported side note — that the greenfield branch *overwrites* `CLAUDE.md` with `@AGENTS.md`
  rather than appending — is technically moot and deliberately not mentioned in the fragment:
  that branch runs only when the file does not exist, so there is nothing to overwrite.

**Verification:** measured against a throwaway Next project at the version in question, three
ways in agreement. (1) The installed `generate-agent-files.js` shows the branch order —
`agentsMdExists && (agentsMdHostsBlock || !claudeMdHostsBlock)` → `AGENTS.md`; else
`claudeMdExists` → `CLAUDE.md`; else scaffold both. (2) Calling `writeAgentFiles` directly on
prepared fixtures: `CLAUDE.md` only → block into `CLAUDE.md`, no `AGENTS.md` created;
`CLAUDE.md` + `AGENTS.md` → block into `AGENTS.md`, `CLAUDE.md` skipped; neither → both
scaffolded; **block already in `CLAUDE.md`, `AGENTS.md` added later → still `CLAUDE.md`**, which
is where the remediation order comes from. (3) Two real `next dev` runs with a request against
each: with only a `CLAUDE.md` the block appeared inside it and no `AGENTS.md` was created; with
an `AGENTS.md` present `CLAUDE.md` was byte-identical afterwards and both the block and
`AGENTS.md`'s own content were in place. `just check` green.

---

## F-015 — Fail-closed env deny set + vendor-aligned `agentRules` rule (2026-08-11)

**Problem:** two follow-ups from review of F-013/F-014. (1) The enumerated env deny of F-014
covers the framework-conventional names only; short forms (`.env.prod`, `.env.ci`) and copy
variants (`.env.bak`, `.env.old`) fall through, and because read-only tools need no approval
inside the working directory they are readable **without a prompt**. That silently reversed the
fail-safe posture F-001 had documented in `core/.claude/README.md`. (2) The `agentRules` rule in
the new `nextjs` fragment told projects to disable Next's agent-rules generator, justified by a
governance conflict that does not hold up.

**What was built (6 files):**

`core/.claude/settings.json` and the template's own `.claude/settings.json`: the fourteen
enumerated env entries are replaced by six patterns per tool that carve the `.env.example`
exception out by hand — `**/.env` and `**/.env[0-9a-z_-]*` for the undotted forms (`.envrc`),
then `**/.env.[0-9a-df-z_-]*`, `**/.env.e[0-9a-wy-z_-]*`, `**/.env.ex[0-9b-z_-]*` and
`**/.env.example?*`, each class excluding exactly the letter that spells `example`. The
`.env.example` allow entries are back in force. `core/.gitignore`: `.env` + `.env.*` collapse
to `.env*`, keeping `!.env.example`. `core/.claude/README.md`: the stale F-001 caveat is
replaced by the rationale plus the two matcher properties the construction depends on.
`modules/standards/docker.md`: unchanged in the end (see below).
`modules/standards/nextjs.md`: the `agentRules` bullet is rewritten. Sync invariant: `VERSION`
0.13.0 + `CHANGELOG.md`. `MANIFEST.md` untouched — no files added, removed or re-policied.

**Notable decisions:**

- **Owner's call: keep the conventional dotted `.env.example`.** The first implementation took
  the opposite route — rename the placeholder to `env.example` so it falls outside the `.env*`
  namespace, which allows a single gapless deny pair and needs no allow entry at all. That was
  built and verified end to end, then reverted when the owner asked for the conventional
  spelling with the leading dot. The cost of the chosen route is six cryptic patterns per
  tool in a JSON file that admits no comments; it is paid down by the rationale block in
  `core/.claude/README.md`.
- **Known residual, documented rather than closed:** a suffix starting with `exa` that is not
  `example` (`.env.exact`, `.env.examine`) and exact truncations (`.env.e`, `.env.exa`) match
  no deny rule. Closing them costs one more pattern per prefix letter and neither shape is a
  real env filename.
- **`agentRules` reversed to vendor-aligned.** The claimed conflict was overstated: Next only
  adds an `AGENTS.md` import to `CLAUDE.md`, which lands outside the `section:claude-*` markers
  and is preserved by `/update-conventions` — so the governance file is not actually contested.
  Disabling the generator threw away the version-matched docs pointer, which is the very thing
  the fragment's lead rule demands and which the vendor's own evals show helps. The rule now
  leaves it on, treats `AGENTS.md` as framework-owned, and commits the managed block; the
  vendor documents that deleting it only re-creates the churn.

**Verification:** measured against the real matcher via headless `claude -p` runs in a scratch
project, not reasoned from the pattern syntax — which mattered twice, because the reasoning was
wrong both times.

1. **There is no negation.** With deny `Read(**/.env.[!e]*)` the result was `.env.foo`
   *allowed* and `.env.example` *blocked* — the exact inverse of gitignore semantics. `[^e]`
   behaved identically, so both forms are read as positive sets containing `e`. A rule written
   on the gitignore assumption would have opened a hole and blocked the placeholder.
2. **Matching is case-insensitive.** The first character-class draft used `[0-9A-Za-df-z_-]`,
   reasoning that `A-Z` covers `.env.PROD`. It blocked everything including `.env.example`,
   because the uppercase range swallowed the lowercase `e` the class was meant to exclude.
   Dropping `A-Z` fixed it — and the lowercase ranges cover uppercase names anyway.

Acceptance test of the shipped configuration: `.env.example` allowed, while `.env`,
`.env.local`, `.env.bak`, `.env.prod`, `.env.2024`, `.envrc`, `.env.e2e`, `.env.export`,
`.env.example.local` and `.env.keys` are all blocked. Edit verified separately under
`--permission-mode acceptEdits` (which deny still overrides): the append to `.env.example`
landed on disk, the same append to `.env.local` was blocked. `.gitignore` cross-checked with
`git check-ignore` in a throwaway repo — every `.env*` ignored, `.env.example` tracked.
`just check` green.

---

## F-014 — Fix `.env.example` shadowed by the broad env deny rule (2026-08-11)

**Problem:** reported from work on a downstream project: the tracked `.env.example`
placeholder could not be created or edited. Both settings files listed
`Read(**/.env.example)` / `Edit(**/.env.example)` under `permissions.allow`, but also the
broad `Read(**/.env.*)` / `Edit(**/.env.*)` under `permissions.deny`. Deny wins over allow, so
the broad rule shadowed the intended exception — while `.gitignore` explicitly includes the
file via `!.env.example`.

**What was built (2 files):**

`core/.claude/settings.json` (shipped to projects) and the template's own
`.claude/settings.json` — both carried the identical defect and both were fixed. The broad
`**/.env.*` is replaced, for `Read` and `Edit` alike, by the secret-bearing variants:
`.env.local`, `.env.*.local`, `.env.development`, `.env.production`, `.env.test`,
`.env.staging` (`**/.env` was already listed separately and stays). Sync invariant:
`VERSION` 0.12.0 + `CHANGELOG.md` (the entry covers `core/` only — the template's own settings
file is not template content). `MANIFEST.md` untouched: `core/.claude/settings.json` is already
policied `managed`, and the change is content, not policy.

**Notable decisions:**

- **No negation-based fix**, because none exists: the permission reference states that Read and
  Edit rules use gitignore pattern syntax and that a broad deny rule "blocks every matching
  call, including calls that also match a narrower allow rule, so a deny rule can't carry
  allowlist exceptions". A `!`-style exemption inside a deny pattern is therefore not an option,
  and the explicit enumeration is the only reliable fix.
- A gitignore character-class construction (`**/.env.[!e]*` plus one pattern per prefix of
  `example`) would be exhaustive and fail-closed, but needs roughly sixteen cryptic patterns
  per tool in a file that ships to every project. Rejected on readability and maintenance
  grounds.
- **Known residual gap, deliberately accepted:** the enumeration covers the framework-
  conventional names, not every conceivable one. An unlisted variant such as `.env.prod` or
  `.env.ci` is no longer denied, and since read-only tools need no approval inside the working
  directory, it would be readable without a prompt — the old broad rule blocked it.

> **Superseded by F-015 (2026-08-11).** Two corrections to the entry above. First, the
> suggested follow-up — a catch-all `ask` rule `Read(**/.env.[!e]*)` — was **wrong and would
> have backfired**: measured against the real matcher, neither `[!e]` nor `[^e]` negates.
> Both are read as positive sets containing `e`, so the rule would have blocked
> `.env.example` and left every other variant open, i.e. the exact inverse of its purpose.
> Second, the residual gap was not merely theoretical but a reversal of a documented posture:
> F-001 accepted a possibly-blocked `.env.example` as "the intended failure direction", and
> this entry silently traded that fail-safe stance for a fail-open one — `.env.bak`, a literal
> copy of a real `.env`, became silently readable. F-015 restores the fail-closed behaviour
> with a deny set that carves the `.env.example` exception out via positive character classes.

**Verification:** both files re-read after the edit and diffed against each other — identical
permission blocks, `**/.env.*` gone from both, `.env.example` allow entries intact;
`just check` green (the validator parses both as JSON).

---

## F-013 — Standards fragment `nextjs` (App Router) (2026-08-11)

**Problem:** the catalog had no Next.js fragment. `react` alone does not cover the App
Router-specific traps that surfaced in a downstream project — the server/client boundary,
Server Actions as public endpoints, and `NEXT_PUBLIC_*` as a publication decision rather than
a convenience prefix.

**What was built (2 files):**

New `modules/standards/nextjs.md`, body wrapped in `<!-- fragment:nextjs -->` …
`<!-- /fragment:nextjs -->`, in six blocks: a lead rule to read the version-matched docs
bundled at `node_modules/next/dist/docs/` instead of writing from memory; server/client
boundary (`"use client"` as a leaf, `server-only` on credential-bearing modules,
`NEXT_PUBLIC_*`, Server Actions validating and authorising themselves); routing & data
(Route Handlers deferring to the `api-design` fragment, explicit caching, file conventions,
Metadata API, `proxy.ts` vs. the deprecated `middleware.ts`); assets & build (`next/image`,
self-hosted `next/font`, standalone `HOSTNAME`, `agentRules: false`, Biome over `next lint`);
configuration (the `NODE_ENV`/`PORT` overwrite, the lazy `instrumentation.ts` hook that
swallows a rejected `register()`); and imports. `modules/standards/README.md` gets the catalog
row (trigger `next`). Sync invariant: `VERSION` 0.12.0 + `CHANGELOG.md`.

**Notable decisions:**

- **Retrofit-only — no module declares the fragment.** All three stack modules declare
  `Standards fragments: (none)`, and `react`/`prisma` are already retrofitted per project via
  `/choose-stack` or `/prep-step`. Beyond consistency there is a hard reason: the fragment's
  extensionless-import rule contradicts the `.js`-extension rule of `fragment:ts-node`, so
  declaring it on the module would ship two conflicting import rules to every plain TypeScript
  project. The fragment therefore names itself the documented exception and points at
  `.claude/convention-overrides.md`.
- `MANIFEST.md` untouched — adding a catalog fragment registers it in
  `modules/standards/README.md`, not in the manifest, which names fragments only as examples.
  Same shape as F-006.
- Catalog row placed directly below `react` rather than appended: the two are read together,
  and the table has no declared ordering.
- **Version-bound wording avoided** per the repo rule against static tool-version claims in
  template texts. The source notes named "Next.js 16" for both the docs-changed warning and the
  `proxy.ts` rename; the fragment states the substance instead ("recent majors changed APIs,
  conventions and file structure", "`middleware.ts` is the deprecated predecessor"), which
  stays true across majors.
- **Unverifiable specifics dropped:** the source notes claimed the build rejects `proxy.ts` and
  `middleware.ts` coexisting under error code `E900`. The official message page documents the
  rename as a deprecation and names no such code, so the fragment keeps the actionable rule
  ("never keep both in a tree") without the code.

**Verification:** claims checked against the vendor documentation rather than from memory —
the AI-agents guide confirms the bundled docs path `node_modules/next/dist/docs/`, that a
`next dev` run writes a managed block into `AGENTS.md`/`CLAUDE.md`, and `agentRules: false` as
the documented opt-out; the message page confirms `proxy.ts` replacing `middleware.ts` and the
codemod. `just check` green: fragment markers balanced, no unknown placeholders, privacy lint
clean (`0.0.0.0` is on the validator's allowlist).

---

## F-012 — ts-node seed files ship Biome-clean (2026-08-11)

**Problem:** reported from a fresh `/new-project` run: every new TypeScript project starts
with a red `just check`. `files/src/index.test.ts` and `files/vitest.config.ts` used single
quotes, while `biome.json` sets no quote-style override — so Biome formats to its default
(double quotes) and the first `biome ci --error-on-warnings` fails with two format errors.
Two config infos came with it: the `$schema` URL pinned 2.5.2 against a CLI resolved from
`^2.5.2` (2.5.7 at the time), and `linter.rules.recommended` is deprecated.

**What was built (5 files):**

`modules/ts-node/files/src/index.test.ts` and `files/vitest.config.ts` reformatted to
double quotes (output of `biome check --write`, no other change).
`modules/ts-node/files/biome.json`: `$schema` →
`./node_modules/@biomejs/biome/configuration_schema.json`;
`linter.rules.recommended: true` → `linter.rules.preset: "recommended"` (the replacement
Biome's own `migrate` emits). `modules/ts-node/MODULE.md`: two maintenance notes — why the
schema is resolved locally, and that `files/**/*.ts` must go through `biome check --write`
before it lands. Sync invariant: `VERSION` 0.11.3 + `CHANGELOG.md`; `MANIFEST.md` untouched
(no files added/removed, no policy change).

**Notable decisions:**

- Fix on the source side, not via `javascript.formatter.quoteStyle: "single"` — the seed
  code follows the formatter's default instead of the config carrying an override for the
  sake of two sample files.
- Local `$schema` instead of bumping the pin to 2.5.7: the URL form would silently drift
  again on the next Biome patch (the Renovate preset has no custom manager for schema
  URLs), the local path always tracks the installed CLI. Trade-off: in a fresh clone the
  schema resolves only after `pnpm install`.

**Verification:** the module was instantiated in a scratch dir (placeholders substituted,
`pnpm install`, Biome 2.5.7 resolved): before the fix `biome ci --error-on-warnings`
reported 2 format errors + 2 infos, afterwards it is clean (no errors, no infos);
`tsc --noEmit` and `vitest run` (1/1) green. Cross-check of the sibling modules against
their formatters: `gofmt -l` on `modules/go/files` empty, `ruff format --check` on
`modules/python/files` clean (its only complaint is the unresolved `{{PROJECT_NAME_SNAKE}}`
placeholder, which is valid Python only after instantiation) — the defect was ts-node-only.

---

## F-011b — Section markers applied to the seed skeletons (2026-07-20)

**Problem:** F-011a defined the `section:NAME` contract and inventory in `MANIFEST.md`;
the markers themselves were still missing from the seed skeletons.

**What was built (7 files):**

Wrapped the template-owned zones exactly per the MANIFEST § Seed sections inventory —
wrappers only, no prose changed: `core/CLAUDE.md` (`claude-graphiti` nested inside the
`template:optional:graphiti` block, `claude-startup` around the reading guidance below
the adapt slot, `claude-conventions` and `claude-workflow` including their headings),
`core/PROGRESS.md` (`progress-head`), `core/PROGRESS-ARCHIVE.md` (`archive-head`),
`core/REQUIREMENTS.md` (`requirements-head`), `core/README.md`
(`readme-getting-started` incl. heading and recipe table),
`core/.claude/convention-overrides.md` (`overrides-head`). `CHANGELOG.md` 0.11.0 entry
updated to state the markers shipped.

**Notable decisions / deviations:**

- **Deviation from the plan (owner's call):** F-011a and F-011b were committed together,
  so both ship as VERSION 0.11.0 — the planned separate 0.11.1 bump for b was dropped
  (the sync invariant is per commit, one bump suffices).
- Zones whose heading is fully template-owned (Conventions, Workflow, Getting started)
  include the heading inside the markers; `claude-startup` excludes its heading because
  the section also carries the project-specific status sentence and adapt slot.

**Verification:** `just check` green; grep over the six files shows exactly the nine
marker pairs of the inventory, all balanced (validator); `sed` proof that
`claude-graphiti` sits inside the optional block.

---

## F-011a — Seed section-marker contract + validator (2026-07-20)

**Problem:** Seed files are living documents `/update-conventions` never touches — but
they carry template-owned zones (CLAUDE.md's Graphiti/startup/conventions/workflow blocks,
the skeleton head notes) that evolve with the template and never reached existing projects.
F-011 defines a section-marker contract so those zones become individually syncable;
this substep ships the contract and validation, F-011b applies the markers.

**What was built (5 files; VERSION 0.10.0 → 0.11.0):**

- `MANIFEST.md`: `<!-- section:NAME -->` … `<!-- /section:NAME -->` registered in
  § Markers (lowercase-kebab, unique across the template); seed policy reworded — marked
  zones are individually offerable (diff shown, confirmed per section), the file as a
  whole never; new § Seed sections with contract prose (deleting a marker pair = permanent
  opt-out; evaluation is coding-kit logic) and the agreed zone inventory: `core/CLAUDE.md`
  (`claude-graphiti` inside the optional block, `claude-startup`, `claude-conventions`,
  `claude-workflow`), `progress-head`, `archive-head`, `requirements-head`,
  `readme-getting-started`, `overrides-head`.
- `scripts/validate.py`: `check_fragment_markers` generalized to `check_paired_markers` —
  one regex (`PAIRED_MARKER_RE`) and per-kind stacks cover `fragment:` and `section:`
  balanced/ordered closing; section names must additionally be unique per file.
- `VERSION` 0.11.0, `CHANGELOG.md` entry.

**Notable decisions:**

- `manifest-format` stays 1: the addition is backward-compatible — older kit versions
  ignore the markers, kit F-021 feature-detects by marker presence.
- MANIFEST documents markers only with the uppercase `NAME` placeholder so the docs
  themselves never trip the balanced-marker check (same convention as `fragment:`).

**Verification:** `just check` green before and after; spot test with an intentionally
broken file caught duplicate, mismatched, and unclosed `section:`/`fragment:` markers
(5 findings), clean again after removal.

---

## F-010 — Per-dimension language matrix (2026-07-19)

**Problem:** Project language was a single dimension (`LIVING_DOC_LANGUAGE`, living
docs only) whose default was coupled to repo visibility (German if private, English if
public). Language follows the project's topic and audience, not its visibility — a
private project may go public later without its language changing.

**What was implemented (VERSION 0.10.0):**

- `core/CLAUDE.md`: Languages block with five independently chosen dimensions —
  `{{LANG_LIVING_DOCS}}`, `{{LANG_CLAUDE_MD}}`, `{{LANG_COMMENTS}}`,
  `{{LANG_COMMITS}}`, `{{LANG_README}}`. Explicitly not configurable: identifiers,
  Conventional-Commit tokens, status tokens, governance docs (always English). Git
  bullet now reads "Conventional Commits (tokens English), prose in {{LANG_COMMITS}}".
- `core/PROGRESS.md`, `core/REQUIREMENTS.md`, `core/HOW-TO-CODE-WITH-CLAUDE.md`:
  switched to the new placeholders.
- `MANIFEST.md` registry: `LIVING_DOC_LANGUAGE` replaced by the five `{{LANG_*}}`
  rows; visibility-coupled default removed — values come from the `/new-project`
  language preset (default: English).
- `scripts/validate.py`: placeholder allowlist updated accordingly (old token out,
  five new tokens in).
- **Decision:** the registry default is neutral (English); opinionated presets
  (e.g. working-language docs with English outward-facing content) live in the
  coding-kit interview, not in the template. Migration of pre-0.10.0 projects is
  `/update-conventions` work (kit side, tracked there as F-020).

## F-009 — Align docs with the current coding-kit skill set (2026-07-19)

**Problem:** The coding-kit plugin (0.13.0) gained fragment-catalog capabilities in several
skills, and convention inheritance became exclusively downward (template → project; the
promote path was removed) — the docs in this repo still described the older state.

**What was changed (7 files; VERSION 0.8.0 → 0.9.0):**

- `core/HOW-TO-CODE-WITH-CLAUDE.md` (managed): both skill tables updated — `/prep-step`
  checks standards coverage for newly introduced frameworks/dependencies (dependency
  signals **and** characteristic triggers; proposes catalog fragments or project-local
  authoring with a manual template-adoption proposal); `/step-done` gains the non-blocking
  diff-based standards-coverage backstop (also added as step 3 in the detail section);
  `/choose-stack` composes declared catalog fragments (idempotent per `fragment:NAME`
  marker) and retrofits characteristic fragments after confirmation; `/update-conventions`
  syncs fragment-granular and downward only; `/define-requirements` asks the catalog's
  characteristic triggers in the interview.
- `modules/standards/README.md`: catalog intro rewritten — `/prep-step` matches both
  trigger types; characteristic triggers are asked at the requirements interview, at
  feature planning, and retrofittable via `/choose-stack`.
- Sync direction made explicit: new `MANIFEST.md` § Sync direction, a paragraph under
  Versioning in the root `README.md`, and a "Where conventions originate" section in the
  root `CONTRIBUTING.md` — conventions originate in the template and flow downward only;
  contributions from projects arrive as manually initiated adoption proposals (template
  session or GitHub issue), never as automatic writes. The standards-fragments policy row
  now states project-local fragments are never written to, only reported.
- `VERSION`, `CHANGELOG.md` (entry [0.9.0]).

**Notable decisions:**

- A repo-wide grep (promote/upstream/bidirectional and paraphrases) found no doc actively
  describing an upward sync — the hits were unrelated (Code of Conduct, SECURITY, nginx
  upstream) plus a historical note in CHANGELOG 0.2.0, which stays untouched as history.
  The new policy is therefore stated affirmatively rather than by deleting old text.
- No plugin version number in template texts (per the no-static-versions rule); the
  CHANGELOG entry says "current coding-kit".

**Verification:** `just check` (validator) green; diff reviewed in full; secrets/privacy
scan clean; MANIFEST cross-reference (§ Sync direction) resolves.

---

## F-008 — Ship the privacy lint + private blocklist to projects (2026-07-18)

**Problem:** Downstream projects had only gitleaks (secrets) as a commit gate — nothing
caught private names, local paths, IPs, or private emails, although the conventions demand
living docs stay publishable. The template repo gained this guard in F-004b; projects had
none of it. The coding-kit `/step-done` privacy scan is soft and does not know the owner's
private names.

**What was built (7 files; VERSION 0.7.1 → 0.8.0):**

- `core/scripts/privacy-lint.sh` (new managed file): POSIX sh + grep, no other toolchain.
  Generic patterns always on (absolute local paths, IPs and emails outside the documentation
  allowlists — defaults mirror this repo's `validate.py`); optional gitignored
  `private/blocklist.txt` (one term per line, `#` comments, case-insensitive substring)
  adds project-private terms, silently skipped where absent (CI). Scans the staged files
  lefthook passes; `--all` re-invokes over `git ls-files` (NUL-safe) for tree audits;
  skips `private/`, `mise.lock`, binary/empty files.
- `core/lefthook.yml`: third pre-commit job `privacy-lint` next to secrets-scan/format.
- `core/private/README.md`: blocklist convention documented; `core/CONTRIBUTING.md`:
  secrets-policy section now names the full pre-commit gate (gitleaks + privacy lint).
- `MANIFEST.md` (new managed-file row), `VERSION`, `CHANGELOG.md`.

**Notable decisions:**

- **Shell instead of Python** (decided with the owner): the core toolchain guarantees no
  Python (mise pins just/lefthook/gitleaks), and the patterns are plain regexes — POSIX
  sh + grep exist in every git environment. On Windows that means Git Bash or WSL; a bare
  cmd/PowerShell setup fails loudly, never silently (noted in the script header).
- Downstream CI integration deliberately out of scope — justfiles are module-owned;
  the pre-commit gate is the deliverable.
- Kept as a hard, deterministic complement to the model-driven `/step-done` privacy scan;
  the blocklist is the only control that knows the owner's actual private names.

**Verification:** 9-case sandbox suite green on macOS/BSD grep (clean file, path/IP/email
leaks, allowlisted values, blocklist hit case-insensitive, blocklist absent → silent skip,
binary skip, `--all` aggregation, no-args exit 0); `just check` green — the validator scans
the new script without false positives from its own regex literals.

---

## F-007 — Refresh repo docs for the fragment catalog (2026-07-18)

**Problem:** After F-002/F-003/F-006 the repo docs lagged behind the fragment mechanism: the
root README still described a module's standards contribution as "a language section" and did
not mention the `modules/standards/` catalog at all; `modules/README.md` listed only stack
modules, leaving the `standards/` directory unexplained.

**What was built (4 files; VERSION 0.7.0 → 0.7.1):**

- `README.md` (repo-own doc, outside template content): structure overview now describes the
  fragment mechanism (language fragment + declared catalog fragments) and lists
  `modules/standards/` with the trigger→fragment mapping.
- `modules/README.md`: pointer that `standards/` is not a stack module but the cross-cutting
  fragment catalog, linking its README.
- `VERSION`, `CHANGELOG.md` (patch bump — catalog/module README is template content per
  F-002/F-003 precedent; the root README alone would not have bumped).

**Verification:** `just check` green; wording matches `MANIFEST.md` § Standards fragments;
`core/README.md` checked and deliberately unchanged (project-facing seed, references no
fragment mechanics).

---

## F-006 — Audit / activity-logging standard (2026-07-18)

**Problem:** Mutating and administrative actions should leave an audit trail, but this is
neither a web framework nor one of the F-003 fragments — it went uncaptured, and a downstream
project inheriting the template's standards would have lost the rule.

**What was built (4 files; VERSION 0.6.0 → 0.7.0):**

- `modules/standards/audit-logging.md` (new): accountability trail for services with
  user/admin mutations — what must be logged (domain mutations, permission/role changes,
  auth and admin operations, including denied attempts), what an entry carries (actor,
  action, target, timestamp, outcome — never secrets or full payloads), properties
  (append-only, coupled to the mutation, queryable, deliberate retention), and the
  separation from application logging (accountability vs. debugging).
- `modules/standards/README.md`: registered the fragment; the catalog mapping now supports
  **project-characteristic triggers** alongside dependency signals, for fragments no package
  manifest can reveal.
- `VERSION`, `CHANGELOG.md`.

**Notable decisions:**

- **Catalog fragment, not a core section** (decided with the owner): an audit trail is real
  architecture and would be wrong to impose on libraries, CLIs, or local tools.
- **Trigger is a project characteristic** ("service with user/admin mutations"), evaluated by
  coding-kit — in the requirements interview at instantiation, or when a matching feature is
  planned. This repo only defines the data and the contract, as with dependency signals.

**Verification:** `just check` green (fragment markers balanced, no dangling declarations,
privacy + blocklist lint); no module declares the fragment — valid, it is pulled per project
characteristic.

---

## F-005 — Async in-flight / promise-dedup concurrency standard (2026-07-18)

**Problem:** Several independent triggers starting the same expensive or side-effectful async
operation (a token refresh, a migration, a cache populate, an external call) cause duplicate
work, wasted load, or corruption from a half-done shared state. Surfaced during the F-003
source analysis; not web-framework-specific.

**What was built (3 files; VERSION 0.5.0 → 0.6.0):**

- `core/CODING-STANDARDS.md` §7, heading extended to "Error handling, resilience &
  concurrency": two new bullets — **deduplicate concurrent async work** (the first caller
  stores its in-flight promise/future and every concurrent caller awaits that same one;
  applies where shared mutable state, several independent async triggers, and expensive or
  side-effectful work meet; cheap idempotent reads need no guard) and **completion marker
  last** (the "done" flag is set only after the awaited work completes, so concurrent readers
  never observe a half-finished state as done).
- `VERSION`, `CHANGELOG.md`.

**Notable decisions:**

- **Core, not a catalog fragment** (decided with the owner): the pattern has no
  dependency-based trigger — the situation emerges mid-development, and a fragment pulled
  only after someone notices the problem class arrives too late. As a conditional rule it
  costs unaffected projects almost nothing.
- **Heading extension instead of a new numbered section** — §§8–13 keep their numbers; the
  §13 slot is referenced externally (MANIFEST, module docs), so renumbering would ripple.

**Verification:** `just check` green; §7 re-read; the only §7 cross-reference in the tree
(`modules/go/CODING-STANDARDS.part.md`) refers to the section number, which is unchanged.

---

## F-004b — Remediate real-name leaks: private blocklist check in the validator (2026-07-18)

**Problem:** Nothing prevented a private name from slipping into the public tree again — the
privacy lint only covered generic patterns (paths, IPs, emails), not the owner's project
names, and the name list itself must never live in the public tree.

**What was built (1 file — repo tooling, no VERSION bump):**

- `scripts/validate.py`: new `check_blocklist` — loads `private/blocklist.txt` if present
  (one term per line, `#` comments) and flags any case-insensitive substring hit in scanned
  files. The blocklist is gitignored (`private/*`) and absent in CI, where the check silently
  skips; locally lefthook's pre-commit runs `just check`, so the gate fires before every
  commit. `private/` is in SKIP_DIRS, so the list itself is never scanned and its terms never
  appear in CI output.
- `private/blocklist.txt` (untracked): seeded with the owner's private project names.

**Verification:** `git check-ignore` confirms the blocklist is ignored; `just check` green
with the seeded list; a temporary fixture containing a listed term made the check fail
(exit 1), removed → green again; with the blocklist moved aside the validator stays green
(CI-safe silent skip).

**This completes F-004:** history purged and force-pushed (F-004a), recurrence guarded by the
local blocklist gate (F-004b). Generalizing the remediation procedure into a reusable
coding-kit skill remains a coding-kit backlog idea.

---

## F-004a — Remediate real-name leaks: history rewrite + force-push (2026-07-18)

**Problem:** A concrete downstream project name had been committed and pushed in the initial
build (in `modules/go/MODULE.md` and the F-001 archive entry). The working tree was scrubbed
in F-002b, but the published history still held the name.

**What was done (history-only operation; no tracked file changes, no VERSION bump):**

- Full detection first: history-wide scan of all refs (blobs, commit messages, spelling
  variants) against the owner's private name blocklist plus personal-data patterns (emails,
  IPs, local paths, real names). Result: exactly one leaked string in two files across four
  commits; commit identities all GitHub-noreply; nothing else.
- Rewrote the history in a fresh scratchpad clone with `git filter-repo --replace-text`,
  literally replacing the leaked name with a redaction token. All commits got new SHAs (root
  commit included); the rewrite was force-pushed to `origin/main` after explicit owner
  approval — also publishing the previously unpushed F-002a–F-003b commits in rewritten form.
- Working repo switched onto the rewritten history (`git reset --soft`, uncommitted work
  preserved); old local objects purged via `git reflog expire` + `git gc --prune=now`;
  scratchpad artifacts (clone + replacements file) deleted.

**Verification:** history-wide scan after the rewrite = 0 hits (rewritten clone and working
repo); HEAD tree hash identical before/after (byte-identical content); `git ls-remote` shows
`main` on the rewritten head; `just check` green.

**Notable decisions:**

- **Accepted residual risk, no GitHub support request:** the old, now-unreferenced commits
  stay reachable on GitHub via direct SHA URLs until garbage-collected. Accepted because the
  leaked string is a project name (not a secret) and the repo has no forks or stars, so the
  old SHAs are effectively known to no one.
- The repo's own agent guardrail (deny on `git push --force`) was respected: the force-push
  was executed by the owner in their terminal, not by the agent.
- Downstream re-fix was not needed: `MODULE.md` is never copied into instantiated projects
  (MANIFEST module contract), so no instantiated repo ever carried the leak.

---

## F-003b — Web-standards fragments: api-design + docker + nginx (2026-07-17)

**Problem:** After F-003a (react, prisma), the web catalog still lacked the API and
infrastructure standards a full-stack project needs.

**What was built (6 files; VERSION 0.4.0 → 0.5.0):**

- `modules/standards/api-design.md` (new): thin-routes/fat-services, URL/method/status
  conventions, schema-validated request/response, and the web security boundary (explicit
  permission-based authorization, rate limiting, forbidden patterns, credentials & data
  protection, security headers).
- `modules/standards/docker.md` (new): multi-stage images, non-root runtime, layer caching,
  healthchecks, PID-1 signal handling, compose, entrypoint & startup.
- `modules/standards/nginx.md` (new): reverse-proxy hardening — per-location header
  re-declaration, WebSocket, compression, SPA cache strategy, HSTS placement.
- `modules/standards/README.md`: three mapping rows; `VERSION`, `CHANGELOG.md`.

**Notable decisions:**

- Generalized from real full-stack sources and senior-hardened (idempotency, `Retry-After`,
  cursor pagination, no stack traces to clients; proxy timeouts / modern TLS). Name-free, no
  version pins; project-specific rules (RBAC internals, activity-log calls, a GDPR ticket
  reference) removed.
- A coverage check against the sources confirmed no framework-general rule was dropped.

**Verification:** `just check` green (markers balanced, no dangling declarations, privacy lint).

**This completes F-003:** the web standards catalog now holds react, prisma, api-design, docker,
nginx. Composing them into a project is the coding-kit side (a full-stack module or the prep-step
hook), tracked separately.

---

## F-003a — Web-standards fragments: react + prisma (2026-07-17)

**Problem:** The composable-standards catalog (`modules/standards/`) existed but held no
fragments — a full-stack project had nothing to compose for its frontend/data layer.

**What was built (5 files; VERSION 0.3.1 → 0.4.0):**

- `modules/standards/react.md` (new): React standard — function components + hooks, typed props,
  custom hooks, local/server-state discipline, component size, design-token/slot-based styling,
  accessibility, i18n, performance.
- `modules/standards/prisma.md` (new): Prisma standard — deliberate querying (no N+1, paginate,
  transactions, one shared client, explicit constraint handling) and immutable migrations with
  DB-enforced integrity.
- `modules/standards/README.md`: registered both in the framework→fragment mapping.
- `VERSION`, `CHANGELOG.md`.

**Notable decisions:**

- Generalized from real full-stack sources and **senior-hardened** (not a copy): added
  server-state-via-cache-layer, stable list keys, controlled inputs, accessibility and a lazy-UI
  error boundary to `react`; deliberate `select`, one shared client, explicit constraint-violation
  handling and indexing to `prisma`.
- **Name-free**, no version pins; project-specific rules (domain abstractions, project theme
  specifics) deliberately left out. A coverage check against the sources confirmed no
  framework-general rule was dropped.

**Verification:** `just check` green (markers balanced, no dangling declarations, privacy lint);
both fragments self-wrapped and mapped. (Same commit also lands the F-003 plan and the F-005/F-006
intake.)

---

## F-002c — Composable CODING-STANDARDS: validator support (2026-07-17)

**Problem:** Nothing enforced the new fragment contract, so a malformed fragment marker or a
`MODULE.md` declaring a non-existent catalog fragment would pass silently.

**What was built (1 file — repo tooling, no VERSION bump):**

- `scripts/validate.py`: two new checks — (a) `check_fragment_markers` scans every file for
  `<!-- fragment:NAME -->` markers and stack-verifies they are balanced and well-nested; (b)
  `check_fragment_declarations` parses each `modules/*/MODULE.md` "Standards fragments"
  declaration and flags any fragment name absent from the `modules/standards/` catalog.

**Notable decisions:**

- The marker regex matches lowercase-kebab names only (`[a-z0-9][a-z0-9-]*`), so documentation
  placeholders (`fragment:NAME` uppercase, `fragment:<name>` bracketed) never false-positive —
  keeping the MANIFEST / README / §13 example markers clean.
- No VERSION bump: `validate.py` is repo tooling, not shipped template content.

**Verification:** `just check` green on the real repo; temporary fixtures confirmed both checks
fire (unclosed `fragment:zzz`; dangling declaration `nope`), then removed and re-verified green.

**This completes F-002** (composable CODING-STANDARDS fragments): contract + catalog scaffold
(F-002a), module migration (F-002b), validator (F-002c). Web fragments follow in F-003; the
coding-kit-side assembly is tracked separately.

---

## F-002b — Composable CODING-STANDARDS: migrate existing modules (2026-07-17)

**Problem:** After F-002a defined the fragment contract, the existing stack modules still shipped
their `CODING-STANDARDS.part.md` as unwrapped blocks — not conforming to the new append/marker
scheme.

**What was built (8 files):**

- `modules/{go,python,ts-node}/CODING-STANDARDS.part.md`: each wrapped in
  `<!-- fragment:<module> -->` … `<!-- /fragment:<module> -->` markers; rule text unchanged
  (marker-only diff — exactly 6 insertions total, markers balanced open=close per module).
- `modules/{go,python,ts-node}/MODULE.md`: added a `Standards fragments: (none)` declaration —
  these single-package language modules pull no catalog fragments.
- `VERSION` 0.3.0 → 0.3.1; `CHANGELOG.md` entry.

**Also in this commit (privacy scrub, not F-002b scope):** replaced a concrete downstream project
name with a neutral wording in `modules/go/MODULE.md` and the F-001 archive entry, per the
repo-wide no-real-names rule. Remediating the already-published git history is tracked as F-004.

**Notable decisions:**

- Fragments self-wrap (the marker lives in the fragment file), so the coding-kit assembly just
  concatenates — no wrapping at runtime.
- A module's own language part is `fragment:<module>`; catalog fragments are declared separately
  and are none for these three.

**Verification:** `just check` green; marker-only diff confirmed; markers balanced; declarations
present in all three `MODULE.md`; working-tree name scan clean.

---

## F-002a — Composable CODING-STANDARDS: fragment contract + catalog scaffold (2026-07-17)

**Problem:** The §13 stack slot took a single inserted module part, so a project could not
compose standards for several frameworks or grow them over time. F-002a lays the contract for
composable fragments; migration (F-002b) and validator support (F-002c) follow.

**What was built (5 files):**

- `MANIFEST.md`: registered the `<!-- fragment:NAME -->` … `<!-- /fragment:NAME -->` marker;
  updated the `module:coding-standards` marker and the `CODING-STANDARDS.part.md`
  module-contract row to append/wrap semantics; new "## Standards fragments" section (catalog,
  the `MODULE.md` `Standards fragments:` declaration, policy, assembly boundary).
- `core/CODING-STANDARDS.md`: §13 slot now documents append + per-fragment markers.
- `modules/standards/README.md` (new): catalog scaffold — framework→fragment mapping table
  (empty until fragments are authored) + how a module declares fragments.
- `VERSION` 0.2.0 → 0.3.0; `CHANGELOG.md` entry.

**Notable decisions:**

- Central reusable catalog `modules/standards/` (not fragments buried per stack module) — a
  fragment like `react`/`docker` can be pulled by any module that needs it.
- Fragments are self-wrapping (each file carries its own `fragment:NAME` markers); skills
  concatenate, no wrapping at runtime.
- A module pulls its own language fragment implicitly and declares additional catalog fragments
  via a `Standards fragments:` line in its `MODULE.md`.
- Runtime assembly stays coding-kit logic; F-002 defines only the contract + data + validator.
  Full end-to-end composition needs the coding-kit `choose-stack` change (tracked separately).

**Verification:** `just check` (validator) green; §13 slot and MANIFEST section reviewed;
internal link `../../MANIFEST.md` resolves; secrets/privacy scan clean.

---

## F-001 — Initial template build (2026-07-07)

**Problem:** No reusable template existed; every new project re-derived its setup from old
projects.

**What was built (90 files):**

- **Root meta level:** own CLAUDE.md (structure rules + sync invariant: managed-file
  change ⇒ VERSION bump + CHANGELOG entry + MANIFEST update), PROGRESS/-ARCHIVE, README,
  VERSION 0.1.0, CHANGELOG, MANIFEST (manifest-format 1: placeholder registry, marker
  conventions, file policies managed/seed/public-only/module, module contract, standard
  recipe set), governance (CONTRIBUTING, SECURITY, AI-DISCLOSURE, CODE_OF_CONDUCT on
  Contributor Covenant 3.0, Apache-2.0 LICENSE), hardened `.claude/settings.json`,
  `scripts/validate.py` (JSON/YAML/TOML syntax, placeholder registry, privacy lint),
  own CI (`just check` via SHA-pinned checkout v7.0.0 + mise-action v4.2.0), lefthook
  (gitleaks + validator), mise.toml + committed cross-platform mise.lock.
- **core/:** CLAUDE.md template (Graphiti as optional block), CODING-STANDARDS with
  write-then-verify (§10), trunk-based/squash (§11) and module slot (§12), CONTRIBUTING,
  SECURITY (adapt slots), HOW-TO-CODE-WITH-CLAUDE (contributor setup incl. plugin
  install), AI-DISCLOSURE (optional security-tool block), PROGRESS skeletons with
  FEATURE-INDEX (F-NNN), REQUIREMENTS (out-of-scope, dated decision logs, open-question
  checkboxes), M6-hardened settings.json + convention-overrides registry + skills README,
  issue forms + PR template, hardened ci.yml with `# module:ci-jobs` append marker,
  CodeQL toggle workflow (public-only, `{{CODEQL_LANGUAGES}}`), docs-only justfile
  (recipe contract setup/dev/test/lint/format/check/build), mise.toml (just/lefthook/
  gitleaks, lockfile=true), lefthook.yml (gitleaks + `just format` with stage_fixed),
  renovate.json (extends the coding-kit preset), .gitignore with `.env*`/private/
  conventions and module append marker, editorconfig/gitattributes, ADR scaffold.
- **modules/:** docs-only (core defaults), ts-node (pnpm + strict tsconfig per current
  `tsc --init` set + nodenext ESM + Biome + vitest; no Corepack dependency), python
  (uv + src layout + uv_build + ruff + pyright strict + pytest), go (distilled from a
  production Go service gold standard: gofmt gate, golangci-lint v2 standard set, -race
  tests, go-licenses gate locally + as CI job), swift-ios/java as documented stubs.

**Notable decisions:**

- Template content under `core/` + `modules/`, repo root owns its own docs/CI — resolves
  the dogfooding-vs-template conflict (root CLAUDE.md can't be both).
- Module justfile **replaces** the core justfile (no merge logic); the recipe set is the
  stable contract skills/CI call.
- CodeQL needs a language ⇒ registered placeholder `{{CODEQL_LANGUAGES}}` provided by the
  module; docs-only projects don't get the workflow.
- core/LICENSE ships the real Apache-2.0 text (canonical apache.org copy) as default;
  `/choose-license` replaces it only on deviation/TBD.
- Known caveat documented in `core/.claude/README.md`: deny rules beat allow rules, so
  `.env.example` may be blocked too depending on Claude Code version (fail-safe
  direction; D8 smoke test verifies empirically).

**Verification:** `just check` (validator) green; all four justfiles parse; lefthook
configs valid; `mise install` + `mise lock` work (28 platform entries); gitleaks clean;
personal-data grep zero hits.
