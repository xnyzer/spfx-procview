# spfx-procview — Requirements

<!-- section:requirements-head -->
> **Transitional artifact.** This document captures intent until every requirement has
> been turned into an F-number in `PROGRESS.md`. Once that transfer is complete, checked,
> and confirmed by the owner, this file is dissolved and the summary in `CLAUDE.md` is
> updated (`/define-requirements` and `/refine-requirements` manage this lifecycle).
> Content is written in English.
<!-- /section:requirements-head -->

## Goals

1. **Embed without iframes, at a controllable size.** Page editors place a shared SAP
   Signavio process diagram on a modern SharePoint page and decide how large it appears —
   something the built-in iframe embed cannot do.
2. **Always current, native look.** The diagram stays up to date automatically (live image
   link) and the web part blends into the page design: theme colors, section backgrounds,
   controls in the page's look and feel.
3. **Deploy once, extend later.** IT deploys a single solution package tenant-wide; the
   architecture keeps the door open for further process tools beyond Signavio.

## Core features

1. **Process-tool provider interface + Signavio provider** — a small provider contract
   (recognise link → image URL, hub URL, validation); Signavio is the first
   implementation. It accepts **only the "Simple image" link** — in Signavio: Share →
   Embed diagram → tab "Simple image"
   (`https://<signavio-host>/p/model/<model-id>/png?inline&authkey=<key>`) — validates
   scheme, host allow-list and shape, and derives the Collaboration Hub link. Input from
   the embed-code tab, hub links or other URLs is rejected with a hint to use the
   "Simple image" tab.
2. **Configuration pane + diagram display with size control** — a small property pane:
   - image link (the "Simple image" link),
   - width as pixels, percent of the column (`NN%`) or `auto`; height as pixels or `auto`
     (a percentage height is meaningless — the column has no fixed height),
   - read-only info: the image's maximum (natural) size, read from the loaded image
     (`naturalWidth × naturalHeight`),
   - alignment of a diagram narrower than its column: left / centre (default) / right,
   - toggle "Offer zoom" (enables feature 6 — added to the pane together with it),
   - toggle "Show Collaboration Hub link" (enables feature 3 — added together with it),
   - optional alternative text (accessibility; a generic label is used when empty),
   - optional caption shown below the diagram, with its alignment (left / center / right,
     default center) chosen in a compact icon toolbar — the alignment applies to the caption
     only.

   The diagram renders as `<img>` (no iframe, no referrer sent to the tool). Sizing: both
   `auto` → natural size, capped at the available column width (also for larger pixel
   values — the diagram is never wider than its column); one value fixed (px or %)
   → the other follows the aspect ratio; both fixed → the diagram fits inside that box
   keeping its aspect ratio (never distorted).
3. **Collaboration Hub link** when the toggle "Show link to the Collaboration Hub" is on — the URL is
   always derived from the model id (no manual override); configurable link text (default
   "Open in Signavio") and position: below the diagram (own alignment, default right) or on
   the diagram, bottom right (overlay, always visible but subtle, opaque on hover/focus).
   Readers need a Signavio account to open it.
4. **Empty and error states** — "not configured yet" placeholder with guidance for
   editors (where to find the "Simple image" link); clear message (plus hub link, if
   enabled) when the image cannot be loaded, naming the likely causes (sharing revoked,
   wrong link, domain blocked by network/firewall); a specific message when a security
   policy blocks the image domain.
5. **Theme, section backgrounds, accessibility** — `supportsThemeVariants`, semantic theme
   colors, keyboard operability, alt text, sufficient contrast.
6. **Zoom and pan** (only when "Offer zoom" is on) — zoom in/out/reset controls and
   drag/touch panning inside the web part frame, up to the image's natural size (100 % is
   the sharpest the PNG gets); controls styled from the page theme (own inline SVG icons).
7. **Full-screen view (lightbox)** — open the diagram in a large overlay, fitted to the
   window and zoomable up to its natural size; close via button, Escape, or backdrop.
8. **Microsoft Teams hosting** — the web part works as a Teams channel tab (no personal
   app — it has no property pane), including Teams' dark and high-contrast themes.
9. **Release via CI + IT deployment guide** — GitHub Actions builds the `.sppkg` and attaches
   it to a GitHub release; a guide describes App Catalog deployment for IT.

## Out of scope

- **No editing or commenting** of diagrams — read-only display; interaction happens via
  the Collaboration Hub link.
- **No own BPMN rendering** — no bpmn-js, no BPMN XML parsing; we show the image the tool
  renders.
- **No Signavio API and no sign-in** — only links shared for read-only access; no
  authentication against Signavio.
