-- Bán kính check-in của POI chỉ được từ 0 đến 50 mét.
-- Ràng buộc đặt ở database nên thêm/sửa POI bằng admin hay bằng SQL
-- trực tiếp vào bảng đều bị chặn như nhau.
-- POI cũ có bán kính lớn hơn 50 được hạ xuống 50 trước khi thêm ràng buộc.
UPDATE `pois`
SET `radius` = 50
WHERE `radius` > 50;

ALTER TABLE `pois`
  ADD CONSTRAINT `chk_pois_radius` CHECK (`radius` BETWEEN 0 AND 50);
