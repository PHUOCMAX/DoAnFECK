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

/*
 * Dùng để ngăn callback cũ tác động
 * sau khi narration đã bị stop.
 */
let narrationRunId = 0;

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

  const audio = currentAudio;

  currentAudio = null;

  try {
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.currentTime = 0;
    audio.src = "";
    audio.load();
  } catch {
    // ignore
  }
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

  const runId =
    narrationRunId;

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
   * ƯU TIÊN PIPELINE AUDIO
   * ========================================
   */
  if (audioSource) {
    const audioUrl =
      resolveAssetUrl(
        audioSource
      );

    const audio =
      new Audio(audioUrl);

    currentAudio = audio;

    audio.preload = "auto";

    /*
     * Đánh dấu audio đã thực sự bắt đầu.
     *
     * Một khi play() đã resolve thì KHÔNG
     * fallback sang Browser TTS nữa, kể cả
     * sau đó audio phát sinh error.
     */
    let playbackStarted = false;

    /*
     * Ngăn fallback chạy nhiều lần.
     */
    let fallbackStarted = false;

    const playBrowserTtsOnce =
      () => {
        if (
          fallbackStarted ||
          playbackStarted
        ) {
          return;
        }

        fallbackStarted = true;

        cleanupCurrentAudio();

        playBrowserTts(
          poi,
          language,
          runId
        );
      };

    audio.onended = () => {
      if (
        runId !== narrationRunId
      ) {
        return;
      }

      cleanupCurrentAudio();

      isPlaying = false;

      void playNext();
    };

    audio.onerror = () => {
      console.warn(
        "POI pipeline audio error."
      );

      /*
       * Chỉ fallback TTS nếu
       * pipeline audio chưa bắt đầu.
       *
       * Nếu audio đã phát rồi thì
       * KHÔNG đọc lại bằng TTS.
       */
      if (!playbackStarted) {
        playBrowserTtsOnce();
      }
    };

    try {
      await audio.play();

      /*
       * play() đã resolve:
       * pipeline audio đã bắt đầu chạy.
       */
      playbackStarted = true;

      /*
       * Có thể narration đã bị stop trong lúc
       * browser xử lý play().
       */
      if (
        runId !== narrationRunId
      ) {
        cleanupCurrentAudio();
      }

      return;
    } catch (error) {
      console.warn(
        "Pipeline audio playback failed:",
        error
      );

      /*
       * play() thất bại trước khi audio
       * bắt đầu → mới được fallback TTS.
       */
      playBrowserTtsOnce();

      return;
    }
  }

  /*
   * ========================================
   * KHÔNG CÓ PIPELINE AUDIO
   * ========================================
   */
  playBrowserTts(
    poi,
    language,
    runId
  );
}

/*
 * ==========================================
 * BROWSER TTS
 * ==========================================
 */
function playBrowserTts(
  poi,
  language,
  runId = narrationRunId
) {
  if (
    runId !== narrationRunId
  ) {
    return;
  }

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

  if (!started) {
    isPlaying = false;

    void playNext();

    return;
  }

  const estimatedDuration =
    Math.max(
      2500,
      Math.min(
        30000,
        text.length * 65
      )
    );

  window.setTimeout(() => {
    if (
      runId !== narrationRunId
    ) {
      return;
    }

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
 */
export function enqueuePoiNarration(
  poi,
  language
) {
  if (!poi) {
    return;
  }

  const poiId =
    Number(poi.id);

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
  /*
   * Invalidate toàn bộ callback async
   * đang tồn tại.
   */
  narrationRunId += 1;

  narrationQueue = [];

  cleanupCurrentAudio();

  stopSpeaking();

  isPlaying = false;
}