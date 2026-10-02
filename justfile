# spfx-procview — standard recipes (SPFx adaptation of the ts-node module)
# The recipe set (setup/dev/test/lint/format/check/build) is the stable contract —
# skills and CI call only these names. Tooling comes from the SPFx 1.23 Heft rig
# (npm, ESLint, Jest); Prettier is the formatter.

# Prettier scope: source, scripts and SPFx config only — governance Markdown/YAML stays untouched
prettier_globs := '"src/**/*.{ts,js,scss,json}" "scripts/**/*.mjs" "config/**/*.json" "*.config.js"'

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

# Build (TypeScript + Heft lint) and run the Jest suite, then the tests of the Node scripts
# (Node's built-in test runner — the scripts have no dependencies)
test:
    npx --no-install heft test --clean
    node --test scripts/*.test.mjs

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
    node scripts/source-chars-check.mjs
    node scripts/sync-version.mjs --check
    just lint
    just test
    node scripts/teams-icons.mjs --check
    node scripts/licence-check.mjs

# Production build: tests + solution package (sharepoint/solution/spfx-procview.sppkg)
build:
    npm run build

# Regenerate the Microsoft Teams app icons in teams/ from scripts/teams-icons.mjs
icons:
    node scripts/teams-icons.mjs

# Cut a release, e.g. `just release 1.0.0` (README "Versioning and releases"): the script fetches
# origin, refuses what cannot be released and sets the version and CHANGELOG; then the full gate,
# the release commit and the tag. It never pushes — the printed push is atomic, so the tag never
# reaches GitHub without its commit on main. Stop the dev server first — `just check` cleans its
# folders.
# The first line checks the version as x.y.z, so the later lines only ever see digits and dots.
release version:
    node scripts/release.mjs {{quote(version)}}
    just check
    git add package.json package-lock.json config/package-solution.json CHANGELOG.md
    git commit --quiet -m "chore(release): {{version}}" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
    git tag -a "v{{version}}" -m "Release {{version}}"
    @echo "Release {{version}} committed and tagged as v{{version}} — push both at once: git push --atomic origin main v{{version}}"
