# spfx-procview — Progress

<!-- section:progress-head -->
Living task list. **Done table** at the top, **open tasks in execution order** below,
**feature index** at the very end. Entries are written in English; the
structure (headings, Done table, FEATURE-INDEX block) stays as-is — the workflow skills
depend on it.

How it works: `/add-feature` intakes new tasks (F-number), `/prep-step` prepares and
decomposes, `/step-done` finishes (review, secrets scan, docs, commit question).
Details: `HOW-TO-CODE-WITH-CLAUDE.md`.
<!-- /section:progress-head -->

---

## Done

| Step | Description | Completed |
|------|-------------|-----------|
| — | _(nothing finished yet)_ | — |

---

## Open tasks — work top to bottom

### F-001 — Provider interface + Signavio provider

**Status:** PLANNED

**Problem:** The web part must turn an editor-supplied link into a displayable diagram image
and reject anything else — today only for Signavio, later for other process tools.

**Idea:** Define a small provider contract (does this link belong to me? → image URL, hub URL,
validation errors) and implement it for Signavio "Simple image" links — the only accepted
input (Signavio: Share → Embed diagram → tab "Simple image"). PNG resolution is settled
(natural size); the regional hosts are verified (see below).

**Solution sketch** (updated 2026-09-29 by `/prep-step`):
- Pure functions outside the web part class (testable with Jest); no UI — wiring into the
  property pane is F-002
- **Rebuild, never pass through:** the image URL is reassembled from validated parts
  (`https://<allow-listed host>/p/model/<id>/png?inline&authkey=<key>`) — no foreign query
  parameters, fragments or userinfo (`https://editor.signavio.com@example.com/…`) can reach
  the `<img>`
- **Exact host match** against the 7 verified hosts (DNS + endpoint checked 2026-09-29):
  `editor.signavio.com` (EU), `app-us`, `app-au`, `app-ca`, `app-jp`, `app-kr`,
  `app-sgp.signavio.com` — no suffix matching (lookalikes are rejected)
- Model id = 32 hex chars; `authkey` = hex of **variable length** (real links: 62 and 64) —
  accept 32–128; case-insensitive match, value passed on unchanged
- **Errors as codes** (`empty`, `unsupported`, `notUrl`, `notHttps`, `unknownHost`,
  `embedCode`, `notImageLink`, `missingAuthKey`, `invalidModelId`, `invalidAuthKey`) —
  F-002 maps them to `loc/` strings; `embedCode`/`notImageLink` carry the hint to the
  "Simple image" tab
- Hub link `https://<host>/p/portal#/model/<id>` (verified for EU; same pattern assumed for
  the other regions — open question in REQUIREMENTS)
- Provider registry with Signavio as the only entry; no new dependencies
- Real shared links live in `private/test-links.md` (gitignored); tests use placeholder
  links only — model ids/authkeys are on the privacy-lint blocklist

**Dependencies:** —

#### F-001a — Provider contract, registry, test pipeline

**What:** Types for the provider contract and parse result (success with `imageUrl`,
`hubUrl`, `modelId`; failure with an error code), a registry that trims input, rejects
empty input and asks each provider; first Jest test in the project.

**Files:** `src/providers/types.ts`, `src/providers/registry.ts`,
`src/providers/registry.test.ts`

**Dependencies:** —

**Acceptance criteria:**
- [ ] `just check` runs ≥ 1 real Jest test (`Total` > 0)
- [ ] A deliberately failing assertion makes `just check` fail (then reverted)
- [ ] Empty/whitespace input → `empty`; input no provider claims → `unsupported`
- [ ] Registry tested with a stub provider (no Signavio dependency yet)

#### F-001b — Signavio provider

**What:** Signavio implementation of the contract: host allow-list, URL parsing and
validation, normalised image URL, derived hub link, detection of typical wrong inputs;
registered in the registry.

**Files:** `src/providers/signavio.ts`, `src/providers/signavio.test.ts`,
`src/providers/registry.ts` (registration)

**Dependencies:** F-001a

**Acceptance criteria:**
- [ ] Valid links for all 7 hosts are recognised (with and without `inline`); output URL
      and hub link are normalised
- [ ] Negative tests (CODING-STANDARDS §10): `http:`, `javascript:`, lookalike hosts,
      userinfo trick, extra query parameters/fragments dropped, invalid model id, missing/
      invalid `authkey`, embed code (`signavio.js`/`authToken`), hub/portal link, model link
      without `/png`, surrounding whitespace
- [ ] Tests contain placeholder ids/keys only — privacy-lint (with blocklist) green
- [ ] Local, uncommitted check: both real links from `private/test-links.md` parse
      correctly against the compiled output

### F-002 — Configuration pane + diagram display with size control

**Status:** BACKLOG

**Problem:** SharePoint's iframe embed gives no control over the diagram size — the core pain
point of the project.

**Idea:** A small configuration pane — image link; width and height, each px or `auto`;
read-only info with the image's maximum (natural) size; checkboxes "Offer zoom" and
"Show Collaboration Hub link"; optional alt text — and an `<img>` rendering of the
provider's image URL.

**Solution sketch:**
- Property pane: link text field with provider validation (`onGetErrorMessage`); width/
  height fields accepting a number or `auto`; natural size read via `naturalWidth ×
  naturalHeight` after the image loads and shown as a label; two checkboxes (feature
  flags for F-003/F-006)
