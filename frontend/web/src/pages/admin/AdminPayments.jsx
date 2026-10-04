import { useEffect, useState } from "react";

import {
  CheckCircle2,
  Clock3,
  CreditCard,
  RefreshCw,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001";

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusLabel(status) {
  if (status === "paid") {
    return "Đã thanh toán";
  }

  if (status === "pending") {
    return "Chờ xác nhận";
  }

  if (status === "failed") {
    return "Thất bại";
  }

  if (status === "cancelled") {
    return "Đã hủy";
  }

  if (status === "refunded") {
    return "Đã hoàn tiền";
  }

  return status || "Không xác định";
}

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [confirmingId, setConfirmingId] =
    useState(null);

  const token = localStorage.getItem("admin_token");

  async function loadPayments(options = {}) {
    const silent = options.silent ?? false;

    if (!token) {
      setError("Phiên đăng nhập Admin đã hết hạn.");
      setLoading(false);
      return;
    }

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/admin/monitoring`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Không thể tải danh sách thanh toán."
        );
      }

      const recentPayments =
        Array.isArray(data?.recentPayments)
          ? data.recentPayments
          : [];

      setPayments(recentPayments);
    } catch (err) {
      setError(
        err?.message ||
          "Không thể tải danh sách thanh toán."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadPayments();

    const interval = setInterval(() => {
      void loadPayments({ silent: true });
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleRefresh() {
      void loadPayments({ silent: true });
    }

    window.addEventListener(
      "admin-payments-refresh",
      handleRefresh
    );

    return () => {
      window.removeEventListener(
        "admin-payments-refresh",
        handleRefresh
      );
    };
  }, []);

  async function confirmPayment(paymentId) {
    const confirmed = window.confirm(
      `Xác nhận payment #${paymentId} đã thanh toán?`
    );

    if (!confirmed) {
      return;
    }

    if (!token) {
      setError(
        "Phiên đăng nhập Admin đã hết hạn."
      );
      return;
    }

    try {
      setConfirmingId(paymentId);
      setError("");

      const response = await fetch(
        `${API_URL}/api/payments/${paymentId}/confirm`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Không thể xác nhận thanh toán."
        );
      }

      setPayments((current) =>
        current.map((payment) =>
          Number(payment.id) === Number(paymentId)
            ? {
                ...payment,
                status: "paid",
                paidAt:
                  new Date().toISOString(),
              }
            : payment
        )
      );
    } catch (err) {
      setError(
        err?.message ||
          "Không thể xác nhận thanh toán."
      );
    } finally {
      setConfirmingId(null);
    }
  }

  const pendingPayments = payments.filter(
    (payment) => payment.status === "pending"
  );

  const paidPayments = payments.filter(
    (payment) => payment.status === "paid"
  );

  return (
    <section className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
            <CreditCard size={21} />
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Quản lý thanh toán
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Xem và xác nhận các khoản thanh toán
              của khách.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            loadPayments({ silent: true })
          }
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          />

          {refreshing
            ? "Đang tải..."
            : "Làm mới"}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* SUMMARY */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-amber-700">
              Chờ xác nhận
            </span>

            <Clock3
              size={20}
              className="text-amber-600"
            />
          </div>

          <p className="mt-2 text-3xl font-bold text-amber-800">
            {pendingPayments.length}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-emerald-700">
              Đã thanh toán
            </span>

            <CheckCircle2
              size={20}
              className="text-emerald-600"
            />
          </div>

          <p className="mt-2 text-3xl font-bold text-emerald-800">
            {paidPayments.length}
          </p>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-sky-700">
              Tổng giao dịch
            </span>

            <CreditCard
              size={20}
              className="text-sky-600"
            />
          </div>

          <p className="mt-2 text-3xl font-bold text-sky-800">
            {payments.length}
          </p>
        </div>
      </div>

      {/* LIST */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <h3 className="text-lg font-bold text-slate-900">
            Giao dịch gần đây
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Hệ thống tự động cập nhật mỗi 5 giây.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-60 items-center justify-center">
            <p className="text-sm text-slate-500">
              Đang tải thanh toán...
            </p>
          </div>
        ) : payments.length === 0 ? (
          <div className="flex min-h-60 flex-col items-center justify-center px-6 text-center">
            <CreditCard
              size={32}
              className="text-slate-300"
            />

            <p className="mt-3 text-sm font-semibold text-slate-600">
              Chưa có giao dịch thanh toán
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Khi khách tạo payment, giao dịch sẽ xuất
              hiện tại đây.
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Payment
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      User
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Session
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Số tiền
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Phương thức
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      Trạng thái
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          #{payment.id}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(
                            payment.createdAt
                          )}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">
                          User #{payment.userId}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">
                          Session #{payment.sessionId}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900">
                          {formatPrice(
                            payment.amount
                          )}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {payment.method ||
                            "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {payment.status ===
                        "paid" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2
                              size={14}
                            />
                            {getStatusLabel(
                              payment.status
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                            <Clock3
                              size={14}
                            />
                            {getStatusLabel(
                              payment.status
                            )}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {payment.status ===
                        "pending" ? (
                          <button
                            type="button"
                            onClick={() =>
                              confirmPayment(
                                payment.id
                              )
                            }
                            disabled={
                              confirmingId ===
                              payment.id
                            }
                            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {confirmingId ===
                            payment.id
                              ? "Đang xác nhận..."
                              : "Xác nhận thanh toán"}
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600">
                            Đã xử lý
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE */}
            <div className="space-y-3 p-4 md:hidden">
              {payments.map((payment) => (
                <article
                  key={payment.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">
                        Payment #{payment.id}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(
                          payment.createdAt
                        )}
                      </p>
                    </div>

                    {payment.status ===
                    "paid" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2
                          size={12}
                        />
                        Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                        <Clock3
                          size={12}
                        />
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        User
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-800">
                        #{payment.userId}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Session
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-800">
                        #{payment.sessionId}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-200 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Số tiền
                    </p>

                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {formatPrice(
                        payment.amount
                      )}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {payment.method ||
                        "—"}
                    </span>

                    {payment.status ===
                    "pending" ? (
                      <button
                        type="button"
                        onClick={() =>
                          confirmPayment(
                            payment.id
                          )
                        }
                        disabled={
                          confirmingId ===
                          payment.id
                        }
                        className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {confirmingId ===
                        payment.id
                          ? "Đang xác nhận..."
                          : "Xác nhận"}
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600">
                        Đã xử lý
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}