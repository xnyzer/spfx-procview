# spfx-procview — Coding Standards

Binding rules for every code change. This document is the working instruction — whoever
writes or reviews code follows these rules. The language-agnostic rules below always
apply; **stack-specific rules are in the final section** (provided by the stack module).

---

## 1. Mindset

- **No workarounds.** Always fix the root cause. No `// HACK`, no `// TODO: fix later`.
- **Fix errors immediately.** Don't defer, don't ignore, don't dismiss as "pre-existing".
  Linter/diagnostic warnings count as errors.
- **Use established patterns.** Don't invent your own when a proven one exists. For
  anything security-critical (crypto, auth, session handling), use a vetted library —
  never hand-roll.
- **Code must be production-ready when first written.** No "good enough for now".
- **Dead code is deleted.** No commented-out blocks, no unused imports, no unreachable paths.

---

## 2. Files & structure

- **File names:** use the stack's casing convention (see the stack section); descriptive,
  consistent.
- **Tests** live next to or mirror the code they test, following the stack's convention.
- **File length:** target under 300 lines — at 300, check whether it can be split.
  Hard limit 500. Exception: clearly delimited modules with section comments.
- **Section comments** structure large files: short, descriptive, visually set apart
  (ASCII rules). No rambling block comments.

---

## 3. Functions & methods

- **Target: under 30 lines** — a function does one thing. **Hard limit: 50 lines.**
  Exception: sequential orchestration functions up to ~80 lines.
- **Naming:** verb first — `parseConfig`, `renderGallery`. Follow the stack's casing.
- **Booleans:** `is`/`has`/`can`/`should` — `isExpired`, `hasChanges`.
- **Exported functions:** explicit return type where the language supports it.
- **Maximum 3 parameters** — beyond that, an options object/struct.

---

## 4. Naming & imports

- **Descriptive names**, no single letters except trivial loop indices. Names reveal intent.
- **No magic values** — named constants for timeouts, limits, defaults.
- **Imports grouped and ordered:** standard library, third-party, local. No unused
  imports. No wildcard imports where the language allows specificity.

---

## 5. Comments & documentation

- **Comment the "why", not the "what".** The code shows what it does; a comment earns its
  place by explaining a non-obvious reason, constraint, or trade-off — never by restating
  the code.
- **Document the public surface.** Every exported function, type, and non-obvious
  configuration field carries a doc-comment in the language's convention (JSDoc, docstring,
  GoDoc, …): purpose, parameters, and return value/units where not self-evident.
- **Language: English** for all comments, doc-comments, and identifiers. The only exception
  is user-facing text, which goes through the project's i18n/localisation layer — never
  hardcoded.

---

## 6. Control flow

- **Early returns / guard clauses** over deep nesting. Handle the error/edge case first,
  keep the happy path unindented.
- **No deeply nested conditionals** (target max 2–3 levels).
- **Exhaustive handling** of enums/variants — no silent fall-through.

---

## 7. Error handling, resilience & concurrency

- **Typed/custom errors** with clear names. Raise in the core, handle centrally.
- **No empty catch / error-swallowing.** Never leak internal details (stack traces,
  internal paths) to users or clients.
- **Fail loud, fail early:** invalid state stops with a clear message; never continue
  with silently-wrong results. On security-relevant paths, fail **closed**.
- **No unhandled rejections/panics** on production paths.
- **Deduplicate concurrent async work.** Where shared mutable state, several independent
  async triggers, and expensive or side-effectful work meet (a token refresh, a migration,
  a cache populate, an external call), the first caller stores its in-flight promise/future
  and every concurrent caller awaits that same one — the operation never runs twice in
  parallel. Cheap idempotent reads need no such guard.
- **Completion marker last.** Set the "done" flag only after the awaited work has
  completed — never before, or concurrent readers observe a half-finished state as
  finished.

---

## 8. Security & secrets

- **No hand-rolled crypto/auth.** Vetted libraries only.
- **Never commit secrets or private identifiers** — no tokens, passwords, private keys,
  private emails, real names (people, customers, concrete projects), or deployment internals
  (IPs, hostnames, key names). Operational internals belong in `private/` (gitignored).
  gitleaks runs pre-commit; treat it as a backstop, not an excuse.
- **All secrets via config/env**; an example env file contains only placeholders and is
  always complete.
- **Config validation at startup** — missing/invalid values fail fast with a clear
  message, never silent misbehaviour.
- **No secrets in logs** (mask keys, tokens, credentials).
- **Pinned versions** instead of `latest` for images, actions, and dependencies.
  **All dependencies permissive-licensed (no GPL/AGPL)** — deviations only as a conscious,
  documented decision.

---

## 9. Configuration & observability

- **Everything configurable, nothing hardcoded:** endpoints, limits, ports, paths — via
  config/env with sane defaults.
- **Structured logging** where the project runs as a service; log level via env; relevant
  events measurable without leaking secrets.

---

## 10. Testing

