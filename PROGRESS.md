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
| F-001a | Provider contract, registry and first Jest tests (test pipeline verified) | 2026-09-29 |
| F-001b | Signavio provider: host allow-list, link validation, normalised image/hub URLs, 38 tests | 2026-09-29 |
| F-001 | Provider interface + Signavio provider (F-001a, F-001b) | 2026-09-29 |
| F-011 | Local testing via SPFx Local Workbench; online workbench references replaced by the Debug Toolbar | 2026-09-30 |
| F-002a | Sizing (px / % of column / auto) and error-message mapping, pure and tested | 2026-09-30 |
| F-002b | Configuration pane, diagram display, caption with alignment toolbar | 2026-09-30 |
| F-002 | Configuration pane + diagram display with size control (F-002a, F-002b) | 2026-09-30 |

---

## Open tasks — work top to bottom

### F-003 — Collaboration Hub link (checkbox)

**Status:** BACKLOG

**Problem:** Readers need a way from the static image to the interactive diagram in the
Collaboration Hub.

**Idea:** Add the checkbox "Show Collaboration Hub link" to the configuration pane (introduced
here, together with its function) and, when checked, show a link below the diagram —
always derived from the model id, no manual override.

**Solution sketch:**
- Link text from `loc/`; opens in a new tab with `rel="noopener noreferrer"`, styled as a
  theme link
- Placed below the caption (F-002 renders `<figure>` with an optional `<figcaption>`)
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

**Idea:** Add the checkbox "Offer zoom" to the configuration pane (introduced here, together
with its function); when checked: zoom in/out/reset controls and drag/touch panning inside
the web part frame, styled from the page theme.

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
next-feature: F-012
F-001 Provider interface + Signavio provider (DONE)
F-002 Configuration pane + diagram display with size control (DONE)
F-003 Collaboration Hub link (checkbox)
F-004 Empty and error states
F-005 Theme, section backgrounds, accessibility
F-006 Zoom and pan (checkbox)
F-007 Full-screen view (lightbox)
F-008 Microsoft Teams hosting
F-009 Release via CI + IT deployment guide
F-010 SPFx upgrade before Node 22 end of life
F-011 Local testing setup + online workbench retirement (DONE)
-->
