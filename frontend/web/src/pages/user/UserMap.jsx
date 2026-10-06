import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ExternalLink,
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  ChevronRight,
} from "lucide-react";

import { useSearchParams } from "react-router-dom";

import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";

import UserLayout from "../../components/user/UserLayout";
import { usePoiStore } from "../../stores/PoiProvider";
import { useLanguage } from "../../i18n";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || "";

if (MAPTILER_KEY) {
  maptilersdk.config.apiKey = MAPTILER_KEY;
}

/* =========================================================
   DISTANCE
========================================================= */

function distanceMeters(a, b) {
  if (!a || !b) return null;

  const latitude = Number(b.latitude);
  const longitude = Number(b.longitude);

  if (
    !Number.isFinite(a.lat) ||
    !Number.isFinite(a.lng) ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  const R = 6371000;
  const d = Math.PI / 180;

  const lat1 = a.lat * d;
  const lat2 = latitude * d;

  const dLat = (latitude - a.lat) * d;
  const dLng = (longitude - a.lng) * d;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) ** 2;

  return (
    R *
    2 *
    Math.atan2(
      Math.sqrt(x),
      Math.sqrt(1 - x)
    )
  );
}

function formatDistance(m) {
  if (m == null) return "";

  if (m < 1000) {
    return `${Math.round(m)} m`;
  }

  return `${(m / 1000).toFixed(1)} km`;
}

/* =========================================================
   GOOGLE DIRECTIONS
   Giữ lại Google Maps chỉ để mở chỉ đường.
========================================================= */