- **SharePoint Online modern pages only** — no classic pages, no SharePoint Server
  on-premises.
- **No further process tools yet** — only the provider architecture that allows them.
- **No Signavio embed code** — the official embed (tab "Embed code", `signavio.js`
  mashup) is not accepted as input; the "Simple image" link is the only input.

## Constraints

- **Platform:** SharePoint Online (and Teams) via SharePoint Framework 1.23.2, no UI
  framework, Node 22; toolchain and rules in `CODING-STANDARDS.md` §13.
- **No iframes** for the diagram — the image link is rendered directly.
- **Shared links are effectively public:** a "Simple image" link with its `authkey` lets
  anyone who has it see the diagram, and it is visible to every page visitor. Only
  diagrams approved for this kind of sharing may be embedded (data classification is the
  editor's responsibility; documented in the IT guide).
- **No real links in the repository:** `authkey` values and model ids of real diagrams
  never enter code, tests, docs, or issues — use placeholders.
- **Image endpoint properties (verified 2026-09-29):** returns `image/png`, `no-store`
  caching (always current), no CORS headers — usable via `<img>` only, not via `fetch`;
  SVG is not available through the shared link (HTTP 403). The PNG renders at the
  diagram's natural size (verified: 3193 × 2232 px for a large BPMN diagram, 720 × 457 px
  for a small map) — its natural size is the web part's "maximum size" info.
- **Dependencies:** permissive licenses only; any new runtime dependency needs an ADR
  (every byte ships to every page visitor).
- **License:** Apache-2.0, public repository.

## Decision log

Dated entries; never rewrite history — supersede with a newer entry instead.

### Product decisions

