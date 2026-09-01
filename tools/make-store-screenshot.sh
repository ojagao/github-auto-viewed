#!/bin/bash
#
# 任意のスクリーンショットを Chrome Web Store 用の 1280x800 PNG に整える。
# はみ出す場合は縮小し、足りない分は白で余白を足す（アスペクト比は崩さない）。
#
# 使い方: tools/make-store-screenshot.sh 撮影した画像.png [出力先.png]
#
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "使い方: $0 <入力画像> [出力画像]" >&2
  exit 1
fi

input="$1"
output="${2:-store-screenshot-1280x800.png}"
work="$(mktemp -t store-shot).png"

trap 'rm -f "$work"' EXIT

# 長辺を 1280 に収める
sips -Z 1280 "$input" --out "$work" >/dev/null

# それでも高さが 800 を超える縦長画像は高さ基準で縮小する
height="$(sips -g pixelHeight "$work" | awk '/pixelHeight/ {print $2}')"
if [ "$height" -gt 800 ]; then
  sips --resampleHeight 800 "$work" --out "$work" >/dev/null
fi

# 1280x800 のキャンバスに中央配置（sips は padColor 指定時に CGColor を stderr へ出すため捨てる）
sips -p 800 1280 --padColor FFFFFF "$work" --out "$output" >/dev/null 2>&1

echo "作成しました: $output ($(sips -g pixelWidth -g pixelHeight "$output" | awk '/pixel/ {printf "%s ", $2}'))"
