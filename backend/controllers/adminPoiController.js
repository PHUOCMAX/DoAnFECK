import pool from "../config/db.js";
import { queuePoiAudioGeneration } from "../services/audioPipelineService.js";
import {
  SUPPORTED_LANGUAGES,
  validatePoiPayload,
} from "../utils/poiValidation.js";

import { translatePoiContent } from "../services/translationService.js";

import {
  indexPoi,
  deletePoiVector,
} from "../services/vectorService.js";

const POI_COLUMNS = `
  id,
  city,
  category,
  latitude,
  longitude,
  radius,
  image,
  status,
  created_by,
  reviewed_by,
  reviewed_at,
  created_at,
  updated_at
`;

function buildPoi(row, translations = []) {
  const name = {};
  const description = {};
  const audio = {};

  for (const language of SUPPORTED_LANGUAGES) {
    name[language] = "";
    description[language] = "";
    audio[language] = "";
  }

  for (const translation of translations) {
    const language = translation.language_code;

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      continue;
    }

    name[language] = translation.name ?? "";

    description[language] =
      translation.description ?? "";

    audio[language] =
      translation.audio ?? "";
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

    createdBy: row.created_by,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getTranslationsForPoi(poiId) {
  const [rows] = await pool.execute(
    `
      SELECT
        poi_id,
        language_code,
        name,
        description,
        audio
      FROM poi_translations
      WHERE poi_id = ?
      ORDER BY language_code ASC
    `,
    [poiId]
  );

  return rows;
}

async function getPoiById(poiId) {
  const [rows] = await pool.execute(
    `
      SELECT ${POI_COLUMNS}
      FROM pois
      WHERE id = ?
    `,
    [poiId]
  );

  if (!rows.length) {
    return null;
  }

  const translations =
    await getTranslationsForPoi(poiId);

  return buildPoi(
    rows[0],
    translations
  );
}

async function insertTranslations(
  connection,
  poiId,
  translations,
  audio
) {
  for (const language of SUPPORTED_LANGUAGES) {
    const translation =
      translations[language];

    if (!translation) {
      continue;
    }

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
        translation.name ?? "",
        translation.description ?? "",
        audio?.[language] ?? "",
      ]
    );
  }
}

