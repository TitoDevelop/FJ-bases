#!/usr/bin/env bash
# Compatible con Windows (Node), macOS y Linux; requiere ffmpeg y ffprobe.
set -euo pipefail
node "$(dirname "$0")/watermark.mjs" "$@"
