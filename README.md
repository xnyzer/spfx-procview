# spfx-procview

SPFx web part to embed SAP Signavio process diagrams in SharePoint with adjustable size.

SharePoint's built-in embed web part only renders iframes, which leaves no way to control
how large an embedded SAP Signavio diagram appears on the page. `spfx-procview` is a
SharePoint Framework web part that takes the **"Simple image" link** of a shared Signavio
diagram and displays it directly — no iframe — at a configurable size, with an optional
caption and an optional link to the Signavio Collaboration Hub. It is built to be deployed
tenant-wide by IT and designed so that further process tools can be supported later.

## Status

In development: the core features (display and sizing, caption, Collaboration Hub link,
empty and error states) are implemented; there is **no release yet** — versioning and the
release pipeline follow (F-009). See `PROGRESS.md` for the roadmap.

## Using the web part (for page editors)

1. **Get the link in SAP Signavio:** select the diagram, then **Share → Embed diagram**. If
   the options are disabled, click "Share diagram for read-only access". Copy the link from
   the **"Simple image"** tab — not the embed code. The image updates automatically when
   the diagram changes in Signavio.
2. **Add "Process diagram (ProcView)"** to a SharePoint page (group "Planning and process")
   and paste the link into **Diagram → Image link** in the property pane. The pane shows the
   diagram's maximum (natural) size once it has loaded.
3. **Settings:**
   - **Caption** — optional text below the diagram; alignment left / center / right.
   - **Collaboration Hub link** — switch on to show a link to the interactive diagram
     (readers need access to SAP Signavio); link text (default "Open in Signavio"); position
     below the diagram (with its own alignment) or on the diagram, bottom right.
   - **Size** — width in pixels, percent of the column (e.g. `50%`) or empty for automatic;
     height in pixels or empty. The diagram is never wider than its column and never
     distorted.
   - **Accessibility** — alternative text for screen readers (default "Process diagram").
4. **When something is wrong:** editors see what to fix (no link yet, a wrong link such as
   the embed code, or why the image could not be loaded — e.g. revoked sharing, or a
   network/firewall blocking the Signavio domain). Readers see a short message instead, or
   nothing at all while no link is configured.

Shared "Simple image" links are readable by anyone who has them — embed only diagrams that
are approved for that kind of sharing.

**Languages:** the web part shows its texts (settings, messages, toolbox entry) in the
language SharePoint uses for the page — English or German so far; any other language falls
back to English. Instructions name the Signavio menu items as Signavio shows them in that
language (German: **Freigeben → Diagramm einbetten**, tab **"Einfaches Bild"**). Texts that
editors enter (caption, alternative text, link text) are shown as entered — translate them
with SharePoint's multilingual pages if needed.

<!-- section:readme-getting-started -->
## Getting started

