# Module: swift-ios (stub — documented, not implemented)

Planned scope for a future Swift/iOS module. Nothing here is instantiated yet;
`/choose-stack` lists it as "planned".

## Intended shape

- **Toolchain:** Xcode (managed outside mise — document the required version in the
  project README), SwiftFormat + SwiftLint via mise/Homebrew.
- **Recipes:** `setup` (resolve SPM packages, lefthook install), `test`
  (`xcodebuild test` on a simulator destination), `lint` (SwiftLint), `format`
  (SwiftFormat), `check` (format-check + lint + test), `build` (`xcodebuild build`),
  `dev` (open in Xcode).
- **Structure:** SPM package or Xcode project; tests via XCTest/Swift Testing.
- **CI:** requires a macOS runner (`runs-on: macos-*`) — the module's `ci.part.yml` will
  add a separate job rather than extending the ubuntu job.
- **CodeQL:** `{{CODEQL_LANGUAGES}}` → `swift` (build-mode support to be verified when
  the module is built).

## Open questions (resolve when building the module)

- [ ] SwiftFormat vs. swift-format (apple) — pick one, verify current state.
- [ ] Simulator destination pinning strategy for reproducible `just test`.
- [ ] Signing/profile handling for CI builds (likely out of scope for `check`).
