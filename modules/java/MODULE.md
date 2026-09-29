# Module: java (stub — documented, not implemented)

Planned scope for a future Java module. Nothing here is instantiated yet;
`/choose-stack` lists it as "planned".

## Intended shape

- **Toolchain:** current LTS JDK via mise; build tool decision pending (Gradle with
  version catalog vs. Maven — verify current best practice when building the module).
- **Recipes:** `setup` (dependency resolution, lefthook install), `test` (JUnit),
  `lint` (Checkstyle/Error Prone — verify current state), `format`
  (google-java-format or Spotless), `check` (format-check + lint + test), `build`
  (jar/native), `dev` (run main class).
- **CI:** ubuntu job extension via `ci.part.yml`; license gate candidate:
  Gradle/Maven license plugins.
- **CodeQL:** `{{CODEQL_LANGUAGES}}` → `java-kotlin`.

## Open questions (resolve when building the module)

- [ ] Gradle vs. Maven default for solo projects.
- [ ] Formatter choice (Spotless wrapping google-java-format is the likely default).
- [ ] Dependency lock strategy (Gradle lockfiles) + Renovate manager coverage.
