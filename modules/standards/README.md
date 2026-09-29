# modules/standards/

Reusable, framework-granular `CODING-STANDARDS` fragments, composed into a project's
`CODING-STANDARDS.md` §13 slot. Unlike the per-language stack `modules/`, these are
cross-cutting: a `react` or `docker` fragment can be pulled by any module that needs it. The
contract is defined in [`MANIFEST.md`](../../MANIFEST.md) (§ Standards fragments).

Each fragment is a self-contained file `<name>.md` whose body is wrapped in
`<!-- fragment:<name> -->` … `<!-- /fragment:<name> -->`. Skills append it inside the
`<!-- module:coding-standards -->` slot; nothing else in `CODING-STANDARDS.md` changes.

## Catalog

Every fragment plus the trigger→fragment mapping. Most triggers are dependency/framework
signals; a fragment without any dependency signal declares a **project characteristic**
instead (marked *characteristic:*). `/prep-step` matches **both** trigger types when a task
introduces new frameworks or dependencies. Characteristic triggers are additionally asked
in the requirements interview (`/define-requirements`) and can be retrofitted via
`/choose-stack` (confirmed before appending). Evaluating triggers is coding-kit logic;
this catalog defines only the mapping.

| Fragment | Covers | Trigger — dependency signal / project characteristic |
|----------|--------|------------------------------------------------------|
| `react` | React components, styling/theming, i18n, a11y, performance | `react`, `react-dom` |
| `nextjs` | App Router boundaries, routing & caching, assets, build, configuration | `next` |
| `prisma` | Prisma data access, schema & migrations | `prisma`, `@prisma/client` |
| `api-design` | REST API design, request/response validation, web security boundary | `express`, `fastify`, `koa`, `hono`, `nestjs` |
| `docker` | Container images, compose, entrypoint & startup | `Dockerfile`, `docker-compose.yml` |
| `nginx` | Reverse proxy: headers, caching, SPA serving, WebSocket | `nginx.conf`, `nginx` |
| `audit-logging` | Accountability trail for mutating/admin actions: scope, entry contents, properties, retention | *characteristic:* service with user/admin mutations |

## How a module pulls fragments

A stack module contributes its own language fragment (its `CODING-STANDARDS.part.md`, wrapped
as `fragment:<module>`) implicitly. To also pull catalog fragments, it lists them — in order —
on a `Standards fragments:` line in its `MODULE.md`, e.g.:

```
Standards fragments: react, prisma, api-design, docker, nginx
```

Omit the line (or leave it empty) to pull no catalog fragments.
