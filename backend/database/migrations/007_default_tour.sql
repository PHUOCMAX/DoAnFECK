-- Đánh dấu tour mặc định (QR dùng chung dán cố định tại điểm tham quan).
-- Admin đổi tour mặc định trong trang "Tour và QR".
ALTER TABLE `tour_sessions`
  ADD COLUMN `is_default` tinyint(1) NOT NULL DEFAULT 0 AFTER `status`;
