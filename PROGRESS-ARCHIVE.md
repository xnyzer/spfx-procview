# spfx-procview — Progress Archive

<!-- section:archive-head -->
Finished tasks with their full write-up: what was implemented, which files were touched,
and notable decisions or deviations. Newest entries at the top. The living list is
`PROGRESS.md`.
<!-- /section:archive-head -->

---

### F-008 — Microsoft Teams hosting

_Completed 2026-10-01._

**Problem:** The manifest already declares Teams hosts; they must actually work, or be
removed.

**Idea:** Make the web part work as a Teams tab including the Teams light/dark/high-contrast
themes, and remove what cannot work.

**Solution sketch** (updated at prep-step, 2026-10-01; size: small–medium, no substeps):
- **Teams theme:** in Teams the web part gets the SharePoint site's theme, not the Teams
  theme — in dark or high-contrast Teams it would be a light block. When
  `this.context.sdks.microsoftTeams` exists, read `teamsJs.app.getContext()` → `app.theme`
  and follow `teamsJs.app.registerOnThemeChangeHandler` (TeamsJS v2.36 ships with SPFx, MIT);
  `dark` and `contrast` override the CSS variables (F-005) with fixed palettes in the style of
  the Fluent UI Teams themes (values verified at build time); `default` keeps the SharePoint
  colours from `onThemeChanged`
- New pure `teamsTheme.ts` (palettes, theme name → variables) with tests; `theme.ts` gets a
  generic "apply these variables" helper
- **Remove `TeamsPersonalApp`** from `supportedHosts` (owner decision 2026-10-01): personal
  apps show no property pane (Microsoft Learn), so no link could ever be entered — readers
  would see an empty app. `TeamsTab` stays (the pane appears when the tab is added)
- Full screen and the diagram background need no change (dark layer, white behind the PNG)
- README section "Microsoft Teams": add as a channel tab, IT step "Sync to Teams" in the
  App Catalog, limits
- No Teams simulation locally (the local workbench sets `sdks.microsoftTeams` to undefined):
  Teams logic covered by tests with a mocked TeamsJS; the real check moves to the IT test site

**Files:** `teamsTheme.ts`, `teamsTheme.test.ts` (new), `theme.ts`, `theme.test.ts`,
`ProcViewWebPart.ts`, `ProcViewWebPart.manifest.json` (under `src/webparts/procView/`);
`README.md`; `REQUIREMENTS.md` (decision log)

**Dependencies:** F-002, F-005

**Acceptance criteria:**
- [x] Tests: the Teams theme is read on start and theme changes are applied; `default` keeps
      the SharePoint colours; outside Teams nothing changes (`teamsTheme.test.ts`, 9;
      `theme.test.ts` +1)
- [x] `TeamsPersonalApp` removed from the manifest; `TeamsTab`, SharePoint web part and full
      page remain
- [x] README "Microsoft Teams"; decision log entry
- [x] `just check` green — 271 tests (isolated copy while the dev server runs)
- [ ] **Open — IT test site** (not possible locally): add as a Teams tab, configure, check
      light/dark/high contrast — especially the unverified high-contrast palette

**Implemented:**
- `teamsTheme.ts` — `parseTeamsTheme`; palettes `DARK` (Fluent UI v9 `teamsDarkTheme` tokens:
  teamsDarkColor.ts with the Teams brand ramp, red tint30 for errors — verified 2026-10-01 in
  the fluentui repository) and `CONTRAST` (classic Teams black/white/yellow/cyan — fixed values,
  because Fluent v9 maps it to CSS system colours that only resolve in OS forced-colours mode;
  not checked against a published source); `teamsThemeVariables(theme)` (undefined for
  `default`); `followTeamsTheme(teamsJs, onTheme)` registers the change handler and reads
  `getContext()` (errors ignored → SharePoint colours stay).
- `theme.ts` — `applyVariables(style, variables)`; `applyThemeVariables` uses it.
- `ProcViewWebPart.ts` — `_siteTheme` from `onThemeChanged`, `_teamsTheme` from
  `followTeamsTheme` (only when `context.sdks.microsoftTeams` exists); `_applyTheme()` applies
  the Teams palette or the site theme.
- Manifest — `supportedHosts` without `TeamsPersonalApp` (comment with the reason).
- README "Microsoft Teams"; decision log entry. Tests check that both Teams palettes keep text,
  links and buttons at ≥ 4.5:1.

**Decisions / deviations:** none from the plan. The real Teams check (and the high-contrast
values) stays open for the IT test site.

### F-015 — Diagram background (setting)

_Completed 2026-10-01._

**Problem:** The Signavio PNG has a transparent background. On a dark or strongly coloured
section (or a dark site theme) its dark lines sit directly on that colour and become hard to
read.

**Idea:** A setting for a background behind the diagram — on/off and its colour, default on
and white — applied on the page and in full screen.

**Solution sketch** (planned 2026-10-01 with the owner; size: small–medium, no substeps):
- Pane group "Viewing": toggle "Background behind the diagram" (default on) and, only while
  it is on, the colour (default white); manifest initial values plus code fallbacks
  (missing → on / white), so existing web parts get them too
