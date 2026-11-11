-- Bán kính check-in của POI chỉ được từ 0 đến 50 mét.
-- Ràng buộc đặt ở database nên thêm/sửa POI bằng admin hay bằng SQL
-- trực tiếp vào bảng đều bị chặn như nhau.
-- POI cũ có bán kính lớn hơn 50 được hạ xuống 50 trước khi thêm ràng buộc.
UPDATE `pois`
SET `radius` = 50
WHERE `radius` > 50;

-- Chỉ thêm khi chưa có (database đã thêm ràng buộc bằng tay trước đó).
SET @has_check := (
  SELECT COUNT(*)
  FROM information_schema.CHECK_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND CONSTRAINT_NAME = 'chk_pois_radius'
);

SET @sql := IF(
  @has_check = 0,
  'ALTER TABLE `pois` ADD CONSTRAINT `chk_pois_radius` CHECK (`radius` BETWEEN 0 AND 50)',
  'DO 0'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
