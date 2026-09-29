# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

<!-- template:adapt: expand into 2–4 sentences from the short-info: what it does, for
whom, what makes it distinct. -->

## Status

<!-- template:adapt: one line on the current state -->
Early development — see `PROGRESS.md` for the roadmap.

<!-- section:readme-getting-started -->
## Getting started

Toolchain is pinned via [mise](https://mise.jdx.dev); everything else follows from it:

```
mise install   # toolchain (incl. just, lefthook, gitleaks)
just setup     # dependencies + git hooks
just check     # full gate: format check, lint, types, tests
```

| Recipe | Purpose |
|--------|---------|
| `just setup` | Install dependencies and git hooks |
| `just dev` | Run the project locally |
| `just test` | Run the test suite |
| `just lint` | Static analysis |
| `just format` | Auto-format the codebase |
| `just check` | The full gate — must be green before every commit |
| `just build` | Production build |
<!-- /section:readme-getting-started -->

## Documentation

- `REQUIREMENTS.md` — intent (transitional; dissolved into `PROGRESS.md`)
- `PROGRESS.md` — roadmap and task list
- `CODING-STANDARDS.md` — binding coding rules
- `HOW-TO-CODE-WITH-CLAUDE.md` — development workflow (Claude Code + coding-kit skills)
- `CONTRIBUTING.md`, `SECURITY.md`, `AI-DISCLOSURE.md` — governance

## License

{{LICENSE_SPDX}} — see [LICENSE](LICENSE).