async function updateTranslations(
  connection,
  poiId,
  translations,
  audio
) {
  for (const language of SUPPORTED_LANGUAGES) {
    const translation =
      translations[language];

    if (!translation) {
      continue;
    }

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

        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          description = VALUES(description),
          audio = VALUES(audio)
      `,
      [
        poiId,
        language,
        translation.name ?? "",
        translation.description ?? "",
        audio?.[language] ?? "",
      ]
    );
  }
}

/**
 * Lấy dữ liệu POI từ request.
 *
 * Multipart:
 * req.body = {
 *   data: '{"name":...}'
 * }
 *
 * JSON:
 * req.body = {
 *   name: {...},
 *   description: {...}
 * }
 */
function getPoiPayload(req) {
  if (req.body?.data) {
    try {
      return JSON.parse(req.body.data);
    } catch {
      throw new Error(
        "Dữ liệu POI không hợp lệ."
      );
    }
  }

  return req.body;
}

/**
 * Tạo dữ liệu phẳng để index vào Qdrant.
 */
function buildVectorPoi({
  id,
  translations,
  poi,
}) {
  return {
    id: Number(id),

    name_vi:
      translations.vi?.name ||
      poi.name.vi ||
      "",

    name_en:
      translations.en?.name ||
      translations.vi?.name ||
      poi.name.vi ||
      "",

    name_zh:
      translations.zh?.name ||
      translations.vi?.name ||
      poi.name.vi ||
      "",

    description_vi:
      translations.vi?.description ||
      poi.description.vi ||
      "",

    description_en:
      translations.en?.description ||
      translations.vi?.description ||
      poi.description.vi ||
      "",

    description_zh:
      translations.zh?.description ||
      translations.vi?.description ||
      poi.description.vi ||
      "",

    city: poi.city || "",
    category: poi.category || "",

    latitude: poi.latitude,
    longitude: poi.longitude,
    radius: poi.radius,

    image: poi.image || null,

    status: "approved",
  };
}

/* =========================================================
   CREATE POI
========================================================= */

export async function createAdminPoi(
  req,
  res
) {
  try {
    const payload =
      getPoiPayload(req);

    /*
     * Nếu Admin chọn ảnh
     */
    if (req.file) {
      payload.image =
        `/uploads/pois/${req.file.filename}`;
    }

    const validation =
      validatePoiPayload(payload);

    if (validation.error) {
      return res.status(400).json({
        message: validation.error,
      });
    }

    const poi = validation.value;

    /*
     * Dịch từ tiếng Việt
     * sang 15 ngôn ngữ.
     */
    const translations =
      await translatePoiContent({
        nameVi: poi.name.vi,
        descriptionVi:
          poi.description.vi,
      });

    /*
     * Lưu POI.
     */
    const [result] =
      await pool.query(
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
            created_by,
            status,
            reviewed_by,
            reviewed_at
          )
          VALUES (
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?,
            'approved',
            ?,
            CURRENT_TIMESTAMP
          )
        `,
        [
          translations.vi.name,

          translations.en?.name ||
            translations.vi.name,

          translations.zh?.name ||
            translations.vi.name,

          translations.vi.description,

          translations.en?.description ||
            translations.vi.description,

          translations.zh?.description ||
            translations.vi.description,

          poi.city,
          poi.category,
          poi.latitude,
          poi.longitude,
          poi.radius,

          poi.image || null,

          req.auth.userId,
          req.auth.userId,
        ]
      );

    const poiId =
      result.insertId;

    /*
     * Lưu bản dịch.
     */
    await insertTranslations(
      pool,
      poiId,
      translations,
      poi.audio
    );
    queuePoiAudioGeneration(
  Number(poiId)
);
    const createdPoi =
      await getPoiById(poiId);

    /*
     * =========================
     * INDEX QDRANT
     * =========================
     *
     * MySQL đã lưu thành công.
     * Bây giờ đồng bộ POI sang
     * vector database.
     */
    try {
      await indexPoi(
        buildVectorPoi({
          id: poiId,
          translations,
          poi,
        })
      );

      console.log(
        `[Vector] POI #${poiId} indexed successfully.`
      );
    } catch (vectorError) {
      /*
       * Không rollback MySQL chỉ vì
       * Qdrant lỗi.
       *
       * POI vẫn được tạo thành công.
       */
      console.error(
        `[Vector] Failed to index POI #${poiId}:`,
        vectorError
      );
    }

    return res.status(201).json({
      message:
        "Tạo POI thành công.",

      poi: createdPoi,
    });
  } catch (error) {
    console.error(
      "createAdminPoi error:",
      error
    );

    return res.status(500).json({
      message:
        error.message ||
        "Lỗi máy chủ.",
    });
  }
}

/* =========================================================
   UPDATE POI
========================================================= */

