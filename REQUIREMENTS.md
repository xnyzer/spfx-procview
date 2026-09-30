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
   - checkbox "Offer zoom" (enables feature 6 — added to the pane together with it),
   - checkbox "Show Collaboration Hub link" (enables feature 3 — added together with it),
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
6. **Zoom and pan** (only when "Offer zoom" is checked) — zoom in/out/reset controls and
   drag/touch panning inside the web part frame, up to the image's natural size (100 % is
   the sharpest the PNG gets); controls styled from the page theme (Fluent UI Core
   icons).
7. **Full-screen view (lightbox)** — open the diagram in a large overlay at natural size;
   close via button, Escape, or backdrop.
8. **Microsoft Teams hosting** — the web part works as a Teams tab and personal app
   (hosts already declared in the manifest), including Teams themes.
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
| 2026-09-30 | Local testing via the community "SPFx Local Workbench" VS Code extension; on-page testing via the SPFx Debug Toolbar in an IT test site (F-011) | The online workbench is deprecated since SPFx 1.23 and retired on 2026-12-01; the owner has no tenant; free developer tenants are restricted to Visual Studio/partner subscribers |

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
- [x] **SharePoint CSP:** resolved 2026-09-30 — SharePoint Online's CSP (enforced since
      2026-03-01) applies to scripts only ("CSP is only enforced for scripts", MS Learn:
      Trusted Script Sources); "HTML Field Security" allowed domains apply to iframes (Embed
      web part). Neither blocks the web part's `<img>`; F-004 still detects an `img-src`
      violation as a safeguard.
- [ ] **Full-screen view (F-007):** always available, tied to "Offer zoom", or its own
      checkbox in the configuration pane?
