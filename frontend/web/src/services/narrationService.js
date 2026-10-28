import { useSyncExternalStore } from "react";

import {
  resolveAssetUrl,
} from "./userService";

/*
 * Một kênh phát duy nhất cho toàn app: thuyết minh tự động (geofence)
 * và nút "Nghe" ở mọi trang đều đi qua đây, nên không bao giờ có hai
 * giọng đọc cùng lúc.
 *
 * Chỉ phát file mp3 do pipeline tạo sẵn (Edge TTS) để giọng đọc luôn
 * giống nhau trên mọi điện thoại; POI chưa có audio thì bỏ qua.
 */

let currentAudio = null;

let currentPoiId = null;

let narrationQueue = [];

/*
 * Dùng để ngăn callback cũ tác động
 * sau khi narration đã bị stop.
 */
let narrationRunId = 0;

/*
 * Mục đang chờ người dùng chạm màn hình vì trình duyệt
 * chặn tự phát âm thanh.
 */
let blockedItem = null;

const listeners = new Set();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function setCurrentPoiId(poiId) {
  currentPoiId = poiId;
  notify();
}

export function getPoiAudioUrl(
  poi,
  language
) {
  const source = (
    poi?.audio?.[language] ||
    ""
  ).trim();

  return source
    ? resolveAssetUrl(source)
    : "";
}

export function hasPoiAudio(
  poi,
  language
) {
  return Boolean(
    getPoiAudioUrl(poi, language)
  );
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
 * CHỜ NGƯỜI DÙNG CHẠM MÀN HÌNH
 * ==========================================
 */
function retryBlockedOnTap() {
  document.removeEventListener(
    "pointerdown",
    retryBlockedOnTap
  );

  const item = blockedItem;

  blockedItem = null;

  if (item && !currentAudio) {
    void startItem(item);
  }
}

function waitForTap(item) {
  blockedItem = item;

  document.addEventListener(
    "pointerdown",
    retryBlockedOnTap,
    { once: true }
  );
}

/*
 * ==========================================
 * PHÁT MỘT POI
 * ==========================================
 */
async function startItem({
  poi,
  language,
}) {
  const audioUrl =
    getPoiAudioUrl(poi, language);

  if (!audioUrl) {
    console.warn(
      "NARRATION: POI chưa có audio, bỏ qua.",
      poi?.id,
      language
    );

    playNext();

    return;
  }

  const runId = narrationRunId;

  const audio = new Audio(audioUrl);

  audio.preload = "auto";

  currentAudio = audio;

  setCurrentPoiId(Number(poi.id));

  const finish = () => {
    if (runId !== narrationRunId) {
      return;
    }

    cleanupCurrentAudio();

    setCurrentPoiId(null);

    playNext();
  };

  audio.onended = finish;

  audio.onerror = () => {
    console.warn(
      "NARRATION: không tải được audio.",
      audioUrl
    );

    finish();
  };

  try {
    await audio.play();

    /*
     * Có thể narration đã bị stop trong lúc
     * browser xử lý play().
     */
    if (runId !== narrationRunId) {
      cleanupCurrentAudio();
    }
  } catch (error) {
    if (runId !== narrationRunId) {
      return;
    }

    cleanupCurrentAudio();

    setCurrentPoiId(null);

    if (error?.name === "NotAllowedError") {
      /*
       * Trình duyệt (nhất là Safari trên iPhone) chặn tự phát:
       * phát lại ngay khi người dùng chạm màn hình.
       */
      waitForTap({ poi, language });

      return;
    }

    console.warn(
      "NARRATION: phát audio thất bại.",
      error
    );

    playNext();
  }
}

function playNext() {
  if (currentAudio) {
    return;
  }

  const next =
    narrationQueue.shift();

  if (next) {
    void startItem(next);
  }
}

/*
 * ==========================================
 * QUEUE NARRATION (geofence)
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
    currentPoiId === poiId ||
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

  playNext();
}

/*
 * ==========================================
 * NÚT "NGHE": phát ngay POI này
 * ==========================================
 */
export function playPoiNarration(
  poi,
  language
) {
  stopNarration();

  if (!hasPoiAudio(poi, language)) {
    return false;
  }

  void startItem({
    poi,
    language,
  });

  return true;
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

  blockedItem = null;

  document.removeEventListener(
    "pointerdown",
    retryBlockedOnTap
  );

  cleanupCurrentAudio();

  setCurrentPoiId(null);
}

/*
 * ==========================================
 * HOOK: POI nào đang được đọc
 * ==========================================
 */
function subscribe(listener) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

export function useNarratingPoiId() {
  return useSyncExternalStore(
    subscribe,
    () => currentPoiId
  );
}
