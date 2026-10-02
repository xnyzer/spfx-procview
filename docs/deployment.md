# Deploying spfx-procview — guide for IT

This guide is for SharePoint administrators who deploy the web part "Process diagram
(ProcView)" in a Microsoft 365 tenant: download and verification, first deployment, Microsoft
Teams, updates, removal, network requirements, privacy, and a short check on the first page.
What editors do with the web part is described in the [README](../README.md).

## At a glance

| | |
|---|---|
| Package | `spfx-procview.sppkg` from the [GitHub releases](https://github.com/xnyzer/spfx-procview/releases), with its SHA-256 checksum and the third-party notices |
| Where | Tenant app catalog ("Apps" in the SharePoint admin center); the solution can be added to all sites at once |
| Hosts | Modern SharePoint Online pages and Microsoft Teams channel tabs — no classic pages, no SharePoint Server, no personal Teams app |
| Permissions | None — the package requests no API permissions, uses no Microsoft Graph and needs no sign-in to SAP Signavio |
| Network | Readers' browsers load the diagram image over HTTPS from the SAP Signavio host of the link (see [Network](#network-firewall-and-proxy)) |
| Scripts | The web part's code ships inside the package and is served by SharePoint — no script from another site |

## 1. Download and verify

From the [latest release](https://github.com/xnyzer/spfx-procview/releases/latest), download:

- `spfx-procview.sppkg` — the solution package,
- `spfx-procview.sppkg.sha256` — its SHA-256 checksum,
- `THIRD-PARTY-NOTICES.md` — the licences of third-party code in the package.

Verify the package in the download folder before you upload it. The **checksum** shows that the
download is complete and intact:

- **macOS / Linux:** `shasum -a 256 -c spfx-procview.sppkg.sha256` (or `sha256sum -c …`) — it
  prints `spfx-procview.sppkg: OK`.
- **Windows (PowerShell):**
  `(Get-FileHash .\spfx-procview.sppkg -Algorithm SHA256).Hash -eq (Get-Content .\spfx-procview.sppkg.sha256).Split(' ')[0]`
  — it prints `True`.

The checksum comes from the same release as the package, so it cannot show whether both were
replaced. Releases of this repository are **immutable**: once published, their files and tag
cannot be changed, and GitHub signs a record of them (a release attestation). With the
[GitHub CLI](https://cli.github.com), check that your file is exactly the one GitHub published —
for example for release 1.0.0:

```
gh release verify-asset v1.0.0 spfx-procview.sppkg --repo xnyzer/spfx-procview
```

It confirms that the file matches the release's attestation. Upload the package only when the
checks pass.

## 2. First deployment

You need the SharePoint Administrator role (or higher). The labels follow
[Manage apps using the Apps site](https://learn.microsoft.com/en-us/sharepoint/use-app-catalog).

1. In the SharePoint admin center, open **More features** and select **Open** under **Apps**.
2. On the **Manage apps** page, select **Upload** and choose `spfx-procview.sppkg`.
3. In the **Enable app** panel, select **Enable this app and add it to all sites** — the
   solution allows it, so site owners do not have to add it themselves.
4. To offer it in Microsoft Teams as well, also select **Add to Teams** (see
   [section 3](#3-microsoft-teams)).
5. Select **Enable app** (or **Add** when you chose Teams), then **Close**.

No API access request appears — the web part needs none. Editors now find "Process diagram
(ProcView)" in the toolbox of modern pages, in the group "Planning and process".

## 3. Microsoft Teams

The web part can be added as a **tab in a Teams channel**; its settings appear when the tab is
added. It is not offered as a personal app: personal apps show no settings, so no diagram link
could be entered.

- If you did not select **Add to Teams** during the upload: on the **Manage apps** page, select
  the app, then **Add to Teams**.
- The app then appears among your organisation's apps in Teams. If users do not find it, check
  the Teams admin center's app permission policies for apps built for your organisation.
- In Teams' dark and high-contrast themes the web part switches to matching colours. Full
  screen covers the tab, not the whole Teams window.

## 4. Updates

Each release on GitHub has a higher version — the app catalog only treats a package as an
update when its version is higher.

1. Download and verify the new release as in [section 1](#1-download-and-verify).
2. Upload it on the **Manage apps** page **with the same file name**, `spfx-procview.sppkg`.
   SharePoint asks whether to replace the existing package — confirm with **Replace it**, then
   enable the app as before.
3. Because the solution is deployed to all sites at once, every page uses the new version right
   away; there is nothing to update per site.

Pages keep their settings across updates: a setting added in a later release starts with its
default on pages saved before it. If the release notes mention a change to the Teams app (its
name, description or icons), select **Add to Teams** again.

## 5. Where to see the version

- **App catalog:** the **App version** column on the **Manage apps** page shows the version
  with a fourth part, `x.y.z.0` (release `x.y.z`).
- **Property pane:** at the end of the web part's settings, under **About**, below the link to
  the repository — "Version x.y.z".
- **GitHub:** the release title and the [CHANGELOG](../CHANGELOG.md) list each version and
  what it changed.

## 6. Disable or remove

- **Disable:** on the **Manage apps** page, select the app, then **Properties**, and clear
  **Enabled**. Editors can no longer add the web part.
- **Remove:** select the app, then **Delete**, and confirm. Existing instances stop working —
  on pages and in Teams tabs. Remove the web part from pages (and the tabs from Teams) first if
  they should stay tidy.

## Network, firewall and proxy

The readers' browsers need HTTPS (port 443) access to the SAP Signavio host your organisation
uses. The web part accepts links from exactly these hosts:

| Host | Region |
|------|--------|
| `editor.signavio.com` | Europe |
| `app-us.signavio.com` | United States |
| `app-au.signavio.com` | Australia |
| `app-ca.signavio.com` | Canada |
| `app-jp.signavio.com` | Japan |
| `app-kr.signavio.com` | South Korea |
| `app-sgp.signavio.com` | Singapore |

- The diagram is loaded as an image from `https://<host>/p/model/<diagram id>/png?authkey=…`;
  the optional Collaboration Hub link opens `https://<host>/p/portal#/model/<diagram id>`.
- No change to SharePoint's security settings is needed: SharePoint Online's content security
  policy applies to scripts, and the allowed domains of "HTML Field Security" apply to iframes —
  the web part shows a plain image, no iframe. If a site policy blocks the image anyway, editors
  see "Images from *host* are blocked".
- When the image cannot be loaded, editors see possible causes, among them a network, firewall
  or proxy blocking the Signavio domain.

## Privacy and shared links

- **Shared "Simple image" links are effectively public:** anyone who has the link can see the
  image — the link carries its own access key. Embed only diagrams that are approved for that
  kind of sharing; to withdraw one, turn off its read-only sharing in SAP Signavio.
- The web part stores only its own settings (e.g. the link) in the page. It sets no cookies,
  sends no telemetry and calls no API of its own.
- Like any embedded image, loading the diagram reveals the visitor's IP address and browser
  details to SAP Signavio. Image requests and the hub link send **no referrer**, so SAP
  Signavio does not learn which page embeds the diagram.

## Third-party notices

The package contains small third-party helpers compiled into the web part (currently `tslib`
and `@microsoft/load-themed-styles`). Their licences are in `THIRD-PARTY-NOTICES.md`, attached
to every release and kept in the repository; the SharePoint Framework packages themselves are
provided by SharePoint at runtime.

## Known limitations

- **Collaboration Hub link:** it opens `https://<host>/p/portal#/model/<diagram id>`, derived
  from the image link. Whether this entry point suits every user is not yet confirmed — the
  Collaboration Hub also has an address with a workspace id, which the image link does not
  contain. If readers land on a page they cannot use, they can still open the diagram from the
  Collaboration Hub themselves.
- **Languages:** the French and Spanish names of the Signavio menu items in the web part's
  instructions are not verified against the Signavio interface — have them reviewed before
  production use.
- **Teams:** full screen covers the tab only; the web part cannot be a personal app.

## First-use check

After the first deployment, check on a modern page you may edit — this covers what could not be
tested during development without a SharePoint test environment or a touch device:

1. **Add the web part:** "Process diagram (ProcView)" from the group "Planning and process";
   paste a "Simple image" link. The diagram appears, and the settings show "Maximum size: …".
2. **Version:** under **About** at the end of the settings, "Version x.y.z" matches the
   release you deployed.
3. **Keyboard focus in the settings:** move to the alignment buttons under **Size and
   alignment** with Tab and choose another alignment with the arrow keys — the focus stays on
   the buttons and the new choice is shown. Do the same with the caption's alignment. Switch
   on **Background behind the diagram**, change the **Background color** and confirm it — the
   focus stays in the colour field.
4. **Zoom and full screen:** switch on **Offer zoom**; zoom with the buttons and with Ctrl
   (Cmd) + mouse wheel; open full screen and close it with Escape — the focus returns to the
   full-screen button.
5. **On a touch device:** in full screen, a two-finger pinch on a diagram that can be zoomed
   zooms the diagram, and the page behind does not scroll; on a diagram shown at its natural
   size, the pinch magnifies the page as usual.
6. **Teams (if used):** add the web part as a channel tab — its settings appear; in Teams' dark
   theme the colours follow.

Report problems as an [issue on GitHub](https://github.com/xnyzer/spfx-procview/issues).
