<!-- fragment:python -->
### Python (python module)

- **Runtime:** current stable Python via mise; `requires-python` enforces the floor.
- **uv only** for environments, dependencies, running, and building — no bare `pip`,
  no manual venv management. `uv run` is the way to execute anything project-local.
- **src layout** (`src/<package>/`) with `py.typed`; imports are absolute from the package.
- **Type hints are mandatory** on all public functions; **pyright runs strict** — fix the
  types, don't `# type: ignore` (if unavoidable, use a scoped ignore with a reason).
- **ruff** is the single formatter + linter (config in `pyproject.toml`); import sorting
  via the `I` rules. Zero lint findings — warnings count as errors (§1).
- **Tests: pytest** under `tests/`, mirroring the package structure; plain asserts,
  fixtures over setup methods.
- **Naming:** snake_case for functions/modules, PascalCase for classes, UPPER_SNAKE for
  constants.
- **Dependencies:** locked in `uv.lock` (committed); Renovate keeps them fresh.
  Permissive licenses only (§8).
<!-- /fragment:python -->