- Sizing: both `auto` → natural size capped at column width; one fixed → aspect ratio;
  both fixed → fit inside the box (`object-fit: contain`), never distorted
- DOM built with escaping / DOM properties only (CODING-STANDARDS §13)
- Builds on the minimal placeholder web part (generator sample UI already removed)

**Dependencies:** F-001

### F-003 — Collaboration Hub link (checkbox)

**Status:** BACKLOG

**Problem:** Readers need a way from the static image to the interactive diagram in the
Collaboration Hub.

**Idea:** When "Show Collaboration Hub link" is checked (F-002 pane), show a link below the
diagram — always derived from the model id, no manual override.

**Solution sketch:**
- Link text from `loc/`; opens in a new tab with `rel="noopener noreferrer"`, styled as a
  theme link
- Target format per the open question in REQUIREMENTS (`/p/portal#/model/<id>` for now)

**Dependencies:** F-001, F-002

### F-004 — Empty and error states

**Status:** BACKLOG

**Problem:** A freshly added or misconfigured web part must not show a broken image.

**Idea:** Placeholder with editor guidance when no link is configured (where to find the
"Simple image" link in Signavio); readable error message (plus hub link if enabled) when
the image fails to load.

**Solution sketch:**
- SPFx placeholder pattern (Fluent UI Core classes) in edit mode
- `<img>` `error` handler → error state; strings in `loc/`

**Dependencies:** F-002

### F-005 — Theme, section backgrounds, accessibility

**Status:** BACKLOG

**Problem:** The web part must look native on any site theme and section background and be
usable with keyboard and screen readers.

**Idea:** Complete the theme handling started in the scaffold (`onThemeChanged` → CSS
variables, SCSS theme tokens) for all elements, and check accessibility basics.

**Solution sketch:**
- Semantic colors for text, links, placeholders; no hard-coded colors
- Keyboard focus styles, alt text required, contrast check on dark/colored sections

**Dependencies:** F-002, F-003, F-004

### F-006 — Zoom and pan (checkbox)

**Status:** BACKLOG

**Problem:** Large process diagrams are hard to read at page width.

**Idea:** When "Offer zoom" is checked (F-002 pane): zoom in/out/reset controls and drag/
touch panning inside the web part frame, styled from the page theme.

**Solution sketch:**
- CSS transform on the image inside a clipped container; pointer events for panning
- Fluent UI Core icon font from `@microsoft/sp-office-ui-fabric-core` (no new dependency)
- Maximum zoom = natural image size (the PNG renders at natural diagram size — sharp up to
  100 %)

**Dependencies:** F-002, F-005

### F-007 — Full-screen view (lightbox)

**Status:** BACKLOG

**Problem:** Within a narrow page column even a zoomable diagram stays cramped.

**Idea:** Clicking the diagram (or a button) opens it in a large overlay at natural size;
closes via button, Escape, or backdrop click.

**Solution sketch:**
- Accessible dialog (focus trap, `aria-modal`), theme colors
- Reuses zoom/pan from F-006 where sensible

**Dependencies:** F-002, F-005 (F-006 optional)

### F-008 — Microsoft Teams hosting

**Status:** BACKLOG

**Problem:** The manifest already declares Teams hosts; they must actually work, or be
removed.

**Idea:** Verify the web part as Teams tab and personal app, including Teams light/dark/
high-contrast themes, and fix host-specific issues.

**Solution sketch:**
- Test via the Teams deployment path of the App Catalog
- Theme handling through the same `onThemeChanged` path

**Dependencies:** F-002, F-005

### F-009 — Release via CI + IT deployment guide

**Status:** BACKLOG

**Problem:** IT needs a reproducible, versioned `.sppkg` and clear deployment steps.

**Idea:** A GitHub Actions workflow builds the package on version tags and attaches it to a
GitHub release; a deployment guide explains App Catalog upload, tenant-wide availability
and the data-classification rule for shared links.

**Solution sketch:**
- Release workflow reusing `just build`; version sync between `package.json` and
  `package-solution.json`
- `docs/deployment.md` for IT

**Dependencies:** F-002 (a usable web part)

---

## Feature ideas (backlog)

_New ideas are intaked via `/add-feature` and get the next F-number._

### F-010 — SPFx upgrade before Node 22 end of life

**Status:** BACKLOG

**Problem:** SPFx 1.23 supports Node 22 only; Node 22 reaches end of life on 2027-04-30.
After that date the toolchain runs on an unsupported runtime.

**Idea:** Upgrade to the first stable SPFx release that supports a newer Node LTS, as one
deliberate task (README "Upgrading SPFx"), well before the deadline.

**Solution sketch:**
- CLI for Microsoft 365 upgrade report; SPFx packages, toolchain, Node major, `engines`
  and Renovate Node rule move together
- Re-evaluate `npm audit` against ADR-0001; drop the `qs` override if no longer needed

**Dependencies:** a stable SPFx release on a newer Node LTS (1.24 was in beta on 2026-09-29)

---

<!-- FEATURE-INDEX
next-feature: F-011
F-001 Provider interface + Signavio provider (PLANNED)
F-002 Configuration pane + diagram display with size control
F-003 Collaboration Hub link (checkbox)
F-004 Empty and error states
F-005 Theme, section backgrounds, accessibility
F-006 Zoom and pan (checkbox)
F-007 Full-screen view (lightbox)
F-008 Microsoft Teams hosting
F-009 Release via CI + IT deployment guide
F-010 SPFx upgrade before Node 22 end of life
-->
