import { useEffect, useMemo, useState } from "react";
import {
  UserRound,
  LogOut,
  PlusCircle,
  MapPin,
  Clock3,
  ChevronRight,
  History,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import UserLayout from "../../components/user/UserLayout";
import {
  clearUserSession,
  getMyCheckins,
  getStoredUser,
  resolveAssetUrl,
} from "../../services/userService";
import { useLanguage } from "../../i18n";

export default function UserProfile() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const user = getStoredUser();

  const [checkins, setCheckins] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");

  function logout() {
    clearUserSession();
    navigate("/login", { replace: true });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoadingHistory(true);
      setHistoryError("");

      try {
        const response = await getMyCheckins(50);

        if (!cancelled) {
          setCheckins(response?.checkins || []);
        }
      } catch (error) {
        if (!cancelled) {
          setHistoryError(
            error?.message || "Không thể tải lịch sử check-in."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingHistory(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  const getPoiName = (item) => {
    return (
      item?.[`name_${language}`] ||
      item?.name_vi ||
      item?.name_en ||
      item?.name_zh ||
      "POI"
    );
  };

  const formatDate = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(
      language === "vi"
        ? "vi-VN"
        : language === "zh"
        ? "zh-CN"
        : language === "ja"
        ? "ja-JP"
        : language === "ko"
        ? "ko-KR"
        : "en-US",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(date);
  };

  const totalCheckins = useMemo(
    () => checkins.length,
    [checkins]
  );

  return (
    <UserLayout>
      <section className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-8">
        {/* PROFILE */}
        <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#e7ecef] sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#eaf7ff] text-[#168dcc]">
                <UserRound size={30} />
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold">
                  {t.profileTitle}
                </h1>

                <p className="mt-1 truncate text-sm text-[#777]">
                  {user?.email || ""}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#eaf7ff] px-4 py-3">
              <p className="text-xs font-bold text-[#168dcc]">
                Check-in
              </p>

              <p className="mt-1 text-2xl font-extrabold text-[#168dcc]">
                {totalCheckins}
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#f5f7fa] p-4">
              <p className="text-xs text-[#999]">
                Name
              </p>

              <p className="mt-1 font-extrabold">
                {user?.name || t.user}
              </p>
            </div>

            <div className="rounded-2xl bg-[#f5f7fa] p-4">
              <p className="text-xs text-[#999]">
                {t.role}
              </p>

              <p className="mt-1 font-extrabold">
                {user?.role || "user"}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/add-poi"
              className="inline-flex items-center gap-2 rounded-xl bg-[#2196F3] px-4 py-3 font-extrabold text-white transition hover:bg-[#1976D2]"
            >
              <PlusCircle size={17} />
              {t.addPoi}
            </Link>

            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-xl bg-[#fff1f1] px-4 py-3 font-extrabold text-[#d33] transition hover:bg-[#ffe2e2]"
            >
              <LogOut size={17} />
              {t.logout}
            </button>
          </div>
        </div>

        {/* HISTORY */}
        <div className="mt-6 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#e7ecef] sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <History
                  size={21}
                  className="text-[#2196F3]"
                />

                <h2 className="text-xl font-extrabold">
                  Lịch sử địa điểm đã ghé
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Những địa điểm bạn đã check-in.
              </p>
            </div>

            <span className="rounded-full bg-[#eaf7ff] px-3 py-1 text-xs font-extrabold text-[#168dcc]">
              {totalCheckins}
            </span>
          </div>

          {/* LOADING */}
          {loadingHistory && (
            <div className="mt-6 rounded-2xl bg-[#f5f7fa] p-6 text-center text-sm font-bold text-slate-500">
              Đang tải lịch sử...
            </div>
          )}

          {/* ERROR */}
          {!loadingHistory && historyError && (
            <div className="mt-6 rounded-2xl bg-[#fff5f5] p-5 text-sm font-bold text-red-600">
              {historyError}
            </div>
          )}

          {/* EMPTY */}
          {!loadingHistory &&
            !historyError &&
            checkins.length === 0 && (
              <div className="mt-6 rounded-2xl border border-dashed border-[#dfe7ea] bg-[#f8fafc] p-10 text-center">
                <MapPin
                  size={32}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 font-extrabold text-slate-600">
                  Chưa có địa điểm nào
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Khi bạn đi vào vùng Geofence của POI,
                  hệ thống sẽ tự động ghi nhận check-in.
                </p>
              </div>
            )}

          {/* LIST */}
          {!loadingHistory &&
            !historyError &&
            checkins.length > 0 && (
              <div className="mt-6 space-y-3">
                {checkins.map((item) => {
                  const imageUrl = resolveAssetUrl(
                    item.image
                  );

                  return (
                    <Link
                      key={item.id}
                      to={`/pois/${item.poi_id}`}
                      className="group flex gap-4 rounded-2xl border border-[#edf1f3] bg-white p-3 transition hover:border-[#b9def5] hover:bg-[#fafdff]"
                    >
                      {/* IMAGE */}
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#eef3f5]">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={getPoiName(item)}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#9aa7ae]">
                            <MapPin size={26} />
                          </div>
                        )}
                      </div>

                      {/* CONTENT */}
                      <div className="min-w-0 flex-1 py-1">
                        <h3 className="truncate font-extrabold text-slate-800">
                          {getPoiName(item)}
                        </h3>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          {item.city && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={13} />
                              {item.city}
                            </span>
                          )}

                          {item.category && (
                            <span>
                              {item.category}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                          <Clock3 size={13} />
                          {formatDate(
                            item.checked_in_at
                          )}
                        </div>
                      </div>

                      {/* ARROW */}
                      <div className="flex items-center text-slate-300 transition group-hover:text-[#2196F3]">
                        <ChevronRight size={21} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
        </div>
      </section>
    </UserLayout>
  );
}