#!/usr/bin/env bash
# Repite una marca vocal aproximadamente cada 20 segundos.
# Uso: bash tools/watermark-repeat.sh original.wav tag.wav preview.mp3
set -euo pipefail
if [ "$#" -ne 3 ]; then echo "Uso: $0 original.wav tag.wav preview.mp3"; exit 1; fi
CYCLE=$(mktemp --suffix=.wav)
trap 'rm -f "$CYCLE"' EXIT
# Prepara un ciclo de 20 s: tag al inicio, seguido de silencio.
ffmpeg -loglevel error -y -i "$2" -af "apad=whole_dur=20" -t 20 -ac 2 -ar 44100 "$CYCLE"
ffmpeg -y -i "$1" -stream_loop -1 -i "$CYCLE" -filter_complex "[1:a]volume=0.65[wm];[0:a][wm]amix=inputs=2:duration=first:dropout_transition=0[out]" -map '[out]' -codec:a libmp3lame -b:a 192k "$3"
# Escucha el resultado antes de publicarlo.
