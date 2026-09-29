<!-- fragment:react -->
### React

- **Function components + hooks only** — no class components.
- **Type props as an interface** declared above the component; destructure in the signature.
- **Custom hooks** for reusable logic — one hook per file, `use`-prefixed.
- **Keep state local.** Reach for Context only for genuinely global state (auth, config, theme);
  for server state use a data-fetching/cache layer, not hand-rolled effects.
- **Effects are for side effects**, not for deriving state — compute derived values in render.
- **No direct DOM manipulation** — go through state/refs.
- **Stable list keys** — a domain id, never the array index.
- **Controlled inputs** with a single source of truth.

**Component size**
- Target under ~200 lines of JSX in the return block; beyond that, extract subcomponents.
- Pull repeating elements (rows, cards, dialogs) into their own components.

**Styling & theming**
- **Design tokens for everything visual** — colours, type, spacing, radius, shadow — as CSS
  variables / theme tokens; dark/light is the first skin on that system.
- **No hardcoded visual values** in components: no raw hex colours, no fixed pixel spacing.
- **No inline styles** except for genuinely dynamic values (e.g. a progress position).
- **Layout-agnostic components:** a component fills its container and never assumes its place
  ("left", "top", a fixed arrangement) — the layout decides placement, so it stays swappable.

**Accessibility**
- Semantic HTML first; every interactive element is keyboard-reachable and labelled.
- Never remove a focus outline without providing an equivalent visible focus state.

**Internationalisation**
- All user-visible strings go through the translation layer — no hardcoded copy.
- Semantic keys (`area.context.element`); add every new key to all language files at once.

**Performance**
- Lazy-load routes and large components, wrapped in an error boundary.
- Watch bundle size — no gratuitous frontend dependencies.
- Optimise images (modern formats, responsive sizes).
<!-- /fragment:react -->
