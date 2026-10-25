-- Du khách không cần đăng nhập: nhận diện theo mã thiết bị (UUID do client tự tạo).
-- user_id được giữ lại (nullable) cho dữ liệu cũ và app mobile còn dùng tài khoản.

ALTER TABLE `session_authorizations`
  MODIFY `user_id` int NULL,
  ADD COLUMN `device_id` char(36) NULL AFTER `user_id`,
  ADD UNIQUE KEY `uq_session_device` (`session_id`, `device_id`);

ALTER TABLE `payments`
  MODIFY `user_id` int NULL,
  ADD COLUMN `device_id` char(36) NULL AFTER `user_id`,
  ADD KEY `idx_payments_device_id` (`device_id`);

ALTER TABLE `checkins`
  MODIFY `user_id` int NULL,
  ADD COLUMN `device_id` char(36) NULL AFTER `user_id`,
  ADD KEY `idx_checkins_device_id` (`device_id`);

-- POI do du khách gửi không còn tài khoản tạo.
ALTER TABLE `pois`
  MODIFY `created_by` int NULL,
  ADD COLUMN `submitted_device_id` char(36) NULL AFTER `created_by`;

-- Heartbeat: thiết bị nào đang ở trong tour nào, lần cuối lúc nào.
CREATE TABLE IF NOT EXISTS `tour_presence` (
  `session_id` bigint unsigned NOT NULL,
  `device_id` char(36) NOT NULL,
  `joined_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`session_id`, `device_id`),
  KEY `idx_tour_presence_last_seen_at` (`last_seen_at`),
  CONSTRAINT `fk_tour_presence_session` FOREIGN KEY (`session_id`) REFERENCES `tour_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
