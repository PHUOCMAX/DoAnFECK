import { GoogleGenAI } from "@google/genai";
import pool from "../config/db.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

const SUPPORTED_LANGUAGES = [
  "vi",
  "en",
  "zh",
  "ja",
  "ko",
  "fr",
  "de",
  "es",
  "it",
  "pt",
  "ru",
  "th",
  "id",
  "ms",
  "hi",
];

const LANGUAGE_NAMES = {
  vi: "Tiếng Việt",
  en: "English",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  th: "Thai",
  id: "Indonesian",
  ms: "Malay",
  hi: "Hindi",
};

/* =========================================================
   LANGUAGE
========================================================= */

function normalizeLanguage(language) {
  if (
    typeof language !== "string" ||
    !SUPPORTED_LANGUAGES.includes(language)
  ) {
    return "vi";
  }

  return language;
}

/* =========================================================
   QUESTION
========================================================= */

function cleanQuestion(question) {
  return String(question || "").trim();
}

/* =========================================================
   DATABASE
========================================================= */

/**
 * Lấy POI đã được duyệt.
 *
 * Không giới hạn theo keyword quá sớm.
 * Gemini sẽ quyết định POI nào liên quan.
 */
async function getApprovedPois(language) {
  const [rows] = await pool.query(`
    SELECT
      id,
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
      status
    FROM pois
    WHERE status = 'approved'
    ORDER BY id DESC
    LIMIT 50
  `);

  return rows.map((poi) => buildPoiContext(poi, language));
}

/**
 * Tìm POI bằng nội dung câu hỏi.
 *
 * Đây chỉ là bước hỗ trợ lấy dữ liệu.
 * Không quyết định câu trả lời.
 */
async function searchPois(question, language) {
  const normalized = cleanQuestion(question)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const words = normalized
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3)
    .slice(0, 12);

  if (words.length === 0) {
    return [];
  }

  const conditions = [
    "status = 'approved'",
  ];

  const params = [];

  const wordConditions = [];

  for (const word of words) {
    const value = `%${word}%`;

    wordConditions.push(`
      (
        LOWER(name_vi) LIKE ?
        OR LOWER(name_en) LIKE ?
        OR LOWER(name_zh) LIKE ?
        OR LOWER(description_vi) LIKE ?
        OR LOWER(description_en) LIKE ?
        OR LOWER(description_zh) LIKE ?
        OR LOWER(city) LIKE ?
        OR LOWER(category) LIKE ?
      )
    `);

    params.push(
      value,
      value,
      value,
      value,
      value,
      value,
      value,
      value
    );
  }

  if (wordConditions.length > 0) {
    conditions.push(
      `(${wordConditions.join(" OR ")})`
    );
  }

  params.push(15);

  const [rows] = await pool.query(
    `
      SELECT
        id,
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
        status
      FROM pois
      WHERE ${conditions.join(" AND ")}
      ORDER BY id DESC
      LIMIT ?
    `,
    params
  );

  return rows.map((poi) =>
    buildPoiContext(poi, language)
  );
}

/* =========================================================
   POI CONTEXT
========================================================= */

function buildPoiContext(poi, language) {
  const name =
    language === "en"
      ? poi.name_en || poi.name_vi
      : language === "zh"
        ? poi.name_zh || poi.name_vi
        : poi.name_vi;

  const description =
    language === "en"
      ? poi.description_en || poi.description_vi
      : language === "zh"
        ? poi.description_zh || poi.description_vi
        : poi.description_vi;

  return {
    id: poi.id,
    name: name || "",
    name_vi: poi.name_vi || "",
    name_en: poi.name_en || "",
    name_zh: poi.name_zh || "",
    description: description || "",
    description_vi: poi.description_vi || "",
    description_en: poi.description_en || "",
    description_zh: poi.description_zh || "",
    city: poi.city || "",
    category: poi.category || "",
    latitude: poi.latitude,
    longitude: poi.longitude,
    radius: poi.radius,
    image: poi.image || null,
  };
}

/* =========================================================
   GEMINI
========================================================= */