function googleDirectionsUrl(origin, routePois) {
  if (!origin || !routePois.length) {
    return "";
  }

  const destination =
    routePois[routePois.length - 1];

  const waypoints = routePois
    .slice(0, -1)
    .map(
      (poi) =>
        `${Number(poi.latitude)},${Number(
          poi.longitude
        )}`
    )
    .join("|");

  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${Number(
      destination.latitude
    )},${Number(destination.longitude)}`,
    travelmode: "walking",
  });

  if (waypoints) {
    params.set("waypoints", waypoints);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/* =========================================================
   RECOMMENDED ROUTE
========================================================= */

function buildRecommendedRoute(
  pois,
  location,
  count
) {
  if (!location || !pois.length || count <= 0) {
    return [];
  }

  const candidates = pois
    .map((poi) => ({
      poi,
      distance: distanceMeters(location, poi),
    }))
    .filter(
      (item) => item.distance != null
    );

  if (!candidates.length) {
    return [];
  }

  const route = [];
  const remaining = [...candidates];

  let current = location;

  while (
    route.length < count &&
    remaining.length > 0
  ) {
    let nearestIndex = 0;
    let nearestDistance =
      Number.MAX_SAFE_INTEGER;

    for (
      let index = 0;
      index < remaining.length;
      index += 1
    ) {
      const candidate = remaining[index];

      const distance = distanceMeters(
        current,
        candidate.poi
      );

      if (
        distance != null &&
        distance < nearestDistance
      ) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    const [selected] =
      remaining.splice(nearestIndex, 1);

    route.push({
      ...selected,
      routeDistance: nearestDistance,
    });

    current = {
      lat: Number(selected.poi.latitude),
      lng: Number(selected.poi.longitude),
    };
  }

  return route;
}

/* =========================================================
   MAPTILER MAP
========================================================= */

function MapTilerView({
  center,
  location,
  pois,
  selectedId,
  recommendedRoute,
  focusLocationKey,
  onSelectPoi,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  const userMarkerRef = useRef(null);
  const userAccuracyRef = useRef(null);

  const poiMarkersRef = useRef([]);
  const routeSourceAddedRef = useRef(false);

  /*
   * Khởi tạo MapTiler
   */
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!MAPTILER_KEY) {
      return;
    }

    const initialCenter = center
      ? [center.lng, center.lat]
      : [106.6297, 10.8231];

    const map = new maptilersdk.Map({
      container: mapContainerRef.current,
      style: maptilersdk.MapStyle.STREETS,
      center: initialCenter,
      zoom: center ? 15 : 12,
      navigationControl: true,
      geolocateControl: false,
    });

    mapRef.current = map;

    const handleMapError = (event) => {
      console.error("[MapTiler] map error:", event?.error || event);
    };

    const handleMapLoad = () => {
      console.info("[MapTiler] map loaded successfully");
      map.resize();
    };

    map.on("error", handleMapError);
    map.on("load", handleMapLoad);

    return () => {
      map.off("error", handleMapError);
      map.off("load", handleMapLoad);
      poiMarkersRef.current.forEach(
        (marker) => marker.remove()
      );

      poiMarkersRef.current = [];

      userMarkerRef.current?.remove();
      userAccuracyRef.current?.remove();

      map.remove();
      mapRef.current = null;
    };
  }, []);

  /* =======================================================
     GPS USER MARKER
  ======================================================= */

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !location) {
      return;
    }

    const lat = Number(location.lat);
    const lng = Number(location.lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return;
    }

    /*
     * Marker GPS
     */
    const userElement =
      document.createElement("div");

    userElement.style.width = "22px";
    userElement.style.height = "22px";
    userElement.style.borderRadius = "50%";
    userElement.style.background = "#2196F3";
    userElement.style.border = "4px solid white";
    userElement.style.boxShadow =
      "0 2px 8px rgba(0,0,0,.35)";
    userElement.style.cursor = "pointer";

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    userMarkerRef.current =
      new maptilersdk.Marker({
        element: userElement,
        anchor: "center",
      })
        .setLngLat([lng, lat])
        .addTo(map);

    /*
     * Accuracy circle
     *
     * Đây là vòng tròn hiển thị trực quan
     * quanh vị trí GPS.
     */
    if (userAccuracyRef.current) {
      userAccuracyRef.current.remove();
    }

    const accuracy =
      Number(location.accuracy) || 30;

    const accuracyElement =
      document.createElement("div");

    const diameter = Math.max(
      40,
      Math.min(140, accuracy * 1.5)
    );

    accuracyElement.style.width =
      `${diameter}px`;

    accuracyElement.style.height =
      `${diameter}px`;

    accuracyElement.style.borderRadius =
      "50%";

    accuracyElement.style.background =
      "rgba(33,150,243,0.15)";

    accuracyElement.style.border =
      "2px solid rgba(33,150,243,0.35)";

    accuracyElement.style.pointerEvents =
      "none";

    userAccuracyRef.current =
      new maptilersdk.Marker({
        element: accuracyElement,
        anchor: "center",
      })
        .setLngLat([lng, lat])
        .addTo(map);
  }, [location]);

  /* =======================================================
     KHI BẤM "VỊ TRÍ CỦA TÔI"
     MAP FLY VỀ GPS
  ======================================================= */

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !location) {
      return;
    }

    const lat = Number(location.lat);
    const lng = Number(location.lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return;
    }

    map.flyTo({
      center: [lng, lat],
      zoom: 17,
      speed: 1.2,
      curve: 1.2,
      essential: true,
    });
  }, [location, focusLocationKey]);

  /* =======================================================
     POI MARKERS
  ======================================================= */

  useEffect(() => {
    const map = mapRef.current;

    if (!map) return;

    /*
     * Xóa marker cũ
     */
    poiMarkersRef.current.forEach(
      (marker) => marker.remove()
    );

    poiMarkersRef.current = [];

    pois.forEach((poi) => {
      const lat = Number(poi.latitude);
      const lng = Number(poi.longitude);

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        return;
      }

      const element =
        document.createElement("div");

      element.style.width = "32px";
      element.style.height = "32px";
      element.style.borderRadius = "50%";
      element.style.background =
        String(poi.id) === String(selectedId)
          ? "#1976D2"
          : "#F44336";

      element.style.border =
        "3px solid white";

      element.style.boxShadow =
        "0 2px 7px rgba(0,0,0,.3)";

      element.style.cursor = "pointer";

      element.title =
        poi.name?.vi ||
        poi.name?.en ||
        "POI";

      element.addEventListener(
        "click",
        () => {
          onSelectPoi(poi.id);
        }
      );

      const marker =
        new maptilersdk.Marker({
          element,
          anchor: "center",
        })
          .setLngLat([lng, lat])
          .addTo(map);

      poiMarkersRef.current.push(marker);
    });

    return () => {
      poiMarkersRef.current.forEach(
        (marker) => marker.remove()
      );

      poiMarkersRef.current = [];
    };
  }, [pois, selectedId, onSelectPoi]);

  /* =======================================================
     ROUTE LINE
  ======================================================= */

  useEffect(() => {
    const map = mapRef.current;

    if (!map) return;

    const coordinates = [];

    if (location) {
      coordinates.push([
        Number(location.lng),
        Number(location.lat),
      ]);
    }

    recommendedRoute.forEach((item) => {
      coordinates.push([
        Number(item.poi.longitude),
        Number(item.poi.latitude),
      ]);
    });

    /*
     * Chưa đủ điểm để vẽ route
     */
    if (coordinates.length < 2) {
      if (
        routeSourceAddedRef.current &&
        map.getLayer("recommended-route")
      ) {
        map.removeLayer("recommended-route");
      }

      if (
        routeSourceAddedRef.current &&
        map.getSource("recommended-route-source")
      ) {
        map.removeSource(
          "recommended-route-source"
        );
      }

      routeSourceAddedRef.current = false;

      return;
    }

    const geojson = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates,
      },
    };

    /*
     * Nếu source đã tồn tại
     */
    const source = map.getSource(
      "recommended-route-source"
    );

    if (source) {
      source.setData(geojson);
      return;
    }

    /*
     * Map style phải loaded trước
     */
    const addRoute = () => {
      if (
        map.getSource(
          "recommended-route-source"
        )
      ) {
        return;
      }

      map.addSource(
        "recommended-route-source",
        {
          type: "geojson",
          data: geojson,
        }
      );

      map.addLayer({
        id: "recommended-route",
        type: "line",
        source: "recommended-route-source",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#2196F3",
          "line-width": 5,
          "line-opacity": 0.85,
        },
      });

      routeSourceAddedRef.current = true;
    };

    if (map.isStyleLoaded()) {
      addRoute();
    } else {
      map.once("load", addRoute);
    }
  }, [
    location,
    recommendedRoute,
  ]);

  /* =======================================================
     FALLBACK
  ======================================================= */

  if (!MAPTILER_KEY) {
    return (
      <div
        ref={mapContainerRef}
        className="flex h-full w-full items-center justify-center bg-slate-100"
      >
        <div className="rounded-xl bg-white p-5 text-center shadow-sm">
          <p className="font-bold text-red-500">
            Chưa cấu hình MapTiler API Key
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Kiểm tra VITE_MAPTILER_KEY trong
            Vercel → Settings → Environment Variables.
            Sau khi thay đổi biến, phải redeploy frontend.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className="h-full w-full"
    />
  );
}

/* =========================================================
   USER MAP
========================================================= */

export default function UserMap() {
  const { t, language } = useLanguage();

  const {
    pois,
    loading,
    error,
  } = usePoiStore();

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const [
    location,
    setLocation,
  ] = useState(null);

  const [
    locationError,
    setLocationError,
  ] = useState("");

  const [
    loadingLocation,
    setLoadingLocation,
  ] = useState(false);

  const [
    focusLocationKey,
    setFocusLocationKey,
  ] = useState(0);

  const [
    routeCount,
    setRouteCount,
  ] = useState(5);

  const [
    showRoute,
    setShowRoute,
  ] = useState(false);

  const selectedId =
    searchParams.get("poi");

  const selected = useMemo(
    () =>
      pois.find(
        (poi) =>
          String(poi.id) ===
          String(selectedId)
      ) || null,
    [pois, selectedId]
  );

  /* =======================================================
     GPS
  ======================================================= */

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(
        "Trình duyệt không hỗ trợ GPS."
      );
      return;
    }

    setLoadingLocation(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const {
          latitude,
          longitude,
          accuracy,
        } = position.coords;

        const nextLocation = {
          lat: latitude,
          lng: longitude,
          accuracy,
        };

        setLocation(nextLocation);

        /*
         * Tăng key để MapTiler chắc chắn
         * flyTo lại GPS kể cả khi tọa độ
         * gần như không thay đổi.
         */
        setFocusLocationKey(
          (value) => value + 1
        );

        setLoadingLocation(false);
      },

      (err) => {
        setLoadingLocation(false);

        setLocationError(
          err.code === 1
            ? t.locationDenied
            : "Không thể xác định vị trí hiện tại."
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, [t.locationDenied]);

  /*
   * Tự lấy GPS khi mở trang
   */
  useEffect(() => {
    locate();
  }, [locate]);

  /* =======================================================
     MAP CENTER
  ======================================================= */

  const center = selected
    ? {
        lat: Number(selected.latitude),
        lng: Number(selected.longitude),
      }
    : location ||
      (pois[0]
        ? {
            lat: Number(pois[0].latitude),
            lng: Number(pois[0].longitude),
          }
        : null);

  /* =======================================================
     SORT POI
  ======================================================= */

  const sortedPois = useMemo(() => {
    return [...pois].sort((a, b) => {
      const da =
        distanceMeters(location, a) ??
        Number.MAX_SAFE_INTEGER;

      const db =
        distanceMeters(location, b) ??
        Number.MAX_SAFE_INTEGER;

      return da - db;
    });
  }, [pois, location]);

  /* =======================================================
     RECOMMENDED ROUTE
  ======================================================= */

  const recommendedRoute = useMemo(() => {
    if (!showRoute) {
      return [];
    }

    return buildRecommendedRoute(
      pois,
      location,
      routeCount
    );
  }, [
    pois,
    location,
    routeCount,
    showRoute,
  ]);

  /* =======================================================
     TOTAL ROUTE DISTANCE
  ======================================================= */

  const totalRouteDistance = useMemo(() => {
    if (!recommendedRoute.length) {
      return 0;
    }

    let total = 0;
    let previous = location;

    for (const item of recommendedRoute) {
      const current = {
        lat: Number(item.poi.latitude),
        lng: Number(item.poi.longitude),
      };

      const distance = distanceMeters(
        previous,
        {
          latitude: current.lat,
          longitude: current.lng,
        }
      );

      if (distance != null) {
        total += distance;
      }

      previous = current;
    }

    return total;
  }, [
    recommendedRoute,
    location,
  ]);

  /* =======================================================
     GOOGLE DIRECTIONS
  ======================================================= */

  const directionsUrl =
    googleDirectionsUrl(
      location,
      recommendedRoute.map(
        (item) => item.poi
      )
    );

  /* =======================================================
     SELECT POI
  ======================================================= */

  const handleSelectPoi = useCallback(
    (id) => {
      setSearchParams({
        poi: String(id),
      });
    },
    [setSearchParams]
  );

  /* =======================================================
     UI
  ======================================================= */

  return (
    <UserLayout>
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#e7ecef] sm:p-6">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#2196F3]">
                {t.map}
              </p>

              <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
                {t.mapTitle}
              </h1>

              <p className="mt-2 text-sm text-[#777]">
                {t.mapText}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">

              {/* GPS */}
              <button
                onClick={locate}
                disabled={loadingLocation}
                className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#2196F3] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#1976D2] disabled:opacity-60"
              >
                <LocateFixed size={17} />

                {loadingLocation
                   ? t.locating
                    : t.myLocation}
              </button>

              {/* ROUTE */}
              <button
                onClick={() =>
                  setShowRoute(true)
                }
                disabled={
                  !location ||
                  !pois.length
                }
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#dfe7ea] bg-white px-4 py-3 text-sm font-extrabold text-[#333] hover:bg-[#f5f7fa] disabled:opacity-50"
              >
                <Route size={17} />

                {t.suggestRoute}
              </button>

            </div>
          </div>

          {/* STATUS */}
          <div className="mt-4 flex flex-wrap gap-2">

            {location && (
              <>
                <span className="rounded-full bg-[#eaf7ff] px-3 py-1.5 text-xs font-bold text-[#168dcc]">
                  Latitude:{" "}
                  {location.lat.toFixed(6)}
                </span>

                <span className="rounded-full bg-[#eaf7ff] px-3 py-1.5 text-xs font-bold text-[#168dcc]">
                  Longitude:{" "}
                  {location.lng.toFixed(6)}
                </span>

                {location.accuracy && (
                  <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-600">
                    GPS ±{" "}
                    {Math.round(
                      location.accuracy
                    )}
                    m
                  </span>
                )}
              </>
            )}

            {locationError && (
              <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">
                {locationError}
              </span>
            )}

            {error && (
              <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">
                {error}
              </span>
            )}

            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
              {pois.length} POI
            </span>

          </div>
        </div>

        {/* ROUTE PANEL */}
        {showRoute && (
          <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#e7ecef]">

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

              <div>
                <div className="flex items-center gap-2">
                  <Route
                    size={18}
                    className="text-[#2196F3]"
                  />

                  <h2 className="font-extrabold">
                    {t.suggestRoute}
                  </h2>
                </div>

                <p className="mt-1 text-sm text-[#777]">
                  {t.recommendedRoute}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={routeCount}
                  onChange={(e) =>
                    setRouteCount(
                      Number(e.target.value)
                    )
                  }
                  className="rounded-xl border border-[#dfe7ea] px-3 py-2 text-sm font-bold outline-none"
                >
                  <option value={3}>
                    3 POI
                  </option>

                  <option value={5}>
                    5 POI
                  </option>

                  <option value={7}>
                    7 POI
                  </option>

                  <option value={10}>
                    10 POI
                  </option>
                </select>
              </div>

            </div>

            {recommendedRoute.length > 0 ? (
              <>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">

                  {recommendedRoute.map(
                    (item, index) => {
                      const poi = item.poi;

                      return (
                        <button
                          key={poi.id}
                          onClick={() =>
                            setSearchParams({
                              poi: String(
                                poi.id
                              ),
                            })
                          }
                          className="group flex items-center gap-3 rounded-xl border border-[#e7ecef] p-3 text-left hover:border-[#2196F3] hover:bg-[#f8fcff]"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eaf7ff] text-sm font-extrabold text-[#2196F3]">
                            {index + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-extrabold">
                              {poi.name?.[
                                language
                              ] ||
                                poi.name?.vi ||
                                poi.name?.en}
                            </p>

                            <p className="mt-1 text-xs text-[#777]">
                              {index === 0
                                ? formatDistance(
                                    item.routeDistance
                                  )
                                : `{t.next} · ${formatDistance(
                                    item.routeDistance
                                  )}`}
                            </p>
                          </div>

                          <ChevronRight
                            size={18}
                            className="shrink-0 text-[#aaa] transition group-hover:text-[#2196F3]"
                          />
                        </button>
                      );
                    }
                  )}

                </div>

                <div className="mt-4 text-sm text-[#666]">
                  {t.estimatedTotalDistance}:{" "}
                  <strong>
                    {formatDistance(
                      totalRouteDistance
                    )}
                  </strong>
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">

                  {directionsUrl && (
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2196F3] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#1976D2]"
                    >
                      <Navigation size={17} />

                      {t.openDirections}
                    </a>
                  )}

                  <button
                    onClick={() =>
                      setShowRoute(false)
                    }
                    className="rounded-xl border border-[#dfe7ea] px-4 py-3 text-sm font-extrabold text-[#666] hover:bg-[#f5f7fa]"
                  >
                    {t.closeRoute}
                  </button>

                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl bg-[#f5f7fa] p-5 text-center text-sm text-[#777]">
                {!location
                  ? "Chưa xác định được vị trí hiện tại."
                  : "Chưa có đủ dữ liệu POI để tạo tuyến."}
              </div>
            )}

          </div>
        )}

        {/* MAP + POI LIST */}
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.7fr_.8fr]">

          {/* MAP */}
          <div className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-[#e7ecef]">

            <div className="flex items-center justify-between border-b border-[#e7ecef] px-5 py-4">

              <div className="flex items-center gap-2 text-sm font-extrabold">
                <MapPin
                  size={17}
                  className="text-[#2196F3]"
                />

                {t.currentLocation}
              </div>

              {center && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${center.lat},${center.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-[#2196F3]"
                >
                  <ExternalLink size={14} />

                  {t.openMap}
                </a>
              )}

            </div>

            {/* MAPTILER */}
            <div className="relative h-[520px] w-full bg-[#eaf7ff]">

              {center ? (
                <MapTilerView
                  center={center}
                  location={location}
                  pois={pois}
                  selectedId={selectedId}
                  recommendedRoute={
                    recommendedRoute
                  }
                  focusLocationKey={
                    focusLocationKey
                  }
                  onSelectPoi={
                    handleSelectPoi
                  }
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#777]">
                  {loading
                    ? t.loading
                    : "Chưa có dữ liệu bản đồ."}
                </div>
              )}

              {/* FLOATING GPS BUTTON */}
              <button
                onClick={locate}
                disabled={loadingLocation}
                title={t.myLocation}
                className="absolute bottom-5 right-5 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#2196F3] shadow-lg ring-1 ring-black/10 hover:bg-[#f8fcff] disabled:opacity-60"
              >
                <LocateFixed
                  size={21}
                />
              </button>

            </div>
          </div>

          {/* POI LIST */}
          <aside className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-[#e7ecef] sm:p-5">

            <div className="flex items-center justify-between">

              <h2 className="font-extrabold">
                {t.selectPoi}
              </h2>

              <span className="rounded-full bg-[#eaf7ff] px-3 py-1 text-xs font-extrabold text-[#168dcc]">
                {pois.length} {t.poiCount}
              </span>

            </div>

            <div className="mt-4 space-y-2">

              {sortedPois.map((poi) => {
                const active =
                  String(poi.id) ===
                  String(selectedId);

                const distance =
                  distanceMeters(
                    location,
                    poi
                  );

                return (
                  <button
                    key={poi.id}
                    onClick={() =>
                      setSearchParams({
                        poi: String(poi.id),
                      })
                    }
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      active
                        ? "border-[#2196F3] bg-[#eaf7ff]"
                        : "border-[#e7ecef] bg-white hover:bg-[#f5f7fa]"
                    }`}
                  >
                    <div className="flex items-start gap-3">

                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eaf7ff] text-[#2196F3]">
                        <MapPin size={17} />
                      </div>

                      <div className="min-w-0 flex-1">

                        <p className="truncate text-sm font-extrabold">
                          {poi.name?.[
                            language
                          ] ||
                            poi.name?.vi ||
                            poi.name?.en}
                        </p>

                        <p className="mt-1 text-xs text-[#777]">

                          {distance == null
                            ? ""
                            : formatDistance(
                                distance
                              )}

                          {distance != null &&
                          Number(poi.radius)
                            ? ` · ${poi.radius} m`
                            : ""}

                        </p>

                      </div>
                    </div>
                  </button>
                );
              })}

              {!sortedPois.length && (
                <div className="rounded-xl bg-[#f5f7fa] p-6 text-center text-sm text-[#777]">

                  <RefreshCw
                    className="mx-auto mb-2"
                    size={20}
                  />

                  {t.noResults}
                </div>
              )}

            </div>

            {/* SELECTED POI */}
            {selected && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selected.latitude},${selected.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#2196F3] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#1976D2]"
              >
                <Navigation size={17} />

                {t.viewMap}
              </a>
            )}

          </aside>

        </div>
      </section>
    </UserLayout>
  );
}