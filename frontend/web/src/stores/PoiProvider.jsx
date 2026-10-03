import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getPois, getUserToken } from "../services/userService";

const PoiContext = createContext(null);

export function PoiProvider({ children }) {
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadedForToken, setLoadedForToken] = useState(null);

  async function loadPois(force = false) {
    const token = getUserToken();
    if (!token) return;
    if (!force && loadedForToken === token) return;
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const data = await getPois();
      setPois(data?.pois || []);
      setLoadedForToken(token);
    } catch (err) {
      setError(err?.message || "Không thể tải dữ liệu POI.");
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function resetPois() {
    setPois([]);
    setLoadedForToken(null);
    setError("");
  }

  useEffect(() => {
    const syncSession = () => {
      const token = getUserToken();
      if (!token) {
        resetPois();
        return;
      }
      loadPois().catch(() => {});
    };

    syncSession();
    window.addEventListener("user-session-changed", syncSession);
    return () => window.removeEventListener("user-session-changed", syncSession);
  }, [loadedForToken]);

  const value = useMemo(
    () => ({
      pois,
      loading,
      error,
      loadPois,
      resetPois,
      getPoiById: (id) => pois.find((poi) => String(poi.id) === String(id)),
    }),
    [pois, loading, error, loadedForToken]
  );

  return <PoiContext.Provider value={value}>{children}</PoiContext.Provider>;
}

export function usePoiStore() {
  const context = useContext(PoiContext);
  if (!context) {
    throw new Error("usePoiStore phải được dùng bên trong PoiProvider.");
  }
  return context;
}
