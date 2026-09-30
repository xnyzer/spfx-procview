# spfx-procview

SPFx web part to embed SAP Signavio process diagrams in SharePoint with adjustable size.

SharePoint's built-in embed web part only renders iframes, which leaves no way to control
how large an embedded SAP Signavio diagram appears on the page. `spfx-procview` is a
SharePoint Framework web part that takes a Signavio shared/embed link, displays the
process diagram at a configurable size, and can optionally link to the Signavio
Collaboration Hub underneath. It is built to be deployed tenant-wide by IT and designed so
that further process tools can be supported later.

## Status

Early development — see `PROGRESS.md` for the roadmap.

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
shows the placeholder instead of the diagram. SharePoint itself is not affected; a fixed
extension release (or a local patch of the extension) is needed to test links locally.

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
reveals the visitor's IP address and browser details to the tool's provider. Shared
"Simple image" links are readable by anyone who has them; embed only diagrams approved for
that kind of sharing.

## Documentation

- `REQUIREMENTS.md` — intent (transitional; dissolved into `PROGRESS.md`)
- `PROGRESS.md` — roadmap and task list
- `CODING-STANDARDS.md` — binding coding rules
- `HOW-TO-CODE-WITH-CLAUDE.md` — development workflow (Claude Code + coding-kit skills)
- `CONTRIBUTING.md`, `SECURITY.md`, `AI-DISCLOSURE.md` — governance

## License

Apache-2.0 — see [LICENSE](LICENSE).