Toolchain is pinned via [mise](https://mise.jdx.dev); everything else follows from it:

```
mise install   # toolchain (incl. just, lefthook, gitleaks)
just setup     # dependencies + git hooks
just check     # full gate: format check, lint, types, tests
```

| Recipe | Purpose |
|--------|---------|
| `just setup` | Install dependencies and git hooks |
| `just dev` | Run the project locally |
| `just test` | Run the test suite |
| `just lint` | Static analysis |
| `just format` | Auto-format the codebase |
| `just check` | The full gate — must be green before every commit |
| `just build` | Production build |
<!-- /section:readme-getting-started -->

## Development (SharePoint Framework)

Built with SharePoint Framework **1.23.2** (Heft toolchain, no UI framework) on Node 22.

**Node 22 via mise.** The recipes call `npx`, so they run on whatever Node your shell
provides. Either activate mise in your shell (`eval "$(mise activate zsh)"` in `~/.zshrc`) or
prefix commands with `mise exec --` (e.g. `mise exec -- just check`).

This project does **not use the SharePoint online workbench** — Microsoft deprecated it with
SPFx 1.23 and retires it on 2026-12-01. The web part is viewed locally with a VS Code
extension, and on real SharePoint pages with the SPFx Debug Toolbar.

### Testing locally (no tenant needed)

One-time setup:

1. Install the VS Code extension **SPFx Local Workbench**
   (`m365pnp.pnp-spfx-local-workbench`, community/PnP, MIT).
2. Trust the development certificate once per machine — the dev server runs on
   `https://localhost:4321`: `mise exec -- npx heft trust-dev-cert` (asks for your admin
   password; the self-signed certificate is valid for `localhost` only; remove it with
   `mise exec -- npx heft untrust-dev-cert`). Without a trusted certificate, starting the
   dev server opens that admin-password prompt on its own.

Daily use: Command Palette → **"SPFx Local Workbench: Start SPFx Serve and Open
Workbench"**. The project's `.vscode/settings.json` makes the extension serve via mise
(Node 22). Alternatively run `just dev` and use "SPFx Local Workbench: Open Local
Workbench". Add "Process diagram (ProcView)" to the canvas and configure it in the property
pane.

Known issue in SPFx Local Workbench 0.2.0: it turns every text value containing a colon —
every URL — into a Dynamic-Data object before it reaches the web part, so a pasted image link
arrives as "empty" and the web part shows "Add a process diagram" instead of the diagram. SharePoint itself is not affected; a fixed
extension release (or a local patch of the extension) is needed to test links locally.

**Testing a language:** stop the dev server, run `just dev de-de` (any file name from
`src/webparts/procView/loc/`) in a terminal, then use "SPFx Local Workbench: Open Local
Workbench" — the extension reuses a dev server that is already running. The server then
serves only that language file. The toolbox entry (title and description from the manifest)
stays English in the local workbench; check it on a SharePoint page.

The dev server picks up code changes while running, but **not changes to `loc/*.js`** (the
texts): after editing them, restart it — otherwise the workbench shows technical field
names or "undefined" for new texts.

`just check` and `just build` clean and rewrite the same build folders the dev server serves
from (and `just build` writes hashed production bundles). Stop the dev server first, or
restart it afterwards — otherwise the workbench may fail with "Failed to load …" (404).

### Testing on SharePoint pages

For a final check under real conditions (your tenant's themes, policies and network), test in
a site you may edit — typically a test site provided by IT:

1. Start the dev server: `just dev`.
2. Open a modern page of that site and append
   `?loadSPFX=true&debugManifestsFile=https://localhost:4321/temp/build/manifests.js`
   to its URL. SharePoint asks to allow debug scripts and then shows the **Debug Toolbar**;
   in edit mode the locally served web part is available in the toolbox.
3. For debugging from VS Code, edit `{tenantDomain}` (and the page path) in
   `.vscode/launch.json` once and start "SharePoint page (Debug Toolbar)".

### Packaging and deployment

- **Package:** `just build` creates `sharepoint/solution/spfx-procview.sppkg`.
- **Deploy:** upload the `.sppkg` to the tenant (or site collection) App Catalog. The
  solution uses `skipFeatureDeployment`, so it can be made available to all sites at once.
- **Updates:** the App Catalog only treats a package as an update when its version is
  higher — versioning and release packages follow with F-009.

### Upgrading SPFx

SPFx releases dictate their toolchain (TypeScript, ESLint, Heft, webpack) and the supported
Node major, so an upgrade is always one deliberate task — Renovate only lists new SPFx
releases on its Dependency Dashboard and never bumps the toolchain on its own
(`renovate.json`, ADR-0001).

1. Generate an upgrade report, e.g. with the CLI for Microsoft 365:
   `npx -p @pnp/cli-microsoft365 m365 spfx project upgrade --shell bash --output md`.
2. Apply all steps together — SPFx packages, toolchain packages, `mise.toml` Node major,
   `engines` in `package.json`, `Node` rule in `renovate.json`.
3. `just check` and `just build` must be green; re-check `npm audit` against ADR-0001
   (drop the `qs` override once the toolchain ships a fixed version).

**Deadline:** SPFx 1.23 supports Node 22 only, and Node 22 reaches end of life on
**2027-04-30** — an upgrade to an SPFx release on a newer Node must land before then.

## Privacy

The web part stores only its own settings (e.g. the diagram link) in the SharePoint page.
It sets no cookies, sends no telemetry and calls no API of its own. To display a diagram,
each visitor's browser loads the image directly from the configured process tool (for
Signavio: the SAP Signavio host of the shared link) — like any embedded image, that request
reveals the visitor's IP address and browser details to the tool's provider. Image requests
and the Collaboration Hub link send **no referrer**, so the tool does not learn which
SharePoint page embeds the diagram. Shared
"Simple image" links are readable by anyone who has them; embed only diagrams approved for
that kind of sharing.

## Documentation

- `REQUIREMENTS.md` — intent (transitional; dissolved into `PROGRESS.md`)
- `PROGRESS.md` — roadmap and task list; `PROGRESS-ARCHIVE.md` — finished tasks with details
- `docs/adr/` — architecture decisions (ADR-0001: SPFx platform licences and toolchain advisories)
- `CODING-STANDARDS.md` — binding coding rules
- `HOW-TO-CODE-WITH-CLAUDE.md` — development workflow (Claude Code + coding-kit skills)
- `CONTRIBUTING.md`, `SECURITY.md`, `AI-DISCLOSURE.md` — governance

## License

Apache-2.0 — see [LICENSE](LICENSE).
