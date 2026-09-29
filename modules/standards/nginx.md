<!-- fragment:nginx -->
### Nginx

- **`server_tokens off`** — do not advertise the version.
- **Re-declare security headers in every `location` block that sets its own.** Nginx *replaces*
  all inherited `add_header` directives once a block defines any of its own, so repeat them:
  `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.
- **`proxy_http_version 1.1`** for keep-alive to the backend; forward `Upgrade` and `Connection`
  for WebSocket support.
- **Compression** (gzip or brotli) for text MIME types (HTML, CSS, JS, JSON, SVG).
- **SPA cache strategy:** serve `index.html` with `Cache-Control: no-cache` so new deploys show
  immediately; serve content-hashed assets `public, immutable` with a long `expires`.
- **Set `client_max_body_size` explicitly** — do not rely on the small default.
- **HSTS belongs on the TLS-terminating proxy**, not an internal upstream nginx.
- Set sensible proxy timeouts and buffer limits; terminate TLS with a modern cipher suite.
<!-- /fragment:nginx -->
