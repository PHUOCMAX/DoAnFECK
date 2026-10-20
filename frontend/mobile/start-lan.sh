#!/bin/sh
# Dùng sau khi đổi Wi-Fi: lấy IP LAN hiện tại của máy,
# cập nhật EXPO_PUBLIC_API_URL trong .env rồi chạy Metro (xóa cache).
set -e

cd "$(dirname "$0")"

IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || true)

if [ -z "$IP" ]; then
  echo "Không tìm thấy IP LAN. Máy đã kết nối Wi-Fi chưa?"
  exit 1
fi

sed -i '' "s#^EXPO_PUBLIC_API_URL=.*#EXPO_PUBLIC_API_URL=http://$IP:5001#" .env

echo "EXPO_PUBLIC_API_URL=http://$IP:5001"

if curl -s --max-time 3 "http://$IP:5001/api/health" | grep -q '"success":true'; then
  echo "Backend OK"
else
  echo "Cảnh báo: chưa gọi được backend ở $IP:5001 (Docker đã chạy chưa?)"
fi

exec npx expo start -c