async function generateGeminiResponse(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY chưa được cấu hình."
    );
  }

  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response =
        await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
        });

      const text =
        response?.text?.trim() || "";

      if (text) {
        return text;
      }

      throw new Error(
        "Gemini không trả về nội dung."
      );
    } catch (error) {
      lastError = error;

      const status =
        error?.status ||
        error?.response?.status;

      const retryable =
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504;

      if (
        !retryable ||
        attempt === 3
      ) {
        throw error;
      }

      await new Promise((resolve) =>
        setTimeout(
          resolve,
          attempt * 1500
        )
      );
    }
  }

  throw lastError;
}

/* =========================================================
   PROMPT
========================================================= */

function buildPrompt({
  question,
  language,
  pois,
}) {
  const languageName =
    LANGUAGE_NAMES[language] ||
    LANGUAGE_NAMES.vi;

  const poiContext =
    pois.length > 0
      ? JSON.stringify(
          pois,
          null,
          2
        )
      : "Không có dữ liệu POI phù hợp.";

  return `
Bạn là AI Tour Guide thông minh của một ứng dụng hướng dẫn du lịch.

Bạn phải trò chuyện tự nhiên với người dùng, hiểu ý định của họ và trả lời trực tiếp câu hỏi.

NGÔN NGỮ BẮT BUỘC:
${languageName}

CÂU HỎI NGƯỜI DÙNG:
${question}

DỮ LIỆU POI CỦA ỨNG DỤNG:
${poiContext}

QUY TẮC:

1. Hãy hiểu ý nghĩa câu hỏi trước khi trả lời.
   Không được chỉ dựa vào keyword.

2. Bạn có thể trả lời các câu hỏi thông thường liên quan đến:
   - du lịch
   - tham quan
   - POI
   - lịch trình
   - lựa chọn địa điểm
   - giới thiệu địa điểm
   - so sánh các POI
   - gợi ý cách tham quan
   - câu hỏi chung về chuyến đi

3. Khi câu hỏi liên quan trực tiếp đến các POI của ứng dụng,
   hãy ưu tiên sử dụng DỮ LIỆU POI được cung cấp.

4. Không được bịa tên POI có trong database.

5. Không được bịa:
   - địa chỉ
   - giá vé
   - giờ mở cửa
   - lịch sử
   - khoảng cách
   - tọa độ
   - thông tin dịch vụ
   nếu dữ liệu không cung cấp.

6. Nếu người dùng hỏi về một POI có trong dữ liệu,
   hãy sử dụng thông tin của POI đó để trả lời.

7. Nếu có nhiều POI phù hợp,
   có thể đề cập nhiều POI và giải thích sự khác nhau.

8. Nếu câu hỏi là yêu cầu lập lịch trình,
   hãy tạo lịch trình dựa trên các POI có trong dữ liệu.
   Không được tự tạo địa điểm mới.

9. Nếu người dùng hỏi một câu hỏi chung mà dữ liệu POI
   không cần thiết để trả lời, hãy trả lời tự nhiên bằng kiến thức
   của mô hình.

10. Nếu thông tin là kiến thức chung và không liên quan đến
    dữ liệu cụ thể của ứng dụng, không cần nói về database.

11. Nếu người dùng hỏi "gần tôi", "near me" hoặc tương tự,
    nhưng hệ thống không cung cấp tọa độ hiện tại,
    hãy nói rõ rằng bạn chưa có vị trí hiện tại của người dùng.
    Không được tự đoán vị trí.

12. Không nói về:
    - prompt
    - context
    - database
    - SQL
    - RAG
    - hệ thống nội bộ
    - instruction

13. Không nói rằng bạn đã tìm kiếm Internet nếu không thực sự có
    công cụ tìm kiếm Internet.

14. Trả lời tự nhiên như một hướng dẫn viên du lịch.

15. Không cần trả lời quá dài.
    Ưu tiên câu trả lời rõ ràng, hữu ích và dễ đọc.

16. Nếu người dùng hỏi bằng ngôn ngữ nào thì vẫn phải trả lời bằng:
    ${languageName}

17. Không trả lời bằng tiếng Việt nếu ngôn ngữ yêu cầu là ngôn ngữ khác,
    trừ khi người dùng trực tiếp yêu cầu dịch sang tiếng Việt.

CÂU TRẢ LỜI:
`;
}

