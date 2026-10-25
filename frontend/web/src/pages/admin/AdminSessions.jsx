import { useCallback, useEffect, useState } from "react";

import {
  CalendarPlus,
  ChevronDown,
  ChevronUp,
  Download,
  Printer,
  QrCode,
  RefreshCw,
  Star,
} from "lucide-react";

import { QRCodeCanvas } from "qrcode.react";

/*
 * Trang "Tour và QR":
 * - Tour mặc định: QR dùng chung dán cố định, tải/in QR, sửa giá.
 * - Danh sách mọi tour: xem lại QR, đặt mặc định, kết thúc / mở lại.
 * - Tạo tour sự kiện (thu gọn): tour riêng có thời gian và giá khác.
 */

const API_URL = (
  import.meta.env.VITE_API_URL || ""
).replace(/\/+$/, "");

const PUBLIC_WEB_URL = (
  import.meta.env.VITE_WEB_BASE_URL ||
  window.location.origin
).replace(/\/+$/, "");

const EMPTY_FORM = {
  name: "",
  startsAt: "",
  expiresAt: "",
  price: "",
};

const STATE_LABEL = {
  running: { text: "Đang chạy", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  upcoming: { text: "Chưa bắt đầu", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  ended: { text: "Đã kết thúc", className: "bg-slate-100 text-slate-600 ring-slate-200" },
};

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
}

function scanUrl(qrToken) {
  return `${PUBLIC_WEB_URL}/scan-qr?qrToken=${encodeURIComponent(qrToken)}`;
}

async function adminRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || `Yêu cầu thất bại (${response.status}).`);
  }

  return data;
}

/* QR + nút tải ảnh / in, dùng cho tour mặc định và từng dòng trong bảng */
function QrBlock({ tour, size = 220 }) {
  const canvasId = `tour-qr-${tour.id}`;

  function getDataUrl() {
    const canvas = document.getElementById(canvasId);
    return canvas ? canvas.toDataURL("image/png") : null;
  }

  function download() {
    const dataUrl = getDataUrl();

    if (!dataUrl) {
      return;
    }

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `qr-tour-${tour.id}.png`;
    link.click();
  }

  function print() {
    const dataUrl = getDataUrl();
    const win = window.open("", "_blank", "width=600,height=750");

    if (!dataUrl || !win) {
      return;
    }

    win.document.write(
      `<!doctype html><title>QR tour #${tour.id}</title>` +
        `<body style="font-family:sans-serif;text-align:center;padding:24px">` +
        `<h2>${(tour.name || "Tour").replace(/</g, "&lt;")}</h2>` +
        `<p>Quét mã để nghe thuyết minh · ${formatPrice(tour.price)}</p>` +
        `<img src="${dataUrl}" style="width:420px;height:420px"/>` +
        "<script>window.onload=()=>{window.print();}</" + "script></body>"
    );
    win.document.close();
  }

  if (!tour.qrToken) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        {/* Canvas ở độ phân giải cao để ảnh tải về in được rõ */}
        <QRCodeCanvas
          id={canvasId}
          value={scanUrl(tour.qrToken)}
          size={1024}
          marginSize={4}
          style={{ width: size, height: size }}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={download}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          <Download size={16} />
          Tải ảnh
        </button>

        <button
          type="button"
          onClick={print}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Printer size={16} />
          In
        </button>
      </div>

      <p className="max-w-xs break-all text-center text-xs text-slate-400">
        {scanUrl(tour.qrToken)}
      </p>
    </div>
  );
}

