import { speakText } from "../../utils/tts";
import { useMemo, useState } from "react";
import {
  Headphones,
  MapPin,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Link } from "react-router-dom";
import UserLayout from "../../components/user/UserLayout";
import { useLanguage } from "../../i18n";
import { usePoiStore } from "../../stores/PoiProvider";
import { resolveAssetUrl } from "../../services/userService";

export default function UserExplore() {
  const { language, t } = useLanguage();
  const { pois } = usePoiStore();

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");

  const list = useMemo(() => {
    const keyword = q.trim().toLowerCase();

    return pois.filter((p) => {
      const name =
        p.name?.[language] ||
        p.name?.vi ||
        "";

      const description =
        p.description?.[language] ||
        p.description?.vi ||
        "";

      const matchesSearch =
        !keyword ||
        `${name} ${description}`
          .toLowerCase()
          .includes(keyword);

      const matchesCategory =
        category === "all" ||
        p.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [pois, q, category, language]);

  function speak(text) {
    if (!text) return;

    speakText(text, language, {
      rate: 0.95,
    });
  }

  return (
    <UserLayout>
      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#e7ecef] sm:p-6">
          <p className="text-xs font-extrabold uppercase tracking-wider text-[#2196f3]">
            {t.explore}
          </p>

          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
            {t.exploreTitle}
          </h1>

          <p className="mt-2 text-sm text-[#777]">
            {t.exploreText}
          </p>

          {/* SEARCH + FILTER */}
          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
            <div className="flex items-center gap-2 rounded-xl border border-[#dfe7ea] bg-[#f5f7fa] px-4">
              <Search
                size={18}
                className="shrink-0 text-[#999]"
              />

              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full bg-transparent py-3 outline-none"
                placeholder={t.searchPlace}
              />
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-[#dfe7ea] bg-white px-3">
              <SlidersHorizontal
                size={16}
                className="shrink-0 text-[#999]"
              />

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-transparent py-3 text-sm font-bold outline-none"
              >
                <option value="all">
                  {t.all}
                </option>

                <option value="tourism">
                  {t.tourism}
                </option>

                <option value="food">
                  {t.food}
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* RESULT COUNT */}
        <div className="mt-5 flex items-center justify-between px-1">
          <p className="text-sm font-bold text-[#777]">
            {list.length} {t.places}
          </p>

          <Link
            to="/add-poi"
            className="text-sm font-extrabold text-[#2196f3]"
          >
            ＋ {t.addPoi}
          </Link>
        </div>

        {/* POI LIST */}
        {list.length > 0 ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => {
              const name =
                p.name?.[language] ||
                p.name?.vi ||
                "";

              const description =
                p.description?.[language] ||
                p.description?.vi ||
                "";

              return (
                <article
                  key={p.id}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e7ecef]"
                >
                  {/* IMAGE */}
                  <div className="h-48 bg-[#eaf7ff]">
                    {p.image ? (
                      <img
                        src={resolveAssetUrl(p.image)}
                        alt={name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <MapPin
                          className="text-[#66b9ee]"
                          size={40}
                        />
                      </div>
                    )}
                  </div>

                  {/* CONTENT */}
                  <div className="p-5">
                    <span className="inline-block rounded-full bg-[#eaf7ff] px-3 py-1 text-xs font-extrabold text-[#168dcc]">
                      {p.category === "food"
                        ? t.food
                        : t.tourism}
                    </span>

                    <h2 className="mt-3 text-xl font-extrabold">
                      {name}
                    </h2>

                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#777]">
                      {description}
                    </p>

                    {/* ACTIONS */}
                    <div className="mt-5 flex items-center justify-between gap-2">
                      <Link
                        to={`/pois/${p.id}`}
                        className="text-sm font-extrabold text-[#2196f3]"
                      >
                        {t.detail} →
                      </Link>

                      <button
                        type="button"
                        onClick={() => speak(description)}
                        disabled={!description}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#f5f7fa] px-3 py-2 text-xs font-extrabold text-[#555] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Headphones size={14} />
                        {t.listen}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-[#cdd8dd] bg-white py-16 text-center text-sm text-[#777]">
            {t.noResults}
          </div>
        )}
      </section>
    </UserLayout>
  );
}