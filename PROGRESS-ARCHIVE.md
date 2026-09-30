# spfx-procview — Progress Archive

<!-- section:archive-head -->
Finished tasks with their full write-up: what was implemented, which files were touched,
and notable decisions or deviations. Newest entries at the top. The living list is
`PROGRESS.md`.
<!-- /section:archive-head -->

---

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

