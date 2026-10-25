-- Cột không còn dùng (đã rà soát code backend, web, mobile):
-- - tour_sessions.session_token: chỉ được sinh lúc tạo tour, không nơi nào đọc;
--   QR dùng qr_codes.qr_token.
-- - pois.district: không có chức năng ghi, toàn bộ dữ liệu trống.
ALTER TABLE `tour_sessions`
  DROP INDEX `uq_tour_sessions_token`,
  DROP COLUMN `session_token`;

ALTER TABLE `pois`
  DROP COLUMN `district`;
