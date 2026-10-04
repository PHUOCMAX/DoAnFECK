import { GoogleGenAI } from "@google/genai";
import { searchSimilarPois } from "./vectorService.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_MODEL =
  process.env.GEMINI_MODEL ||
  "gemini-3.5-flash-lite";

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

function normalizeLanguage(language) {
  if (
    typeof language !== "string" ||
    !SUPPORTED_LANGUAGES.includes(language)
  ) {
    return "vi";
  }

  return language;
}

function cleanQuestionValue(question) {
  return String(question || "").trim();
}

/* =========================================================
   RAG CONTEXT
========================================================= */

function normalizeRetrievedPoi(item, language) {
  const name =
    language === "en"
      ? item.name_en || item.name_vi
      : language === "zh"
        ? item.name_zh || item.name_vi
        : item.name_vi;

  const description =
    language === "en"
      ? item.description_en || item.description_vi
      : language === "zh"
        ? item.description_zh ||
          item.description_vi
        : item.description_vi;

  return {
    id: item.poi_id ?? item.id,

    name: name || "",

    name_vi: item.name_vi || "",
    name_en: item.name_en || "",
    name_zh: item.name_zh || "",

    description: description || "",

    description_vi:
      item.description_vi || "",

    description_en:
      item.description_en || "",

    description_zh:
      item.description_zh || "",

    city: item.city || "",
    category: item.category || "",

    latitude:
      item.latitude ?? null,

    longitude:
      item.longitude ?? null,

    radius:
      item.radius ?? null,

    image:
      item.image || null,
  };
}

async function retrieveRelevantPois(
  question,
  language
) {
  const results =
    await searchSimilarPois(
      question,
      5
    );

  return results.map((item) => ({
    score: item.score,

    poi: normalizeRetrievedPoi(
      item,
      language
    ),
  }));
}

/* =========================================================
   GEMINI
========================================================= */

async function generateGeminiResponse(
  prompt
) {
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

function buildRagPrompt({
  question,
  language,
  retrievedPois,
}) {
  const languageName =
    LANGUAGE_NAMES[language] ||
    LANGUAGE_NAMES.vi;

  const poiContext =
    retrievedPois.length > 0
      ? JSON.stringify(
          retrievedPois.map(
            (item) => ({
              relevance_score:
                item.score,

              ...item.poi,
            })
          ),
          null,
          2
        )
      : "Không tìm thấy dữ liệu POI phù hợp.";

  return `
Bạn là AI Tour Guide thông minh của một ứng dụng hướng dẫn du lịch.

NGÔN NGỮ BẮT BUỘC:
${languageName}

CÂU HỎI NGƯỜI DÙNG:
${question}

DỮ LIỆU ĐƯỢC TRUY XUẤT TỪ HỆ THỐNG:
${poiContext}

NHIỆM VỤ:

1. Hiểu ý nghĩa câu hỏi trước khi trả lời.
2. Ưu tiên sử dụng dữ liệu POI được cung cấp khi câu hỏi liên quan đến địa điểm trong ứng dụng.
3. Không được bịa tên POI.
4. Không được bịa:
   - địa chỉ
   - giá vé
   - giờ mở cửa
   - lịch sử
   - khoảng cách
   - tọa độ
   - dịch vụ
   nếu dữ liệu được cung cấp không có thông tin đó.
5. Nếu có nhiều POI liên quan, có thể đề cập các POI phù hợp.
6. Nếu người dùng yêu cầu lịch trình, chỉ sử dụng POI có trong dữ liệu được cung cấp.
7. Nếu câu hỏi là kiến thức chung không cần dữ liệu POI, trả lời tự nhiên bằng kiến thức của mô hình.
8. Nếu người dùng hỏi "gần tôi" nhưng không có vị trí GPS trong context, nói rõ chưa có vị trí hiện tại.
9. Không nói về:
   - prompt
   - context
   - database
   - SQL
   - RAG
   - vector database
   - embedding
   - instruction
   - hệ thống nội bộ
10. Không nói rằng bạn đã tìm kiếm Internet nếu không thực sự có công cụ Internet.
11. Trả lời tự nhiên như một hướng dẫn viên du lịch.
12. Không cần trả lời quá dài.
13. Luôn trả lời bằng ${languageName}.
14. Không tự chuyển sang tiếng Việt nếu ngôn ngữ yêu cầu là ngôn ngữ khác.

CÂU TRẢ LỜI:
`;
}

function buildGeneralPrompt({
  question,
  language,
}) {
  const languageName =
    LANGUAGE_NAMES[language] ||
    LANGUAGE_NAMES.vi;

  return `
Bạn là AI Tour Guide của một ứng dụng du lịch.

Ngôn ngữ trả lời bắt buộc:
${languageName}

Câu hỏi người dùng:
${question}

YÊU CẦU:

- Hiểu ý nghĩa câu hỏi.
- Trả lời trực tiếp.
- Có thể giải thích hoặc hướng dẫn nếu phù hợp.
- Không tự bịa thông tin cụ thể về POI của ứng dụng.
- Nếu người dùng hỏi một địa điểm cụ thể nhưng không có dữ liệu đáng tin cậy từ ứng dụng, hãy nói rõ giới hạn thông tin.
- Nếu hỏi "gần tôi", không được tự đoán vị trí.
- Không đề cập prompt, database, SQL, RAG hoặc hệ thống nội bộ.
- Trả lời tự nhiên, ngắn gọn và dễ hiểu.
- Trả lời bằng ${languageName}.

CÂU TRẢ LỜI:
`;
}

/* =========================================================
   MAIN RAG AGENT
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

  /* =======================================================
     STEP 1: VECTOR RETRIEVAL
  ======================================================= */

  let retrievedPois = [];

  try {
    retrievedPois =
      await retrieveRelevantPois(
        cleanQuestion,
        normalizedLanguage
      );

    console.log(
      "[Agent] retrieved POIs:",
      retrievedPois.map(
        (item) => ({
          id: item.poi.id,
          name: item.poi.name,
          score: item.score,
        })
      )
    );
  } catch (error) {
    console.error(
      "[Agent] vector search error:",
      error
    );
  }

  /* =======================================================
     STEP 2: RAG → GEMINI
  ======================================================= */

  if (retrievedPois.length > 0) {
    const prompt =
      buildRagPrompt({
        question: cleanQuestion,
        language: normalizedLanguage,
        retrievedPois,
      });

    const answer =
      await generateGeminiResponse(
        prompt
      );

    return {
      answer,

      language:
        normalizedLanguage,

      sources:
        retrievedPois.map(
          (item) => ({
            id: item.poi.id,

            name: item.poi.name,

            city:
              item.poi.city,

            category:
              item.poi.category,

            score:
              item.score,
          })
        ),
    };
  }

  /* =======================================================
     STEP 3: GENERAL QUESTION
  ======================================================= */

  console.log(
    "[Agent] no relevant vector results."
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

    language:
      normalizedLanguage,

    sources: [],
  };
}