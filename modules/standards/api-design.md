<!-- fragment:api-design -->
### API design

**Architecture — thin routes, fat services**
- A route does three things: validate/parse input, delegate to a service, return the response.
- Services hold everything else — validation, data access, side effects, logging. Keep route
  handlers free of business logic.

**URLs & methods**
- `/<resource>` — plural, lowercase, kebab-case (`/users`, `/system-settings`).
- Use HTTP methods correctly: GET reads, POST creates, PUT replaces, PATCH partial-updates,
  DELETE removes. PUT and DELETE are idempotent.

**Status codes**
- Success: `200` OK, `201` Created, `204` No Content.
- Client: `400` Bad Request, `401` Unauthorized, `403` Forbidden, `404` Not Found,
  `409` Conflict, `422` Validation Error, `429` Too Many Requests (send `Retry-After`).
- Server: `500` Internal Server Error — never leak stack traces or internals to the client.

**Request / response**
- **Validate every external input server-side** with a schema — body, query, params, headers —
  using a whitelist (accept only what is explicitly allowed), not a denylist.
- Define an explicit **response shape** so internal fields cannot leak by accident.
- No sensitive data in URLs / query parameters.
- Consistent error envelope: `{ error: string, details?: object }`.
- Paginate large collections (prefer cursor-based); never return an unbounded list.

**Security boundary**
- **Authorize every route explicitly** by permission — never by comparing role strings; only
  auth and health endpoints are open.
- **Rate-limit** sensitive endpoints (login, password reset, registration, MFA).
- Forbidden by default — use the safe alternative:
  - dynamic code execution (`eval`, `new Function`) → never;
  - spawning a process with user input → an argument-array exec, never a shell string;
  - raw SQL with string interpolation → parameterised queries only;
  - rendering raw HTML from input → sanitise first;
  - tokens/sessions in browser web storage → httpOnly, Secure cookies;
  - unstructured `console` logging on a server path → the structured logger.

**Credentials & data protection**
- Hash passwords with a modern, deliberately-slow KDF (never MD5/SHA); encrypt sensitive fields
  at rest. Secrets come from validated env only (core §8) — never in logs, code, or git.
- Data minimisation: select only the fields you need, especially for personal data.
- No personal data in URLs, error responses, or client-visible logs; truncate or hash IP
  addresses in logs.
- Host assets locally — no third-party CDNs, fonts, or trackers on user-facing pages.
- Honour real deletion where the law requires it — a soft-delete flag is a transitional state,
  not erasure.

**Security headers** (set at the app or the terminating proxy — see the `nginx` fragment):
`Content-Security-Policy` (avoid `unsafe-inline`), `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Strict-Transport-Security` (≥ 1 year), and `Cache-Control: no-store` for sensitive responses.
<!-- /fragment:api-design -->
