<!-- fragment:docker -->
### Docker & containers

**Dockerfile**
- **Multi-stage builds** — separate the build stage (compilers, dev deps) from the runtime stage
  (only artefacts + prod deps). No dev dependencies in the runtime image.
- **Official minimal base images** (current LTS); pin them deliberately and let the updater bump.
- **Run as a non-root user** in every runtime stage — set an explicit UID/GID, `USER` before
  `EXPOSE`/`CMD`. Prefer an official unprivileged image over hand-rolled user hacks.
- **Reproducible installs** — always use the package manager's frozen-lockfile flag.
- **Order layers for caching:** copy manifests → install → copy source → build, so the install
  layer is invalidated only when dependencies change.
- **Healthcheck** in every image; the start-period must cover real startup (migrations, warmup).
- **Signal handling:** the entrypoint runs the main process as PID 1 (`exec "$@"`) so it receives
  SIGTERM; `#!/bin/sh` with `set -e`.
- **No secrets in images** — not as `ARG`, not as `ENV`; secrets arrive at runtime via the
  orchestrator.

**.dockerignore**
- Exclude everything not needed for the build (docs, logs, coverage, CI config, VCS metadata).
- Do not exclude files another service needs from the build context.

**Compose / orchestration**
- Every service has a healthcheck; dependents wait on `condition: service_healthy`.
- Restart policy `unless-stopped`; required variables via `${VAR:?message}` so it fails fast.
- Named volumes for persistent data — never anonymous volumes for anything important.
- A complete, commented `.env.example` — every variable documented, no real secrets.
- Ports configurable via env — no hardcoded port numbers.

**Entrypoint & startup**
- Run migrations before the server starts — a deploy migration, never an auto-destructive one.
- Make seeding opt-in via an env flag; do not reseed on every restart.
- `set -e` up front so a failed step (e.g. a migration) aborts immediately.
- Graceful shutdown: handle SIGTERM, finish in-flight work, close connections cleanly.
<!-- /fragment:docker -->
