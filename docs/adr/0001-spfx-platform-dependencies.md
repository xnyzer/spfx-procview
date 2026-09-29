# ADR-0001: Accept the SharePoint Framework platform dependencies as they ship

- **Status:** accepted
- **Date:** 2026-09-29

## Context

The project is a SharePoint Framework (SPFx 1.23.2) web part. SPFx dictates its runtime
packages and its whole build toolchain (Heft rig, TypeScript, ESLint, Jest, webpack,
Node 22). Two project rules collide with that:

1. **Licenses** — `CODING-STANDARDS.md` §8 allows only permissive licenses unless a
   deviation is a conscious, documented decision. The runtime packages `@microsoft/sp-*`
   are published under Microsoft's SharePoint Framework license terms
   (`http://aka.ms/spfx`, proprietary but free to use for SPFx solutions); the build rig,
   Heft plugins and `@microsoft/eslint-*-spfx` under custom Microsoft terms. At runtime the
   `@microsoft/sp-*` modules are *externals*: SharePoint loads them — they are not bundled
   into or redistributed with our `.sppkg`.
2. **Known advisories** — `npm audit` (2026-09-29) reports moderate advisories that live
   exclusively in the build/dev toolchain shipped by Microsoft:
   - `qs` (GHSA-q8mj-m7cp-5q26) via `@microsoft/spfx-heft-plugins` → `express` — **fixed** by
     an npm `overrides` pin to `qs` 6.16.0 (same major, patch release).
   - `uuid` < 11.1.1 (GHSA-w5hq-g745-h8pq: missing buffer bounds check in `v3`/`v5`/`v6`
     when a `buf` argument is passed) via `@microsoft/spfx-heft-plugins`, `jest-junit`,
     `webpack-dev-server` → `sockjs`. All three consumers call **only `v4()`** (verified in
     their sources), so the vulnerable code path is not reachable. The only fix npm offers
     is a downgrade of SPFx to 1.12/1.21 (`npm audit fix --force`) — not an option.

## Decision

- We **accept the Microsoft SPFx license terms** for the SPFx runtime packages and the
  SPFx build toolchain as an explicit exception to §8. Every other dependency remains
  subject to the permissive-only rule. Dual-licensed transitive build packages (`jszip`
  MIT OR GPL-3.0, `node-forge` BSD-3-Clause OR GPL-2.0) are used under their permissive
  option.
- We **accept the remaining `uuid` advisory** as a non-reachable, dev-time-only risk until
  an SPFx release updates its toolchain. We never run `npm audit fix --force`.
- Advisories in the toolchain are fixed by narrow npm `overrides` only when the override
  stays within the same major version and the build (`just build`) stays green.

## Consequences

- New `@microsoft/sp-*` packages may be added without a new ADR; any other non-permissive
  dependency still needs one.
- `npm audit` will keep reporting the `uuid` advisory; it is re-evaluated with every SPFx
  upgrade (see README "Upgrading SPFx") and whenever the advisory changes scope.
- The `qs` override must be removed once the SPFx toolchain ships a patched `express`
  dependency chain on its own.