export async function updateAdminPoi(
  req,
  res,
  next
) {
  const poiId =
    Number(req.params.poiId);

  if (
    !Number.isInteger(poiId) ||
    poiId < 1
  ) {
    return res.status(400).json({
      success: false,
      message:
        "ID POI không hợp lệ.",
    });
  }

  let payload;

  try {
    payload =
      getPoiPayload(req);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  const connection =
    await pool.getConnection();

  try {
    await connection.beginTransaction();

    /*
     * Lấy POI hiện tại.
     */
    const [existingRows] =
      await connection.execute(
        `
          SELECT
            id,
            image
          FROM pois
          WHERE id = ?
        `,
        [poiId]
      );

    if (!existingRows.length) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy POI.",
      });
    }

    /*
     * Xử lý ảnh.
     */
    if (req.file) {
      payload.image =
        `/uploads/pois/${req.file.filename}`;
    } else {
      payload.image =
        existingRows[0].image || "";
    }

    const validation =
      validatePoiPayload(payload);

    if (validation.error) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const poi =
      validation.value;

    /*
     * Dịch lại toàn bộ nội dung.
     */
    const translations =
      await translatePoiContent({
        nameVi: poi.name.vi,
        descriptionVi:
          poi.description.vi,
      });

    /*
     * Cập nhật thông tin POI.
     */
    await connection.execute(
      `
        UPDATE pois
        SET
          city = ?,
          category = ?,
          latitude = ?,
          longitude = ?,
          radius = ?,
          image = ?,
          name_vi = ?,
          name_en = ?,
          name_zh = ?,
          description_vi = ?,
          description_en = ?,
          description_zh = ?
        WHERE id = ?
      `,
      [
        poi.city,
        poi.category,
        poi.latitude,
        poi.longitude,
        poi.radius,
        poi.image || null,

        translations.vi.name,

        translations.en?.name ||
          translations.vi.name,

        translations.zh?.name ||
          translations.vi.name,

        translations.vi.description,

        translations.en?.description ||
          translations.vi.description,

        translations.zh?.description ||
          translations.vi.description,

        poiId,
      ]
    );

    /*
     * Cập nhật translations.
     */
    await updateTranslations(
      connection,
      poiId,
      translations,
      poi.audio
    );

    await connection.commit();
    queuePoiAudioGeneration(
  Number(poiId)
);

    const savedPoi =
      await getPoiById(poiId);

    /*
     * =========================
     * RE-INDEX QDRANT
     * =========================
     *
     * Admin sửa POI
     * → MySQL mới
     * → embedding mới
     * → Qdrant mới
     */
    try {
      await indexPoi(
        buildVectorPoi({
          id: poiId,
          translations,
          poi,
        })
      );

      console.log(
        `[Vector] POI #${poiId} re-indexed successfully.`
      );
    } catch (vectorError) {
      console.error(
        `[Vector] Failed to re-index POI #${poiId}:`,
        vectorError
      );
    }

    return res.json({
      success: true,
      message:
        "POI đã được cập nhật, dịch lại và đồng bộ RAG.",

      poi: savedPoi,
    });
  } catch (error) {
    await connection.rollback();

    return next(error);
  } finally {
    connection.release();
  }
}

/* =========================================================
   DELETE POI
========================================================= */

export async function deleteAdminPoi(
  req,
  res,
  next
) {
  const poiId =
    Number(req.params.poiId);

  if (
    !Number.isInteger(poiId) ||
    poiId < 1
  ) {
    return res.status(400).json({
      success: false,
      message:
        "ID POI không hợp lệ.",
    });
  }

  try {
    const [result] =
      await pool.execute(
        "DELETE FROM pois WHERE id = ?",
        [poiId]
      );

    if (
      result.affectedRows === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy POI.",
      });
    }

    /*
     * Xóa vector tương ứng khỏi Qdrant.
     */
    try {
      await deletePoiVector(poiId);

      console.log(
        `[Vector] POI #${poiId} deleted from Qdrant.`
      );
    } catch (vectorError) {
      /*
       * MySQL đã xóa thành công.
       * Nếu Qdrant lỗi thì không rollback
       * được transaction MySQL ở đây.
       *
       * Ghi log để xử lý đồng bộ lại sau.
       */
      console.error(
        `[Vector] Failed to delete POI #${poiId} from Qdrant:`,
        vectorError
      );

      return res.json({
        success: true,
        warning: true,
        message:
          "POI đã xóa khỏi MySQL nhưng vector Qdrant chưa được xóa.",
      });
    }

    return res.json({
      success: true,
      message:
        "POI đã được xóa khỏi hệ thống và Qdrant.",
    });
  } catch (error) {
    return next(error);
  }
}