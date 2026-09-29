# Security Policy

project-template ships configuration into downstream projects: CI workflows, permission
settings for Claude Code, git hooks, and dependency automation. A malicious or careless
change here propagates — reports are taken seriously.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Use GitHub's private reporting instead:

1. Go to the **Security tab** of this repository
2. Click **"Report a vulnerability"**
3. Fill in the form and submit

## What is in scope

- The shipped CI workflows (`core/.github/workflows/`, module `ci.part.yml` files) —
  e.g. permission escalation, unpinned or tampered action references.
- The shipped Claude Code permission settings (`core/.claude/settings.json`) — e.g. a
  deny-list bypass.
- The shipped hook and scanner configuration (`core/lefthook.yml`) and the template
  validator (`scripts/validate.py`).

Out of scope: vulnerabilities in the referenced third-party tools themselves (mise, just,
lefthook, gitleaks, Renovate, CodeQL) — report those upstream, but do tell us so pins can
be updated.

## What happens next

This project is maintained by a single person in their spare time — initial response
within a few days where possible, but it can take two to three weeks. Confirmed issues in
shipped configuration are treated with priority because of their downstream blast radius.

## Safe harbor

No legal action against researchers who report in good faith, give reasonable time to fix,
and limit testing to their own repositories and deployments.
