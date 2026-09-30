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
| F-003a | Collaboration Hub link below the diagram: toggle, link text, alignment | 2026-09-30 |
| F-003b | Hub link as overlay in the bottom-right corner; image frame; manifest defaults | 2026-09-30 |
| F-003 | Collaboration Hub link (F-003a, F-003b) | 2026-09-30 |
| F-004a | Empty/error states: state table, messages, policy-violation tracker (pure, tested) | 2026-09-30 |

---

## Open tasks — work top to bottom

### F-004 — Empty and error states

**Status:** PLANNED

**Problem:** A freshly added or misconfigured web part must not show a broken image.

**Idea:** Placeholder with editor guidance when no link is configured (where to find the
"Simple image" link in Signavio); readable error message (plus hub link if enabled) when
the image fails to load — including the case that the domain is blocked (owner request,
2026-09-30: the SharePoint embed web part needed the domain approved by IT first).

**Solution sketch** (updated 2026-09-30 by `/prep-step`; size: medium):

| State | Edit mode (editors) | Read mode (readers) |
|-------|---------------------|---------------------|
| No link | Guidance (Signavio → Share → Embed diagram → tab "Simple image" → copy the link) and a **"Configure"** button that opens the property pane | **Nothing** — the web part stays empty (owner decision) |
| Invalid link | The specific link error (e.g. embed code) in the web part body | Short: "The diagram is currently unavailable." |
| Image fails to load | Likely causes: sharing revoked in Signavio, link incorrect, **network / firewall / proxy blocks the Signavio domain** (ask IT to allow it) | Short: "The diagram could not be loaded." + hub link if enabled |
| Blocked by a security policy | Specific message naming the domain, pointing to the SharePoint administrator | Same as "fails to load" |

- The browser does not tell an `<img>` why loading failed (no status code) — hence the list
  of likely causes
- **Blocked detection:** listen for `securitypolicyviolation` (`img-src`/`default-src`) and
  remember violations for the image URL; when the image then fails, the cause is "blocked".
  The listener is removed in `onDispose`. Background (verified 2026-09-30): SharePoint
  Online's CSP is enforced for scripts only, and "HTML Field Security" applies to iframes —
  neither blocks the `<img>` today, so this path is a safeguard
- Error state is kept per image URL — changing the link clears an old error
- Pure, tested modules (state → message model with `loc/` keys, DOM builder, violation
  tracker); the web part only wires them; text via `textContent` only
- `propertyPane.open()` is a no-op in the local workbench (works in SharePoint)

**Dependencies:** F-002

#### F-004b — Wiring in the web part

**What:** Display mode handling (`displayMode`, `onDisplayModeChanged`), image `error`
event and violation tracker wired to the error state, "Configure" opens the property pane,
cleanup in `onDispose`, strings in `loc/`.

**Files:** `ProcViewWebPart.ts`, `renderDiagram.ts` (error callback), `ProcViewWebPart.module.scss`,
`loc/en-us.js`, `loc/mystrings.d.ts`, `linkErrors.test.ts`

**Dependencies:** F-004a

**Acceptance criteria:**
- [ ] `just check` and `just build` green
- [ ] Owner, in the local workbench (restart the dev server — new texts): no link in edit
      and read mode; embed code pasted; a link with a slightly changed `authkey` (valid
      format, Signavio answers 403 → "fails to load"); messages readable in the theme
- [ ] The "blocked" message cannot be triggered locally — covered by tests only

### F-012 — Localisation: German, English, French, Spanish

**Status:** BACKLOG

**Problem:** All texts and messages exist in English only; editors and readers on German,
French or Spanish SharePoint sites see a foreign-language web part.

**Idea:** Add language files for de-DE, fr-FR and es-ES next to en-US; SharePoint picks
the file matching the site/user language automatically (English as fallback). Toolbox
texts in the manifest (title, description, group) are localised as well.

**Solution sketch:**
- `loc/de-de.js`, `loc/fr-fr.js`, `loc/es-es.js`; manifest `title`/`description`/`group`
  with `de-DE`, `fr-FR`, `es-ES` entries
- Extend the `loc/` completeness test to all four languages — no text may be missing
- Texts entered by editors (caption, alt text, link text) stay as entered — page content,
  translated via SharePoint's multilingual pages if needed
- French and Spanish reviewed by native speakers before production use; the local
  workbench's pseudo-locale helps spot untranslated texts
- After F-004, so its new messages are translated in the same pass

**Dependencies:** F-004

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

### F-009 — Versioning, release via CI + IT deployment guide

**Status:** BACKLOG

**Problem:** IT needs a reproducible, versioned `.sppkg` and clear deployment steps. The
App Catalog only offers an update when the solution version increases — today it is fixed
(SemVer `1.0.0` plus a build part `0`) and would have to be changed by hand in two places.

**Idea:** One version number as the single source of truth, a release recipe that sets it
and tags the release, and a GitHub Actions workflow that builds the package on version
tags and attaches it to a GitHub release; a deployment guide for IT.

**Solution sketch:**
- Version only in `package.json` (SemVer, e.g. `1.2.0`); `package-solution.json`
  (solution + feature: the SemVer plus a trailing build part `0`) derived by a script and
  checked in CI
- Release recipe (e.g. `just release 1.2.0`): set version, update `CHANGELOG.md`, commit,
  tag — the tag triggers the CI release with the `.sppkg` attached
- Version shown in the property pane (small note, e.g. "ProcView 1.2.0") for support
  (owner decision 2026-09-30)
- `CHANGELOG.md`; `docs/deployment.md` for IT (App Catalog upload, updating an existing
  deployment, tenant-wide availability, data-classification rule for shared links)
- Still to analyse (prep-step): script vs. `npm version` hook; whether `dataVersion` needs
  bumps for property migrations

**Dependencies:** F-002 (a usable web part)

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
next-feature: F-013
F-001 Provider interface + Signavio provider (DONE)
F-002 Configuration pane + diagram display with size control (DONE)
F-003 Collaboration Hub link (DONE)
F-004 Empty and error states (PLANNED)
F-005 Theme, section backgrounds, accessibility
F-006 Zoom and pan (checkbox)
F-007 Full-screen view (lightbox)
F-008 Microsoft Teams hosting
F-009 Versioning, release via CI + IT deployment guide
F-010 SPFx upgrade before Node 22 end of life
F-011 Local testing setup + online workbench retirement (DONE)
F-012 Localisation: German, English, French, Spanish
-->
