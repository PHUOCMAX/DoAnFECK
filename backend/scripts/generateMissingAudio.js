import "dotenv/config";

import pool from "../config/db.js";
import { generatePoiAudio } from "../services/audioPipelineService.js";
import { translatePoiContent } from "../services/translationService.js";
import { SUPPORTED_LANGUAGES } from "../utils/poiValidation.js";

/*
 * Bổ sung cho các POI đã duyệt:
 * 1. Bản dịch còn thiếu (dịch từ tiếng Việt).
 * 2. File audio còn thiếu cho từng ngôn ngữ.
 *
 * Chạy lại bao nhiêu lần cũng được: audio đã có thì bỏ qua.
 *   docker exec multilingual-tour-guide-backend npm run audio:backfill
 */

async function fillMissingTranslations(poi) {
  const [rows] = await pool.execute(
    `SELECT language_code FROM poi_translations WHERE poi_id = ?`,
    [poi.id]
  );

  const existing = new Set(rows.map((row) => row.language_code));
  const missing = SUPPORTED_LANGUAGES.filter((code) => !existing.has(code));

  if (missing.length === 0) {
    return 0;
  }

  const translations = await translatePoiContent({
    nameVi: poi.name_vi,
    descriptionVi: poi.description_vi,
  });

  for (const language of missing) {
    const translation = translations[language];

    if (!translation) {
      continue;
    }

    await pool.execute(
      `
        INSERT IGNORE INTO poi_translations
          (poi_id, language_code, name, description, audio)
        VALUES (?, ?, ?, ?, '')
      `,
      [poi.id, language, translation.name ?? "", translation.description ?? ""]
    );
  }

  return missing.length;
}

async function countMissingAudio() {
  const [[row]] = await pool.query(`
    SELECT
      COUNT(*) AS total,
      SUM(t.audio IS NULL OR t.audio = '') AS missing
    FROM poi_translations t
    INNER JOIN pois p ON p.id = t.poi_id
    WHERE p.status = 'approved'
  `);

  return {
    total: Number(row.total),
    missing: Number(row.missing || 0),
  };
}

async function main() {
  const before = await countMissingAudio();

  console.log(`Audio trước khi chạy: thiếu ${before.missing}/${before.total}`);

  const [pois] = await pool.query(`
    SELECT id, name_vi, description_vi
    FROM pois
    WHERE status = 'approved'
    ORDER BY id ASC
  `);

  for (const poi of pois) {
    try {
      const added = await fillMissingTranslations(poi);

      if (added > 0) {
        console.log(`POI ${poi.id}: thêm ${added} bản dịch`);
      }
    } catch (error) {
      console.error(`POI ${poi.id}: dịch thất bại`, error.message);
    }

    await generatePoiAudio(poi.id);
  }

  const after = await countMissingAudio();

  console.log(`Audio sau khi chạy: thiếu ${after.missing}/${after.total}`);

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