| Date | Decision | Why |
|------|----------|-----|
| 2026-09-29 | Scope: SAP Signavio only, behind a provider interface for later tools | Immediate need is Signavio; other tools are plausible later and should not require a rewrite |
| 2026-09-29 | Initial scope includes zoom/pan, full-screen view, Teams hosting and CI releases | Chosen by the owner in the requirements interview |
| 2026-09-29 | Non-goals: no editing/commenting, no own BPMN rendering, no Signavio API/sign-in, modern SharePoint Online only | Keep the web part a lightweight, read-only embed that IT can deploy without integration effort |
| 2026-09-29 | Collaboration Hub link is derived from the image link by default, overridable | The model id is part of the image link; editors should not have to paste two links |
| 2026-09-29 | Input is the "Simple image" link only; the Signavio embed code is not accepted | Owner decision: one clear input; the embed code's viewer shows the same PNG anyway |
| 2026-09-29 | Configuration pane: image link, width/height (px or `auto`), natural-size info, checkboxes "Offer zoom" and "Show Collaboration Hub link" | Owner specification — a small pane an editor understands without training |
| 2026-09-29 | Collaboration Hub link is an on/off checkbox, always derived — **supersedes** the "overridable" entry above | Keep the pane minimal; the derived link is the right target for every model |
| 2026-09-30 | Width also accepts percent of the column (`NN%`); height stays px or `auto` | Owner decision; percent of the column is responsive, a percentage height has no reference |
| 2026-09-30 | The checkboxes "Show Collaboration Hub link" and "Offer zoom" are introduced with F-003/F-006, not in F-002 | No setting without its function in any intermediate state |
| 2026-09-30 | The diagram is never wider than its column, even for larger pixel widths (no scrolling inside the web part) | Owner decision; keeps the page layout intact — scrolling was offered and rejected |
| 2026-09-30 | Optional caption below the diagram with left/center/right alignment (default center) in a compact icon toolbar; alignment applies to the caption only | Owner request during F-002; dropdown and large icon tiles were tried and rejected as less clear |
| 2026-09-30 | Hub link: configurable text (default "Open in Signavio"), position below the diagram (own alignment) or as overlay in the bottom-right corner; URL still derived | Owner request; the link must be placeable independently of the caption |
| 2026-09-30 | The overlay is always visible (subtle), never hover-only | Touch devices have no hover, hidden links are not discovered, WCAG 2.1 SC 1.4.13 — owner accepted |
| 2026-09-30 | On/off settings use a toggle (SharePoint standard), not a checkbox — first applied to the hub link | Owner decision; matches the SharePoint property pane conventions |
| 2026-09-30 | Languages: English, German, French, Spanish (F-012); other languages fall back to English; texts entered by editors are not translated | Owner request; editor texts are page content, translated via SharePoint's multilingual pages |
| 2026-09-30 | Instructions name Signavio menu items as the Signavio UI shows them in each language; German texts avoid a form of address ("Sie"/"du") where possible | Owner decision during F-012 planning; editors recognise the labels they see in Signavio |
| 2026-09-30 | French Signavio labels from the French SAP Signavio user guide (Partager → Incorporer un diagramme → « Image simple »); Spanish keeps the English labels; both unverified against the UI, native-speaker review before production | The SAP guides are machine-translated (the German one says "Teilen" where the UI shows "Freigeben"); no Spanish guide exists; the owner cannot switch the Signavio UI language — owner chose this over asking for screenshots |
| 2026-10-01 | Zoom (F-006): toggle "Offer zoom" (default off) in its own group "Zoom" below "Size" (a toggle right below a text field description sat too close to it); controls top right on the diagram, subtle and always visible; Ctrl/Cmd + wheel zooms (plain wheel scrolls the page); two-finger pinch on touch, one finger pans while zoomed; maximum = natural size; controls only when the diagram is shown smaller | Owner decisions during F-006 planning; page scrolling must keep working for readers who do not want to zoom |
| 2026-10-01 | Full-screen view (F-007): own toggle "Offer full screen", **on by default** (manifest value and a code fallback for web parts saved before); only the diagram in the overlay (no caption, no hub link), fitted to the window and zoomable; one control bar top right for zoom and full screen; the pane group "Zoom" is renamed "Viewing" and holds both toggles — supersedes the group name of the entry above | Owner decisions during F-007 planning; resolves the open question below |
| 2026-10-01 | Diagram background (F-015): setting "Background behind the diagram", on by default and white (manifest values and code fallbacks), colour via the browser's own picker; the colour covers exactly the PNG on the page and in full screen (replaces the fixed white of F-007) | Owner request after testing F-007: the transparent Signavio PNG is hard to read on dark or coloured sections; a picker library would be a large runtime dependency |
| 2026-10-01 | Teams (F-008): the web part is offered as a channel tab only — `TeamsPersonalApp` removed from `supportedHosts`; in Teams it follows the Teams theme (dark and high contrast override the colour variables with fixed palettes) | Personal Teams apps show no property pane, so no link could be entered (owner decision); SPFx passes the SharePoint site theme in Teams, not the Teams theme |
| 2026-10-01 | Full screen always shows a colour behind the diagram — the configured background colour, otherwise white; the setting "Background behind the diagram" only switches the page (refines the F-015 entry; implemented in F-017) | Audit F-016a (M9): with the setting off, the transparent PNG drawn for white paper was unreadable on the dark full-screen layer (owner decision) |
| 2026-10-01 | The host `SharePointFullPage` is removed from `supportedHosts`; the web part is offered on pages and as a Teams channel tab only (implemented in F-016c) | Audit F-016a (L15): the full-page app host was neither documented nor tested; only tested hosts are offered, as with the personal Teams app (owner decision) |
| 2026-10-02 | Diagram alignment (F-018): setting left / centre / right, **centred by default** (manifest value and code fallback — web parts saved before move from left to centred), same icon toolbar as the caption; it positions only a diagram narrower than its column, caption and hub link keep their own alignment | The code never positioned the diagram, so its place depended on the surrounding layout — in the local workbench narrow diagrams jumped from centre to left when another web part was added (owner decision) |
| 2026-10-02 | Property pane order (F-018): **Diagram** (image link, alternative text) → **Size and alignment** (maximum-size info, width, height, alignment) → **Caption** → **Collaboration Hub link** → **Viewing** → **About**; the group "Accessibility" goes away | The pane had grown feature by feature: the size sat far from the link and the alternative text came last, where it is easily missed; the new order follows how editors work (owner decision) |
| 2026-10-02 | The setting "Background behind the diagram" applies on the page **and** in full screen: switched off, the diagram is transparent in both, whatever colour is still stored — **supersedes** the 2026-10-01 entry "Full screen always shows a colour behind the diagram" | A colour that appears in full screen although the switch is off — possibly one chosen earlier and long forgotten — leaves editors wondering where it comes from; one switch for both places is easier to understand. Editors who find the diagram hard to read on the dark full-screen layer switch the background on (owner decision during the F-017c visual check) |
| 2026-10-02 | A failed image load counts only while the same link stays entered: changing the link clears the stored error, and entering a link again loads it again (implemented in F-019a) | Control audit 2026-10-02 (L32): the error was kept per link for the page's lifetime, so an editor who fixed the sharing in Signavio or switched back to a link saw the old error until the page was reloaded (owner decision) |
| 2026-10-02 | In full screen the browser's own pinch magnification stays available while the diagram cannot be zoomed (not zoomable, or the error text); while it can be zoomed, a pinch zooms the diagram (implemented in F-019c) | Control audit 2026-10-02 (L36): `touch-action: none` on the whole full-screen layer kept touch users from magnifying a diagram shown near its natural size or the error text (owner decision) |
| 2026-10-02 | The README screenshots (`docs/images/`) may show the beginning of the owner's test link — the host and the first characters of the diagram id, never the access key; an exception to "real Signavio links never enter the repository" (F-020) | The image link field cuts the link off long before its access key, and without the key the visible part opens nothing (owner decision) |

