# ADR-0002: Accept the node-forge advisory in the SPFx build toolchain

- **Status:** accepted
- **Date:** 2026-10-02
- **Extends:** [ADR-0001](0001-spfx-platform-dependencies.md) — the same policy for one more
  toolchain advisory

## Context

`npm audit` (2026-10-02) reports GHSA-86w9-cpqp-85rv (CVE-2026-85393, published 2026-09-03,
high, CVSS v4 8.7) for `node-forge` up to 1.4.0: its RSA PKCS#1 v1.5 signature verification
accepts extra nested DigestAlgorithm elements, so signatures made with low-exponent keys can be
forged. **No fixed version exists** (`latest` is 1.4.0). npm counts it five times — `node-forge`
and the packages that pull it in.

- **Path:** `@microsoft/spfx-web-build-rig` → `@rushstack/heft-dev-cert-plugin` and
  `@rushstack/heft-webpack5-plugin` → `@rushstack/debug-certificate-manager` (1.7.10, 1.7.13) →
  `node-forge` 1.4.0.
- **Development only:** the certificate manager creates and trusts the self-signed `localhost`
  certificate of the dev server; nothing of it reaches the `.sppkg` (`npm audit --omit=dev`
  reports 0).
- **Not reachable** (checked in its sources): it calls only `pki.rsa.generateKeyPair`,
  `pki.createCertificate`, `pki.certificateToPem`, `pki.certificateFromPem`,
  `pki.privateKeyToPem` and `md.sha*` — it creates and signs its own certificate and never
  verifies a signature from elsewhere.
- **No usable fix:** `npm audit fix --force` would install `@microsoft/spfx-web-build-rig`
  1.21.1, a downgrade of the SPFx toolchain that ADR-0001 rules out; an npm override needs a
  fixed version, and there is none.

## Decision

- We **accept the advisory** as a non-reachable, development-only risk until an SPFx toolchain
  release ships a fixed `node-forge` or no longer needs it.
- The Dependabot alerts for this advisory and for the `uuid` advisory accepted in ADR-0001 are
  **dismissed as tolerable risk** with a reference to these ADRs, so an open alert always means
  a new finding.

## Consequences

- `npm audit` keeps reporting the `node-forge` chain (5 high) and the `uuid` chain (5 moderate);
  both are accepted — anything beyond them is new and needs a look.
- Re-evaluated with the SPFx upgrade before Node 22's end of life (F-010) and as soon as a fixed
  `node-forge` is published — then a same-major npm override, as ADR-0001 allows.
- If Dependabot reopens a dismissed alert (e.g. for a changed advisory), it is checked against
  this ADR again.
