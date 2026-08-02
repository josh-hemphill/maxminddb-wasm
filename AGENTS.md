# AGENTS.md

## Cursor Cloud specific instructions

`maxminddb-wasm` is a Rust → WebAssembly library (compiled with `wasm-bindgen`) that
exposes MaxMind GeoIP database lookups to JavaScript/TypeScript. There is **no
long‑running service**; the "applications" are the generated WASM bindings and the
per‑platform test suites under `tests/*`.

### Toolchain notes (non‑obvious)

- The Rust toolchain is **nightly** and the `wasm32-unknown-unknown` target is pinned
  by `rust-toolchain.toml` (rustup adds the target automatically).
- The build calls the `wasm-bindgen` CLI directly. Its version **must match** the
  `wasm-bindgen` crate version in `Cargo.lock` (currently `0.2.105`); a mismatch makes
  `pnpm build` fail with a schema‑version error. The update script installs the pinned
  CLI. The root `postinstall` (`tsx cli.ts --install-bindgen`) only installs an
  unpinned latest CLI when none is on `PATH`, so keep the pinned one installed.
- `bun` and `deno` are **not system tools**; they are provided as pnpm optional
  dependencies (see `pnpm.onlyBuiltDependencies`) and are on `PATH` only inside
  `pnpm run` scripts. `pnpm install` installs them.

### Build / test / run

- Build all JS targets (`node`, `browser`, `bundler`, `node-module`): `pnpm build`
  (see `package.json` scripts). Output dirs are git‑ignored.
- Run the standard test matrix: `pnpm test`. This fetches the MaxMind test DB to
  `tests/.GeoLite2-City-Test.mmdb` on first run (needs network) and then runs the
  `test:*` scripts: **node, node-module, bun, deno** (all pass).
- The **browser** and **cloudflare** suites are intentionally prefixed `failing:`
  (`failing:test:browser`, `failing:test:cf-worker`) so `pnpm test` skips them. The
  browser suite launches Chromium via Playwright (installed) but currently fails on a
  `@vitest/browser-playwright/context` package‑export resolution error in the test
  code; the cloudflare suite does not run locally per the README. Do not treat these
  as environment gaps.
- There is **no configured lint step** (repo CI is build + test only); `package.json`
  has no `lint` script and there is no ESLint config despite CONTRIBUTING mentioning it.

### Quick end‑to‑end sanity check

Import from the built `node-module` output and look up an IP present in the test DB
(`2a02:d100::0001` resolves to Poland / `Europe/Warsaw`):

```js
import { readFileSync } from 'node:fs';
import { Maxmind } from './node-module/index.js';
const mm = new Maxmind(readFileSync('./tests/.GeoLite2-City-Test.mmdb'));
console.log(mm.lookup_city('2a02:d100::0001'));
```
