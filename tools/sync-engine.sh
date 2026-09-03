#!/bin/sh
# sync-engine.sh — Chép "bộ máy luật chơi" từ game/js sang Edge Function.
#
# Vì sao phải chép: máy chủ xác minh điểm bằng cách chạy lại nguyên ván, nên nó
# phải dùng ĐÚNG cùng một bộ luật với trình duyệt. Lệch một dòng là mọi ván đều
# bị từ chối oan. Bảy file này phải giống nhau từng ký tự.
#
#   ./tools/sync-engine.sh          chép từ game/js → supabase (sau khi sửa luật)
#   ./tools/sync-engine.sh --check  chỉ kiểm tra, khác nhau thì báo lỗi (dùng cho CI)
#
# Nhắc lại: bảy file này KHÔNG BAO GIỜ được dùng document / window /
# localStorage. Thêm vào là phía máy chủ vỡ ngay.
set -e

ROOT=$(cd "$(dirname "$0")/.." && pwd)
SRC="$ROOT/game/js"
DST="$ROOT/supabase/functions/_shared/engine"
FILES="rng.js shapes.js level.js grid.js tray.js score.js sim.js"

if [ "$1" = "--check" ]; then
  fail=0
  for f in $FILES; do
    if ! cmp -s "$SRC/$f" "$DST/$f"; then
      echo "LỆCH: $f — chạy ./tools/sync-engine.sh rồi commit lại"
      fail=1
    fi
  done
  if [ $fail -eq 0 ]; then echo "Bộ máy luật chơi khớp nhau: $FILES"; fi
  exit $fail
fi

mkdir -p "$DST"
for f in $FILES; do
  cp "$SRC/$f" "$DST/$f"
  echo "đã chép $f"
done

# Chặn sớm cái lỗi tệ nhất: lỡ tay dùng API trình duyệt trong bộ máy luật chơi.
# (Chỉ bắt lúc thật sự gọi, ví dụ `window.` — nhắc tên trong lời chú thích thì không sao.)
for f in $FILES; do
  if grep -nE '\b(document|window|localStorage|sessionStorage|navigator)[[:space:]]*[.[]' "$DST/$f"; then
    echo
    echo "DỪNG: $f vừa đụng vào API trình duyệt. Phía máy chủ sẽ không chạy được."
    exit 1
  fi
done
echo "Xong."
