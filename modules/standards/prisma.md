<!-- fragment:prisma -->
### Prisma

- **Use the ORM for all queries** — no raw SQL without a compelling reason; when unavoidable,
  only parameterised `Prisma.sql` tagged templates, never string interpolation.
- **Select deliberately** — fetch only the fields you need; don't over-fetch whole relations.
- **No N+1** — use `include`/`select` or batch queries.
- **Paginate** large result sets; never return an unbounded list.
- **Wrap related writes in a transaction** (`$transaction`) so they commit or roll back together.
- **One shared client instance** — never construct a client per request.
- **Handle constraint violations explicitly** (e.g. unique conflicts) — map them to a clean
  domain error; never leak the raw database error to the client.

**Schema & migrations**
- Every change goes through a generated migration — **no manual database edits**.
- Migrations are **immutable**: once created/applied, never edit one — add a new migration.
- **Enforce integrity in the database:** foreign-key constraints, and unique constraints on
  natural keys (email, slug, …), not only in application code.
- **Index** the columns used in filters, joins, and sorts.
- Destructive changes (drop, column removal) only with an accompanying data migration.
<!-- /fragment:prisma -->
