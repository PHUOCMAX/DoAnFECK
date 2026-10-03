import { SUPPORTED_LANGUAGES } from "../utils/poiValidation.js";

const TRANSLATE_URL =
  process.env.LIBRETRANSLATE_URL ||
  "http://localhost:5002";

const TRANSLATE_CODES = {
  vi: "vi",
  en: "en",
  zh: "zh-Hans",
  ja: "ja",
  ko: "ko",
  fr: "fr",
  de: "de",
  es: "es",
  it: "it",
  pt: "pt",
  ru: "ru",
  th: "th",
  id: "id",
  ms: "ms",
  hi: "hi",
};

async function translateText(
  text,
  sourceLanguage,
  targetLanguage
) {
  const sourceCode =
    TRANSLATE_CODES[sourceLanguage];

  const targetCode =
    TRANSLATE_CODES[targetLanguage];

  if (!sourceCode) {
    throw new Error(
      `Không hỗ trợ ngôn ngữ nguồn: ${sourceLanguage}`
    );
  }

  if (!targetCode) {
    throw new Error(
      `Không hỗ trợ ngôn ngữ đích: ${targetLanguage}`
    );
  }

  if (!text?.trim()) {
    return "";
  }

  if (sourceLanguage === targetLanguage) {
    return text.trim();
  }

  const response = await fetch(
    `${TRANSLATE_URL}/translate`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        q: text.trim(),
        source: sourceCode,
        target: targetCode,
        format: "text",
      }),
    }
  );

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `LibreTranslate ${sourceLanguage} -> ${targetLanguage} failed: ${response.status} ${body}`
    );
  }

  let data;

  try {
    data = JSON.parse(body);
  } catch {
    throw new Error(
      `LibreTranslate trả về JSON không hợp lệ: ${body}`
    );
  }

  if (
    !data.translatedText ||
    typeof data.translatedText !== "string"
  ) {
    throw new Error(
      `Không nhận được bản dịch ${sourceLanguage} -> ${targetLanguage}.`
    );
  }

  return data.translatedText.trim();
}

/*
 * Dịch qua English làm ngôn ngữ trung gian.
 *
 * Ví dụ:
 *
 * Vietnamese
 *     ↓
 * English
 *     ↓
 * Japanese
 *
 * Cách này giúp tránh phụ thuộc trực tiếp
 * vào từng cặp vi -> target.
 */
async function translateViaEnglish(
  textVi,
  targetLanguage,
  englishText = null
) {
  if (targetLanguage === "vi") {
    return textVi.trim();
  }

  let english;

  if (englishText) {
    english = englishText;
  } else {
    english = await translateText(
      textVi,
      "vi",
      "en"
    );
  }

  if (targetLanguage === "en") {
    return english;
  }

  return translateText(
    english,
    "en",
    targetLanguage
  );
}

async function translateLanguage({
  language,
  nameVi,
  descriptionVi,
  nameEn,
  descriptionEn,
}) {
  const name =
    await translateViaEnglish(
      nameVi,
      language,
      nameEn
    );

  const description =
    await translateViaEnglish(
      descriptionVi,
      language,
      descriptionEn
    );

  return {
    language,
    name,
    description,
  };
}

export async function translatePoiContent({
  nameVi,
  descriptionVi,
}) {
  const normalizedName =
    nameVi?.trim() || "";

  const normalizedDescription =
    descriptionVi?.trim() || "";

  if (!normalizedName) {
    throw new Error(
      "Tên POI Tiếng Việt không được để trống."
    );
  }

  if (!normalizedDescription) {
    throw new Error(
      "Mô tả POI Tiếng Việt không được để trống."
    );
  }

  /*
   * VI -> EN chỉ thực hiện một lần.
   */
  console.log(
    "[Translation] vi -> en (name)"
  );

  const nameEn =
    await translateText(
      normalizedName,
      "vi",
      "en"
    );

  console.log(
    "[Translation] vi -> en (description)"
  );

  const descriptionEn =
    await translateText(
      normalizedDescription,
      "vi",
      "en"
    );

  const result = {
    vi: {
      name: normalizedName,
      description: normalizedDescription,
    },

    en: {
      name: nameEn,
      description: descriptionEn,
    },
  };

  /*
   * Các ngôn ngữ còn lại:
   *
   * EN -> target
   */
  const targetLanguages =
    SUPPORTED_LANGUAGES.filter(
      (language) =>
        language !== "vi" &&
        language !== "en"
    );

  for (const language of targetLanguages) {
    console.log(
      `[Translation] en -> ${language}`
    );

    const translation =
      await translateLanguage({
        language,
        nameVi: normalizedName,
        descriptionVi: normalizedDescription,
        nameEn,
        descriptionEn,
      });

    result[language] = {
      name: translation.name,
      description: translation.description,
    };
  }

  return result;
}