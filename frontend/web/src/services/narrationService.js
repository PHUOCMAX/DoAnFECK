import {
  resolveAssetUrl,
} from "./userService";

import {
  speakText,
  stopSpeaking,
} from "../utils/tts";

let currentAudio = null;

let narrationQueue = [];

let isPlaying = false;

function getPoiText(
  poi,
  language
) {
  return (
    poi?.description?.[language] ||
    poi?.description?.vi ||
    poi?.description?.en ||
    ""
  ).trim();
}

function getPoiAudio(
  poi,
  language
) {
  return (
    poi?.audio?.[language] ||
    ""
  ).trim();
}

function cleanupCurrentAudio() {
  if (!currentAudio) {
    return;
  }

  try {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  } catch {
    // ignore
  }

  currentAudio.src = "";

  currentAudio = null;
}

/*
 * ==========================================
 * PLAY NEXT
 * ==========================================
 */
async function playNext() {
  if (isPlaying) {
    return;
  }

  const next =
    narrationQueue.shift();

  if (!next) {
    return;
  }

  isPlaying = true;

  const {
    poi,
    language,
  } = next;

  const audioSource =
    getPoiAudio(
      poi,
      language
    );

  /*
   * ========================================
   * ƯU TIÊN AUDIO CÓ SẴN
   * ========================================
   */
  if (audioSource) {
    try {
      const audioUrl =
        resolveAssetUrl(
          audioSource
        );

      const audio =
        new Audio(audioUrl);

      currentAudio = audio;

      audio.preload = "auto";

      audio.onended = () => {
        cleanupCurrentAudio();

        isPlaying = false;

        void playNext();
      };

      audio.onerror = () => {
        console.warn(
          "POI audio không phát được → Browser TTS."
        );

        cleanupCurrentAudio();

        playBrowserTts(
          poi,
          language
        );
      };

      await audio.play();

      return;
    } catch (error) {
      console.warn(
        "Audio playback failed:",
        error
      );

      cleanupCurrentAudio();

      playBrowserTts(
        poi,
        language
      );

      return;
    }
  }

  /*
   * ========================================
   * KHÔNG CÓ AUDIO → BROWSER TTS
   * ========================================
   */
  playBrowserTts(
    poi,
    language
  );
}

/*
 * ==========================================
 * BROWSER TTS
 * ==========================================
 */
function playBrowserTts(
  poi,
  language
) {
  const text =
    getPoiText(
      poi,
      language
    );

  if (!text) {
    isPlaying = false;

    void playNext();

    return;
  }

  stopSpeaking();

  const started =
    speakText(
      text,
      language,
      {
        rate: 0.95,
        pitch: 1,
        volume: 1,
      }
    );

  /*
   * speechSynthesis không có
   * Promise trực tiếp từ speakText(),
   * nên dùng thời gian nói ước lượng
   * để giải phóng queue.
   */
  if (!started) {
    isPlaying = false;

    void playNext();

    return;
  }

  const estimatedDuration = Math.max(
    2500,
    Math.min(
      30000,
      text.length * 65
    )
  );

  window.setTimeout(() => {
    if (!isPlaying) {
      return;
    }

    isPlaying = false;

    void playNext();
  }, estimatedDuration);
}

/*
 * ==========================================
 * QUEUE NARRATION
 * ==========================================
 *
 * Flow:
 *
 * queueNarration(bestPOI)
 * ↓
 * playNext()
 */
export function enqueuePoiNarration(
  poi,
  language
) {
  if (!poi) {
    return;
  }

  /*
   * Không queue trùng cùng POI.
   */
  const poiId = Number(
    poi.id
  );

  const alreadyQueued =
    narrationQueue.some(
      (item) =>
        Number(item.poi?.id) ===
        poiId
    );

  if (
    alreadyQueued ||
    Number.isNaN(poiId)
  ) {
    return;
  }

  narrationQueue.push({
    poi,
    language,
  });

  console.log(
    "NARRATION QUEUE:",
    poiId
  );

  void playNext();
}

/*
 * ==========================================
 * STOP
 * ==========================================
 */
export function stopNarration() {
  narrationQueue = [];

  cleanupCurrentAudio();

  stopSpeaking();

  isPlaying = false;
}