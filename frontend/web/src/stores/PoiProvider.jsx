import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getPois,
  getTourAuthorization,
  getUserToken,
} from "../services/userService";

const PoiContext = createContext(null);

export function PoiProvider({ children }) {
  const [pois, setPois] = useState([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [authorization, setAuthorization] =
    useState(() => getTourAuthorization());

  /*
   * Dùng ref để tránh loadPois thay đổi identity
   * mỗi lần loading / loadedForKey thay đổi.
   */
  const loadedForKeyRef = useRef(null);

  const loadingRef = useRef(false);

  /* =========================
     RESET POI
  ========================= */

  const resetPois = useCallback(() => {
    loadedForKeyRef.current = null;

    setPois([]);

    setLoading(false);

    setError("");
  }, []);

  /* =========================
     LOAD POIS
  ========================= */

  const loadPois = useCallback(
    async (force = false) => {
      const token = getUserToken();

      const tourAuthorization =
        getTourAuthorization();

      /*
       * Không đăng nhập
       * hoặc chưa authorization
       * => tuyệt đối không load POI.
       */
      if (
        !token ||
        tourAuthorization?.status !==
          "active" ||
        !tourAuthorization?.sessionId
      ) {
        resetPois();
        return;
      }

      /*
       * Mỗi token + session là một bộ dữ liệu riêng.
       */
      const loadKey =
        `${token}:${tourAuthorization.sessionId}`;

      /*
       * Đã load bộ dữ liệu này rồi
       * => không gọi API lại.
       */
      if (
        !force &&
        loadedForKeyRef.current ===
          loadKey
      ) {
        return;
      }

      /*
       * Đang có request chạy
       * => không tạo request thứ hai.
       */
      if (loadingRef.current) {
        return;
      }

      loadingRef.current = true;

      setLoading(true);

      setError("");

      try {
        console.log(
          "POI: bắt đầu load sau khi authorization active"
        );

        const data = await getPois();

        const nextPois =
          data?.pois || [];

        setPois(nextPois);

        /*
         * Chỉ đánh dấu loaded sau khi API
         * trả dữ liệu thành công.
         */
        loadedForKeyRef.current =
          loadKey;

        console.log(
          "POI: load thành công =",
          nextPois.length
        );
      } catch (err) {
        console.error(
          "POI: LOAD ERROR =",
          err
        );

        setError(
          err?.message ||
            "Không thể tải dữ liệu POI."
        );

        /*
         * Không đánh dấu loaded nếu request lỗi.
         * Lần sau có thể retry.
         */

        throw err;
      } finally {
        loadingRef.current = false;

        setLoading(false);
      }
    },
    [resetPois]
  );

  /* =========================
     SYNC TOUR ACCESS
  ========================= */

  const syncTourAccess =
    useCallback(() => {
      const currentAuthorization =
        getTourAuthorization();

      console.log(
        "TOUR AUTH CHANGED:",
        currentAuthorization
      );

      setAuthorization(
        currentAuthorization
      );

      /*
       * Chưa authorization active
       * => xoá toàn bộ POI khỏi memory.
       */
      if (
        currentAuthorization?.status !==
          "active" ||
        !currentAuthorization?.sessionId
      ) {
        console.log(
          "TOUR: chưa authorized -> reset POI"
        );

        resetPois();

        return;
      }

      /*
       * Đã authorization
       * => bắt đầu load POI.
       */
      console.log(
        "TOUR: authorized -> load POI"
      );

      void loadPois().catch(() => {});
    }, [
      loadPois,
      resetPois,
    ]);

  /* =========================
     SESSION / AUTH EVENTS
  ========================= */

  useEffect(() => {
    /*
     * Kiểm tra ngay khi Provider mount.
     */
    syncTourAccess();

    /*
     * Khi Login / Logout.
     */
    window.addEventListener(
      "user-session-changed",
      syncTourAccess
    );

    /*
     * Khi:
     * - QR authorize thành công
     * - tour authorization bị clear
     * - session thay đổi
     */
    window.addEventListener(
      "tour-authorization-changed",
      syncTourAccess
    );

    return () => {
      window.removeEventListener(
        "user-session-changed",
        syncTourAccess
      );

      window.removeEventListener(
        "tour-authorization-changed",
        syncTourAccess
      );
    };
  }, [syncTourAccess]);

  /* =========================
     AUTHORIZED STATE
  ========================= */

  const authorized =
    authorization?.status ===
      "active" &&
    !!authorization?.sessionId;

  /* =========================
     CONTEXT VALUE
  ========================= */

  const value = useMemo(
    () => ({
      /*
       * POI data
       */
      pois,

      /*
       * API loading state
       */
      loading,

      /*
       * Error message
       */
      error,

      /*
       * Tour access
       */
      authorized,

      authorization,

      /*
       * Actions
       */
      loadPois,

      resetPois,

      /*
       * Lookup
       */
      getPoiById: (id) =>
        pois.find(
          (poi) =>
            String(poi.id) ===
            String(id)
        ),
    }),
    [
      pois,
      loading,
      error,
      authorized,
      authorization,
      loadPois,
      resetPois,
    ]
  );

  return (
    <PoiContext.Provider
      value={value}
    >
      {children}
    </PoiContext.Provider>
  );
}

/* =========================
   HOOK
========================= */

export function usePoiStore() {
  const context =
    useContext(PoiContext);

  if (!context) {
    throw new Error(
      "usePoiStore phải được dùng bên trong PoiProvider."
    );
  }

  return context;
}