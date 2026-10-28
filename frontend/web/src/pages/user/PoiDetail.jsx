import { useEffect } from "react";
import {
  ArrowLeft,
  Headphones,
  MapPin,
  Navigation,
  Square,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import UserLayout from "../../components/user/UserLayout";
import { useLanguage } from "../../i18n";
import { usePoiStore } from "../../stores/PoiProvider";

import {
  hasPoiAudio,
  playPoiNarration,
  stopNarration,
  useNarratingPoiId,
} from "../../services/narrationService";

import { resolveAssetUrl } from "../../services/userService";

export default function PoiDetail() {
  const { id } = useParams();

  const { language, t } = useLanguage();
  const { getPoiById } = usePoiStore();

  const poi = getPoiById(id);

  const speaking =
    useNarratingPoiId() === Number(id);

  const hasAudio =
    hasPoiAudio(poi, language);

  const name =
    poi?.name?.[language] ||
    poi?.name?.vi ||
    poi?.name?.en ||
    "";

  const desc =
    poi?.description?.[language] ||
    poi?.description?.vi ||
    poi?.description?.en ||
    "";

  /*
   * Mở trang POI thì đọc thuyết minh (audio pipeline),
   * rời trang hoặc đổi ngôn ngữ thì dừng.
   */
  useEffect(() => {
    if (!poi) {
      return undefined;
    }

    const timer = setTimeout(() => {
      playPoiNarration(poi, language);
    }, 700);

    return () => {
      clearTimeout(timer);
      stopNarration();
    };
    // Chỉ chạy lại khi đổi POI hoặc ngôn ngữ, không phải mỗi lần store cập nhật.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, language, Boolean(poi)]);

  function speak() {
    playPoiNarration(poi, language);
  }

  function stop() {
    stopNarration();
  }

  if (!poi) {
    return (
      <UserLayout>
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-[#e7ecef]">
            <MapPin
              size={40}
              className="mx-auto text-[#66b9ee]"
            />

            <p className="mt-4 text-sm font-semibold text-[#777]">
              {t.loading}
            </p>

            <Link
              to="/explore"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2196f3] px-4 py-3 text-sm font-extrabold text-white"
            >
              <ArrowLeft size={16} />
              {t.back}
            </Link>
          </div>
        </section>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <section className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-8">
        <Link
          to="/explore"
          className="mb-4 inline-flex items-center gap-2 text-sm font-extrabold text-[#2196f3]"
        >
          <ArrowLeft size={17} />
          {t.back}
        </Link>

        <article className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-[#e7ecef]">
          {/* IMAGE */}
          <div className="h-64 bg-[#eaf7ff] sm:h-[390px]">
            {poi.image ? (
              <img
                src={resolveAssetUrl(poi.image)}
                alt={name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <MapPin
                  size={58}
                  className="text-[#66b9ee]"
                />
              </div>
            )}
          </div>

          {/* CONTENT */}
          <div className="p-5 sm:p-8">
            <span className="inline-block rounded-full bg-[#eaf7ff] px-3 py-1 text-xs font-extrabold text-[#168dcc]">
              {poi.category === "food"
                ? t.food
                : t.tourism}
            </span>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
              {name}
            </h1>

            <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#777]">
              <MapPin
                size={16}
                className="text-[#2196f3]"
              />

              {poi.city === "ho-chi-minh"
                ? t.cityHcm
                : poi.city}
            </p>

            {/* DESCRIPTION */}
            <div className="mt-7 rounded-2xl bg-[#f5f7fa] p-5">
              <h2 className="text-sm font-extrabold text-[#555]">
                {t.narrationTitle}
              </h2>

              <p className="mt-3 text-[15px] leading-7 text-[#555]">
                {desc || "—"}
              </p>
            </div>

            {/* ACTIONS */}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={
                  speaking ? stop : speak
                }
                disabled={!hasAudio}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2196f3] px-5 py-3 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {speaking ? (
                  <Square size={17} />
                ) : (
                  <Headphones size={17} />
                )}

                {speaking
                  ? t.stop
                  : t.listenNarration}
              </button>

              <Link
                to={`/map?poi=${poi.id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-[#dfe7ea] px-5 py-3 font-extrabold text-[#2196f3]"
              >
                <Navigation size={17} />
                {t.viewMap}
              </Link>
            </div>

            {/* LOCATION INFO */}
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                [t.latitude, poi.latitude],
                [t.longitude, poi.longitude],
                [
                  t.radius,
                  poi.radius != null
                    ? `${poi.radius} m`
                    : "—",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl bg-[#f5f7fa] p-4"
                >
                  <p className="text-xs text-[#999]">
                    {label}
                  </p>

                  <p className="mt-1 break-all font-extrabold">
                    {value ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>
    </UserLayout>
  );
}