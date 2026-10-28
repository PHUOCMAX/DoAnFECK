import {
  createAudioPlayer,
  setAudioModeAsync,
} from "expo-audio";

import type { LanguageCode } from "../translations";
import type { Poi } from "../store/usePoiStore";

/*
 * Một kênh phát duy nhất: chỉ phát file mp3 do pipeline tạo sẵn
 * (Edge TTS) để giọng đọc giống nhau trên mọi máy; POI chưa có
 * audio thì bỏ qua, không dùng giọng đọc của điện thoại.
 */

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

export function hasPoiAudio(
  poi: Poi | null | undefined,
  language: LanguageCode
) {
  return Boolean(
    resolveAudioUrl(poi?.audio?.[language])
  );
}

export async function playPoiNarration(
  poi: Poi,
  language: LanguageCode
) {
  const token = ++narrationToken;

  cleanupCurrentPlayer();

  const audioUrl = resolveAudioUrl(
    poi.audio?.[language]
  );

  if (!audioUrl) {
    console.warn(
      "[Narration] POI chưa có audio, bỏ qua:",
      poi.id,
      language
    );

    return false;
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
    return false;
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

    const fail = () => {
      if (finished) {
        return;
      }

      finished = true;

      cleanupCurrentPlayer();
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

            fail();
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

    cleanupCurrentPlayer();

    return false;
  }

  return true;
}

export function stopPoiNarration() {
  narrationToken += 1;

  cleanupCurrentPlayer();
}