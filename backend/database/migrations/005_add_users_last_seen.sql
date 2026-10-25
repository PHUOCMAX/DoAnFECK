-- Thời điểm người dùng gọi API gần nhất (dùng cho "Đang online" trên dashboard admin).
ALTER TABLE `users`
  ADD COLUMN `last_seen_at` timestamp NULL DEFAULT NULL AFTER `created_at`,
  ADD KEY `idx_users_last_seen_at` (`last_seen_at`);
