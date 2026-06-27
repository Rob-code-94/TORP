#!/usr/bin/env bash
# Export portfolio poster, grid thumb, 15s hero reel, and 75s film from local masters.
# Usage: ./scripts/export-portfolio-hero.sh [source-file] [slug-base]
# Example: ./scripts/export-portfolio-hero.sh "/Volumes/ArmorATD/T.O.R.P/Media Assets Original/The Crew.01.mov" crew-after-dark

set -euo pipefail

SRC_ROOT="${SRC_ROOT:-/Volumes/ArmorATD/T.O.R.P/Media Assets Original}"
OUT="${OUT:-$HOME/Desktop/torp-portfolio-exports}"
FFMPEG="${FFMPEG:-ffmpeg}"

export_one() {
  local IN="$1"
  local BASE="$2"
  mkdir -p "$OUT"
  echo "Exporting $BASE from $IN"
  "$FFMPEG" -y -i "$IN" -ss 00:00:02 -frames:v 1 -q:v 2 "$OUT/${BASE}-poster.jpg"
  "$FFMPEG" -y -i "$OUT/${BASE}-poster.jpg" -vf "scale='min(1280,iw)':-2" -q:v 3 "$OUT/${BASE}-thumb.jpg"
  "$FFMPEG" -y -i "$IN" -t 15 -vf "scale=-2:720" -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p -an -movflags +faststart "$OUT/${BASE}-hero.mp4"
  "$FFMPEG" -y -i "$IN" -t 75 -vf "scale=-2:1080" -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "$OUT/${BASE}-film.mp4"
  echo "Wrote $OUT/${BASE}-poster.jpg, ${BASE}-thumb.jpg, ${BASE}-hero.mp4, ${BASE}-film.mp4"
}

if [[ $# -eq 2 ]]; then
  export_one "$1" "$2"
  exit 0
fi

echo "Batch mode — set SRC_ROOT (default: $SRC_ROOT) and OUT (default: $OUT)"
echo "Run with two args for a single file: $0 <file> <slug-base>"