export default function AdminSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [priceDraft, setPriceDraft] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);

  const [expandedId, setExpandedId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  const defaultTour = sessions.find((tour) => tour.isDefault) || null;
  const otherTours = sessions.filter((tour) => !tour.isDefault);

  const loadSessions = useCallback(async () => {
    setError("");

    try {
      const data = await adminRequest("/api/sessions");
      const list = Array.isArray(data?.sessions) ? data.sessions : [];

      setSessions(list);

      const current = list.find((tour) => tour.isDefault);
      setPriceDraft(current ? String(current.price) : "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  async function run(id, action, successText) {
    setBusyId(id);
    setError("");
    setNotice("");

    try {
      await action();
      setNotice(successText);
      await loadSessions();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function saveDefaultPrice(event) {
    event.preventDefault();

    const price = Number(priceDraft);

    if (!Number.isInteger(price) || price < 0) {
      setError("Giá phải là số nguyên VNĐ, lớn hơn hoặc bằng 0.");
      return;
    }

    setSavingPrice(true);
    await run(
      defaultTour.id,
      () =>
        adminRequest(`/api/sessions/${defaultTour.id}/price`, {
          method: "PATCH",
          body: JSON.stringify({ price }),
        }),
      "Đã cập nhật giá tour mặc định. Mã QR giữ nguyên, không cần in lại."
    );
    setSavingPrice(false);
  }

  function createQr(tour) {
    return run(
      tour.id,
      () =>
        adminRequest(`/api/sessions/${tour.id}/qr`, {
          method: "POST",
          body: JSON.stringify({ poiId: null }),
        }),
      `Đã tạo mã QR cho tour #${tour.id}.`
    );
  }

  function setDefault(tour) {
    return run(
      tour.id,
      () => adminRequest(`/api/sessions/${tour.id}/default`, { method: "PATCH" }),
      `Tour #${tour.id} giờ là tour mặc định. Nhớ in mã QR mới của tour này.`
    );
  }

  function changeStatus(tour, status) {
    return run(
      tour.id,
      () =>
        adminRequest(`/api/sessions/${tour.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }),
      status === "expired"
        ? `Đã kết thúc tour #${tour.id}. Mã QR của tour này không dùng được nữa.`
        : `Đã mở lại tour #${tour.id}.`
    );
  }

  async function createEventTour(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    const price = Number(form.price);

    if (!Number.isInteger(price) || price < 0) {
      setError("Giá phải là số nguyên VNĐ, lớn hơn hoặc bằng 0.");
      return;
    }

    if (
      form.startsAt &&
      form.expiresAt &&
      new Date(form.expiresAt) <= new Date(form.startsAt)
    ) {
      setError("Thời gian kết thúc phải sau thời gian bắt đầu.");
      return;
    }

    setCreating(true);

    try {
      const created = await adminRequest("/api/sessions", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim() || null,
          startsAt: form.startsAt || null,
          expiresAt: form.expiresAt || null,
        }),
      });

      const id = created?.session?.id;

      await adminRequest(`/api/sessions/${id}/price`, {
        method: "PATCH",
        body: JSON.stringify({ price }),
      });

      await adminRequest(`/api/sessions/${id}/qr`, {
        method: "POST",
        body: JSON.stringify({ poiId: null }),
      });

      setForm(EMPTY_FORM);
      setShowCreate(false);
      setExpandedId(id);
      setNotice(`Đã tạo tour sự kiện #${id} kèm mã QR.`);
      await loadSessions();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Đang tải danh sách tour...
      </p>
    );
  }

  return (
    <section className="space-y-6">
      {(error || notice) && (
        <p
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {error || notice}
        </p>
      )}

      {/* ================= TOUR MẶC ĐỊNH ================= */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Star size={21} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Tour mặc định</h2>
              <p className="mt-1 text-sm text-slate-500">
                Mã QR dùng chung, in một lần dán cố định. Mỗi lượt khách dùng được trong thời hạn cấu hình (mặc định 2 giờ).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadSessions()}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
            title="Tải lại"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {!defaultTour ? (
          <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            Chưa có tour mặc định. Chọn một tour đang chạy trong danh sách bên dưới và bấm “Đặt mặc định”.
          </p>
        ) : (
          <div className="mt-5 grid gap-6 md:grid-cols-[auto_1fr]">
            {defaultTour.qrToken ? (
              <QrBlock tour={defaultTour} />
            ) : (
              <button
                type="button"
                disabled={busyId === defaultTour.id}
                onClick={() => void createQr(defaultTour)}
                className="inline-flex h-fit items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                <QrCode size={17} />
                Tạo mã QR
              </button>
            )}

            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-500">Tour</p>
                <p className="text-base font-bold text-slate-900">
                  #{defaultTour.id} · {defaultTour.name || "Không tên"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Đang trong tour</p>
                  <p className="text-xl font-bold text-slate-900">{defaultTour.inTourNow}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Lượt đã thanh toán</p>
                  <p className="text-xl font-bold text-slate-900">{defaultTour.paidCount}</p>
                </div>
              </div>

              <form onSubmit={saveDefaultPrice} className="space-y-2">
                <label className="block text-xs font-medium text-slate-500" htmlFor="default-price">
                  Giá vé (VNĐ) — 0 là miễn phí
                </label>
                <div className="flex gap-2">
                  <input
                    id="default-price"
                    type="number"
                    min="0"
                    step="1000"
                    value={priceDraft}
                    onChange={(e) => setPriceDraft(e.target.value)}
                    className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={savingPrice}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {savingPrice ? "Đang lưu..." : "Lưu giá"}
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Giá hiện tại: {formatPrice(defaultTour.price)}. Đổi giá không cần in lại QR.
                </p>
              </form>
            </div>
          </div>
        )}
      </section>

      {/* ================= DANH SÁCH TOUR ================= */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Tất cả tour</h2>

        {otherTours.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Chưa có tour nào khác.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="py-2 font-medium">Tour</th>
                  <th className="py-2 font-medium">Giá</th>
                  <th className="py-2 font-medium">Trạng thái</th>
                  <th className="py-2 font-medium">Thời gian</th>
                  <th className="py-2 text-right font-medium">Đang dùng</th>
                  <th className="py-2 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {otherTours.map((tour) => {
                  const label = STATE_LABEL[tour.state] || STATE_LABEL.ended;
                  const expanded = expandedId === tour.id;
                  const busy = busyId === tour.id;

                  return [
                    <tr key={tour.id} className="border-t border-slate-100 align-middle">
                      <td className="py-3 font-semibold text-slate-900">
                        #{tour.id} · {tour.name || "Không tên"}
                      </td>
                      <td className="py-3">{formatPrice(tour.price)}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${label.className}`}>
                          {label.text}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-slate-500">
                        {formatDate(tour.startsAt)} → {formatDate(tour.expiresAt)}
                      </td>
                      <td className="py-3 text-right font-semibold">{tour.inTourNow}</td>
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : tour.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            QR {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>

                          {tour.state === "running" && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void setDefault(tour)}
                              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Đặt mặc định
                            </button>
                          )}

                          {tour.status === "active" ? (
                            tour.state !== "ended" && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void changeStatus(tour, "expired")}
                                className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                              >
                                Kết thúc
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void changeStatus(tour, "active")}
                              className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              Mở lại
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>,

                    expanded && (
                      <tr key={`${tour.id}-qr`} className="bg-slate-50">
                        <td colSpan={6} className="py-4">
                          {tour.qrToken ? (
                            <QrBlock tour={tour} size={180} />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-sm text-slate-500">
                              <p>Tour này chưa có mã QR còn hiệu lực.</p>
                              {tour.state !== "ended" && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void createQr(tour)}
                                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                >
                                  <QrCode size={15} />
                                  Tạo mã QR
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ================= TẠO TOUR SỰ KIỆN ================= */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setShowCreate((value) => !value)}
          className="flex w-full items-center justify-between gap-3 p-5 text-left sm:p-6"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <CalendarPlus size={21} />
            </span>
            <span>
              <span className="block text-lg font-bold text-slate-900">Tạo tour sự kiện</span>
              <span className="block text-sm text-slate-500">
                Cho trường hợp đặc biệt: tour đêm, lễ hội, giá khác. Ngày thường dùng tour mặc định.
              </span>
            </span>
          </span>
          {showCreate ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {showCreate && (
          <form onSubmit={createEventTour} className="grid gap-4 border-t border-slate-100 p-5 sm:grid-cols-2 sm:p-6">
            <label className="block text-sm">
              <span className="text-xs font-medium text-slate-500">Tên tour</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ví dụ: Tour đêm lễ hội"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
              />
            </label>

            <label className="block text-sm">
              <span className="text-xs font-medium text-slate-500">Giá vé (VNĐ)</span>
              <input
                type="number"
                min="0"
                step="1000"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="Ví dụ: 50000"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
              />
            </label>

            <label className="block text-sm">
              <span className="text-xs font-medium text-slate-500">Bắt đầu (không bắt buộc)</span>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
              />
            </label>

            <label className="block text-sm">
              <span className="text-xs font-medium text-slate-500">Kết thúc (không bắt buộc)</span>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
              />
            </label>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {creating ? "Đang tạo..." : "Tạo tour và mã QR"}
              </button>
            </div>
          </form>
        )}
      </section>
    </section>
  );
}
