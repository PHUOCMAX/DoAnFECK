import pool from "../config/db.js";
import {
  visitorColumns,
  visitorCondition,
} from "../middleware/visitorMiddleware.js";

export async function createCheckin(req, res, next) {
  const poiId = Number(req.body?.poiId);

  if (!Number.isInteger(poiId) || poiId < 1) {
    return res.status(400).json({
      success: false,
      message: "POI không hợp lệ.",
    });
  }

  try {
    /*
     * Kiểm tra POI có tồn tại và đã được duyệt hay chưa.
     */
    const [pois] = await pool.execute(
      `
        SELECT
          id,
          name_vi,
          name_en,
          name_zh
        FROM pois
        WHERE id = ?
          AND status = 'approved'
      `,
      [poiId]
    );

    if (!pois.length) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy POI đang hoạt động.",
      });
    }

    /*
     * Ghi theo thiết bị (du khách) hoặc tài khoản (app mobile cũ).
     * Không lưu latitude / longitude.
     */
    const owner = visitorColumns(req);

    const [result] = await pool.execute(
      `
        INSERT INTO checkins (
          user_id,
          device_id,
          poi_id
        )
        VALUES (?, ?, ?)
      `,
      [
        owner.userId,
        owner.deviceId,
        poiId,
      ]
    );

    /*
     * Lấy lại record vừa tạo.
     */
    const [rows] = await pool.execute(
      `
        SELECT
          c.id,
          c.user_id,
          c.poi_id,
          c.checked_in_at,
          p.name_vi,
          p.name_en,
          p.name_zh
        FROM checkins c
        JOIN pois p
          ON p.id = c.poi_id
        WHERE c.id = ?
      `,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: "Check-in thành công.",
      checkin: rows[0],
    });
  } catch (error) {
    console.error("CREATE CHECK-IN ERROR:", error);
    return next(error);
  }
}

export async function listMyCheckins(req, res, next) {
  const limit = Math.min(
    Math.max(Number(req.query.limit) || 50, 1),
    100
  );

  try {
    const who = visitorCondition(req, "c.");

    const [rows] = await pool.execute(
      `
        SELECT
          c.id,
          c.user_id,
          c.poi_id,
          c.checked_in_at,
          p.name_vi,
          p.name_en,
          p.name_zh,
          p.city,
          p.category,
          p.image
        FROM checkins c
        JOIN pois p
          ON p.id = c.poi_id
        WHERE ${who.sql}
        ORDER BY c.checked_in_at DESC
        LIMIT ${limit}
      `,
      who.params
    );

    return res.json({
      success: true,
      checkins: rows,
    });
  } catch (error) {
    console.error("LIST CHECK-INS ERROR:", error);
    return next(error);
  }
}