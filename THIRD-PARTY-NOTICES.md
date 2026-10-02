# Third-party notices

The solution package `spfx-procview.sppkg` contains ProcView's own code (Apache-2.0, see
[LICENSE](LICENSE)) and the third-party code listed below, which the SharePoint Framework build
compiles into the web part bundle. The SharePoint Framework libraries the web part uses at
runtime are provided by SharePoint and are not part of the package (Microsoft SharePoint
Framework licence terms, see [ADR-0001](docs/adr/0001-spfx-platform-dependencies.md)).

`just check` (`scripts/licence-check.mjs`) fails when the versions below no longer match the
installed ones, so this file is updated together with the dependency.

## tslib 2.3.1

- Source: <https://github.com/microsoft/tslib>
- Licence: 0BSD
- In the bundle: TypeScript's runtime helpers (e.g. for class inheritance)

```text
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
```

## @microsoft/load-themed-styles 1.10.292

- Source: <https://github.com/microsoft/rushstack> (`libraries/load-themed-styles`)
- Licence: MIT
- In the bundle: the loader that adds the web part's theme-aware stylesheet to the page (added
  by the SharePoint Framework build through `@microsoft/sp-css-loader`)

```text
Copyright (c) Microsoft Corporation. All rights reserved.

MIT License

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