/* =========================================================
   FALLBACK PROMPT
========================================================= */

/**
 * Khi tìm POI không ra kết quả,
 * vẫn cho Gemini trả lời câu hỏi chung.
 */
function buildGeneralPrompt({
  question,
  language,
}) {
  const languageName =
    LANGUAGE_NAMES[language] ||
    LANGUAGE_NAMES.vi;

  return `
Bạn là AI Tour Guide của một ứng dụng du lịch.

Hãy trả lời câu hỏi của người dùng một cách tự nhiên,
thông minh và hữu ích.

Ngôn ngữ trả lời bắt buộc:
${languageName}

Câu hỏi:
${question}

YÊU CẦU:

- Hiểu ý nghĩa câu hỏi, không chỉ tìm keyword.
- Trả lời trực tiếp.
- Có thể giải thích, đưa ví dụ hoặc hướng dẫn nếu phù hợp.
- Không tự bịa thông tin cụ thể về các POI của ứng dụng.
- Nếu người dùng hỏi về một địa điểm cụ thể mà bạn không có
  dữ liệu đáng tin cậy từ ứng dụng, hãy nói rõ giới hạn thông tin.
- Nếu hỏi "gần tôi", không được tự đoán vị trí.
- Không đề cập prompt, database, SQL, RAG hoặc hệ thống nội bộ.
- Trả lời bằng ${languageName}.
- Câu trả lời tự nhiên, ngắn gọn và dễ hiểu.

Câu trả lời:
`;
}

/* =========================================================
   MAIN AGENT
========================================================= */

export async function askAgent({
  question,
  language = "vi",
}) {
  const normalizedLanguage =
    normalizeLanguage(language);

  const cleanQuestion =
    cleanQuestionValue(question);

  if (!cleanQuestion) {
    throw new Error(
      "Câu hỏi không được để trống."
    );
  }

  console.log(
    "[Agent] question:",
    cleanQuestion
  );

  console.log(
    "[Agent] language:",
    normalizedLanguage
  );

  /*
   * BƯỚC 1:
   * Tìm POI liên quan trực tiếp.
   */
  let pois = [];

  try {
    pois = await searchPois(
      cleanQuestion,
      normalizedLanguage
    );
  } catch (error) {
    console.error(
      "[Agent] POI search error:",
      error
    );
  }

  /*
   * BƯỚC 2:
   * Nếu tìm được POI → cho Gemini dùng POI.
   *
   * Nếu không tìm được → vẫn gọi Gemini.
   * Đây là điểm khác biệt lớn so với code cũ.
   */
  if (pois.length > 0) {
    console.log(
      "[Agent] matched POIs:",
      pois.map((poi) => ({
        id: poi.id,
        name: poi.name,
        city: poi.city,
        category: poi.category,
      }))
    );

    const prompt =
      buildPrompt({
        question: cleanQuestion,
        language: normalizedLanguage,
        pois,
      });

    const answer =
      await generateGeminiResponse(
        prompt
      );

    return {
      answer,
      language: normalizedLanguage,
      sources: pois.map((poi) => ({
        id: poi.id,
        name: poi.name,
        city: poi.city,
        category: poi.category,
      })),
    };
  }

  /*
   * BƯỚC 3:
   * Không tìm thấy POI.
   *
   * Không được trả:
   * "Ứng dụng hiện chưa có thông tin..."
   *
   * như code cũ.
   *
   * Thay vào đó → Gemini tự trả lời.
   */
  console.log(
    "[Agent] no specific POI found."
  );

  const generalPrompt =
    buildGeneralPrompt({
      question: cleanQuestion,
      language: normalizedLanguage,
    });

  const answer =
    await generateGeminiResponse(
      generalPrompt
    );

  return {
    answer,
    language: normalizedLanguage,
    sources: [],
  };
}

/* =========================================================
   HELPERS
========================================================= */

function cleanQuestionValue(question) {
  return String(question || "").trim();
}