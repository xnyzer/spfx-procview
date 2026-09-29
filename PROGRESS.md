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

**Status:** BACKLOG

**Problem:** The web part must turn an editor-supplied link into a displayable diagram image
and reject anything else — today only for Signavio, later for other process tools.

**Idea:** Define a small provider contract (does this link belong to me? → image URL, hub URL,
validation errors) and implement it for Signavio "Simple image" links. Starts with a short
spike against a large real diagram to settle the open questions on resolution and hosts.

**Solution sketch:**
- Pure functions outside the web part class (testable with Jest): parse, validate
  (`https:`, host allow-list, `/p/model/<id>/png`, `authkey` present), derive hub link
- Provider registry with Signavio as the only entry
- No new dependencies
- Real shared links for the spike live in `private/test-links.md` (gitignored); tests use
  placeholder links only — model ids/authkeys are on the privacy-lint blocklist

**Dependencies:** —

### F-002 — Diagram display with size control

**Status:** BACKLOG

**Problem:** SharePoint's iframe embed gives no control over the diagram size — the core pain
point of the project.

**Idea:** Replace the scaffold's sample UI with an `<img>` rendering of the provider's image
URL and property pane settings for link, size mode (fit to width / fixed width / fixed
height, px or %) and alt text.

**Solution sketch:**
- Property pane: text field with provider validation, dropdown for size mode, numeric size
- DOM built with escaping / DOM properties only (CODING-STANDARDS §13)
- Builds on the minimal placeholder web part (generator sample UI already removed)

**Dependencies:** F-001

### F-003 — Optional Collaboration Hub link

**Status:** BACKLOG

**Problem:** Readers need a way from the static image to the interactive diagram in the
Collaboration Hub.

**Idea:** Show a link below the diagram, derived from the model id by default, with an
overridable URL and link text and an on/off toggle.

**Solution sketch:**
- Property pane group "Collaboration Hub link"
- Opens in a new tab (`rel="noopener"`), styled as a theme link

**Dependencies:** F-001, F-002

### F-004 — Empty and error states

**Status:** BACKLOG

**Problem:** A freshly added or misconfigured web part must not show a broken image.

**Idea:** Placeholder with editor guidance when no link is configured; readable error
message (plus hub link if available) when the image fails to load.

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

### F-006 — Zoom and pan

**Status:** BACKLOG

**Problem:** Large process diagrams are hard to read at page width.

**Idea:** Zoom in/out/reset controls and drag/touch panning inside the web part frame,
styled from the page theme.

**Solution sketch:**
- CSS transform on the image inside a clipped container; pointer events for panning
- Fluent UI Core icon font from `@microsoft/sp-office-ui-fabric-core` (no new dependency)
- Usefulness depends on the PNG resolution (open question from F-001)

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
F-001 Provider interface + Signavio provider
F-002 Diagram display with size control
F-003 Optional Collaboration Hub link
F-004 Empty and error states
F-005 Theme, section backgrounds, accessibility
F-006 Zoom and pan
F-007 Full-screen view (lightbox)
F-008 Microsoft Teams hosting
F-009 Release via CI + IT deployment guide
F-010 SPFx upgrade before Node 22 end of life
-->
