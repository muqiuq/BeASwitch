# be-a.network — browser version

All three exercises (BeASwitch, BeARouter, IP Quiz) as one static site. No server,
no network calls at runtime, installable as a PWA.

- `engine/` (repo root) — the simulation logic in Rust, compiled to WebAssembly.
- `web/` — the UI in TypeScript, inline SVG and CSS.

The WPF projects are untouched and remain the reference implementation.

## Prerequisites

| Tool | Why | Notes |
| --- | --- | --- |
| Rust + `wasm-pack` | builds the engine | already installed |
| `wasm32-unknown-unknown` target | **not yet installed** | `rustup target add wasm32-unknown-unknown` |
| Node 24 | builds the UI | or use `./npm.sh`, which runs npm in a container |

## Build

```sh
# once
rustup target add wasm32-unknown-unknown

cd web
./npm.sh install        # or: npm install
npm run build:wasm      # wasm-pack -> web/src/wasm/ (runs on the host, not in a container)
./npm.sh run build      # or: npm run build   -> web/dist/
```

`web/dist/` is a plain static folder. It uses relative asset paths, so it can be
served from a domain root, a sub-path such as GitHub Pages, or a school intranet
share without rebuilding.

## Develop

```sh
cd web
./start.sh              # dev server with hot reload -> http://localhost:5173
./start.sh preview      # serve the production build -> http://localhost:4173
./start.sh build        # build only
```

`start.sh` installs dependencies on first run, warns if the engine has not been
built yet, and stops with Ctrl-C. It mounts the repo into
`docker.io/library/node:24-alpine` and keeps `node_modules` in a named volume,
because bind-mounted `node_modules` is slow on macOS and loses its ownership
through virtiofs. `npm.sh` wraps arbitrary npm commands the same way.

## Test

```sh
cd engine && cargo test  # 147 tests: forwarding, routing, subnetting, quiz generators
cd web && ./npm.sh test  # translation catalog parity
cd web && ./npm.sh run test:engine  # drives the built wasm through a round of each exercise
```

The Rust suites include the assertions ported 1:1 from `BeARouter.Test`, so the
browser version is checked against the same expectations as the desktop app.

## Layout

```
engine/crates/
  net-core/        IPv4/IPv6 addresses, subnets, EUI-64, scoring, seeded RNG
  switch-engine/   MAC learning, VLAN tagging, forwarding decisions
  router-engine/   longest prefix match and the Explain data
  quiz-engine/     the twelve question generators
  wasm-api/        wasm-bindgen surface

web/src/
  engine/          typed wrapper around the wasm module
  i18n/            de + en catalogs
  ui/switch|router|quiz/
  styles/
```

## Notes

- The core crates have **no dependencies**. Randomness comes from a small
  seeded PRNG in `net-core::rng`, seeded from `crypto.getRandomValues` in the
  browser, which avoids the `getrandom` wasm shim and keeps the bundle small.
- Expected answers never cross into JavaScript. `submit()` takes the student's
  answer and returns only a verdict; the solution appears in the snapshot after
  the round has been scored.
- The original discovered quiz question types by scanning assemblies with
  reflection. That cannot work in WebAssembly, so `quiz-engine/src/types.rs`
  lists them in a static `REGISTRY` instead.
- Certificate generation and submission are not part of this version; a session
  ends with a summary screen.
