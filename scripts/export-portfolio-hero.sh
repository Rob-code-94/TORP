#!/usr/bin/env bash
# Batch-export portfolio poster, hero reel (~25s), and film cut (~75s) from local masters.
# Usage: ./scripts/export-portfolio-hero.sh [source-file] [slug-base]
# Example: ./scripts/export-portfolio-hero.sh "/Volumes/ArmorATD/T.O.R.P/Media Assets Original/The Crew.01.mov" crew-after-dark

set -euo pipefail

SRC_ROOT="${SRC_ROOT:-/Volumes/ArmorATD/T.O.R.P/Media Assets Original}"
OUT="${OUT:-$HOME/Desktop/torp-portfolio-exports}"

export_one() {
  local IN="$1"
  local BASE="$2"
  mkdir -p "$OUT"
  echo "Exporting $BASE from $IN"
  ffmpeg -y -i "$IN" -ss 00:00:02 -frames:v 1 -q:v 2 "$OUT/${BASE}-poster.jpg"
  ffmpeg -y -i "$IN" -t 25 -vf "scale=-2:1080" -c:v libx264 -preset slow -crf 23 -an -movflags +faststart "$OUT/${BASE}-hero.mp4"
  ffmpeg -y -i "$IN" -t 75 -vf "scale=-2:1080" -c:v libx264 -preset slow -crf 22 -c:a aac -b:a 128k -movflags +faststart "$OUT/${BASE}-film.mp4"
  echo "Wrote $OUT/${BASE}-poster.jpg, ${BASE}-hero.mp4, ${BASE}-film.mp4"
}

if [[ $# -eq 2 ]]; then
  export_one "$1" "$2"
  exit 0
fi

echo "Batch mode — set SRC_ROOT (default: $SRC_ROOT) and OUT (default: $OUT)"
echo "Run with two args for a single file: $0 <file> <slug-base>"
echo ""
echo "Example batch (uncomment and run from repo root):"
echo '  export_one "$SRC_ROOT/The Crew.01.mov" crew-after-dark'
echo '  export_one "$SRC_ROOT/Fihp.Co.Run.Kollin.01.mov" fihp-co-run-kollin'
