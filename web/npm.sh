#!/usr/bin/env sh
# Runs npm inside a container so no Node toolchain is required on the host.
#
#   ./npm.sh install
#   ./npm.sh run build
#   ./npm.sh run dev        (serves on http://localhost:5173)
#
# node_modules lives in a named volume: bind-mounted node_modules is slow on
# macOS and gets its ownership squashed by virtiofs.
set -eu

IMAGE="docker.io/library/node:24-alpine"
VOLUME="bea-web-node-modules"
DIR="$(cd "$(dirname "$0")" && pwd)"

exec podman run --rm -it \
  -v "$DIR":/app \
  -v "$VOLUME":/app/node_modules \
  -w /app \
  -p 5173:5173 \
  "$IMAGE" npm "$@"
