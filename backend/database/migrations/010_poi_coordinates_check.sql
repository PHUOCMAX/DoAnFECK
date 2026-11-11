-- Vĩ độ và kinh độ của POI phải lớn hơn 0.
-- Ràng buộc đặt ở database nên thêm/sửa POI bằng admin hay bằng SQL
-- trực tiếp vào bảng đều bị chặn như nhau.
-- POI có vĩ độ/kinh độ <= 0 phải được sửa hoặc xoá trước, nếu không
-- MySQL báo "Check constraint 'chk_pois_coordinates' is violated".

-- Chỉ thêm khi chưa có (database đã thêm ràng buộc bằng tay trước đó).
SET @has_check := (
  SELECT COUNT(*)
  FROM information_schema.CHECK_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND CONSTRAINT_NAME = 'chk_pois_coordinates'
);

SET @sql := IF(
  @has_check = 0,
  'ALTER TABLE `pois` ADD CONSTRAINT `chk_pois_coordinates` CHECK (`latitude` > 0 AND `longitude` > 0)',
  'DO 0'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
