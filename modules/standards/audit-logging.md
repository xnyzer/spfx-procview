<!-- fragment:audit-logging -->
### Audit / activity logging

An audit trail answers "who did what to what, and when" — it exists for accountability,
not debugging. It applies wherever users or administrators perform mutating actions.

- **Log every mutating domain action** (create, update, delete) and every security-relevant
  operation: permission/role changes, auth events, admin/config operations — **including
  denied attempts** (a rejected action is a signal, not noise).
- **An entry carries:** actor (stable id), action, target (type + id), timestamp, and
  outcome (success / denied / failed) — plus a correlation/request id where available.
- **Never record secrets or full payloads:** no tokens, credentials, or complete request
  bodies; reference the target by id instead of duplicating its data. Personal data only as
  far as accountability requires.
- **Append-only:** entries are never updated or deleted by application code — corrections
  are new entries.
- **Coupled to the mutation:** write the audit entry atomically with the change (same
  transaction) or via an equally reliable path — a mutation whose audit write silently
  failed is a gap in the trail.
- **Queryable:** filterable by actor, target, action, and time range — an unqueryable
  trail answers nothing.
- **Retention is a conscious decision:** define it per project (compliance may dictate it);
  audit entries never just rotate away with application logs.

**Audit log ≠ application log**

- The application log serves debugging: technical events, free-form, may rotate away.
- The audit log serves accountability: domain events, structured, retained deliberately.
  Keep them separate — different audience, different lifetime, different access rules.
<!-- /fragment:audit-logging -->
