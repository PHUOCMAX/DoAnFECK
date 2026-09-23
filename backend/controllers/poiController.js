import pool from "../config/db.js";
import { validatePoiPayload } from "../utils/poiValidation.js";

function toPoi(row) {
  return {
    id: Number(row.id),
    name: {
      vi: row.name_vi,
      en: row.name_en,
      zh: row.name_zh,
    },
    description: {
      vi: row.description_vi,
      en: row.description_en,
      zh: row.description_zh,
    },
    city: row.city,
    category: row.category,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    radius: Number(row.radius),
    image: row.image ?? "",
    audio: {
      vi: row.audio_vi ?? "",
      en: row.audio_en ?? "",
      zh: row.audio_zh ?? "",
    },
    status: row.status,
  };
}

const POI_COLUMNS = `
  id,
  name_vi, name_en, name_zh,
  description_vi, description_en, description_zh,
  city, category, latitude, longitude, radius,
  image, audio_vi, audio_en, audio_zh,
  status, created_by, reviewed_by, reviewed_at
`;

export async function listPois(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT ${POI_COLUMNS}
       FROM pois
       WHERE status = 'approved'
       ORDER BY created_at DESC, id DESC`
    );

    return res.json({
      success: true,
      pois: rows.map(toPoi),
    });
  } catch (error) {
    return next(error);
  }
}

export async function createPoi(req, res, next) {
  const validation = validatePoiPayload(req.body);

  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  const poi = validation.value;

  try {
    const [result] = await pool.execute(
      `INSERT INTO pois (
        name_vi, name_en, name_zh,
        description_vi, description_en, description_zh,
        city, category, latitude, longitude, radius, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        poi.name.vi,
        poi.name.en,
        poi.name.zh,
        poi.description.vi,
        poi.description.en,
        poi.description.zh,
        poi.city,
        poi.category,
        poi.latitude,
        poi.longitude,
        poi.radius,
        req.auth.userId,
      ]
    );

    const [rows] = await pool.execute(
      `SELECT ${POI_COLUMNS} FROM pois WHERE id = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: "Yêu cầu thêm địa điểm đã được gửi và đang chờ quản trị viên duyệt.",
      poi: toPoi(rows[0]),
    });
  } catch (error) {
    return next(error);
  }
}

export async function listPoisForReview(req, res, next) {
  const status = req.query.status ?? "pending";

  if (!["pending", "approved", "rejected"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Trạng thái POI không hợp lệ.",
    });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT ${POI_COLUMNS}
       FROM pois
       WHERE status = ?
       ORDER BY created_at ASC, id ASC`,
      [status]
    );

    return res.json({ success: true, pois: rows.map(toPoi) });
  } catch (error) {
    return next(error);
  }
}

export async function reviewPoi(req, res, next) {
  const poiId = Number(req.params.poiId);
  const status = req.body?.status;

  if (!Number.isInteger(poiId) || poiId < 1) {
    return res.status(400).json({ success: false, message: "ID địa điểm không hợp lệ." });
  }

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Trạng thái duyệt phải là approved hoặc rejected.",
    });
  }

  try {
    const [result] = await pool.execute(
      `UPDATE pois
       SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'pending'`,
      [status, req.auth.userId, poiId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy POI đang chờ duyệt.",
      });
    }

    const [rows] = await pool.execute(
      `SELECT ${POI_COLUMNS} FROM pois WHERE id = ?`,
      [poiId]
    );

    return res.json({
      success: true,
      message: status === "approved" ? "POI đã được duyệt." : "POI đã bị từ chối.",
      poi: toPoi(rows[0]),
    });
  } catch (error) {
    return next(error);
  }
}
