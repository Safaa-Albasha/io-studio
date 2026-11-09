#!/usr/bin/env bash
# Rebuild the FAKE demo: cut 5 × 8 s clips from two test videos, then run the experiment.
# usage: bash engine/hookmeter/demo/make_demo.sh <arabic-ad.mp4> <animated-lesson.mp4> [out-dir]
set -euo pipefail
AD="$1"; LESSON="$2"; OUT="${3:-hookmeter-demo}"
HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$OUT/reels"
i=1
for spec in "$AD 0" "$AD 12" "$AD 24" "$LESSON 0" "$LESSON 10"; do
  set -- $spec
  ffmpeg -v error -y -ss "$2" -i "$1" -t 8 -c:v libx264 -preset veryfast -c:a aac "$OUT/reels/demo$i.mp4"
  i=$((i+1))
done
python3 "$HERE/../experiment.py" run --reels "$OUT/reels" --metrics "$HERE/metrics.FAKE.csv" --out "$OUT" \
  --demo-label "بيانات مزيفة للعرض فقط — FAKE DEMO DATA"
