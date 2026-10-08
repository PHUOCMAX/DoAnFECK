import pool from "../config/db.js";
import {
  SUPPORTED_LANGUAGES,
  validatePoiPayload,
} from "../utils/poiValidation.js";
import { queuePoiAudioGeneration } from "../services/audioPipelineService.js";
function createEmptyLocalizedObject() {
  return Object.fromEntries(
    SUPPORTED_LANGUAGES.map((language) => [language, ""])
  );
}

function toPoi(row, translations = []) {
  const name = createEmptyLocalizedObject();
  const description = createEmptyLocalizedObject();
  const audio = createEmptyLocalizedObject();

  /*
   * Hỗ trợ dữ liệu cũ trong bảng pois
   */
  if (row.name_vi) name.vi = row.name_vi;
  if (row.name_en) name.en = row.name_en;
  if (row.name_zh) name.zh = row.name_zh;

  if (row.description_vi) description.vi = row.description_vi;
  if (row.description_en) description.en = row.description_en;
  if (row.description_zh) description.zh = row.description_zh;

  if (row.audio_vi) audio.vi = row.audio_vi;
  if (row.audio_en) audio.en = row.audio_en;
  if (row.audio_zh) audio.zh = row.audio_zh;

  /*
   * Dữ liệu trong poi_translations sẽ ghi đè
   * dữ liệu cũ nếu có.
   */
  for (const translation of translations) {
    const language = translation.language_code;

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      continue;
    }

    name[language] = translation.name ?? "";
    description[language] = translation.description ?? "";
    audio[language] = translation.audio ?? "";
  }

  return {
    id: Number(row.id),

    name,
    description,

    city: row.city,
    category: row.category,

    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    radius: Number(row.radius),

    image: row.image ?? "",

    audio,

    status: row.status,
  };
}

const POI_COLUMNS = `
  id,
  name_vi,
  name_en,
  name_zh,
  description_vi,
  description_en,
  description_zh,
  city,
  district,
  category,
  latitude,
  longitude,
  radius,
  image,
  audio_vi,
  audio_en,
  audio_zh,
  status,
  created_by,
  reviewed_by,
  reviewed_at,
  created_at
`;

async function getTranslationsForPois(poiIds) {
  if (!poiIds.length) {
    return [];
  }

  const placeholders = poiIds.map(() => "?").join(", ");

  const [rows] = await pool.query(
    `
    SELECT
      poi_id,
      language_code,
      name,
      description,
      audio
    FROM poi_translations
    WHERE poi_id IN (${placeholders})
    ORDER BY poi_id ASC, language_code ASC
    `,
    poiIds
  );

  return rows;
}

function groupTranslationsByPoi(translations) {
  const grouped = new Map();

  for (const translation of translations) {
    const poiId = String(translation.poi_id);

    if (!grouped.has(poiId)) {
      grouped.set(poiId, []);
    }

    grouped.get(poiId).push(translation);
  }

  return grouped;
}

export async function listPois(req, res, next) {
  try {
    const [rows] = await pool.query(
      `
      SELECT ${POI_COLUMNS}
      FROM pois
      WHERE status = 'approved'
      ORDER BY created_at DESC, id DESC
      `
    );

    const poiIds = rows.map((row) => row.id);

    const translations =
      await getTranslationsForPois(poiIds);

    const grouped =
      groupTranslationsByPoi(translations);

    const pois = rows.map((row) =>
      toPoi(
        row,
        grouped.get(String(row.id)) || []
      )
    );

    return res.json({
      success: true,
      pois,
    });
  } catch (error) {
    console.error("LIST POIS ERROR:", error);
    return next(error);
  }
}