- **Business logic has unit tests**, using the stack's standard test framework.
- **Negative tests are mandatory** wherever input is untrusted or a boundary is enforced:
  the invalid, the malformed, and the hostile case must be rejected — with a test proving it.
- **Never commit with red tests.** Fix pre-existing red tests anyway, or report them
  explicitly.
- `just check` (format check + lint + types + tests) must be green before any commit.

---

## 11. Write-then-verify

- **After every edit, verify the result** — re-read the file, run the relevant check, or
  execute the affected path. Never report something as done without tool evidence.
- Applies to docs the same as to code: links resolve, referenced files exist, examples run.
- When a change spans several files, verify the **whole chain** once at the end
  (`just check` at minimum), not just the last file touched.

---

## 12. Commits, branches & pull requests

- **Conventional Commits**, English, imperative mood; justify trade-offs briefly in the
  body (`Decision: X over Y because …`).
- Body ends with `Co-Authored-By: Claude <noreply@anthropic.com>` where applicable.
- **Commit email = GitHub noreply** — verify before each commit; never a private address.
- **Never auto-commit** — always wait for the owner's explicit "yes".
- **Focused commits** — one concern per commit.
- **Trunk-based:** short-lived feature branches onto `main`; PRs optional for solo work
  but CI must be green either way; **squash-merge**; delete the branch after merge.

---

## 13. Stack-specific rules

Stack rules are composed here from **standards fragments** — one self-contained block per
language or framework, each wrapped in `<!-- fragment:NAME -->` … `<!-- /fragment:NAME -->` and
appended inside the slot below. A stack module contributes its own language fragment plus any
catalog fragments it declares; adding a framework later appends its fragment, and nothing above
this section changes. Contract: `MANIFEST.md` § Standards fragments.

<!-- module:coding-standards -->
<!-- fragment:spfx -->
### SharePoint Framework (SPFx adaptation of the ts-node module)

- **Toolchain is owned by SPFx.** SPFx 1.23 on the **Heft** rig (`@microsoft/spfx-web-build-rig`);
  `tsconfig.json`, ESLint profile, Jest and webpack config come from the rig — extend, never
  fork them (no `heft eject-webpack`). Versions of `typescript`, `eslint`, `@rushstack/heft`
  and all `@microsoft/sp*` packages are dictated by the SPFx release and change only as one
  deliberate SPFx upgrade task (Renovate groups/blocks them accordingly).
- **Runtime:** Node 22 via mise (`engines` enforces `>=22.14 <23`). **Package manager: npm**
  (`package-lock.json` committed; `just setup` runs `npm ci`).
- **No UI framework.** The web part renders with plain DOM/template strings
  (`--framework none`). Adding React or other runtime libraries is an architecture decision
  (ADR), not a drive-by change.
- **Escape everything that reaches HTML.** Every value from web part properties, URLs, or
  remote content is set via DOM properties (`textContent`, `setAttribute`) — never
  concatenated raw into `innerHTML`. Web part properties are read in one place that checks
  type and shape of every value (`settings.ts`).
  URLs are validated (scheme `https:` and an allow-listed host) before use. Links that open
  a new tab always carry `rel="noopener noreferrer"`.
- **Theme-aware by default.** `supportsThemeVariants` stays `true`; colors come from the page
  theme via `onThemeChanged()` → CSS custom properties and SCSS theme tokens
  (`"[theme:bodyText, default: #323130]"`) — no hard-coded colors. Icons are small inline
  SVGs drawn in `currentColor` and hidden from screen readers — no icon fonts or icon
  libraries in the bundle; the toolbox icon is a name from SharePoint's own icon font.
- **Compile target is ES5 with the ES2015 lib** (rig default): APIs newer than ES2015 are not
  typed — check before using them, prefer small helpers over polyfills.
- **Tests: Jest** (via `heft test`), colocated as `*.test.ts` next to the code; keep logic
  (URL parsing, provider detection, sizing) in plain functions outside the web part class
  so it is testable without SharePoint.
- **Naming & files:** SPFx conventions — PascalCase file names for components
  (`ProcViewWebPart.ts`, `*.module.scss`), camelCase folders under `src/webparts/`; user-facing
  strings live in `loc/` (never hard-coded).
- **Formatting/linting:** Prettier (`.prettierrc.json`) formats `src/` and config;
  ESLint uses the SPFx profile with zero warnings. **No `any`** — use `unknown` and narrow.
- **Dependencies:** permissive licenses only (§8) — the one accepted exception is the SPFx
  platform itself (Microsoft SPFx license terms, ADR-0001). Every runtime dependency ends up
  in the bundle delivered to all page visitors — justify each one. Never run
  `npm audit fix --force` (it downgrades SPFx); toolchain advisories are handled per ADR-0001
  and ADR-0002.
- **SPFx upgrades** are a deliberate task, never a drive-by Renovate merge: SPFx packages,
  TypeScript/ESLint/Heft and the Node major move together (README "Upgrading SPFx").
<!-- /fragment:spfx -->
<!-- /module:coding-standards -->
