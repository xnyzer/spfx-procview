# modules/

Per-stack additions, instantiated by `/new-project` (or retrofitted by `/choose-stack`).
The module contract — which parts exist and how each is applied — is defined in
[`MANIFEST.md`](../MANIFEST.md) (§ Module contract). Ongoing updates of instantiated
modules are handled by `/update-conventions`, not by `/choose-stack`.

| Module | Status | Toolchain |
|--------|--------|-----------|
| `docs-only` | full (default) | none — core defaults |
| `ts-node` | full | Node LTS + pnpm + TypeScript strict + Biome + vitest |
| `python` | full | current Python + uv + ruff + pyright + pytest |
| `go` | full | current Go + gofmt/goimports + golangci-lint + go-licenses |
| `swift-ios` | stub — documented, not implemented | — |
| `java` | stub — documented, not implemented | — |

`standards/` is not a stack module but the cross-cutting catalog of reusable
CODING-STANDARDS fragments a module declares or a project pulls — see
[`standards/README.md`](standards/README.md).

Adding a module never requires touching `core/` — modules are additive by design.
