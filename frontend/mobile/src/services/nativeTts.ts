import * as Speech from "expo-speech";
import type { LanguageCode } from "../translations";

const SPEECH_LANGUAGE: Record<LanguageCode, string> = {
  vi: "vi-VN",
  en: "en-US",
  zh: "zh-CN",
  ja: "ja-JP",
  ko: "ko-KR",
  fr: "fr-FR",
  de: "de-DE",
  es: "es-ES",
  it: "it-IT",
  pt: "pt-PT",
  ru: "ru-RU",
  th: "th-TH",
  id: "id-ID",
  ms: "ms-MY",
  hi: "hi-IN",
};

export function getSpeechLanguage(
  language: LanguageCode
) {
  return (
    SPEECH_LANGUAGE[language] ||
    SPEECH_LANGUAGE.en
  );
}

export function speakText(
  text: string,
  language: LanguageCode
) {
  const cleanText = String(text || "").trim();

  if (!cleanText) {
    return;
  }

  const speechLanguage =
    getSpeechLanguage(language);

  console.log(
    "[NativeTTS] language:",
    language
  );

  console.log(
    "[NativeTTS] speech language:",
    speechLanguage
  );

  console.log(
    "[NativeTTS] text:",
    cleanText
  );

  Speech.stop();

  Speech.speak(cleanText, {
    language: speechLanguage,
    rate: 0.9,
    pitch: 1.0,
  });
}

export function stopSpeaking() {
  Speech.stop();
}