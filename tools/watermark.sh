#!/usr/bin/env bash
# Misma preparación segura y repetida cada 25 segundos.
set -euo pipefail
node "$(dirname "$0")/watermark.mjs" "$@"
