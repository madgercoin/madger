#!/usr/bin/env bash
set -euo pipefail

source_image="${1:-MADGER_LAUNCH_COUNTDOWN_TODAY_2026-08-24_FINAL.jpg}"
output_video="${2:-MADGER_LAUNCH_COUNTDOWN_TODAY_2026-08-24_ANIMATED_4x5.mp4}"

ffmpeg -y -loop 1 -i "$source_image" -t 8 -filter_complex "
  [0:v]split=2[background][poster];
  [background]scale=1080:1350:force_original_aspect_ratio=increase,
    crop=1080:1350,gblur=sigma=28,
    eq=brightness=-0.18:saturation=1.08[bg];
  [poster]scale=864:1350:force_original_aspect_ratio=decrease,
    pad=864:1350:(ow-iw)/2:(oh-ih)/2:color=black@0,
    zoompan=z='min(zoom+0.000075,1.018)':
      x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':
      d=240:s=864x1350:fps=30[fg];
  [bg][fg]overlay=(W-w)/2:(H-h)/2,
    drawbox=x=20:y=20:w=1040:h=1310:color=0xD9A323@0.50:t=2,
    fade=t=in:st=0:d=0.35,
    fade=t=out:st=7.65:d=0.35,
    format=yuv420p[outv]
" -map "[outv]" -an -r 30 -c:v libx264 -profile:v high -level 4.1   -preset medium -crf 23 "$output_video"

printf '%s\n' "$output_video"
