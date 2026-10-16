#!/usr/bin/env bash
# Uso: bash tools/watermark.sh original.wav marca.wav preview.mp3
# Necesitas ffmpeg; tu marca.wav debe ser grabación de voz de tu marca.
set -euo pipefail
if [ "$#" -ne 3 ]; then echo "Uso: $0 original.wav marca.wav preview.mp3"; exit 1; fi
ffmpeg -y -i "$1" -stream_loop -1 -i "$2" -filter_complex "[1:a]volume=0.7,adelay=12000|12000,apad,atrim=0:3600[wm];[0:a][wm]amix=inputs=2:duration=first:dropout_transition=0[out]" -map '[out]' -codec:a libmp3lame -b:a 192k "$3"
# Este script mezcla una marca de agua que aparece 12 segundos después del inicio.
# Para repetirla de verdad periódicamente utiliza tools/watermark-repeat.sh.
