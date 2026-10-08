import { useMemo, useState } from "react";

import {
  ArrowRight,
  Bot,
  Headphones,
  MapPin,
  Navigation,
  PlusCircle,
  QrCode,
  Search,
} from "lucide-react";

import { Link } from "react-router-dom";

import UserLayout from "../../components/user/UserLayout";
import { useLanguage } from "../../i18n";
import { usePoiStore } from "../../stores/PoiProvider";
import { speakText } from "../../utils/tts";
import { resolveAssetUrl } from "../../services/userService";

function speak(text, language) {
  speakText(text, language, {
    rate: 0.95,
  });
}

export default function UserHome() {
  const { language, t } = useLanguage();

  const {
    pois,
    loading,
    authorized,
  } = usePoiStore();

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!authorized) {
      return [];
    }

    return pois.filter((p) =>
      (
        p.name?.[language] ||
        p.name?.vi ||
        ""
      )
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  }, [
    pois,
    query,
    language,
    authorized,
  ]);

  return (
    <UserLayout>
      {/* =========================
          HERO
      ========================= */}
      <section className="mx-auto max-w-7xl px-4 pt-7 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[28px] bg-[#2196F3] px-5 py-8 text-white shadow-sm sm:px-8 sm:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* HERO TEXT */}
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wider text-[#d8fffb]">
                {t.discover}
              </p>

              <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                {t.welcome}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
                {t.intro}
              </p>

              {!authorized ? (
                <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/90">
                  Tham gia tour bằng mã QR để mở dữ liệu địa điểm,
                  bản đồ, GPS, thuyết minh và AI Tour Guide.
                </p>
              ) : null}
            </div>

            {/* HERO ACTIONS */}
            <div className="flex flex-wrap gap-2">
              {authorized ? (
                <Link
                  to="/map"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-[#2196F3]"
                >
                  <Navigation size={17} />
                  {t.openMap}
                </Link>
              ) : (
                <Link
                  to="/scan-qr"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-[#2196F3]"
                >
                  <QrCode size={17} />
                  Tham gia tour
                </Link>
              )}

              <Link
                to="/add-poi"
                className="inline-flex items-center gap-2 rounded-xl bg-[#2196F3] px-4 py-3 text-sm font-extrabold text-white ring-1 ring-white/30"
              >
                <PlusCircle size={17} />
                {t.addPoi}
              </Link>

              {authorized ? (
                <Link
                  to="/chat"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-4 py-3 text-sm font-extrabold text-white"
                >
                  <Bot size={17} />
                  {t.askAI}
                </Link>
              ) : null}
            </div>
          </div>

          {/* SEARCH */}
          <div className="mt-7 flex items-center gap-3 rounded-2xl bg-white/12 px-4 ring-1 ring-white/20">
            <Search size={19} />

            <input
              value={query}
              onChange={(e) =>
                setQuery(e.target.value)
              }
              disabled={!authorized}
              className="w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-white/70 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder={
                authorized
                  ? t.searchPlace
                  : "Tham gia tour để tìm địa điểm..."
              }
            />
          </div>
        </div>
      </section>

      {/* =========================
          TOUR ACCESS
      ========================= */}
      {!authorized ? (
        <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-[#e7ecef]">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#168dcc]">
                  TOUR ACCESS
                </p>

                <h2 className="mt-1 text-2xl font-extrabold">
                  Dữ liệu tour chưa được mở
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#777]">
                  Bạn đã đăng nhập nhưng chưa tham gia
                  một tour. Hãy quét mã QR của tour để
                  xác định session. Nếu tour yêu cầu
                  thanh toán, hệ thống sẽ chuyển sang
                  bước thanh toán trước khi cấp quyền.
                </p>
              </div>

              <Link
                to="/scan-qr"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2196F3] px-5 py-3 text-sm font-extrabold text-white"
              >
                <QrCode size={17} />
                Tham gia tour
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* =========================
              POI LIST
          ========================= */}
          <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#999]">
                  POI
                </p>

                <h2 className="mt-1 text-2xl font-extrabold">
                  {t.nearby}
                </h2>
              </div>

              <Link
                to="/explore"
                className="text-sm font-extrabold text-[#2196F3]"
              >
                {t.seeAll}
              </Link>
            </div>

            {loading ? (
              <div className="rounded-2xl bg-white p-12 text-center text-sm text-[#777] shadow-sm">
                {t.loading}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-[#e7ecef]">
                <div className="flex justify-center">
                  <Search
                    size={38}
                    className="text-[#2196F3]"
                  />
                </div>

                <h3 className="mt-4 text-lg font-extrabold">
                  {t.noResults}
                </h3>

                <p className="mt-2 text-sm text-[#777]">
                  Thử tìm kiếm bằng tên địa điểm khác.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered
                  .slice(0, 6)
                  .map((p) => (
                    <article
                      key={p.id}
                      className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e7ecef]"
                    >
                      {/* IMAGE */}
                      <div className="h-44 bg-[#eaf7ff]">
                        {p.image ? (
                          <img
                            src={resolveAssetUrl(
                              p.image
                            )}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <MapPin
                              size={42}
                              className="text-[#2196F3]"
                            />
                          </div>
                        )}
                      </div>

                      {/* CONTENT */}
                      <div className="p-5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="rounded-full bg-[#eaf7ff] px-3 py-1 text-xs font-extrabold text-[#168dcc]">
                            {p.category ===
                            "food"
                              ? t.food
                              : t.tourism}
                          </span>

                          <span className="text-xs text-[#999]">
                            {p.city ===
                            "ho-chi-minh"
                              ? t.cityHcm
                              : p.city}
                          </span>
                        </div>

                        <h3 className="mt-3 text-lg font-extrabold">
                          {p.name?.[
                            language
                          ] ||
                            p.name?.vi}
                        </h3>

                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#777]">
                          {p.description?.[
                            language
                          ] ||
                            p.description?.vi}
                        </p>

                        {/* ACTIONS */}
                        <div className="mt-4 flex items-center justify-between gap-2">
                          <Link
                            to={`/pois/${p.id}`}
                            className="inline-flex items-center gap-1 text-sm font-extrabold text-[#2196F3]"
                          >
                            {t.detail}

                            <ArrowRight
                              size={15}
                            />
                          </Link>

                          <button
                            type="button"
                            onClick={() =>
                              speak(
                                p.description?.[
                                  language
                                ] ||
                                  p.description?.vi ||
                                  "",
                                language
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#f5f7fa] px-3 py-2 text-xs font-extrabold text-[#555]"
                          >
                            <Headphones
                              size={14}
                            />

                            {t.listen}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* =========================
          FEATURE CARDS
      ========================= */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [
              MapPin,
              t.mapFeature,
              t.mapFeatureText,
            ],
            [
              Headphones,
              t.narration,
              t.narrationText,
            ],
            [
              Bot,
              t.aiFeature,
              t.aiFeatureText,
            ],
          ].map(
            ([Icon, title, text]) => (
              <div
                key={title}
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#e7ecef]"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf7ff] text-[#168dcc]">
                  <Icon size={20} />
                </div>

                <h3 className="font-extrabold">
                  {title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#777]">
                  {text}
                </p>
              </div>
            )
          )}
        </div>
      </section>
    </UserLayout>
  );
}