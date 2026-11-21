#!/usr/bin/env bash
# Turns the editor's showcase output into the site's media.
#
#   scripts/encode-media.sh still <png> <name>        public/assets/shots/<name>-{1440,2880}.jpg
#   scripts/encode-media.sh clip <frame-dir> <name>   public/assets/clips/<name>.{webm,mp4,jpg}
#
# A still is a 2880x1800 PNG from `showcase --scale 2`; a clip is a folder of
# frame-%04d.png at 30 fps from a Record step. Needs ImageMagick and ffmpeg.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
shots="$root/public/assets/shots"
clips="$root/public/assets/clips"
fps=30
width=1440

usage() {
  sed -n '2,8p' "$0" >&2
  exit 2
}

need() {
  command -v "$1" >/dev/null || {
    echo "encode-media: $1 is not installed" >&2
    exit 1
  }
}

still() {
  local src="$1" name="$2"
  need magick
  mkdir -p "$shots"
  magick "$src" -strip -interlace JPEG -sampling-factor 4:2:0 -quality 84 "$shots/$name-2880.jpg"
  magick "$src" -strip -resize "${width}x" -interlace JPEG -sampling-factor 4:2:0 -quality 86 "$shots/$name-1440.jpg"
}

clip() {
  local dir="$1" name="$2"
  need ffmpeg
  [[ -f "$dir/frame-0000.png" ]] || {
    echo "encode-media: $dir has no frame-0000.png" >&2
    exit 1
  }
  mkdir -p "$clips"
  local input=(-hide_banner -loglevel error -y -framerate "$fps" -i "$dir/frame-%04d.png")
  local scale="scale=${width}:-2:flags=lanczos"
  ffmpeg "${input[@]}" -vf "$scale,format=yuv420p" -an \
    -c:v libx264 -preset slow -crf 26 -profile:v high -movflags +faststart \
    "$clips/$name.mp4"
  ffmpeg "${input[@]}" -vf "$scale,format=yuv420p" -an \
    -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -deadline good \
    "$clips/$name.webm"
  magick "$dir/frame-0000.png" -strip -resize "${width}x" -quality 84 "$clips/$name.jpg"
  ls -l "$clips/$name".*
}

[[ $# -eq 3 ]] || usage
case "$1" in
still) still "$2" "$3" ;;
clip) clip "$2" "$3" ;;
*) usage ;;
esac
