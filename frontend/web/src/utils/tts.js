const TTS_LANGUAGES = {
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

export function getTTSLanguage(language) {
  return TTS_LANGUAGES[language] || "en-US";
}

export function speakText(text, language, options = {}) {
  if (!text?.trim()) return false;

  if (
    typeof window === "undefined" ||
    !window.speechSynthesis ||
    typeof window.SpeechSynthesisUtterance ===
      "undefined"
  ) {
    return false;
  }

  window.speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(
      text.trim()
    );

  utterance.lang =
    getTTSLanguage(language);

  utterance.rate =
    options.rate ?? 0.95;

  utterance.pitch =
    options.pitch ?? 1;

  utterance.volume =
    options.volume ?? 1;

  const voices =
    window.speechSynthesis
      .getVoices?.() || [];

  const languageCode =
    getTTSLanguage(language).toLowerCase();

  const baseLanguage =
    languageCode.split("-")[0];

  const matchingVoice =
    voices.find(
      (voice) =>
        voice.lang?.toLowerCase() ===
        languageCode
    ) ||
    voices.find((voice) =>
      voice.lang
        ?.toLowerCase()
        .startsWith(baseLanguage)
    );

  if (matchingVoice) {
    utterance.voice =
      matchingVoice;
  }

  window.speechSynthesis.speak(
    utterance
  );

  return true;
}

export function stopSpeaking() {
  if (
    typeof window !== "undefined" &&
    window.speechSynthesis
  ) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeechSynthesisSupported() {
  return (
    typeof window !== "undefined" &&
    !!window.speechSynthesis &&
    typeof window.SpeechSynthesisUtterance !==
      "undefined"
  );
}