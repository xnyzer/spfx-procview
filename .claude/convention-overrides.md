# Convention Overrides

<!-- section:overrides-head -->
Registry of deliberate, project-local deviations from the template conventions.
`/update-conventions` respects every entry here: registered files (or sections marked
inline with `<!-- override: reason -->`) are **never** overwritten by template updates.

An override needs a reason — "we never got around to it" is drift, not an override.
<!-- /section:overrides-head -->

| File / rule | Deviation | Reason | Since |
|-------------|-----------|--------|-------|
| Stack module | No template module instantiated as-is; SPFx adaptation of `ts-node` (scaffold from `@microsoft/generator-sharepoint` 1.23.2, `--framework none`). `ts-node` `files/**`, `mise.part.toml`, `gitignore.part` and `fragment:ts-node` are **not** applied | SPFx dictates its own toolchain (Heft rig, npm, ESLint, Jest, CommonJS/AMD, ES5 target) that conflicts with ts-node's pnpm/Biome/vitest/nodenext/ESM rules | 2026-09-29 |
| `justfile` | SPFx recipes (`npm ci`, `heft start/test`, ESLint, Prettier, `npm run build`) instead of the module justfile | Standard recipe set kept; implementation follows the SPFx toolchain | 2026-09-29 |
| `mise.toml` | `node = "22"`, no `pnpm` | SPFx 1.23 requires Node `>=22.14 <23` and uses npm | 2026-09-29 |
| `renovate.json` | `packageRules`: SPFx group only on Dependency Dashboard approval; updates disabled for SPFx-pinned toolchain packages and Node majors | SPFx packages must move in lockstep with their toolchain; a partial bump breaks the rig — upgrades are a deliberate task (README "Upgrading SPFx") | 2026-09-29 |
| `CODING-STANDARDS.md` §13 | Project-local `fragment:spfx` instead of `fragment:ts-node` | See "Stack module"; candidate for an `spfx` module/fragment in the template (manual adoption proposal) | 2026-09-29 |
| `scripts/privacy-lint.sh` | Skips `package-lock.json`; ignores IP-like matches on `"version":` lines (marked `# override:` inline) | npm lockfile deprecation notices contain maintainer emails; SPFx solution versions have four parts (major.minor.patch.build). Generic gap — adoption proposal for the template | 2026-09-29 |
| `CODING-STANDARDS.md` §13 (escaping, icons) | DOM properties only instead of `escape` from `@microsoft/sp-lodash-subset`; own inline SVG icons instead of Fluent UI Core icon classes (`@microsoft/sp-office-ui-fabric-core`); both packages removed | No markup strings are built at all, so there is nothing to escape; inline SVGs in `currentColor` follow the section theme without an icon font (decided in F-006, removed in the audit F-016c) | 2026-10-01 |
| `CODING-STANDARDS.md` §13 (theme colours) — `ProcViewWebPart.module.scss` | Fixed colours in the full-screen layer (scrim `rgba(0, 0, 0, 0.85)`, white close button with dark icon, white message text, two-tone white/black focus ring) and neutral shadows `rgba(0, 0, 0, 0.2)` under the overlay link and the zoom buttons | The full-screen dialog lives in `<body>`, outside the web part and any section theme, and is always dark: theme colours there were unreadable or invisible in dark themes (audit F-016a M8, L14); shadows only lift the controls off any diagram background | 2026-10-02 |
| `CODING-STANDARDS.md` §8 (permissive licenses) | Microsoft SPFx license terms accepted for `@microsoft/sp-*` runtime packages and the SPFx build toolchain | Unavoidable platform dependency; runtime packages are SharePoint-provided externals — see `docs/adr/0001-spfx-platform-dependencies.md` | 2026-09-29 |
| `.github/workflows/ci.yml` (module jobs) | Jobs `secrets-scan` (gitleaks over full history + `privacy-lint --all`) and `package` (`just build`) below `# module:ci-jobs` | Server-side backstop for skippable local hooks; shared-link keys are no GitHub push-protection pattern. `package` guards the `.sppkg` deliverable. `secrets-scan` is a template adoption candidate | 2026-09-29 |
| `.gitignore` (module part) | SPFx build outputs (root-anchored) appended below `# module:gitignore` instead of `ts-node/gitignore.part` | Heft/SPFx output folders (`lib*`, `temp`, `solution`, `.heft`, `jest-output`, `*.sppkg`) | 2026-09-29 |
