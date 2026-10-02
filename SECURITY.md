# Security Policy

`spfx-procview` is a SharePoint Framework web part that renders process diagrams from
editor-supplied links inside SharePoint pages; it runs in the security context of every
page visitor, so injection flaws (e.g. unescaped URLs or markup) could affect all users of
a site.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, use GitHub's private reporting feature:

1. Go to the **Security tab** of this repository
2. Click **"Report a vulnerability"**
3. Fill in the form and submit

Only the maintainer and you will see the report. You can attach proof-of-concept code or
logs without them becoming public.

## What to include

- A description of the issue and its impact
- Steps to reproduce (as minimal as you can make them)
- The affected version or commit SHA
- The threat scenario (who can exploit this, and from where)
- Any suggested mitigation or patch idea, if you have one

## What happens next

This project is maintained by a single person in their spare time, so response times
vary — please be patient.

- **Initial response:** within a few days where possible, but it can take two to three weeks.
- **Triage:** confirmation whether it is a vulnerability and a rough severity.
- **Fix timeline:** depends on severity and scope; issues that expose users or data are
  treated with the highest priority.
- **Disclosure:** when a fix is released, the advisory is published and you are credited
  unless you prefer to stay anonymous.

## Scope

- In scope: this repository's code (web part source, manifests, solution package
  configuration) and its build/CI configuration.
- Out of scope: vulnerabilities in third-party dependencies, including the SharePoint
  Framework packages (report upstream, but tell us so we can pin/patch), in SharePoint
  Online / Microsoft 365 itself, and in SAP Signavio or other embedded process tools.

## Supported versions

| Version | Supported |
|---------|-----------|
| The latest release | yes — a fix comes as a new patch release |
| Older releases | no — update to the latest release |

Releases are immutable: a published version is never changed, so every fix gets a new, higher
version number that the SharePoint App Catalog offers as an update.

## Safe harbor

I will not take legal action against researchers who report vulnerabilities in good
faith, follow this policy, give reasonable time to fix the issue before public
disclosure, and do not exfiltrate data beyond what is needed to demonstrate the issue.
Testing must be limited to your own deployment — do not attack other people's instances.
