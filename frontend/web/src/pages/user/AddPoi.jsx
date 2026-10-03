import { useEffect, useState } from "react";
import { ArrowLeft, LocateFixed, Send } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import UserLayout from "../../components/user/UserLayout";
import { createPoi } from "../../services/userService";
import { useLanguage } from "../../i18n";

const LANGUAGES = [
  { code: "vi", label: "Tiếng Việt" },
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
  { code: "th", label: "ไทย" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "hi", label: "हिन्दी" },
];

function createLocalizedFields() {
  return Object.fromEntries(
    LANGUAGES.map(({ code }) => [code, ""])
  );
}

export default function AddPoi() {
  const { t } = useLanguage();
  const nav = useNavigate();

  const [form, setForm] = useState({
    name: createLocalizedFields(),
    description: createLocalizedFields(),

    city: "ho-chi-minh",
    category: "tourism",
    latitude: "",
    longitude: "",
    radius: "100",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);

  function setField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function setLocalizedField(type, language, value) {
    setForm((current) => ({
      ...current,
      [type]: {
        ...current[type],
        [language]: value,
      },
    }));
  }

  function locate() {
    if (!navigator.geolocation) {
      setError("Trình duyệt không hỗ trợ định vị.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setField(
          "latitude",
          position.coords.latitude.toFixed(6)
        );

        setField(
          "longitude",
          position.coords.longitude.toFixed(6)
        );

        setError("");
      },
      () => {
        setError(t.locationDenied);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }

  useEffect(() => {
    locate();
  }, []);

  async function submit(e) {
    e.preventDefault();

    setError("");
    setOk(false);

    if (
      !form.name.vi.trim() ||
      !form.description.vi.trim() ||
      !form.latitude ||
      !form.longitude
    ) {
      setError(t.required);
      return;
    }

    setLoading(true);

    try {
      await createPoi({
        name: form.name,

        description: form.description,

        city: form.city,

        category: form.category,

        latitude: Number(form.latitude),

        longitude: Number(form.longitude),

        radius: Number(form.radius),
      });

      setOk(true);

      setTimeout(() => {
        nav("/explore");
      }, 900);
    } catch (e) {
      setError(
        e.message || "Request failed."
      );
    } finally {
      setLoading(false);
    }
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

        <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#e7ecef] sm:p-8">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#2196f3]">
              POI
            </p>

            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
              {t.addPoiTitle}
            </h1>

            <p className="mt-2 text-sm text-[#777]">
              {t.addPoiText}
            </p>
          </div>

          {error && (
            <div className="mt-5 rounded-xl bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#d33]">
              {error}
            </div>
          )}

          {ok && (
            <div className="mt-5 rounded-xl bg-[#eaf8f6] px-4 py-3 text-sm font-semibold text-[#2196f3]">
              {t.poiSubmitted}
            </div>
          )}

          <form
            onSubmit={submit}
            className="mt-6 space-y-6"
          >
            {/* =========================
                NAME
            ========================== */}

            <div>
              <h2 className="text-lg font-extrabold">
                Tên địa điểm
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {LANGUAGES.map((language) => (
                  <label
                    key={language.code}
                    className="text-sm font-extrabold"
                  >
                    {language.label}

                    {language.code === "vi" && (
                      <span className="ml-1 text-[#d33]">
                        *
                      </span>
                    )}

                    <input
                      value={
                        form.name[language.code]
                      }
                      onChange={(e) =>
                        setLocalizedField(
                          "name",
                          language.code,
                          e.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-[#dfe7ea] bg-[#f5f7fa] px-4 py-3 outline-none focus:border-[#2196f3]"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* =========================
                DESCRIPTION
            ========================== */}

            <div>
              <h2 className="text-lg font-extrabold">
                Mô tả
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {LANGUAGES.map((language) => (
                  <label
                    key={language.code}
                    className="text-sm font-extrabold"
                  >
                    {language.label}

                    {language.code === "vi" && (
                      <span className="ml-1 text-[#d33]">
                        *
                      </span>
                    )}

                    <textarea
                      value={
                        form.description[
                          language.code
                        ]
                      }
                      onChange={(e) =>
                        setLocalizedField(
                          "description",
                          language.code,
                          e.target.value
                        )
                      }
                      rows="5"
                      className="mt-2 w-full rounded-xl border border-[#dfe7ea] bg-[#f5f7fa] px-4 py-3 outline-none focus:border-[#2196f3]"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* =========================
                BASIC INFO
            ========================== */}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-extrabold">
                {t.category}

                <select
                  value={form.category}
                  onChange={(e) =>
                    setField(
                      "category",
                      e.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-[#dfe7ea] bg-white px-4 py-3 outline-none"
                >
                  <option value="tourism">
                    {t.tourism}
                  </option>

                  <option value="food">
                    {t.food}
                  </option>
                </select>
              </label>

              <label className="text-sm font-extrabold">
                City

                <input
                  value={form.city}
                  onChange={(e) =>
                    setField(
                      "city",
                      e.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-[#dfe7ea] bg-[#f5f7fa] px-4 py-3 outline-none focus:border-[#2196f3]"
                />
              </label>
            </div>

            {/* =========================
                LOCATION
            ========================== */}

            <div className="rounded-2xl bg-[#f5f7fa] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold">
                    {t.location}
                  </p>

                  <p className="mt-1 text-xs text-[#777]">
                    {form.latitude &&
                    form.longitude
                      ? `${form.latitude}, ${form.longitude}`
                      : "—"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={locate}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2196f3] px-4 py-2.5 text-sm font-extrabold text-white"
                >
                  <LocateFixed size={16} />

                  {t.useMyLocation}
                </button>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <label className="text-xs font-extrabold">
                  {t.latitude}

                  <input
                    value={form.latitude}
                    onChange={(e) =>
                      setField(
                        "latitude",
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-[#dfe7ea] bg-white px-3 py-2"
                  />
                </label>

                <label className="text-xs font-extrabold">
                  {t.longitude}

                  <input
                    value={form.longitude}
                    onChange={(e) =>
                      setField(
                        "longitude",
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-[#dfe7ea] bg-white px-3 py-2"
                  />
                </label>

                <label className="text-xs font-extrabold">
                  {t.radius}

                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={form.radius}
                    onChange={(e) =>
                      setField(
                        "radius",
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-[#dfe7ea] bg-white px-3 py-2"
                  />
                </label>
              </div>
            </div>

            {/* =========================
                SUBMIT
            ========================== */}

            <button
              disabled={loading || ok}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2196f3] px-5 py-3 font-extrabold text-white disabled:opacity-60"
            >
              <Send size={17} />

              {loading
                ? t.submitting
                : t.submitPoi}
            </button>
          </form>
        </div>
      </section>
    </UserLayout>
  );
}