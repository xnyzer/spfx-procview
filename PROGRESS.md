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

---

## Open tasks — work top to bottom

### F-011 — Local testing setup + online workbench retirement

**Status:** BACKLOG

**Problem:** The SharePoint Framework online workbench (`workbench.aspx`) is deprecated since
SPFx 1.23 and retired on 2026-12-01, yet `config/serve.json`, `.vscode/launch.json`, the
README and `just dev` still target it. The owner has no tenant, so the web part needs a way
to be viewed locally; testing on real pages later happens in a test site provided by IT.

**Idea:** Make the community "SPFx Local Workbench" VS Code extension (PnP, MIT, Heft-based
SPFx 1.22+, no tenant needed) the local way to view the web part, and replace every
online-workbench reference with the SPFx Debug Toolbar on normal SharePoint pages.

**Solution sketch:**
- Workspace setting `spfxLocalWorkbench.serveCommand` runs Heft through mise (Node 22) —
  the owner's shell loads Node 24 via nvm, which SPFx 1.23 does not support
- `just dev` serves without opening a browser (`heft start --clean --nobrowser`)
- README "Testing": one-time setup (install extension, trust the dev certificate
  deliberately), daily use (command "Start SPFx Serve and Open Workbench"), on-page testing
  with the Debug Toolbar in an IT test site
- Remove/replace `workbench.aspx` in `serve.json`, `launch.json`, README
- No new project dependencies (the extension lives in VS Code, not in `package.json`)

**Dependencies:** —

### F-002 — Configuration pane + diagram display with size control

**Status:** PLANNED

**Problem:** SharePoint's iframe embed gives no control over the diagram size — the core pain
point of the project.

**Idea:** A small configuration pane — image link; width (px, % of the column, or `auto`);
height (px or `auto`); read-only info with the image's maximum (natural) size; optional alt
text — and an `<img>` rendering of the provider's image URL. The checkboxes "Show
Collaboration Hub link" and "Offer zoom" arrive with F-003 and F-006 (no switch without
its function).

**Solution sketch** (updated 2026-09-30 by `/prep-step`):
- Width/height are text fields: empty or `auto` → automatic; a whole number → px; width
  also accepts `NN%` (1–100, of the column). Height has no `%` — the column has no fixed
  height, so a percentage would resolve to `auto`. Upper bound 10 000 px against typos
- Sizing: both `auto` → natural size capped at column width; one fixed → aspect ratio;
  both fixed → fit inside the box (`object-fit: contain`), never distorted
- Pure, tested modules for sizing, error-code → `loc/` key mapping and DOM building; jsdom
  (the rig's Jest environment) tests the DOM without SharePoint; the web part class only
  wires them together
- `<img>` with `referrerpolicy="no-referrer"` (Signavio does not learn the SharePoint page
  URL; the image loads without a referrer — every curl check had none), `loading="lazy"`,
  `decoding="async"`
- Link validation via `onGetErrorMessage` with deferred validation; every `LinkErrorCode`
  has a message in `loc/` (`embedCode`/`notImageLink` point to the "Simple image" tab);
  full empty/error states stay F-004 — F-002 shows the existing placeholder
- Natural size read on the image `load` event and shown via `PropertyPaneLabel`; pane
  refreshed with `propertyPane.refresh()` when open
- DOM built with DOM properties only (CODING-STANDARDS §13); `dataVersion` stays 1.0
  (nothing released yet)
- Visual check: recommended in the local workbench (F-011) — not an acceptance criterion

**Dependencies:** F-001 (done); F-011 recommended first for the visual check

#### F-002a — Sizing and error messages (pure, tested)

**What:** `parseDimension()` (empty/`auto` → auto, whole number → px, width also `NN%`;
everything else rejected), `imageStyle(width, height)` returning the CSS for all
combinations, and a mapping of every `LinkErrorCode` to a `loc/` string key.

**Files:** `src/webparts/procView/sizing.ts`, `sizing.test.ts`, `linkErrors.ts`,
`linkErrors.test.ts`

**Dependencies:** —

**Acceptance criteria:**
- [ ] All sizing combinations tested (auto/auto, px/auto, %/auto, auto/px, px/px, %/px)
- [ ] Negative tests: negative, `0`, decimals, `12px`, `0%`, `101%`, `%` for height,
      > 10 000, text
- [ ] Every `LinkErrorCode` maps to a `loc/` key — enforced by the type and a test
- [ ] `just check` green

#### F-002b — Configuration pane and diagram display

**What:** Property pane (image link with deferred validation and messages, width, height,
alt text, natural-size label), `<img>` rendering via a pure DOM builder, strings in
`loc/`, styles from the theme.

**Files:** `ProcViewWebPart.ts`, `ProcViewWebPart.module.scss`, `loc/en-us.js`,
`loc/mystrings.d.ts`, `renderDiagram.ts`, `renderDiagram.test.ts`
(all under `src/webparts/procView/`)

**Dependencies:** F-002a

**Acceptance criteria:**
- [ ] jsdom test: valid link → `<img>` with the rebuilt URL, `alt` (or default text),
      `referrerpolicy="no-referrer"`, `loading="lazy"` and the sizing styles; invalid link
      → placeholder, no `<img>`
- [ ] Web part class builds no markup strings (`innerHTML` not used)
- [ ] `just check` and `just build` green
- [ ] Recommended, not required: visual check in the local workbench (F-011)

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
F-002 Configuration pane + diagram display with size control (PLANNED)
F-003 Collaboration Hub link (checkbox)
F-004 Empty and error states
F-005 Theme, section backgrounds, accessibility
F-006 Zoom and pan (checkbox)
F-007 Full-screen view (lightbox)
F-008 Microsoft Teams hosting
F-009 Release via CI + IT deployment guide
F-010 SPFx upgrade before Node 22 end of life
F-011 Local testing setup + online workbench retirement
-->