- Colour via the browser's own picker (`<input type="color">`) in a small custom pane field
  (`PropertyPaneFieldType.Custom`, the alignment toolbar's pattern) — SharePoint has no colour
  picker and the PnP property controls would be a large new runtime dependency; stored values
  are validated strictly (`#rrggbb`), anything else counts as white
- The colour sits exactly behind the PNG, also with a fixed height (`object-fit: contain`
  letterbox): a single-colour SVG data URI with the PNG's aspect ratio as background image,
  `background-size: contain` and centred — it is fitted exactly like the image; no resize
  handling, and it moves with the zoom transform; built by a tested pure function
- Full screen uses the same setting (off → transparent there too); the fixed white of F-007
  goes away
- Texts in four languages; tests; README and decision log

**Files:** `background.ts`, `background.test.ts`, `colorField.ts`, `colorField.test.ts` (new),
`renderDiagram.ts`, `lightbox.ts`, `ProcViewWebPart.ts`, `ProcViewWebPart.module.scss`,
`ProcViewWebPart.manifest.json`, `loc/*.js`, `loc/mystrings.d.ts`, `linkErrors.test.ts`,
tests (under `src/webparts/procView/`); `README.md`; `REQUIREMENTS.md`

**Dependencies:** F-007

**Acceptance criteria:**
- [x] Default on and white — also for existing web parts (fallbacks `!== false` and
      `parseBackgroundColor`, toggle `checked`); off → transparent as before
- [x] The colour covers exactly the PNG (no coloured letterbox bars with a fixed height), on
      the page and in full screen, and follows the zoom (SVG background fitted like the image)
- [x] Colour picker in the pane; invalid stored values fall back to white (tests)
- [x] Texts in four languages
- [x] Owner checks it in the local workbench (e.g. with the "Dark Teal" theme) — owner
      closed the step
- [x] `just check` green — 261 tests (isolated copy while the dev server runs)

**Implemented:**
- `background.ts` — `DEFAULT_BACKGROUND`, `parseBackgroundColor` (`#rrggbb` only, else
  white), `backgroundStyles(color, natural)`: single-colour SVG data URI with the natural size
  (`'` encoded too, so nothing can end the `url()`), `background-size: contain`, centred, no
  repeat; empty without a valid colour or size.
- `colorField.ts` — `renderColorField`: label linked to `<input type="color">`, reports on
  `change` only (each change re-renders the web part and reloads the PNG).
- `renderDiagram.ts` / `lightbox.ts` — option `background`; applied on image load (natural size
  known); the fixed white of the lightbox CSS removed.
- `ProcViewWebPart.ts` — `showBackground`, `backgroundColor`; `_backgroundFields` (toggle with
  `checked`, colour field only while on, pane refresh on toggle), `_colorField`, `_background()`
  used for page and full screen. Manifest `showBackground: true`, `backgroundColor: "#ffffff"`.
- SCSS `.colorField`, `.colorLabel`, `.colorInput`; `loc/*` `ShowBackgroundLabel`,
  `BackgroundColorLabel`. Tests: 11 new. Docs: README "Viewing", decision log entry.

**Decisions / deviations:** none from the plan.

### F-007 — Full-screen view (lightbox)

_Completed 2026-10-01 via F-007a and F-007b._

**Problem:** Within a narrow page column even a zoomable diagram stays cramped.

**Idea:** A button opens the diagram in a large overlay; closes via button, Escape, or
backdrop click.

**Solution sketch** (updated at prep-step, 2026-10-01; size: medium, two substeps):
- Native `<dialog>` with `showModal()` instead of a hand-made dialog: the browser makes the
  page inert, closes on Escape, keeps focus inside and renders in the top layer (above the
  SharePoint chrome, no z-index fights); focus returns to the full-screen button on close
  (manual — not every browser does it). The Fullscreen API was rejected: often blocked in
  Teams tabs
- Opened only by a button with a full-screen icon — a click on the image means drag/pan
  when zoom is offered
- Inside: only the diagram, a close button (top right) and zoom (F-006 `attachZoom`): the
  diagram first fits the window, then zooms up to its natural size — always available in
  full screen, independent of "Offer zoom"
- The image is fetched again on open (Signavio sends `no-store`) — once per opening
- Owner decisions (2026-10-01): **own toggle "Offer full screen", default on** (manifest
  initial value `true` **and** a code fallback that treats a missing value as on, so
  existing web parts get it too); full-screen button always visible while the toggle is
  on (also a focused large view for small diagrams); **nothing but the diagram** in the
  overlay (no caption, no hub link)
- Shared control bar top right on the image: zoom buttons (if "Offer zoom") and the
  full-screen button (if "Offer full screen"), alone or together — `attachZoom` gets an
  option to put its buttons into a host element instead of its own container
- Pane: both toggles in one group, renamed from "Zoom" to "Viewing" (DE "Ansicht", FR
  "Affichage", ES "Visualización")
- Teams shows the overlay within the tab — fits a tab; part of F-008

**Dependencies:** F-002, F-005, F-006

### F-007b — Wiring with the "Offer full screen" toggle

_Part of F-007 — Full-screen view (lightbox). Completed 2026-10-01._

**What:** Shared control bar top right (zoom buttons and/or full-screen button),
`attachZoom` host option, toggle "Offer full screen" (default on, manifest + code fallback),
pane group renamed to "Viewing", texts in four languages, SCSS (theme colours, dark
backdrop, forced colours), docs.

**Files:** `zoomView.ts`, `renderDiagram.ts`, `ProcViewWebPart.ts`,
`ProcViewWebPart.module.scss`, `ProcViewWebPart.manifest.json`, `loc/*.js`,
`loc/mystrings.d.ts`, `linkErrors.test.ts`, tests (under `src/webparts/procView/`);
`README.md`; `REQUIREMENTS.md` (decision log, resolve the open question)

**Dependencies:** F-007a

**Acceptance criteria:**
- [x] Toggle on by default — also for existing web parts without the property (code
      fallback `!== false`, toggle `checked` shows it); off removes the button
- [x] Control bar: zoom only, full screen only, or both — no overlap with the hub overlay
      (renderDiagram tests)
- [x] Full screen shows only the diagram, fits the window (never above natural size),
      zooms up to natural size, closes via button/Escape/backdrop, focus back on the button
- [x] Texts in four languages; theme colours; forced colours; keyboard only works end to end
- [x] Owner tries it in the local workbench (first round found the missing zoom and the
      transparent PNG on the dark layer — fixed, see below; owner closed the step)
- [x] `just check` green — 250 tests (isolated copy while the dev server runs)

**Implemented:**
- `zoomView.ts` — option `host`: the zoom buttons go into a shared bar.
- `lightbox.ts` — option `opener` (Safari does not focus clicked buttons).
- `renderDiagram.ts` — `IDiagramFullScreen` (label, class, `onOpen(button)`); one
  `controlBar` top right in the frame holds the zoom group and/or the full-screen button
  (own SVG: two arrows outwards — distinct from the zoom "fit" corners).
- `ProcViewWebPart.ts` — `offerFullScreen` (manifest `true`, fallback `!== false`, toggle
  `checked`), `_openFullScreen` opens `openLightbox` (closed in `onDispose`), shared
  `_zoomLabels`/`_zoomClassNames`; pane group "Viewing" with both toggles.
- `ProcViewWebPart.module.scss` — `.controlBar` (position) and `.zoomControls` (flex only);
  lightbox: the dialog is the dark layer (`[open]` flex-centres the frame, padding leaves room
  for the close button), `.lightboxFrame` hugs the image, `.lightboxImage` at most natural size
  and scaled down to the window, white background exactly behind the PNG, close button and
  zoom controls; forced colours.
- `loc/*` — `ViewingGroupName` (renamed from `ZoomGroupName`), `OfferFullScreenLabel`,
  `FullScreen`, `CloseFullScreen`. Tests: 7 new. Docs: README "Viewing"; decision log entry;
  the open question on F-007 resolved.

**Decisions / deviations:** After the owner's first test the lightbox image no longer fills the
frame (`object-fit: contain` blew small diagrams up beyond their natural size, so zoom had
nothing left to do, and a white background would have covered the letterbox). The white
background behind the PNG (deliberately not a theme colour — the diagram is drawn for white)
was an owner request. **Proposed follow-up (not built):** the same white backing behind the
diagram on the page, for dark or strongly coloured sections.

### F-007a — Full-screen overlay (not wired yet)

_Part of F-007 — Full-screen view (lightbox). Completed 2026-10-01._

**What:** `lightbox.ts`: dialog with the image, a close button and zoom; open/close, focus
return, Escape and backdrop click, cleanup — tested in isolation.

**Files:** `lightbox.ts`, `lightbox.test.ts` (new, under `src/webparts/procView/`)

**Dependencies:** —

**Acceptance criteria:**
- [x] Opens a modal `<dialog>` with only the image (alt text, `referrerpolicy="no-referrer"`),
      a labelled close button and the zoom controls
- [x] Closes via button, Escape (`cancel`) and backdrop click — not via clicks on the image
      or the controls (nor a drag that ends on the backdrop); focus returns to the element
      that opened it; everything is removed after closing (no leftover listeners)
- [x] Covered by jsdom tests (`lightbox.test.ts`, 10; `showModal`/`close` stubbed)
- [x] `just check` green — 243 tests (isolated copy while the dev server runs)

**Implemented:**
- `lightbox.ts` — `openLightbox(doc, props)` returns `{ close }`: `<dialog>` named after the
  alt text with a frame (zoom viewport) holding the image (`referrerpolicy="no-referrer"`,
  `decoding="async"`, `src` set last) and a close button (inline SVG X, `aria-label` +
  `title`); `attachZoom` on the frame (always in full screen); `showModal()` with an
  `open`-attribute fallback; focus to the close button, back to the opener on close;
  `cancel` (Escape) closes through the same path; a backdrop click closes only when the
  press also started on the dialog itself (a drag from the image ending on the backdrop
  would otherwise close it); a browser-side `close` event also cleans up; idempotent.

**Decisions / deviations:** none from the plan; the drag-ends-on-backdrop guard was added
while writing the tests.

### F-006 — Zoom and pan (checkbox)

_Completed 2026-10-01 via F-006a and F-006b._

**Problem:** Large process diagrams are hard to read at page width.

**Idea:** Add the setting "Offer zoom" to the configuration pane (introduced here, together
with its function); when on: zoom in/out/reset controls and drag/touch panning inside the
web part frame, styled from the page theme.

**Solution sketch** (updated at prep-step, 2026-10-01; size: large, two substeps):
- CSS transform on the image inside a clipped viewport; pointer events for mouse, touch and
  pen; maximum zoom = natural image size (the PNG is sharp up to 100 %)
- **Toggle, not checkbox** ("Offer zoom", default off — on/off settings are toggles)
- **Own inline SVG icons, not the Fluent icon font** — the font is loaded by SharePoint
  pages and missing in the local workbench (and possibly Teams); the alignment toolbar and
  the hub link already use own SVGs
- Controls hidden when there is nothing to zoom (diagram already shown at or above its
  natural size)
- With a fixed height the painted image can be smaller than its box (`object-fit:
  contain`) — pan limits follow the painted image, not the box; a column resize (e.g.
  rotating a tablet) re-clamps the zoom so the image never leaves the frame
- Owner decisions (2026-10-01): mouse wheel zooms only with Ctrl/Cmd (plain wheel scrolls
  the page); two-finger pinch zoom on touch, one finger pans while zoomed (page scrolling
  is blocked only while zoomed in); controls top right on the image, subtle and always
  visible (the hub overlay stays bottom right)

**Dependencies:** F-002, F-005

### F-006b — Wiring with the "Offer zoom" toggle

_Part of F-006 — Zoom and pan. Completed 2026-10-01._

**What:** Toggle "Offer zoom" in the "Size" group (default off, manifest initial value),
zoom view wired into the diagram, texts in four languages, colours from the section theme
(F-005 pattern), forced colours, no animation with reduced motion, docs.

**Files:** `renderDiagram.ts`, `ProcViewWebPart.ts`, `ProcViewWebPart.module.scss`,
`ProcViewWebPart.manifest.json`, `loc/*.js`, `loc/mystrings.d.ts`, `linkErrors.test.ts`,
tests (under `src/webparts/procView/`); `README.md`; `REQUIREMENTS.md`

**Dependencies:** F-006a

**Acceptance criteria:**
- [x] With the toggle off the web part behaves exactly as before (existing tests green; a
      test asserts no controls, buttons or tabindex without the option)
- [x] With the toggle on: controls top right, hub overlay unaffected, controls hidden when
      there is nothing to zoom (renderDiagram tests; owner in the local workbench)
- [x] Texts in all four languages; theme colours on coloured sections; keyboard focus
      visible
- [x] Owner tries it in the local workbench with a large diagram (zoom, pan, reset —
      "works"); pinch needs a touch device → to confirm in the IT test site or on a tablet
- [x] `just check` green — 233 tests (isolated copy while the dev server runs)

**Implemented:**
- `renderDiagram.ts` — optional `zoom` in the view (`IDiagramZoom`: labels, class names,
  `onAttach`); attaches `attachZoom` to the image frame after the overlay, so the controls
  sit top right and the hub overlay stays bottom right.
- `ProcViewWebPart.ts` — property `offerZoom`; own pane group "Zoom" with the toggle; the
  zoom controller is disposed on every render and in `onDispose` (no leftover listeners or
  observers); image loads do not re-render, so the zoom survives them.
- `ProcViewWebPart.module.scss` — `.zoomable` (clips, `touch-action: pan-x pan-y`, focus
  outline), `.zoomed` (`touch-action: none`, grab cursor), `.zoomControls` (top right,
  `[hidden]` wins over flex), `.zoomButton` (section theme colours like the hub overlay,
  disabled state, forced colours); no animation at all.
- Manifest — `"offerZoom": false`; `loc/*` — `ZoomGroupName`, `OfferZoomLabel`, `ZoomIn`,
  `ZoomOut`, `ZoomReset`, `ZoomViewportLabel` in four languages.
- Tests — 5 renderDiagram tests for the wiring. Docs — README "Zoom → Offer zoom",
  decision log entry.

**Decisions / deviations:** The toggle moved from the "Size" group to its own group "Zoom"
after the owner's visual check — a toggle right below a text field's description sat too
close to it, and the built-in fields cannot be restyled cleanly.

### F-006a — Zoom logic and controls (not wired yet)

_Part of F-006 — Zoom and pan. Completed 2026-10-01._

**What:** Pure zoom/pan maths and the zoom view (viewport, controls, gestures), tested in
isolation; not yet part of the web part.

**Files:** `zoom.ts`, `zoom.test.ts`, `zoomView.ts`, `zoomView.test.ts` (new, under
`src/webparts/procView/`)

**Dependencies:** —

**Acceptance criteria:**
- [x] `zoom.ts`: fit scale from natural and painted size, zoom about a focal point, pan
      limits (image never leaves the viewport), zoom range 1× … natural size, re-clamp on
      viewport resize, step levels for buttons/keys — covered by tests (`zoom.test.ts`, 16)
- [x] `zoomView.ts`: buttons −, +, reset (inline SVG, labelled, disabled at the limits);
      drag/one-finger pan while zoomed; two-finger pinch; Ctrl/Cmd + wheel; keyboard (+, −,
      0, arrow keys) on the focusable viewport — covered by jsdom tests (`zoomView.test.ts`,
      14)
- [x] `just check` green — 228 tests (isolated copy while the dev server runs)

**Implemented:**
- `zoom.ts` — state `{ scale, x, y }` for `transform: translate() scale()` with
  `transform-origin: 0 0`; the painted content is the natural size fitted into the image box
  (handles `object-fit: contain` letterboxing); `maxScale` (natural size), `canZoom`
  (≥ 5 % headroom), `clamp` (centred when smaller than the viewport, no empty margin when
  larger; no negative zero), `zoomTo`/`zoomBy` about a focal point, `pan`, `pinch` (distance
  ratio around the start midpoint, then follows the midpoint), `toTransform`.
- `zoomView.ts` — `attachZoom(doc, { viewport, image, labels, classNames, measure? })`:
  controls (−, +, fit; inline SVG, `aria-label` + `title`, disabled at the limits, hidden
  when nothing to zoom); Ctrl/Cmd + wheel about the pointer (line deltas converted); pointer
  events for drag (only while zoomed), two-finger pinch and continuing with the remaining
  finger; presses on buttons/links are not gestures; keys +, =, −, 0 and arrows (arrows
  only while zoomed, browser shortcuts with Ctrl/Cmd/Alt left alone); viewport focusable
  with `role="group"` and a label only while zoomable; re-clamp on image load and on
  `ResizeObserver` (fallback: window resize); `dispose()` restores everything.

**Decisions / deviations:** `touch-action` is set by the stylesheet through the `zoomable`
(`pan-x pan-y`) and `zoomed` (`none`) classes instead of inline — jsdom does not support the
property, and the stylesheet is its natural place; the SCSS follows in F-006b.

### F-014 — Own Teams app icons instead of the generator placeholders

_Completed 2026-10-01._

**Problem:** `teams/` holds the placeholder icons the SPFx generator created (a generic
"apps" glyph). They are Microsoft assets under the SPFx license terms, not a permissive
licence, and are not recognisable as this web part.

**Idea:** A simple own icon (a small process flow), generated reproducibly, replacing the
two PNGs Teams requires.

**Solution sketch** (updated at prep-step, 2026-10-01; size: small, no substeps):
- Teams requirements (Microsoft Learn, verified): colour icon 192 × 192, perfect square,
  full bleed, flat background, no rounded corners or border (Teams adds both), motif
  within the central 120 × 120 safe area (balanced in 96 × 96), contrast ≥ 4.5:1;
  outline icon 32 × 32, white on transparent; file names unchanged
  (`<web part id>_color.png`, `_outline.png`) so SPFx packages them
- **No SVG-to-PNG conversion:** this machine has no converter and no Chrome. Instead a
  dependency-free Node script (`scripts/teams-icons.mjs`) defines the shapes once and
  writes both PNGs (built-in `zlib`, anti-aliasing by supersampling), optionally an SVG
  preview from the same shapes; it asserts that the outline icon is white/transparent
  only; recipe `just icons`
- Motif (owner-approved): left-to-right flow circle (start) → rounded rectangle (task) →
  diamond (decision), connected by lines; colour icon white on petrol blue (about
  `#0E5A73` — neither Signavio orange nor Microsoft blue), outline icon the same motif in
  white lines
- The SharePoint toolbox icon stays the Fluent font icon "VisioDiagram" (referenced by
  name, not redistributed)
- The old files stay in the git history (accepted by the owner)

**Files:** `scripts/teams-icons.mjs` (new), `teams/<web part id>_color.png`,
`teams/<web part id>_outline.png`, `justfile`, `README.md`, `REQUIREMENTS.md`

**Dependencies:** —

**Acceptance criteria:**
- [x] Sizes and rules met: 192 × 192 square, fully opaque corners (no rounding), contrast
      7.7:1; 32 × 32 white/transparent only (script assertion + file analysis). **Deviation
      (owner decision):** the motif is 150 × 44 px, wider than the 120 × 120 safe area meant
      for square logos — the flat band stays clear of the rounded corners and keeps more than
      15 px margin even under a circular mask
- [x] Owner reviews and approves both icons (three iterations, see below)
- [x] A package build (`just build`, isolated copy) contains the new icons — byte-identical
      in `ClientSideAssets/` of the `.sppkg`
- [x] `just check` green — 198 tests, icons up to date (isolated copy); ESLint and
      Prettier accept the script, no exclusion needed

**Implemented:**
- `scripts/teams-icons.mjs` — motif defined once as signed-distance shapes (circle, rounded
  box, diamond as rotated square, connecting segments), rasterised with 8 × 8 supersampling,
  encoded by a minimal PNG writer (`zlib.deflateSync`, `zlib.crc32`); colour icon at
  5.1 px/unit with 4.5 px lines, outline icon at 0.98 px/unit with 2 px lines (stroke given
  in pixels, so each icon gets its own line width); web part id read from the manifest;
  asserts white-only outline; `--check` compares the files with a fresh rendering.
- `teams/<web part id>_color.png`, `_outline.png` — replaced (names unchanged).
- `justfile` — recipe `icons`; `check` runs `node scripts/teams-icons.mjs --check`, so CI
  fails when the script and the files drift apart (small addition to the plan).
- README "Packaging and deployment" — Teams app icons; REQUIREMENTS.md — decision log entry
  incl. the safe-area deviation.

**Decisions / deviations:** Three iterations with the owner: (1) the planned flow at
108 × 34 px with 7.5 px lines — too thick and too small; (2) a square flowchart (task box,
decision, two branches) — rejected, it read as an org chart; (3) the original flow, larger
(150 × 44 px), longer connectors and 4.5 px lines — approved. No SVG preview file was added
(not needed; the script is the single source).

### F-013 — Link to the GitHub repository in the property pane

_Completed 2026-09-30._

**Problem:** Editors and IT have no pointer from the web part to its source code,
documentation and issue tracker — useful for support and for reporting problems.

**Idea:** A small info group at the end of the property pane with a link to the public
repository (https://github.com/xnyzer/spfx-procview), opening in a new tab. F-009 later
adds the version number to the same group.

**Solution sketch** (updated at prep-step, 2026-09-30; size: small, no substeps):
- **Not `PropertyPaneLink`:** it has no `rel` option, but CODING-STANDARDS requires
  `rel="noopener noreferrer"` on every new-tab link — browsers imply `noopener`, not
  `noreferrer`, so GitHub would learn the tenant name on every click
- Instead a small custom pane field (`PropertyPaneFieldType.Custom`, the alignment
  toolbar's pattern) rendering a plain link: `target="_blank"`,
  `rel="noopener noreferrer"`, the screen-reader new-tab hint; it reuses `hubAnchor`
  (its parameter narrowed to url, text and hint — behaviour unchanged)
- New `aboutField.ts`: repository URL constant + render function (F-009 adds the version
  there later, e.g. "ProcView 1.2.0 · Source code on GitHub")
- Last pane group; texts (owner-approved): EN "About" / "Source code and documentation on
  GitHub", DE "Info" / "Quellcode und Dokumentation auf GitHub", FR "À propos" / "Code
  source et documentation sur GitHub", ES "Acerca de" / "Código fuente y documentación en
  GitHub"
- The pane is not inside a section → page-theme colours (static token fallback) are right
- No new dependencies, endpoints or settings

**Files:** `aboutField.ts`, `aboutField.test.ts` (new), `ProcViewWebPart.ts`,
`renderDiagram.ts`, `loc/*.js`, `loc/mystrings.d.ts`, `linkErrors.test.ts` (all under
`src/webparts/procView/`); `README.md`

**Dependencies:** —

**Acceptance criteria:**
- [x] The link is the last pane group and opens the repository in a new tab (owner, local
      workbench)
- [x] Tests: `rel="noopener noreferrer"`, `target="_blank"`, exact URL, screen-reader hint
      (`aboutField.test.ts`, 4 tests)
- [x] Group name and link text in all four languages (F-012 tests green)
- [x] Owner sees the link in the local workbench
- [x] `just check` green — 198 tests (isolated copy while the dev server runs)

**Implemented:**
- `aboutField.ts` — `REPOSITORY_URL` and `renderAboutField` (a `<p>` with the link built by
  `hubAnchor`: new tab, `rel="noopener noreferrer"`, external-link icon, screen-reader
  new-tab hint).
- `ProcViewWebPart.ts` — last pane group `AboutGroupName` with the custom field
  `_aboutField()` (target `aboutInfo`, not a stored property).
- `renderDiagram.ts` — `hubAnchor` takes only url, text and hint (behaviour unchanged).
- `ProcViewWebPart.module.scss` — `.aboutField` with `position: relative`.
- `loc/*.js`, `mystrings.d.ts`, `linkErrors.test.ts` — `AboutGroupName`,
  `RepositoryLinkText` in all four languages.
- README — "About" in the settings list.

**Decisions / deviations:** The owner noticed a second scrollbar in the property pane: the
link's absolutely positioned screen-reader hint had no positioned ancestor in the pane, so
it overflowed the page below the pane's scroll area. `position: relative` on the field keeps
it inside; the owner closed the step after the fix.

### F-005 — Theme, section backgrounds, accessibility

_Completed 2026-09-30._

**Problem:** The web part must look native on any site theme and section background and be
usable with keyboard and screen readers.

**Idea:** Complete the theme handling started in the scaffold (`onThemeChanged` → CSS
variables, SCSS theme tokens) for all elements, and check accessibility basics.

**Solution sketch** (updated at prep-step, 2026-09-30; size: small, no substeps):
- **Bug found:** `onThemeChanged` maps only `bodyText`, `bodySubtext`, `link`,
  `linkHovered`; every other colour is a static `[theme:…]` token, resolved from the *page*
  theme. On a strong section background the message box shows the section's white text on
  the page's light grey (unreadable), the focus outline (`themePrimary`) vanishes, the
  "Configure" button and the hub overlay keep the page's white background
- New pure `theme.ts`: the section's `semanticColors` (and `palette.themePrimary` where
  needed) → CSS custom properties (body background/text/subtext, link, link hovered, focus
  border, error text, standout background for the message box, divider, button background/
  text/border/hovered); missing slots are left out so the fallback applies
- SCSS: every element on the page uses `var(--x, '[theme:…]')` — one declaration with the
  token as fallback (the current two-declaration pattern drops the colour when a variable
  is missing); the property pane's alignment toolbar keeps static tokens (the pane is not
  inside a section)
- Accessibility is largely in place (alt text with default, `figure`/`figcaption`, radio
  group with arrow keys, new-tab hint, visible focus, forced colours, reduced motion);
  alt text stays optional with the generic default (decision 2026-09-29, not "required")
- Docs: README "Accessibility and themes"; decision log entry
- First build step: check whether the local workbench's theme picker reaches
  `onThemeChanged` at all (owner saw no change when switching the theme colour — with a
  diagram shown almost nothing is theme-dependent, or the workbench does not propagate the
  theme); if it does not, the visual theme check moves to the IT test site
- Real section backgrounds exist only in SharePoint → confirm in the IT test site

**Files:** `theme.ts`, `theme.test.ts` (new), `ProcViewWebPart.ts`,
`ProcViewWebPart.module.scss` (all under `src/webparts/procView/`); `README.md`;
`REQUIREMENTS.md`

**Dependencies:** F-002, F-003, F-004

**Acceptance criteria:**
- [x] No element on the page takes a colour that ignores the section (SCSS review; static
      tokens only in the property pane — `grep "theme:"` shows them only as `var()`
      fallbacks and in the pane block)
- [x] Tests: for a strong-section theme, message box text and background come from the
      same section; missing slots fall back (`theme.test.ts`, 7 tests)
- [x] Whether the local workbench propagates theme changes is verified and documented —
      it calls `onThemeChanged` on init and on every theme switch (extension code); README
      "Testing themes"
- [x] Diagram, message, "Configure", hub link below, overlay link and focus outline are
      readable/visible in a light and a dark theme — owner checked in the local workbench
      and closed the step
- [x] Keyboard walk-through: everything reachable with Tab, focus always visible (owner)
- [x] Token fallback inside `var()` verified — the built CSS keeps the token inside
      `var()`, and `load-themed-styles` `detokenize` turns it into the theme value or the
      default
- [x] `just check` green — 194 tests (isolated copy while the dev server runs)

**Implemented:**
- `theme.ts` — `themeVariables(theme)`: 13 semantic colours (body background/standout
  background/text/subtext/divider, link, link hovered, focus border, error text, button
  background/hovered/text/border) plus `palette.themePrimary` → `--<slot>` custom
  properties; missing, empty or non-string values are left out. `applyThemeVariables`
  sets them on the web part element and removes the rest, so nothing lingers from a
  previous theme.
- `ProcViewWebPart.ts` — `onThemeChanged` calls `applyThemeVariables`; the re-render on
  theme change is gone (the variables cascade to the rendered elements).
- `ProcViewWebPart.module.scss` — every page colour as `var(--x, '[theme:x, default: …]')`
  (one declaration; the old two-declaration pattern dropped the colour when a variable
  was missing); message box on `bodyStandoutBackground`, info accent `themePrimary`,
  error accent `errorText`, "Configure" on the button colours, overlay on
  `bodyBackground`, focus outlines on `focusBorder`. The property pane toolbar keeps
  static tokens.
- `theme.test.ts` — page theme, strong section variant, partial/invalid themes, set and
  remove on an element.
- Docs — README "Themes and accessibility" (editors) and "Testing themes" (local
  workbench); REQUIREMENTS.md decision log entry.

**Decisions / deviations:** No code-side fallback needed — tokens inside `var()` work. The
owner's earlier "nothing changed" came from the diagram view having almost no themed
elements, not from missing propagation. Real section backgrounds remain to be confirmed in
the IT test site.

### F-012 — Localisation: German, English, French, Spanish

_Completed 2026-09-30 via F-012a and F-012b._

**Problem:** All texts and messages exist in English only; editors and readers on German,
French or Spanish SharePoint sites see a foreign-language web part.

**Idea:** Add language files for de-DE, fr-FR and es-ES next to en-US; SharePoint picks
the file matching the site/user language automatically (English as fallback). Toolbox
texts in the manifest (title, description, group) are localised as well.

**Solution sketch** (updated at prep-step, 2026-09-30):
- `loc/de-de.js`, `loc/fr-fr.js`, `loc/es-es.js`; manifest `title`/`description`/`group`
  with `de-DE`, `fr-FR`, `es-ES` entries — `group` only affects the classic picker
  (modern pages show SharePoint's own localised name of the predefined group), localised
  for completeness only
- No code change needed: every visible text already comes from `loc/` (verified);
  `config.json` already maps `{locale}`. SharePoint Online has one UI culture per language
  (de-DE, fr-FR, es-ES); any other culture falls back to en-US (`defaultPath`)
- Tests for all four languages: every key present and non-empty, no extra keys,
  placeholders `{0}`/`{1}` preserved, "Empty: …" hints match the same language's default
  texts
- Signavio menu labels appear as Signavio shows them in that language (owner decision);
  German texts avoid a form of address where possible (no "Sie"/"du", owner decision)
- Texts entered by editors (caption, alt text, link text) stay as entered — page content,
  translated via SharePoint's multilingual pages if needed
- French and Spanish reviewed by native speakers before production use (README note); the
  pseudo-locale `qps-ploc` is used only ad hoc for a length check, not committed (it would
  ship in the package; the tests already catch missing texts)

**Dependencies:** F-004

### F-012b — French and Spanish

_Part of F-012 — Localisation: German, English, French, Spanish. Completed 2026-09-30._

**What:** French and Spanish language files and manifest entries; Signavio labels
researched in the localised SAP Signavio documentation (fallback: short guide for the
owner to switch the Signavio UI language).

**Files:** `loc/fr-fr.js`, `loc/es-es.js` (new), `ProcViewWebPart.manifest.json`,
`linkErrors.test.ts` (all under `src/webparts/procView/`); `README.md`; `REQUIREMENTS.md`

**Dependencies:** F-012a

**Acceptance criteria:**
- [x] The F-012a tests are green for all four languages — 187 tests
- [x] Signavio labels — **changed by owner decision:** the French and Spanish UI labels
      could not be verified (the SAP guides are machine-translated — the German one says
      "Teilen" where the UI shows "Freigeben"; no Spanish guide exists; the owner cannot
      switch the Signavio UI language). French uses the French SAP Signavio user guide
      (PDF, fr-FR, 2026-01-07): "Partager → Incorporer un diagramme → onglet « Image
      simple »"; Spanish keeps the English labels. Noted as unverified in README and
      decision log
- [x] Spot check: a test dev server on another port started with `--locales fr-fr` /
      `--locales es-es` served exactly the French / Spanish strings file (the mechanism the
      local workbench uses, verified in F-012a)
- [x] `just check` green (isolated copy while the dev server runs)

**Implemented:**
- `loc/fr-fr.js`, `loc/es-es.js` — all 65 texts; infinitive instructions without a form of
  address (as in German); Microsoft terms "composant WebPart" / "elemento web"; French
  typography with no-break spaces (U+00A0) inside « » and before `:` and `%`, Spanish
  « » without spaces and a no-break space before `%`. Prettier turns `\u00a0` escapes into
  the literal character, so the file headers name U+00A0 explicitly.
- `linkErrors.test.ts` — `LOCALES` and `SIMPLE_IMAGE_TAB` extended (French tab with
  no-break spaces, Spanish tab English).
- Manifest — `fr-FR` and `es-ES` for `title`, `description` and `group`.
- README — "Languages" note lists all four languages, the label sources and the
  native-speaker review before production use; REQUIREMENTS.md — decision log entry.

**Decisions / deviations:** Owner chose guide labels (French) and English labels (Spanish)
over asking for screenshots or bilingual labels. The ad-hoc pseudo-locale length check from
the solution sketch was not run — the owner's visual check of the (longer) German texts in
F-012a covered text length.

### F-012a — German + test scaffold for all languages

_Part of F-012 — Localisation: German, English, French, Spanish. Completed 2026-09-30._

**What:** German language file; completeness/consistency tests generalised to every file
in `loc/`; manifest `de-DE` entries; `just dev` gets an optional locale parameter
(`just dev de-de` → `heft start --locales de-de`); docs.

**Files:** `loc/de-de.js` (new), `linkErrors.test.ts`, `ProcViewWebPart.manifest.json`
(all under `src/webparts/procView/`); `justfile`; `README.md`; `CLAUDE.md`;
`REQUIREMENTS.md`

**Dependencies:** —

**Signavio labels (German UI, provided by the owner):** Share → "Freigeben", Embed diagram →
"Diagramm einbetten", tabs "Einbettung" (embed code) and "Einfaches Bild", field "Link zum
PNG-Bild"; read-only sharing → "Lesezugriff freigeben" / "Lesezugriff auf Diagramm
widerrufen"; "Collaboration Hub" stays as product name.

**Acceptance criteria:**
- [x] Tests fail for a missing, empty or extra key, a lost `{0}`/`{1}`, or a "Empty: …"
      hint that does not match the default text — in any language file (mutation run on
      `de-de.js`: each of the five faults turned at least one test red)
- [x] German texts use the Signavio labels above and no form of address where possible
- [x] How the local workbench switches the language is verified and documented in the
      README — `--locales de-de` makes the debug manifest serve only the German file (a
      single `path` entry); the extension loads that file and reuses a dev server already
      running on port 4321
- [x] Owner accepted the German texts in the local workbench (by running step-done)
- [x] `just check` green — 177 tests (isolated copy while the dev server runs)

**Implemented:**
- `loc/de-de.js` — all 65 texts; Signavio labels from the German UI; no "Sie"/"du"
  (infinitive instructions such as "Den Link … einfügen"); German typographic quotes and
  `50 %` (the width parser accepts the space).
- `linkErrors.test.ts` — `LOCALES` list and `loadStrings(locale)`; per language: every
  declared key non-empty, no extra keys, placeholders equal to the English text, the
  "Empty: …" hints contain that language's default link/alt texts; the "Simple image" tab
  check uses the tab name of each language (`SIMPLE_IMAGE_TAB`).
- Manifest — `de-DE` for `title`, `description` and `group` (comment: `group` only affects
  the classic picker).
- `justfile` — `dev locale=""`, passing `--locales <locale>` when given.
- Docs — README: "Languages" note for editors and "Testing a language"; CLAUDE.md: the
  "Texts" note covers all language files and how to add one; REQUIREMENTS.md: decision log
  entries (languages, Signavio labels/form of address, no committed pseudo-locale).

**Decisions / deviations:** The tests use an explicit `LOCALES` list instead of reading the
`loc/` folder — the rig's TypeScript config includes no Node types. The toolbox entry stays
English in the local workbench (it always uses the manifest default); check it on a
SharePoint page.

### F-004 — Empty and error states

_Completed 2026-09-30 via F-004a and F-004b._

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

### F-004b — Wiring in the web part

_Part of F-004 — Empty and error states. Completed 2026-09-30._

**What:** Display mode handling (`displayMode`, `onDisplayModeChanged`), image `error`
event and violation tracker wired to the error state, "Configure" opens the property pane,
cleanup in `onDispose`.

**Files:** `ProcViewWebPart.ts`, `ProcViewWebPart.module.scss`, `renderDiagram.ts`
(+ test: `onImageError`), `violationTracker.ts` (+ test: `onViolation` callback) — all under
`src/webparts/procView/`

**Dependencies:** F-004a

**Acceptance criteria:**
- [x] `just check` and `just build` green — 169 tests, `.sppkg` 23.8 KB (isolated copy)
- [x] Owner, in the local workbench: the owner closed the step after checking the states;
      reported: the "Configure" button does not open the pane — verified as a workbench
      limitation (its `propertyPane.open()` is a no-op stub); **to be confirmed in an IT test
      site on SharePoint**
- [x] The "blocked" message cannot be triggered locally — covered by tests only, incl. a
      violation that arrives after the image error

**Implemented:**
- `render()` — `resolveState` + `outcomeFor(…, displayMode === Edit)`: `nothing` → empty
  element; `message` → `renderMessage` with "Configure" (`propertyPane.open()`) and, for
  readers on load errors, the hub link below (if enabled); `diagram` → `renderDiagram` with
  `onImageError`.
- `_loadError` per image URL; `_onImageError` decides `failed`/`blocked` via the tracker;
  `_onViolation` upgrades `failed` → `blocked` when the (asynchronous) violation arrives
  later.
- `onInit` starts `trackImageViolations(document, …)`, `onDispose` disposes it;
  `onDisplayModeChanged` re-renders.
- Styles — `.message` box (theme background, left border: theme primary for guidance, error
  text colour for errors), title, body, list, Fluent-style `.configureButton` with focus
  ring; forced-colors border.

**Decisions / deviations:**
- `trackImageViolations` got an optional `onViolation` callback (not in the plan) — CSP
  violations are reported asynchronously and may arrive after the image's `error` event.
- The diagram placeholder in `renderDiagram` (`NotConfiguredMessage`) is no longer reached
  from the web part (messages cover all non-diagram states) but kept as a defensive path.

### F-004a — States and messages (pure, tested)

_Part of F-004 — Empty and error states. Completed 2026-09-30._

**What:** State resolution (no link / invalid link / load failed / blocked) × edit/read
mode → message model with `loc/` keys; DOM builder for messages (text, list of causes,
optional "Configure" button, optional hub link); violation tracker for
`securitypolicyviolation` events.

**Files:** `messages.ts`, `messages.test.ts`, `renderMessage.ts`, `renderMessage.test.ts`,
`violationTracker.ts`, `violationTracker.test.ts` (new); `renderDiagram.ts` (`hubAnchor`
exported), `loc/en-us.js`, `loc/mystrings.d.ts`, `linkErrors.test.ts` (all under
`src/webparts/procView/`)

**Dependencies:** —

**Acceptance criteria:**
- [x] Tests for every cell of the state table (incl. read mode "no link" → nothing) —
      plus: a stale load error does not apply to a new link; link errors win over a
      stored load error
- [x] Violation tracker: a simulated `securitypolicyviolation` (jsdom) for the image URL
      is recognised (full URL, origin-only report, `default-src` fallback); other
      URLs/directives and a lookalike origin are ignored; listener removable — a mutation
      test (plain prefix match) turned the lookalike test red
- [x] Texts never interpreted as markup; every message key exists in `loc/` (typed keys +
      completeness test)
- [x] `just check` green — 167 tests (isolated copy while the dev server runs)

**Implemented:**
- `messages.ts` — `resolveState(result, loadError)`, `outcomeFor(state, editMode)` →
  `diagram` / `nothing` / `message` (the F-004 state table), `resolveMessage(model,
  strings)` with `{0}` substitution, `MESSAGE_KEYS`.
- `renderMessage.ts` — `section > div.message(.info|.error)` with optional title, body, list
  of causes, "Configure" button (callback), and the hub link below when asked for; texts
  via `textContent` only.
- `violationTracker.ts` — `trackImageViolations(target)` remembers `blockedURI`s of
  `img-src`/`default-src` violations; `isBlocked(imageUrl)` matches the full URL or an
  origin-only report (exact origin boundary, no lookalikes); `dispose()`.
- 13 message strings in `loc/`.

**Decisions / deviations:** message strings added to `loc/` already in F-004a (plan: F-004b)
— the typed keys need them; the components are not wired into the web part yet (F-004b).

### F-003 — Collaboration Hub link

_Completed 2026-09-30 via F-003a and F-003b (planned as "checkbox"; built with a toggle)._

**Problem:** Readers need a way from the static image to the interactive diagram in the
Collaboration Hub.

**Idea:** Add a pane group "Collaboration Hub link" (introduced here, together with its
function): toggle "Show link to the Collaboration Hub" (default off; toggle instead of the
originally planned checkbox — SharePoint standard for on/off settings, owner's choice); when checked, the link text
(default "Open in Signavio"), the position — below the diagram (own alignment, default right)
or on the diagram, bottom right (overlay) — and, for "below", the alignment. The URL is
always derived from the model id (no manual override).

**Solution sketch** (updated 2026-09-30 by `/prep-step`; size: medium):
- Link fields appear only when the checkbox is checked (uncluttered pane)
- Link: `target="_blank"`, `rel="noopener noreferrer"`, external-link icon (inline SVG,
  theme colour), screen-reader-only "(opens in a new tab)"; text via `textContent` only
- Shown only with checkbox **and** a valid image link; without a link only the placeholder
- Readers need a Signavio account: `/p/portal` and `/p/hub/model/<id>` answer 401 without a
  session; `/p/model/<id>` redirects to `/p/portal#/model/<id>` — the current `hubUrl`. If the
  portal link fails for signed-in users, switch to the canonical `/p/model/<id>`
- Overlay is always visible but subtle, fully opaque on hover/keyboard focus — never
  hover-only (touch devices, discoverability, WCAG 2.1 SC 1.4.13); no transition with
  `prefers-reduced-motion`, system border in forced-colors mode
- Default link text is Signavio-specific; with a second process tool it must come from the
  provider

**Dependencies:** F-001, F-002 (both done)

### F-003b — Overlay in the bottom-right corner

_Part of F-003 — Collaboration Hub link. Completed 2026-09-30._

**What:** Option "Position" (Below the diagram / On the diagram, bottom right); the
alignment field is hidden for the overlay. The image gets a frame so the overlay sits at the
image corner, not the column corner.

**Files:** `renderDiagram.ts`, `renderDiagram.test.ts`, `sizing.ts`, `sizing.test.ts`,
`ProcViewWebPart.ts`, `ProcViewWebPart.module.scss`, `ProcViewWebPart.manifest.json`,
`loc/en-us.js`, `loc/mystrings.d.ts`, `linkErrors.test.ts` (all under
`src/webparts/procView/`)

**Dependencies:** F-003a

**Acceptance criteria:**
- [x] jsdom test: frame and overlay structure; overlay only for position "bottom right" —
      link inside the frame after the image, no link paragraph, alignment ignored, none
      without a valid diagram; `parseHubLinkPosition` fallback tests
- [x] Existing sizing tests adapted and green — `diagramStyles` covers all six
      combinations for frame and image
- [x] Overlay: always visible, opaque on hover/focus; reduced-motion and forced-colors rules
      (CSS; visually confirmed by the owner)
- [x] `just check` and `just build` green — 135 tests, `.sppkg` 21.9 KB (isolated copy)
- [x] Owner: both positions and the sizing combinations checked in the local workbench;
      known limit — with fixed width and height the image may be letterboxed and the
      overlay sits at the frame corner

**Implemented:**
- `sizing.ts` — `imageStyle` replaced by `diagramStyles(width, height)` → `{ frame, image }`:
  the frame hugs the image (`width: fit-content`, `max-width: 100%`); a percentage width goes
  on the frame and the image fills it (`width: 100%`) — a percentage on an image inside a
  shrink-to-fit frame would be circular; pixel/auto widths, height and `object-fit` stay on
  the image. Sizing rules unchanged.
- `renderDiagram.ts` — `figure > div.frame > img (+ overlay a)` and optional `figcaption`;
  `HubLinkPosition` + `parseHubLinkPosition` (unknown → `below`); one `hubAnchor()` builder
  for both positions.
- `ProcViewWebPart.ts` — property `hubLinkPosition`; `PropertyPaneChoiceGroup` "Position";
  the alignment toolbar only for "below"; pane refresh on position changes.
- Styles — `.frame` (`position: relative`); `.hubOverlay`: absolute bottom right, background
  `color-mix(<theme white> 80%, transparent)` with full-strength text, shadow, solid on
  hover/focus, no transition under `prefers-reduced-motion`, `Canvas`/`CanvasText` border in
  forced-colors mode.
- Manifest — initial values `showHubLink: false`, `hubLinkPosition: "below"`,
  `hubLinkAlign: "right"` (plus `captionAlign: "center"`), matching the code fallbacks.

**Decisions / deviations:**
- The plan moved width/height to the frame; built as a split instead (percent width on the
  frame, pixel/auto on the image) — avoids the circular percentage in a shrink-to-fit box.
- Overlay subtlety via a translucent background instead of element opacity — text keeps
  full contrast.
- Defaults as manifest initial values (owner found the "Below" radio unselected): the pane
  selection follows the stored property; the code fallback alone rendered correctly but
  left the radio empty in the local workbench. Existing instances keep their stored values.

### F-003a — Link below the diagram

_Part of F-003 — Collaboration Hub link. Completed 2026-09-30._

**What:** Pane group "Collaboration Hub link" with an on/off setting, link text (empty →
"Open in Signavio", note "Readers need access to SAP Signavio.") and alignment via the
existing icon toolbar (default right; the toolbar is generalised). The link is rendered
below the caption.

**Files:** `renderDiagram.ts`, `renderDiagram.test.ts`, `alignmentField.ts`,
`alignmentField.test.ts`, `ProcViewWebPart.ts`, `ProcViewWebPart.module.scss`,
`loc/en-us.js`, `loc/mystrings.d.ts`, `linkErrors.test.ts` (all under
`src/webparts/procView/`); `README.md`

**Dependencies:** —

**Acceptance criteria:**
- [x] jsdom test: link only when requested **and** with a valid link; `href` = hub URL;
      `target="_blank"`, `rel="noopener noreferrer"`; screen-reader note present; text never
      interpreted as markup; order image → caption → link; alignment applied — 9 tests.
      _Gap:_ the default text for an empty field is applied in the web part class
      (`|| strings.HubLinkDefaultText`) and is not covered by a jsdom test
- [x] Link fields hidden in the pane while the setting is off — conditional fields plus
      `propertyPane.refresh()` on change; the owner closed the step after the workbench check
      (in the local workbench, pane refresh is a no-op — reopening the pane may be needed)
- [x] `just check` and `just build` green — 121 tests, `.sppkg` 21.4 KB (isolated copy)
- [x] Owner: the link opens the diagram in the Collaboration Hub when signed in to Signavio
      — confirmed 2026-09-30 (`/p/portal#/model/<id>` works; no fallback needed)

**Implemented:**
- `renderDiagram.ts` — `TextAlign` + `parseTextAlign(value, fallback)` (replaces the
  caption-specific parser); optional `hubLink` view rendered as `<p>` after the `<figure>`:
  `<a>` with text node, inline SVG external-link icon (`aria-hidden`) and a visually hidden
  " (opens in a new tab)" span.
- `ProcViewWebPart.ts` — properties `showHubLink`, `hubLinkText`, `hubLinkAlign`; pane group
  with `PropertyPaneToggle` (On/Off) and, only while on, link text and alignment; one generic
  `_alignField(property, label)` for caption and link; per-setting defaults (caption center,
  link right); `onPropertyPaneFieldChanged` refreshes the pane for the conditional fields;
  theme link colours set as CSS variables.
- `alignmentField.ts` — label id now `${idPrefix}-label` (unique per field).
- Styles — `.hubLink`, `.hubAnchor` (theme link colours, underline on hover, focus ring),
  `.srOnly`.
- README — the dev server does not pick up `loc/*.js` changes; restart after editing texts.

**Decisions / deviations:**
- Toggle instead of the planned checkbox — SharePoint standard for on/off settings (owner).
- Local workbench: the owner first saw technical field names ("HubLinkText"), missing group
  headings and "undefined" as link text — the running dev server still served the old
  strings file; a restart fixes it (documented in the README).

### F-002 — Configuration pane + diagram display with size control

_Completed 2026-09-30 via F-002a and F-002b._

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

### F-002b — Configuration pane and diagram display

_Part of F-002 — Configuration pane + diagram display with size control. Completed 2026-09-30._

**What:** Property pane (image link with deferred validation and messages, width, height,
alt text, natural-size label), `<img>` rendering via a pure DOM builder, strings in
`loc/`, styles from the theme.

**Files:** `ProcViewWebPart.ts`, `ProcViewWebPart.module.scss`, `ProcViewWebPart.manifest.json`,
`loc/en-us.js`, `loc/mystrings.d.ts`, `renderDiagram.ts` (new), `renderDiagram.test.ts` (new),
`alignmentField.ts` (new), `alignmentField.test.ts` (new), `linkErrors.test.ts`, `sizing.ts`,
`sizing.test.ts` (all under `src/webparts/procView/`); `src/providers/registry.ts`,
`registry.test.ts`; `README.md`

**Dependencies:** F-002a

**Acceptance criteria:**
- [x] jsdom test: valid link → `<img>` with the rebuilt URL, `alt` (or default text),
      `referrerpolicy="no-referrer"`, `loading="lazy"` and the sizing styles; invalid link
      → placeholder, no `<img>`
- [x] Web part class builds no markup strings (`innerHTML` not used — grep over `src/`)
- [x] `just check` and `just build` green — 112 tests; `.sppkg` 20.6 KB (checked in an
      isolated copy while the owner's dev server was running)
- [x] Recommended visual check in the local workbench — done by the owner: diagram loads,
      sizes apply, caption and alignment toolbar work

**Implemented:**
- `renderDiagram.ts` — builds `<section>` → `<figure>` → `<img>` (+ optional `<figcaption>`)
  or the placeholder `<p>`, DOM APIs only; `<img>` with `referrerpolicy="no-referrer"`,
  `loading="lazy"`, `decoding="async"` and the sizing styles; reports the natural size on
  `load`. `parseCaptionAlign()` (unknown → `center`).
- `ProcViewWebPart.ts` — properties `imageLink`, `width`, `height`, `altText`, `caption`,
  `captionAlign`; pane groups **Diagram** (image link with deferred validation, natural-size
  label), **Caption** (text, alignment toolbar), **Size** (width, height), **Accessibility**
  (alt text). Invalid sizes fall back to `auto`; the natural size refreshes the pane when
  open.
- `alignmentField.ts` — compact icon toolbar as a custom property pane field
  (`PropertyPaneFieldType.Custom`): inline SVG icons, `role="radiogroup"`/`radio` with
  `aria-checked`, roving tab stop, arrow keys/Home/End, tooltips, focus ring, forced-colors
  support; keeps its own state (hosts may render custom fields only once).
- Untrusted property data: `parseDiagramLink`, `parseDimension`, caption and alt text treat
  non-string values as empty.
- `loc/` — pane labels, descriptions, caption strings; a completeness test typed as
  `Record<keyof IProcViewWebPartStrings, true>` fails when `en-us.js` lacks a key.
- README — note that `just check`/`just build` rewrite the folders the dev server serves.

**Decisions / deviations:**
- **Caption added in F-002b on the owner's request** (not in the original plan): own pane
  group, text field, alignment left/center/right (default center, also the manifest
  default); the alignment applies to the caption only, the image stays left (owner's
  choice). Dropdown → icon tiles (`PropertyPaneChoiceGroup`, too large) → compact custom
  toolbar (owner's choice).
- **Width stays capped at the column** (`max-width: 100%`) even for larger pixel values —
  owner decision; scrolling inside the web part was offered and rejected. The pane
  descriptions say so.
- `PropertyPaneCustomField()` is not public API in SPFx 1.23 — the field object is built
  with the documented `PropertyPaneFieldType.Custom` pattern instead.
- Natural-size label target is its own id (`naturalSizeInfo`), not `imageLink`.
- **Local workbench findings** (SPFx Local Workbench 0.2.0, outside the repository): it
  converts every text value containing `:` into a Dynamic-Data object (all URLs), which
  crashed the web part until the non-string guard was added; the owner's installed copy
  was patched locally (backup kept, overwritten by extension updates; issue not filed).
  Its `propertyPane.refresh()` is a no-op and its CSP blocks the dev server's live-reload
  websocket. Running `just check`/`just build` while the dev server runs caused a
  "Failed to load" 404 — documented in the README.

### F-002a — Sizing and error messages (pure, tested)

_Part of F-002 — Configuration pane + diagram display with size control. Completed 2026-09-30._

**What:** `parseDimension()` (empty/`auto` → auto, whole number → px, width also `NN%`;
everything else rejected), `imageStyle(width, height)` returning the CSS for all
combinations, and a mapping of every `LinkErrorCode` to a `loc/` string key.

**Files:** `src/webparts/procView/sizing.ts` (new), `sizing.test.ts` (new), `linkErrors.ts`
(new), `linkErrors.test.ts` (new), `loc/mystrings.d.ts`, `loc/en-us.js`

**Dependencies:** —

**Acceptance criteria:**
- [x] All sizing combinations tested (auto/auto, px/auto, %/auto, auto/px, px/px, %/px)
- [x] Negative tests: negative, `0`, decimals, `12px`, `0%`, `101%`, `%` for height,
      > 10 000, text — plus `12,5`, `1e3`, `50 %%`, `%50`
- [x] Every `LinkErrorCode` maps to a `loc/` key — enforced by the type and a test; both
      proven by counter-checks (key removed from `mystrings.d.ts` → TS2322; text removed
      from `en-us.js` → test fails; files restored and verified identical)
- [x] `just check` green (76 tests)

**Implemented:**
- `sizing.ts` — `MAX_PX = 10000`; `parseDimension(input, allowPercent)` returning
  `auto` / `px` / `percent` or an error (`invalid`, `tooLarge`, `percentNotAllowed`,
  `percentOutOfRange`); `imageStyle(width, height)` → `width`, `height`,
  `max-width: 100%` and `object-fit` (`contain` whenever the height is fixed, so a width
  capped by the column never distorts the image; otherwise `fill`, the aspect ratio then
  follows from `auto`); `dimensionErrorKey(error, field)` with field-specific hints for
  width and height.
- `linkErrors.ts` — `LINK_ERROR_KEYS: Record<LinkErrorCode, keyof IProcViewWebPartStrings>`.
- `loc/` — 10 link-error and 5 dimension-error strings; `embedCode`/`notImageLink` point to
  Share → Embed diagram → "Simple image".
- Tests — `sizing.test.ts` (28), `linkErrors.test.ts` (4); the latter loads the real AMD
  module `loc/en-us.js` through a minimal `define` shim via `jest.requireActual`, once per
  file (Jest caches the module).

**Decisions / deviations:**
- The error strings were added to `loc/` already in F-002a (plan: F-002b) — the type-safe
  mapping needs the keys to exist.
- `jest.requireActual` instead of `require()` — ESLint forbids `require()`
  (`@typescript-eslint/no-require-imports`); no rule was disabled.

### F-011 — Local testing setup + online workbench retirement

_Completed 2026-09-30._

**Problem:** The project still targets the SharePoint Framework online workbench
(`workbench.aspx`) in `config/serve.json`, `.vscode/launch.json`, the README and the `just dev`
comment. The online workbench is treated as **no longer available** (deprecated since SPFx
1.23, retired 2026-12-01) — it is not an option, not even temporarily. The owner has no
tenant, so the web part needs a local way to be viewed; testing on real pages later happens
in a test site provided by IT.

**Idea:** Make the community "SPFx Local Workbench" VS Code extension (PnP, MIT, Heft-based
SPFx 1.22+, no tenant needed) the local way to view the web part, and replace every
online-workbench reference with the SPFx Debug Toolbar on normal SharePoint pages
(`?loadSPFX=true&debugManifestsFile=https://localhost:4321/temp/build/manifests.js`).

**Solution sketch** (updated 2026-09-30 by `/prep-step`; size: small, no substeps):
- `.vscode/settings.json`: `spfxLocalWorkbench.serveCommand` =
  `mise exec -- npx heft start --clean --nobrowser` (Node 22 — the owner's shell loads
  Node 24 via nvm, which SPFx 1.23 does not support)
- `justfile`: `dev` serves without a browser and without a tenant (`--nobrowser`); comment
  updated
- `config/serve.json`: `initialPage` → a normal page (`https://{tenantDomain}/SitePages/Home.aspx`)
  for on-page testing
- `.vscode/launch.json`: "Hosted workbench" → "SharePoint page (Debug Toolbar)" with page URL
  and debug parameters (`{tenantDomain}` is edited once for the IT test site)
- README "Development": local testing (extension, one-time dev-certificate trust, start with
  one click), on-page testing with the Debug Toolbar in an IT test site, one sentence on why
  there is no online workbench, and the Node note (activate mise in the shell or prefix
  `mise exec --`; the owner's `~/.zshrc` is not changed)
- No new project dependencies (the extension lives in VS Code, not in `package.json`);
  `.spfx-workbench/` (optional API mocks) is not needed and not added

**Dependencies:** —

**Acceptance criteria:**
- [x] No `workbench.aspx` in `config/serve.json`, `.vscode/launch.json`, `justfile`, README
      (verified by grep)
- [x] `just --dry-run dev` shows `--nobrowser`
- [x] Workspace setting present; the owner confirms that "SPFx Local Workbench: Start SPFx
      Serve and Open Workbench" works with one click — confirmed 2026-09-30
- [x] `just check` green (44 tests)

**Implemented:**
- `.vscode/settings.json` — `spfxLocalWorkbench.serveCommand` =
  `mise exec -- npx heft start --clean --nobrowser`
- `justfile` — `dev` runs `heft start --clean --nobrowser`; comment points to the local
  workbench and the Debug Toolbar
- `config/serve.json` — `initialPage` = `https://{tenantDomain}/SitePages/Home.aspx`
- `.vscode/launch.json` — configuration "SharePoint page (Debug Toolbar)" with
  `?loadSPFX=true&debugManifestsFile=https://localhost:4321/temp/build/manifests.js`
- `README.md` — "Development" restructured: Node 22 via mise, why there is no online
  workbench, "Testing locally" (extension, one-time dev-certificate trust, daily use),
  "Testing on SharePoint pages" (Debug Toolbar in an IT test site), "Packaging and
  deployment"

**Decisions / deviations:**
- The README says the project does not use the online workbench and that Microsoft retires
  it on 2026-12-01, rather than "retired" — the date is still ahead; the owner's decision
  to treat it as unavailable is reflected by offering no workbench path at all.
- Outside the repository (owner's machine, not part of the commit): the extension was
  installed via the VS Code CLI and the owner trusted the dev certificate.

### F-001 — Provider interface + Signavio provider

_Completed 2026-09-29 via F-001a and F-001b._

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
- Real shared links are kept only locally under `private/` (gitignored); tests use placeholder
  links only — model ids/authkeys are on the privacy-lint blocklist

**Dependencies:** —

### F-001b — Signavio provider

_Part of F-001 — Provider interface + Signavio provider. Completed 2026-09-29._

**What:** Signavio implementation of the contract: host allow-list, URL parsing and
validation, normalised image URL, derived hub link, detection of typical wrong inputs;
registered in the registry.

**Files:** `src/providers/signavio.ts` (new), `src/providers/signavio.test.ts` (new),
`src/providers/registry.ts` (registration)

**Dependencies:** F-001a

**Acceptance criteria:**
- [x] Valid links for all 7 hosts are recognised (with and without `inline`); output URL
      and hub link are normalised
- [x] Negative tests (CODING-STANDARDS §10): `http:`, `javascript:`, lookalike hosts,
      userinfo trick, extra query parameters/fragments dropped, invalid model id, missing/
      invalid `authkey`, embed code (`signavio.js`/`authToken`), hub/portal link, model link
      without `/png`, surrounding whitespace
- [x] Tests contain placeholder ids/keys only — privacy-lint (with blocklist) green
- [x] Local, uncommitted check: the locally kept real links parse correctly against the
      compiled output — both recognised, rebuilt image URL identical to the input; the
      real embed code yields `embedCode`

**Implemented:**
- `signavio.ts` — `SIGNAVIO_HOSTS` (7 regional hosts, exact match) and `signavioProvider`.
  The provider claims every input that mentions "signavio" (so wrong Signavio input gets a
  specific error instead of `unsupported`) and checks in order: embed code → `embedCode`;
  URL parse (`new URL`) → `notUrl`; scheme → `notHttps`; host in allow-list and no
  userinfo/port → `unknownHost`; path `/p/model/<id>/png` → `notImageLink`; model id
  (32 hex) → `invalidModelId`; `authkey` present → `missingAuthKey`, 32–128 hex →
  `invalidAuthKey`. Output `imageUrl` and `hubUrl` are rebuilt from the validated parts.
- `signavio.test.ts` — 38 tests (all 7 hosts, missing `inline`, 62-char key, upper-case
  host, foreign parameters/fragments dropped, registry integration; negatives for embed
  code, non-URL, `http:`/`javascript:`/`data:`, lookalike hosts, bare domain, `app-eu`,
  explicit port, userinfo trick and userinfo on an allowed host, hub/portal/model/SVG/
  nested paths, four invalid model ids, missing/empty key, four invalid keys incl. markup).
- `registry.ts` — `defaultProviders = [signavioProvider]`.
- Total suite: 44 tests green; a mutation test (host check weakened to a suffix match)
  turned 3 tests red, confirming the negative tests bite.

**Decisions / deviations:**
- Two negative tests beyond the plan: markup in the `authkey` and a `data:` URL.
- Secret-scanner false positives in the tests were fixed without allow-listing: the
  placeholder key is deliberately low-entropy (`'ab12'.repeat(16)`), the userinfo test
  builds its credentials from a variable, and the `javascript:` input is assembled from two
  strings instead of disabling ESLint's `no-script-url`.

### F-001a — Provider contract, registry, test pipeline

_Part of F-001 — Provider interface + Signavio provider. Completed 2026-09-29._

**What:** Types for the provider contract and parse result (success with `imageUrl`,
`hubUrl`, `modelId`; failure with an error code), a registry that trims input, rejects
empty input and asks each provider; first Jest test in the project.

**Files:** `src/providers/types.ts`, `src/providers/registry.ts`,
`src/providers/registry.test.ts`

**Dependencies:** —

**Acceptance criteria:**
- [x] `just check` runs ≥ 1 real Jest test (`Total` > 0) — `Total: 6`, all green
- [x] A deliberately failing assertion makes `just check` fail (then reverted) —
      `Failures: 1`, exit 1; file restored and verified identical
- [x] Empty/whitespace input → `empty`; input no provider claims → `unsupported`
- [x] Registry tested with a stub provider (no Signavio dependency yet)

**Implemented:**
- `types.ts` — `LinkErrorCode` (the ten codes from the plan), `IDiagramLink`
  (`providerId`, `modelId`, normalised `imageUrl`, optional `hubUrl`), the discriminated
  union `LinkParseResult` and `IProcessToolProvider`. A provider returns `undefined` for
  input that is not its tool's, so the registry can ask the next one; a failure result
  means "mine, but invalid".
- `registry.ts` — `parseDiagramLink(input, providers = defaultProviders)`: accepts
  `undefined` (property pane values may be unset), trims, returns `empty` / the first
  claiming provider's result / `unsupported`. `defaultProviders` is still empty — Signavio
  is registered in F-001b.
- `registry.test.ts` — 6 tests with stub providers: empty/undefined/whitespace, no
  provider claims, no providers registered, first claim wins, trimmed input reaches the
  providers, provider order.

**Decisions / deviations:** none from the plan. `hubUrl` is optional in the contract
(other tools may have no interactive view); Signavio will always set it. The code is not
wired into the web part yet (F-002), so it is not part of the bundle.

