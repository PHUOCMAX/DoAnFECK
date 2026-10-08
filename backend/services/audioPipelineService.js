import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import {
  EdgeTTS,
  Constants,
} from "@andresaya/edge-tts";

import pool from "../config/db.js";

import {
  SUPPORTED_LANGUAGES,
} from "../utils/poiValidation.js";

/* =========================================================
   CONFIG
========================================================= */

const AUDIO_DIR = path.resolve(
  process.cwd(),
  "uploads",
  "audio"
);

const PUBLIC_AUDIO_PREFIX =
  "/uploads/audio";

/*
 * Một số voice ổn định cho 15 ngôn ngữ
 * của project.
 */
const VOICES = {
  vi: "vi-VN-HoaiMyNeural",
  en: "en-US-AriaNeural",
  zh: "zh-CN-XiaoxiaoNeural",
  ja: "ja-JP-NanamiNeural",
  ko: "ko-KR-SunHiNeural",
  fr: "fr-FR-DeniseNeural",
  de: "de-DE-KatjaNeural",
  es: "es-ES-ElviraNeural",
  it: "it-IT-ElsaNeural",
  pt: "pt-BR-FranciscaNeural",
  ru: "ru-RU-SvetlanaNeural",
  th: "th-TH-PremwadeeNeural",
  id: "id-ID-GadisNeural",
  ms: "ms-MY-YasminNeural",
  hi: "hi-IN-SwaraNeural",
};

/*
 * Chống chạy đồng thời cùng một POI.
 */
const runningPois = new Set();

/* =========================================================
   HELPERS
========================================================= */

function hashText(text) {
  return crypto
    .createHash("sha1")
    .update(text)
    .digest("hex")
    .slice(0, 12);
}

function getVoice(language) {
  return VOICES[language] ?? null;
}

/* =========================================================
   GENERATE ONE AUDIO
========================================================= */

async function generateAudioForLanguage({
  poiId,
  language,
  description,
}) {
  const voice = getVoice(language);

  if (!voice) {
    console.warn(
      `AUDIO PIPELINE: no voice for ${language}`
    );

    return {
      success: false,
      language,
      status: "skipped",
    };
  }

  const text = String(
    description || ""
  ).trim();

  if (!text) {
    return {
      success: false,
      language,
      status: "empty",
    };
  }

  const hash = hashText(text);

  const fileName =
    `poi-${poiId}-${language}-${hash}.mp3`;

  const absolutePath = path.join(
    AUDIO_DIR,
    fileName
  );

  const publicUrl =
    `${PUBLIC_AUDIO_PREFIX}/${fileName}`;

  /*
   * Nếu audio đã tồn tại:
   * không generate lại.
   */
  try {
    await fs.access(absolutePath);

    await pool.execute(
      `
      UPDATE poi_translations
      SET audio = ?
      WHERE poi_id = ?
        AND language_code = ?
      `,
      [
        publicUrl,
        poiId,
        language,
      ]
    );

    return {
      success: true,
      language,
      status: "cached",
      audio: publicUrl,
    };
  } catch {
    /*
     * File chưa tồn tại → generate.
     */
  }

  const tts = new EdgeTTS();

  await tts.synthesize(
    text,
    voice,
    {
      outputFormat:
        Constants.OUTPUT_FORMAT
          .AUDIO_24KHZ_96KBITRATE_MONO_MP3,
    }
  );

  /*
   * Đảm bảo thư mục tồn tại.
   */
  await fs.mkdir(
    AUDIO_DIR,
    {
      recursive: true,
    }
  );

  /*
   * edge-tts tự thêm .mp3.
   */
  const outputBase =
    absolutePath.endsWith(".mp3")
      ? absolutePath.slice(
          0,
          -".mp3".length
        )
      : absolutePath;

  await tts.toFile(
    outputBase
  );

  /*
   * Lưu URL audio vào DB.
   */
  await pool.execute(
    `
    UPDATE poi_translations
    SET audio = ?
    WHERE poi_id = ?
      AND language_code = ?
    `,
    [
      publicUrl,
      poiId,
      language,
    ]
  );

  console.log(
    "AUDIO GENERATED:",
    {
      poiId,
      language,
      audio: publicUrl,
    }
  );

  return {
    success: true,
    language,
    status: "generated",
    audio: publicUrl,
  };
}

/* =========================================================
   GENERATE ALL LANGUAGES FOR ONE POI
========================================================= */

export async function generatePoiAudio(
  poiId
) {
  if (
    runningPois.has(poiId)
  ) {
    return;
  }

  runningPois.add(poiId);

  try {
    console.log(
      "AUDIO PIPELINE START:",
      poiId
    );

    await fs.mkdir(
      AUDIO_DIR,
      {
        recursive: true,
      }
    );

    const [rows] =
      await pool.execute(
        `
        SELECT
          language_code,
          description
        FROM poi_translations
        WHERE poi_id = ?
        ORDER BY language_code ASC
        `,
        [poiId]
      );

    const translationMap =
      new Map(
        rows.map((row) => [
          row.language_code,
          row.description,
        ])
      );

    /*
     * Chạy tuần tự để tránh spam
     * TTS service.
     */
    for (const language of
      SUPPORTED_LANGUAGES) {

      const description =
        translationMap.get(
          language
        );

      if (!description) {
        continue;
      }

      try {
        await generateAudioForLanguage(
          {
            poiId,
            language,
            description,
          }
        );
      } catch (error) {
        console.error(
          "AUDIO LANGUAGE FAILED:",
          {
            poiId,
            language,
            error:
              error instanceof Error
                ? error.message
                : error,
          }
        );

        /*
         * Một ngôn ngữ lỗi không làm
         * hỏng toàn bộ pipeline.
         */
      }
    }

    console.log(
      "AUDIO PIPELINE COMPLETE:",
      poiId
    );
  } catch (error) {
    console.error(
      "AUDIO PIPELINE FAILED:",
      poiId,
      error
    );
  } finally {
    runningPois.delete(
      poiId
    );
  }
}

/* =========================================================
   QUEUE
========================================================= */

/*
 * Không block request POST / POI.
 *
 * API trả response trước,
 * pipeline chạy nền trong process Node.
 */
export function queuePoiAudioGeneration(
  poiId
) {
  setImmediate(() => {
    void generatePoiAudio(
      poiId
    );
  });
}