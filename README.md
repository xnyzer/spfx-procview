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

- **Local debugging:** `just dev` serves the web part to the SharePoint hosted workbench.
  Set your tenant first, e.g. `export SPFX_SERVE_TENANT_DOMAIN=contoso.sharepoint.com`
  (replaces `{tenantDomain}` in `config/serve.json`). The dev server runs on
  `https://localhost:4321`; trust its development certificate once per machine with
  `npx heft trust-dev-cert` (remove it again with `npx heft untrust-dev-cert`). Without a
  trusted certificate, `just dev` itself opens an admin-password prompt (macOS: a Terminal
  window running `sudo security add-trusted-cert`) and launches the workbench URL in the
  browser — trust the certificate deliberately first.
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