### Technical decisions

| Date | Decision | Why |
|------|----------|-----|
| 2026-09-29 | SPFx 1.23.2 (current stable), Heft toolchain, npm, Node 22 | Latest stable release; its tooling dictates Node 22 and the Heft rig |
| 2026-09-29 | No UI framework (`--framework none`) instead of React | Measured: 7.9 KB vs 8.7 KB bundle (React is provided by SharePoint) — size is not the driver; the web part is simple, theming works without React, and plain TypeScript stays closer to the maintainer's skill set. Revisit via ADR if the UI grows |
| 2026-09-29 | Render the Signavio "Simple image" PNG via `<img>` | Verified against a real shared link: HTTP 200 `image/png`, anonymous with `authkey`, `no-store`; iframe headers (`x-frame-options`) do not apply to images |
| 2026-09-29 | Hub link format `https://<host>/p/portal#/model/<model-id>` | The model root URL of a shared link redirects there |
| 2026-09-29 | The PNG is the only diagram source (no SVG, no mashup script) | Spike with a large diagram: PNG at natural size (sharp up to 100 % zoom); the official `signavio.js` mashup (9.5 MB React viewer) renders the very same `…/png?authkey=…` — its auth token is `{pngKey}_{jsonKey}_{svgKey}`, the SVG key is unused and `/svg` answers 403 |
| 2026-09-29 | Host allow-list: exactly `editor.signavio.com`, `app-us`, `app-au`, `app-ca`, `app-jp`, `app-kr`, `app-sgp` (`.signavio.com`), exact match only | Verified via docs, DNS and endpoint behaviour; exact matching rejects lookalike hosts |
| 2026-09-30 | `<img>` with `referrerpolicy="no-referrer"` | The tool does not learn which SharePoint page embeds the diagram; the image endpoint works without a referrer |
| 2026-09-30 | Web part property values are treated as untrusted: non-string values count as empty | Page data can be malformed; the local workbench even converts URLs into objects — the web part must degrade to its placeholder, never crash |
| 2026-09-30 | Custom property pane fields use the documented `PropertyPaneFieldType.Custom` object pattern | `PropertyPaneCustomField()` is not public API in SPFx 1.23 |
| 2026-09-30 | Default values of settings are stored as initial values in the web part manifest, matching the code fallbacks | The property pane selects what is stored; a code-only fallback renders correctly but shows no selection |
| 2026-09-30 | Local testing via the community "SPFx Local Workbench" VS Code extension; on-page testing via the SPFx Debug Toolbar in an IT test site (F-011) | The online workbench is deprecated since SPFx 1.23 and retired on 2026-12-01; the owner has no tenant; free developer tenants are restricted to Visual Studio/partner subscribers |
| 2026-09-30 | Pseudo-locale `qps-ploc` is not committed; locales are tested locally with `just dev <locale>` (`heft start --locales`) | Every file in `loc/` ships in the package; the typed completeness tests already catch missing texts. Verified: with `--locales de-de` the debug manifest serves only the German file, which the local workbench loads |
| 2026-09-30 | Every colour on the page comes from the theme SharePoint passes to `onThemeChanged` (all used semantic colours + `palette.themePrimary` as CSS variables, `theme.ts`); static `[theme:…]` tokens only as `var()` fallback and in the property pane | On a coloured section SharePoint passes the section's variant, while static tokens resolve from the page theme — mixing both made the message box unreadable on strong sections (F-005). Verified: `load-themed-styles` replaces tokens inside `var()` |
| 2026-10-01 | Own Teams app icons, generated by a dependency-free Node script (`scripts/teams-icons.mjs`, `just icons`; `just check` verifies them) instead of the SPFx generator's placeholders | The placeholders are Microsoft assets under the SPFx license terms, not covered by ADR-0001 for redistribution; no SVG converter or browser is available, and one script keeps the icons reproducible (F-014). Owner decision: the flat motif (start circle → task box → diamond) is about 150 px wide, beyond the 120 px safe area meant for square logos — it stays clear of the rounded corners and keeps more than 15 px margin even under a circular mask |
| 2026-10-01 | Settings are read in one pure module (`settings.ts`): editor texts lose control characters and explicit direction embeddings/overrides/isolates (U+202A–U+202E, U+2066–U+2069) and count as empty when only invisible characters remain (the default text applies); marks and joiners real text needs (LRM/RLM, ZWJ/ZWNJ, soft hyphen) stay. Theme values are used only when they are colours (hex, `rgb()`/`hsl()`, keywords); a provider's link that is not `https:` is rejected (F-016b) | Audit F-016a (L1, L2, L4, M12): reversed or invisible link and alt texts, theme values that could make the browser fetch a URL via `background:`, and future providers must not reach the page unchecked; one module makes every value testable on the web part's own path |
| 2026-10-01 | Third-party code that ships in the bundle is listed with its licence notice in `THIRD-PARTY-NOTICES.md` (repository and GitHub release); a dependency-free licence check (`npm query`) runs in `just check` (implemented in F-016c) | Audit F-016a (M13): the bundle contains `tslib` (0BSD) and `@microsoft/load-themed-styles` (MIT, notice required); the `.sppkg` cannot carry an extra file without a custom webpack configuration. A permanent check instead of a one-off list, because Renovate keeps updating dependencies (owner decision) |
| 2026-10-02 | Callbacks are tied to what they belong to (`lifecycleGuard.ts`): image events only count for the current render, and nothing runs after `onDispose`; Teams theme failures are logged (`Log.warn`) and keep the SharePoint colours; custom property pane fields are keyed per web part instance from `this.context.instanceId` (F-016c) | Audit F-016a (M4, M5, L5) and the owner's visual check (L25): late events of replaced images re-rendered the web part, and with one key for all web parts the local workbench kept showing the previous web part's colour and alignment — its stand-in base class has no `instanceId` getter |
| 2026-10-02 | Custom property pane fields keep what they built per host element and only show a newly stored value (`showValue`) when SharePoint calls `onRender` again, instead of rebuilding (F-019b) | Control audit M15: SharePoint fetches the pane configuration again after every change and calls `onRender` of every custom field again with the same element (SPFx 1.23.2 source); the rebuilt alignment toolbars and colour input dropped the keyboard focus. No SharePoint test environment — the first-use check of the IT guide (F-009b) confirms it at runtime |
| 2026-10-02 | The licence check takes the bundled packages from the build's source map (`dist/*.js.map`) and checks `THIRD-PARTY-NOTICES.md` both ways; `just check` also rejects raw invisible and control characters in `src/` and `scripts/` (`scripts/source-chars-check.mjs`) (F-019b) | Control audit L45 and L44: a hand-kept list could not notice newly bundled third-party code, and raw no-break spaces had slipped into the language files unnoticed — such characters also arrived raw when files were written (owner decision) |
| 2026-10-02 | The repository depends on no third-party website: the README shows only the CI badge, which GitHub itself serves; licence and SPFx version are plain text — no shields.io or any other external image or script service. Links to external pages are fine (F-020) | Nothing in the repository should break or change when a third-party service changes or goes away (owner decision during F-020 planning) |

