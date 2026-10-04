import { useState } from "react";

import {
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Plus,
  X,
} from "lucide-react";

import { QRCodeSVG } from "qrcode.react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001";

const EMPTY_FORM = {
  name: "",
  startsAt: "",
  expiresAt: "",
  price: "",
};

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
}

export default function AdminSessions() {
  const [form, setForm] = useState(EMPTY_FORM);

  const [session, setSession] = useState(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [qr, setQr] = useState(null);

  const [qrLoading, setQrLoading] = useState(false);

  const [qrError, setQrError] = useState("");

  const token = localStorage.getItem("admin_token");

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function createSession(event) {
    event.preventDefault();

    if (!token) {
      setError("Phiên đăng nhập đã hết hạn.");
      return;
    }

    setError("");
    setSuccess("");
    setQr(null);
    setQrError("");
    setLoading(true);

    try {
      if (
        form.startsAt &&
        form.expiresAt &&
        new Date(form.expiresAt) <= new Date(form.startsAt)
      ) {
        throw new Error(
          "Thời gian kết thúc phải lớn hơn thời gian bắt đầu."
        );
      }

      const price = Number(form.price);

      if (!Number.isFinite(price) || price < 0) {
        throw new Error(
          "Giá phiên tham quan phải lớn hơn hoặc bằng 0."
        );
      }

      // =========================
      // 1. TẠO SESSION
      // =========================

      const response = await fetch(`${API_URL}/api/sessions`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim() || null,
          startsAt: form.startsAt || null,
          expiresAt: form.expiresAt || null,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || "Không thể tạo phiên tham quan."
        );
      }

      const createdSession = data?.session;

      if (!createdSession?.id) {
        throw new Error(
          "Backend không trả về ID phiên tham quan."
        );
      }

      // =========================
      // 2. CẬP NHẬT GIÁ SESSION
      // =========================

      const priceResponse = await fetch(
        `${API_URL}/api/sessions/${createdSession.id}/price`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            price,
          }),
        }
      );

      const priceData = await priceResponse
        .json()
        .catch(() => null);

      if (!priceResponse.ok) {
        throw new Error(
          priceData?.message ||
            "Tạo phiên thành công nhưng không thể cập nhật giá."
        );
      }

      setSession({
        ...createdSession,
        price,
      });

      setSuccess(
        "Tạo phiên tham quan và cập nhật giá thành công."
      );

      setForm(EMPTY_FORM);
    } catch (err) {
      setError(
        err?.message || "Không thể tạo phiên tham quan."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetCreatedSession() {
    setSession(null);
    setQr(null);
    setQrError("");
    setSuccess("");
    setError("");
  }

  async function createQr() {
    if (!token || !session?.id) {
      return;
    }

    setQrLoading(true);
    setQrError("");

    try {
      const response = await fetch(
        `${API_URL}/api/sessions/${session.id}/qr`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            poiId: null,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || "Không thể tạo mã QR."
        );
      }

      if (!data?.qr?.qr_token) {
        throw new Error(
          "Backend không trả về mã QR hợp lệ."
        );
      }

      setQr(data.qr);
    } catch (err) {
      setQrError(
        err?.message || "Không thể tạo mã QR."
      );
    } finally {
      setQrLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        {/* =========================
            TẠO SESSION
        ========================== */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <CalendarPlus size={21} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Tạo phiên tham quan
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Tạo một phiên tham quan mới cho khách.
              </p>
            </div>
          </div>

          <form
            onSubmit={createSession}
            className="mt-6 space-y-5"
          >
            {/* Tên */}
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Tên phiên
              </span>

              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  updateField("name", event.target.value)
                }
                placeholder="Ví dụ: Tour Dinh Độc Lập"
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />
            </label>

            {/* Giá */}
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Giá tham quan (VNĐ)
              </span>

              <input
                type="number"
                min="0"
                step="1000"
                value={form.price}
                onChange={(event) =>
                  updateField("price", event.target.value)
                }
                placeholder="Ví dụ: 50000"
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />

              <p className="mt-1 text-xs text-slate-400">
                Nhập 0 nếu phiên tham quan miễn phí.
              </p>
            </label>

            {/* Thời gian */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Bắt đầu
                </span>

                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) =>
                    updateField(
                      "startsAt",
                      event.target.value
                    )
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Kết thúc
                </span>

                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(event) =>
                    updateField(
                      "expiresAt",
                      event.target.value
                    )
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                />
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={17} />

              {loading
                ? "Đang tạo..."
                : "Tạo phiên tham quan"}
            </button>
          </form>
        </section>

        {/* =========================
            SESSION VỪA TẠO
        ========================== */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={21} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Phiên vừa tạo
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Thông tin phiên tham quan mới nhất.
              </p>
            </div>
          </div>

          {!session ? (
            <div className="mt-6 flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 text-center">
              <Clock3
                size={28}
                className="text-slate-300"
              />

              <p className="mt-3 text-sm font-medium text-slate-600">
                Chưa có phiên nào được tạo
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Tạo phiên ở biểu mẫu bên trái.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {/* ID */}
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  ID phiên
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  #{session.id}
                </p>
              </div>

              {/* Tên */}
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Tên phiên
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {session.name || "Không có tên"}
                </p>
              </div>

              {/* Giá */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                  Giá tham quan
                </p>

                <p className="mt-1 text-xl font-bold text-amber-700">
                  {formatPrice(session.price)}
                </p>
              </div>

              {/* Thời gian */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Bắt đầu
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatDate(session.starts_at)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Kết thúc
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatDate(session.expires_at)}
                  </p>
                </div>
              </div>

              {/* Trạng thái */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  Trạng thái
                </p>

                <p className="mt-1 font-bold text-emerald-700">
                  {session.status === "active"
                    ? "Đang hoạt động"
                    : session.status || "Không xác định"}
                </p>
              </div>

              {/* QR vào tour */}
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                      Mã QR vào tour
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Khách dùng QR này để vào phiên tham quan.
                    </p>
                  </div>

                  {qr && (
                    <button
                      type="button"
                      onClick={createQr}
                      disabled={qrLoading}
                      className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {qrLoading
                        ? "Đang tạo..."
                        : "Tạo lại"}
                    </button>
                  )}
                </div>

                {!qr ? (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={createQr}
                      disabled={qrLoading}
                      className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {qrLoading
                        ? "Đang tạo QR..."
                        : "Tạo mã QR"}
                    </button>

                    {qrError && (
                      <p className="mt-2 text-sm text-red-600">
                        {qrError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col items-center">
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <QRCodeSVG
                        value={qr.qr_token}
                        size={220}
                        level="M"
                      />
                    </div>

                    <p className="mt-4 text-sm font-semibold text-slate-700">
                      Quét mã để vào tour
                    </p>

                    <p className="mt-2 max-w-full break-all text-center font-mono text-xs leading-5 text-slate-500">
                      {qr.qr_token}
                    </p>
                  </div>
                )}
              </div>

              {/* Token */}
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Mã phiên
                </p>

                <p className="mt-2 break-all font-mono text-xs leading-5 text-slate-600">
                  {session.session_token}
                </p>
              </div>

              {/* Đóng */}
              <button
                type="button"
                onClick={resetCreatedSession}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <X size={16} />
                Đóng thông tin
              </button>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}