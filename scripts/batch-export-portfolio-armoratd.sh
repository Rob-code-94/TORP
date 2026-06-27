#!/usr/bin/env bash
# Export all 12 portfolio masters to torp-web-exports on the ArmorATD volume.
set -euo pipefail

SRC="/Volumes/ArmorATD/T.O.R.P/Media Assets Original"
OUT="${SRC}/torp-web-exports"
LOG="${OUT}/export.log"
FFMPEG="${FFMPEG:-/opt/homebrew/bin/ffmpeg}"

mkdir -p "$OUT"
exec > >(tee -a "$LOG") 2>&1

export_one() {
  local IN="$1"
  local BASE="$2"
  if [[ ! -f "$IN" ]]; then
    echo "SKIP missing: $IN"
    return 1
  fi
  echo ""
  echo "========== $(date '+%Y-%m-%d %H:%M:%S') — $BASE =========="
  echo "Source: $IN"
  "$FFMPEG" -y -i "$IN" -ss 00:00:02 -frames:v 1 -q:v 2 "$OUT/${BASE}-poster.jpg"
  "$FFMPEG" -y -i "$OUT/${BASE}-poster.jpg" -vf "scale='min(1280,iw)':-2" -q:v 3 "$OUT/${BASE}-thumb.jpg"
  "$FFMPEG" -y -i "$IN" -t 15 -vf "scale=-2:720" -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p -an -movflags +faststart "$OUT/${BASE}-hero.mp4"
  "$FFMPEG" -y -i "$IN" -t 75 -vf "scale=-2:1080" -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "$OUT/${BASE}-film.mp4"
  echo "Done: ${BASE}-poster.jpg, ${BASE}-thumb.jpg, ${BASE}-hero.mp4, ${BASE}-film.mp4"
  ls -lh "$OUT/${BASE}-poster.jpg" "$OUT/${BASE}-thumb.jpg" "$OUT/${BASE}-hero.mp4" "$OUT/${BASE}-film.mp4"
}

echo "Batch export started $(date)"
echo "Output: $OUT"

export_one "$SRC/The Crew.01.mov" "crew-after-dark"
export_one "$SRC/SoleClassics.HeGotGame (1).mp4" "sole-classics-he-got-game"
export_one "$SRC/A.TORP.Collection.01.mov" "torp-collection"
export_one "$SRC/Fihp.Co.JP.01.mov" "fihp-co-jp"
export_one "$SRC/Fihp.Co.Run.Kollin.01.mov" "fihp-co-run-kollin"
export_one "$SRC/Fihp.Morning.Vert (1).mov" "fihp-morning-vert"
export_one "$SRC/A.Night.With.Our.Buds.01.25.mp4" "a-night-with-our-buds"
export_one "$SRC/Destany.Gym.Shark.Draft.02.mov" "destany-gymshark"
export_one "$SRC/Don.Life.Car.Draft.03 (1).mov" "don-life-car"
export_one "$SRC/Gracelynn.mov" "gracelynn"
export_one "$SRC/UL.SKY.LIMIT.JOHN.01 (1).mov" "ul-sky-limit-john"
export_one "$SRC/ULTD.Debo (1).mov" "ultd-debo"

echo ""
echo "========== Batch complete $(date) =========="
ls -lh "$OUT"
