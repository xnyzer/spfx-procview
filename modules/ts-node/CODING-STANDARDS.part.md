<!-- fragment:ts-node -->
### TypeScript (ts-node module)

- **Runtime:** current Node LTS via mise; `engines` in `package.json` enforces the floor.
  **ESM only** (`"type": "module"`); relative imports carry the `.js` extension (nodenext).
- **Package manager: pnpm only** (pinned via `packageManager` + mise). No npm, no yarn.
- **tsconfig is strict** (`strict` plus `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `noUnusedLocals/Parameters`, …).
  Never weaken it per file — fix the types. `tsc --noEmit` is part of `just lint`.
- **Biome** is the single formatter + linter (`biome.json`); warnings fail the gate
  (`--error-on-warnings`). **No `any`** (`noExplicitAny` is an error) — use `unknown`
  and narrow.
- **Tests: vitest**, colocated as `*.test.ts` next to the code; excluded from production
  builds via `tsconfig.build.json`.
- **Naming:** camelCase for values/functions, PascalCase for types/classes,
  kebab-case file names.
- **Dependencies:** exact-pinned by the lockfile (`pnpm-lock.yaml`, committed); Renovate
  keeps them fresh. Permissive licenses only (§8).
<!-- /fragment:ts-node -->
