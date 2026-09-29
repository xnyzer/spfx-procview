# Security Policy

<!-- template:adapt: one sentence on what this project is and why a vulnerability would
matter (attack surface, data handled). For security-critical projects (auth, network
boundaries), state that explicitly. -->

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

<!-- template:adapt: list what is in scope (this project's code, its build/CI config) and
what is out of scope (upstream dependencies, the underlying OS/runtime, third-party
services) — adjust to the project's architecture. -->

- In scope: this repository's code and its build/deployment/CI configuration.
- Out of scope: vulnerabilities in third-party dependencies (report upstream, but tell us
  so we can pin/patch) and in the underlying OS/runtime.

## Supported versions

| Version | Supported |
|---------|-----------|
| pre-release (no tagged release yet) | latest `main` only |

This table will be updated once the project has tagged releases.

## Safe harbor

I will not take legal action against researchers who report vulnerabilities in good
faith, follow this policy, give reasonable time to fix the issue before public
disclosure, and do not exfiltrate data beyond what is needed to demonstrate the issue.
Testing must be limited to your own deployment — do not attack other people's instances.
