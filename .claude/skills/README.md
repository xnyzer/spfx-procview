# .claude/skills/

Home for **project-specific** skills only — automation that makes no sense outside this
project (deploy helpers, domain checks, data fixtures).

The generic workflow skills (`/add-feature`, `/prep-step`, `/step-done`, `/audit-code`,
`/new-project`, `/update-conventions`, …) come from the **coding-kit plugin** and are
namespaced (`/coding-kit:step-done`). Do not copy them into this directory: a local copy
shadows nothing but stops receiving updates and confuses skill listings.
