import {
  createAudioPlayer,
  setAudioModeAsync,
} from "expo-audio";

import type { LanguageCode } from "../translations";
import type { Poi } from "../store/usePoiStore";

import {
  speakText,
  stopSpeaking,
} from "./nativeTts";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(
    /\/+$/,
    ""
  ) || "";

type AudioSubscription = {
  remove: () => void;
};

let currentPlayer:
  | ReturnType<typeof createAudioPlayer>
  | null = null;

let currentSubscription:
  | AudioSubscription
  | null = null;

let narrationToken = 0;

function resolveAudioUrl(
  audio?: string | null
) {
  if (!audio) {
    return null;
  }

  const value = audio.trim();

  if (!value) {
    return null;
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("file://") ||
    value.startsWith("content://")
  ) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${API_URL}${value}`;
  }

  return `${API_URL}/${value}`;
}

function getLocalizedValue(
  values:
    | Record<string, string>
    | null
    | undefined,
  language: LanguageCode
) {
  if (!values) {
    return "";
  }

  return (
    values[language] ??
    values.vi ??
    Object.values(values)[0] ??
    ""
  );
}

function cleanupCurrentPlayer() {
  try {
    currentSubscription?.remove();
  } catch (error) {
    console.warn(
      "[Narration] remove subscription failed:",
      error
    );
  }

  currentSubscription = null;

  if (currentPlayer) {
    try {
      currentPlayer.pause();
    } catch (error) {
      console.warn(
        "[Narration] pause failed:",
        error
      );
    }

    try {
      currentPlayer.remove();
    } catch (error) {
      console.warn(
        "[Narration] remove player failed:",
        error
      );
    }
  }

  currentPlayer = null;
}

function fallbackToTts(
  poi: Poi,
  language: LanguageCode,
  token: number
) {
  if (token !== narrationToken) {
    return;
  }

  cleanupCurrentPlayer();

  const description =
    getLocalizedValue(
      poi.description,
      language
    );

  if (!description) {
    return;
  }

  console.log(
    "[Narration] fallback -> Native TTS"
  );

  speakText(
    description,
    language
  );
}

export async function playPoiNarration(
  poi: Poi,
  language: LanguageCode
) {
  const token = ++narrationToken;

  cleanupCurrentPlayer();
  stopSpeaking();

  const audioSource =
    getLocalizedValue(
      poi.audio,
      language
    );

  const description =
    getLocalizedValue(
      poi.description,
      language
    );

  /*
   * Không có audio thì dùng native TTS.
   */
  if (!audioSource) {
    console.log(
      "[Narration] no pre-generated audio -> TTS"
    );

    if (description) {
      speakText(
        description,
        language
      );
    }

    return;
  }

  const audioUrl =
    resolveAudioUrl(audioSource);

  if (!audioUrl) {
    fallbackToTts(
      poi,
      language,
      token
    );
    return;
  }

  console.log(
    "[Narration] POI:",
    poi.id
  );

  console.log(
    "[Narration] language:",
    language
  );

  console.log(
    "[Narration] audio:",
    audioUrl
  );

  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
    });
  } catch (error) {
    console.warn(
      "[Narration] setAudioModeAsync failed:",
      error
    );
  }

  if (token !== narrationToken) {
    return;
  }

  try {
    const player = createAudioPlayer(
      audioUrl,
      {
        downloadFirst: true,
      }
    );

    currentPlayer = player;

    let started = false;
    let finished = false;

    const fallback = () => {
      if (finished) {
        return;
      }

      finished = true;

      fallbackToTts(
        poi,
        language,
        token
      );
    };

    const subscription =
      player.addListener(
        "playbackStatusUpdate",
        (status) => {
          if (token !== narrationToken) {
            return;
          }

          if (status.error) {
            console.warn(
              "[Narration] audio error:",
              status.error
            );

            fallback();
            return;
          }

          if (
            status.isLoaded &&
            !started
          ) {
            started = true;

            console.log(
              "[Narration] audio loaded -> play"
            );

            player.play();
          }

          if (
            status.didJustFinish
          ) {
            finished = true;

            cleanupCurrentPlayer();

            console.log(
              "[Narration] playback finished"
            );
          }
        }
      );

    currentSubscription =
      subscription as AudioSubscription;

    /*
     * Trong trường hợp audio đã load ngay
     * khi listener được đăng ký.
     */
    if (
      player.isLoaded &&
      !started
    ) {
      started = true;
      player.play();
    }
  } catch (error) {
    console.error(
      "[Narration] create player failed:",
      error
    );

    fallbackToTts(
      poi,
      language,
      token
    );
  }
}

export function stopPoiNarration() {
  narrationToken += 1;

  cleanupCurrentPlayer();
  stopSpeaking();
}