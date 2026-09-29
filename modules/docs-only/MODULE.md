# Module: docs-only

The default when no stack is chosen (`/new-project` → stack "open"). Provides **nothing**
— the project runs on the core defaults: the core `justfile` (no-op recipes that succeed),
core `mise.toml` (just/lefthook/gitleaks only), core CI (`just check` passes trivially).

Intended for: documentation projects, specs, decision records, or projects whose stack is
decided later (`/choose-stack` retrofits a real module without touching `core/` files
beyond the documented merge points).

No `{{CODEQL_LANGUAGES}}`: `/new-project` removes the CodeQL workflow for docs-only
projects regardless of visibility.
