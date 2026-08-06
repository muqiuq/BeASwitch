#!/usr/bin/env sh
# Starts the web app in a container so no Node toolchain is needed on the host.
#
#   ./start.sh            dev server with hot reload  (http://localhost:5173)
#   ./start.sh preview    serve the production build  (http://localhost:4173)
#   ./start.sh build      build only, then exit
#
# Stop with Ctrl-C.
set -eu

IMAGE="docker.io/library/node:20-alpine"
VOLUME="bea-web-node-modules"
CONTAINER="bea-web-server"
DIR="$(cd "$(dirname "$0")" && pwd)"
MODE="${1:-dev}"

case "$MODE" in
  dev) PORT=5173 ;;
  preview) PORT=4173 ;;
  build) PORT=0 ;;
  *)
    echo "usage: $0 [dev|preview|build]" >&2
    exit 64
    ;;
esac

if ! command -v podman >/dev/null 2>&1; then
  echo "podman is not installed or not on PATH." >&2
  exit 127
fi

if ! podman info >/dev/null 2>&1; then
  echo "The podman machine is not running. Start it with: podman machine start" >&2
  exit 1
fi

run() {
  podman run --rm \
    -v "$DIR":/app \
    -v "$VOLUME":/app/node_modules \
    -w /app \
    "$@"
}

# A named, port-publishing container so a previous run can be reaped: closing
# the terminal does not always stop it, and it keeps holding the port.
serve() {
  podman rm -f "$CONTAINER" >/dev/null 2>&1 || true
  podman run --rm -it --name "$CONTAINER" \
    -v "$DIR":/app \
    -v "$VOLUME":/app/node_modules \
    -w /app \
    -p "$PORT:$PORT" \
    "$@"
}

if ! run "$IMAGE" test -d node_modules/vite >/dev/null 2>&1; then
  echo "==> Installing dependencies (first run only)"
  run "$IMAGE" npm install --no-audit --no-fund
fi

# Without the engine the page renders a build hint instead of the exercises.
if [ ! -f "$DIR/src/wasm/wasm_api_bg.wasm" ]; then
  printf '\n!! The WebAssembly engine has not been built yet.\n'
  printf '!! wasm-pack cannot run in this container, so build it on the host:\n\n'
  printf '     rustup target add wasm32-unknown-unknown   # once\n'
  printf '     cd %s && npm run build:wasm\n\n' "$DIR"
  printf '!! Starting anyway, but the exercises will show a build hint.\n\n'
fi

case "$MODE" in
  build)
    run "$IMAGE" npm run build
    printf '==> Output in %s/dist\n' "$DIR"
    ;;
  dev)
    printf '==> Dev server on http://localhost:%s  (Ctrl-C to stop)\n' "$PORT"
    serve "$IMAGE" \
      npx vite --host 0.0.0.0 --port "$PORT" --strictPort
    ;;
  preview)
    run "$IMAGE" npm run build
    printf '==> Preview on http://localhost:%s  (Ctrl-C to stop)\n' "$PORT"
    serve "$IMAGE" \
      npx vite preview --host 0.0.0.0 --port "$PORT" --strictPort
    ;;
esac