export async function createPoi(req, res, next) {
  console.log("========== CREATE POI ==========");
  console.log("USER:", req.auth?.userId);
  console.log(
    "BODY:",
    JSON.stringify(req.body, null, 2)
  );

  const validation = validatePoiPayload(req.body);

  if (validation.error) {
    console.error(
      "POI VALIDATION ERROR:",
      validation.error
    );

    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  const poi = validation.value;

  let connection;

  try {
    connection = await pool.getConnection();

    await connection.beginTransaction();

    /*
     * ==========================================
     * DỮ LIỆU 3 NGÔN NGỮ CHÍNH
     * ==========================================
     *
     * Database hiện tại bắt buộc:
     * name_vi
     * name_en
     * name_zh
     *
     * description_vi
     * description_en
     * description_zh
     */

    const nameVi =
      poi.name.vi?.trim() || "";

    const nameEn =
      poi.name.en?.trim() ||
      nameVi;

    const nameZh =
      poi.name.zh?.trim() ||
      nameVi;

    const descriptionVi =
      poi.description.vi?.trim() || "";

    const descriptionEn =
      poi.description.en?.trim() ||
      descriptionVi;

    const descriptionZh =
      poi.description.zh?.trim() ||
      descriptionVi;

    const audioVi =
      poi.audio?.vi?.trim() || "";

    const audioEn =
      poi.audio?.en?.trim() || "";

    const audioZh =
      poi.audio?.zh?.trim() || "";

    /*
     * ==========================================
     * INSERT POI
     * ==========================================
     */

    const [result] = await connection.execute(
      `
      INSERT INTO pois (
        name_vi,
        name_en,
        name_zh,

        description_vi,
        description_en,
        description_zh,

        city,
        category,
        latitude,
        longitude,
        radius,

        image,

        audio_vi,
        audio_en,
        audio_zh,

        created_by
      )
      VALUES (
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?,
        ?, ?, ?,
        ?
      )
      `,
      [
        nameVi,
        nameEn,
        nameZh,

        descriptionVi,
        descriptionEn,
        descriptionZh,

        poi.city,
        poi.category,
        poi.latitude,
        poi.longitude,
        poi.radius,

        poi.image || null,

        audioVi || null,
        audioEn || null,
        audioZh || null,

        req.auth.userId,
      ]
    );

    const poiId = result.insertId;

    console.log(
      "POI CREATED:",
      poiId
    );

    /*
     * ==========================================
     * LƯU DỮ LIỆU ĐA NGÔN NGỮ
     * ==========================================
     *
     * Giữ lại poi_translations để hệ thống
     * 15 ngôn ngữ hiện tại tiếp tục hoạt động.
     */

    for (const language of SUPPORTED_LANGUAGES) {
      const name =
        poi.name?.[language] ||
        nameVi;

      const description =
        poi.description?.[language] ||
        descriptionVi;

      const audio =
        poi.audio?.[language] ||
        "";

      await connection.execute(
        `
        INSERT INTO poi_translations (
          poi_id,
          language_code,
          name,
          description,
          audio
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          poiId,
          language,
          name,
          description,
          audio,
        ]
      );
    }

    await connection.commit();

    queuePoiAudioGeneration(Number(poiId));
    console.log(
      "CREATE POI COMMIT SUCCESS:",
      poiId
    );

    /*
     * Đọc lại POI vừa tạo
     */

    const [rows] = await connection.execute(
      `
      SELECT ${POI_COLUMNS}
      FROM pois
      WHERE id = ?
      `,
      [poiId]
    );

    if (!rows.length) {
      return res.status(500).json({
        success: false,
        message:
          "Tạo POI thành công nhưng không thể đọc lại dữ liệu.",
      });
    }

    const translations =
      await getTranslationsForPois([poiId]);

    return res.status(201).json({
      success: true,

      message:
        "Yêu cầu thêm địa điểm đã được gửi và đang chờ quản trị viên duyệt.",

      poi: toPoi(
        rows[0],
        translations
      ),
    });
  } catch (error) {
    console.error(
      "========== CREATE POI ERROR =========="
    );

    console.error(
      "MESSAGE:",
      error?.message
    );

    console.error(
      "CODE:",
      error?.code
    );

    console.error(
      "SQL STATE:",
      error?.sqlState
    );

    console.error(
      "SQL MESSAGE:",
      error?.sqlMessage
    );

    console.error(
      "STACK:",
      error?.stack
    );

    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "ROLLBACK ERROR:",
          rollbackError?.message
        );
      }
    }

    return res.status(500).json({
      success: false,

      message:
        error?.sqlMessage ||
        error?.message ||
        "Đã xảy ra lỗi máy chủ.",

      code:
        error?.code ||
        "UNKNOWN_ERROR",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function listPoisForReview(
  req,
  res,
  next
) {
  const status =
    req.query.status ?? "pending";

  if (
    ![
      "pending",
      "approved",
      "rejected",
    ].includes(status)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Trạng thái POI không hợp lệ.",
    });
  }

  try {
    const [rows] =
      await pool.execute(
        `
        SELECT ${POI_COLUMNS}
        FROM pois
        WHERE status = ?
        ORDER BY created_at ASC, id ASC
        `,
        [status]
      );

    const poiIds =
      rows.map((row) => row.id);

    const translations =
      await getTranslationsForPois(
        poiIds
      );

    const grouped =
      groupTranslationsByPoi(
        translations
      );

    const pois = rows.map((row) =>
      toPoi(
        row,
        grouped.get(
          String(row.id)
        ) || []
      )
    );

    return res.json({
      success: true,
      pois,
    });
  } catch (error) {
    console.error(
      "LIST POIS FOR REVIEW ERROR:",
      error
    );

    return next(error);
  }
}

export async function reviewPoi(
  req,
  res,
  next
) {
  const poiId =
    Number(req.params.poiId);

  const status =
    req.body?.status;

  if (
    !Number.isInteger(poiId) ||
    poiId < 1
  ) {
    return res.status(400).json({
      success: false,
      message:
        "ID địa điểm không hợp lệ.",
    });
  }

  if (
    ![
      "approved",
      "rejected",
    ].includes(status)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Trạng thái duyệt phải là approved hoặc rejected.",
    });
  }

  try {
    const [result] =
      await pool.execute(
        `
        UPDATE pois
        SET
          status = ?,
          reviewed_by = ?,
          reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND status = 'pending'
        `,
        [
          status,
          req.auth.userId,
          poiId,
        ]
      );

    if (
      result.affectedRows === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy POI đang chờ duyệt.",
      });
    }

    const [rows] =
      await pool.execute(
        `
        SELECT ${POI_COLUMNS}
        FROM pois
        WHERE id = ?
        `,
        [poiId]
      );

    const translations =
      await getTranslationsForPois(
        [poiId]
      );

    return res.json({
      success: true,

      message:
        status === "approved"
          ? "POI đã được duyệt."
          : "POI đã bị từ chối.",

      poi: toPoi(
        rows[0],
        translations
      ),
    });
  } catch (error) {
    console.error(
      "REVIEW POI ERROR:",
      error
    );

    return next(error);
  }
}