## Open questions

- [x] **PNG resolution:** ~~does the PNG grow with larger diagrams?~~ Yes — it renders at
      the diagram's natural size (3193 × 2232 px for a large BPMN diagram; size parameters
      are still ignored). Resolved 2026-09-29, see technical decisions.
- [x] **Regional hosts:** resolved 2026-09-29 — 7 hosts verified via Signavio/SAP docs, DNS
      and the `/p/model/…/png` endpoint: `editor.signavio.com` (EU), `app-us`, `app-au`,
      `app-ca`, `app-jp`, `app-kr`, `app-sgp.signavio.com` (`app-eu`/`app-sg` do not exist).
- [ ] **Hub link target:** is `/p/portal#/model/<id>` right for all users, or should the
      Collaboration Hub form `/p/hub/model/<id>?t=<workspace-id>` be used (needs the
      workspace id, which the image link does not contain)?
      Until verified, the IT deployment guide (F-009b) names it as a known limitation (control
      audit 2026-10-02, L46).
- [x] **SharePoint CSP:** resolved 2026-09-30 — SharePoint Online's CSP (enforced since
      2026-03-01) applies to scripts only ("CSP is only enforced for scripts", MS Learn:
      Trusted Script Sources); "HTML Field Security" allowed domains apply to iframes (Embed
      web part). Neither blocks the web part's `<img>`; F-004 still detects an `img-src`
      violation as a safeguard.
- [x] **Full-screen view (F-007):** ~~always available, tied to "Offer zoom", or its own
      checkbox?~~ Its own toggle, on by default. Resolved 2026-10-01, see product decisions.
