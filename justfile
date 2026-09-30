# spfx-procview — standard recipes (SPFx adaptation of the ts-node module)
# The recipe set (setup/dev/test/lint/format/check/build) is the stable contract —
# skills and CI call only these names. Tooling comes from the SPFx 1.23 Heft rig
# (npm, ESLint, Jest); Prettier is the formatter.

# Prettier scope: source and SPFx config only — governance Markdown/YAML stays untouched
prettier_globs := '"src/**/*.{ts,js,scss,json}" "config/**/*.json" "*.config.js"'

default:
    @just --list

# Install dependencies (exactly as locked) + git hooks
setup:
    npm ci
    lefthook install

# Serve the web part on https://localhost:4321 for the local workbench or a SharePoint page
# with the Debug Toolbar (README "Development") — no browser, no tenant needed.
# Optional language file to serve, e.g. `just dev de-de` (default: en-us)
dev locale="":
    npx --no-install heft start --clean --nobrowser {{ if locale == "" { "" } else { "--locales " + locale } }}

# Build (TypeScript + Heft lint) and run the Jest suite
test:
    npx --no-install heft test --clean

# Static analysis: ESLint with the SPFx profile, zero warnings
lint:
    npx --no-install eslint --max-warnings 0 .

# Auto-format + safe lint fixes
format:
    npx --no-install prettier --write --log-level warn {{prettier_globs}}
    npx --no-install eslint --fix .

# Full gate — must be green before every commit
check:
    npx --no-install prettier --check --log-level warn {{prettier_globs}}
    just lint
    just test

# Production build: tests + solution package (sharepoint/solution/spfx-procview.sppkg)
build:
    npm run build
