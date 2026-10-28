import { useCallback, useEffect, useState } from "react";

import { Ban, KeyRound, RefreshCw, Search, Smartphone } from "lucide-react";

import {
  getAdminDevices,
  grantDeviceAccess,
  revokeDeviceAccess,
} from "../../services/adminService";

/*
 * Khách không có tài khoản: tra cứu theo mã thiết bị.
 * Khách đọc mã rút gọn (8 ký tự) ở trang "Tài khoản" trên web.
 * Dùng khi khách báo "đã trả tiền mà không vào được tour".
 */

const API_URL = (
  import.meta.env.VITE_API_URL || ""
).replace(/\/+$/, "");

const METHOD_LABEL = { online: "VNPAY", offline: "Tiền mặt" };
const PAYMENT_STATUS = {
  paid: "đã trả",
  pending: "đang chờ",
  failed: "thất bại",
  cancelled: "đã huỷ",
};

function formatTime(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function timeLeft(value) {
  const minutes = Math.round((new Date(value) - Date.now()) / 60000);

  if (minutes <= 0) {
    return "sắp hết";
  }

  return minutes >= 60
    ? `còn ${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`
    : `còn ${minutes} phút`;
}

export default function AdminDevices() {
  const token = localStorage.getItem("admin_token");

  const [query, setQuery] = useState("");
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [defaultTour, setDefaultTour] = useState(null);
  const [grantingId, setGrantingId] = useState(null);

  const load = useCallback(
    async (search = "") => {
      setError("");

      try {
        const data = await getAdminDevices(token, search.trim());
        setDevices(Array.isArray(data?.devices) ? data.devices : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    void load();

    // Tour mặc định: tour được cấp lại khi khách báo lỗi.
    fetch(`${API_URL}/api/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((data) => {
        setDefaultTour(
          (data?.sessions || []).find((tour) => tour.isDefault) || null
        );
      })
      .catch(() => {});
  }, [load, token]);

  function search(event) {
    event.preventDefault();
    setLoading(true);
    void load(query);
  }

  async function grant(device) {
    if (!defaultTour) {
      setError("Chưa có tour mặc định để cấp quyền.");
      return;
    }

    const confirmed = window.confirm(
      `Cấp quyền tour "${defaultTour.name}" cho thiết bị ${device.shortCode}? ` +
        "Thiết bị dùng được trong thời hạn mỗi lượt (mặc định 2 giờ) tính từ bây giờ."
    );

    if (!confirmed) {
      return;
    }

    setGrantingId(device.deviceId);
    setError("");
    setNotice("");

    try {
      await grantDeviceAccess(token, device.deviceId, defaultTour.id);
      setNotice(`Đã cấp quyền tour cho thiết bị ${device.shortCode}. Khách tải lại trang là vào được.`);
      await load(query);
    } catch (err) {
      setError(err.message);
    } finally {
      setGrantingId(null);
    }
  }

  async function revoke(device) {
    const confirmed = window.confirm(
      `Thu hồi quyền tour của thiết bị ${device.shortCode}? ` +
        "Khách sẽ phải quét QR và thanh toán lại để vào tour."
    );

    if (!confirmed) {
      return;
    }

    setGrantingId(device.deviceId);
    setError("");
    setNotice("");

    try {
      await revokeDeviceAccess(token, device.deviceId);
      setNotice(`Đã thu hồi quyền tour của thiết bị ${device.shortCode}.`);
      await load(query);
    } catch (err) {
      setError(err.message);
    } finally {
      setGrantingId(null);
    }
  }

  return (
    <section className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nhập mã thiết bị khách đọc cho bạn, ví dụ 89541C99"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm uppercase outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            className="min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Tìm
          </button>

          <button
            type="button"
            onClick={() => {
              setQuery("");
              setLoading(true);
              void load();
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-3 text-slate-600 hover:bg-slate-50"
            title="Tải lại"
          >
            <RefreshCw size={17} />
          </button>
        </form>

        <p className="mt-3 text-xs text-slate-500">
          Khách xem mã thiết bị ở trang “Tài khoản” trên web. Danh sách hiện 100 thiết bị hoạt động gần nhất.
        </p>
      </section>

      {(error || notice) && (
        <p
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {error || notice}
        </p>
      )}

      {loading ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Đang tải...
        </p>
      ) : devices.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center">
          <Smartphone size={24} className="text-slate-400" />
          <p className="mt-2 text-sm text-slate-500">Không tìm thấy thiết bị nào.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Thiết bị</th>
                <th className="px-5 py-3 font-semibold">Quyền tour</th>
                <th className="px-5 py-3 font-semibold">Thanh toán gần nhất</th>
                <th className="px-5 py-3 font-semibold">Hoạt động gần nhất</th>
                <th className="px-5 py-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {devices.map((device) => {
                const payment = device.payments[0];

                return (
                  <tr key={device.deviceId} className="align-top">
                    <td className="px-5 py-4">
                      <p className="font-mono text-base font-bold text-slate-900">
                        {device.shortCode}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {device.checkinCount} lượt check-in
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      {device.access ? (
                        <>
                          <p className="font-semibold text-emerald-700">
                            #{device.access.sessionId} · {device.access.tourName || "Tour"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {timeLeft(device.access.expiresAt)}
                          </p>
                        </>
                      ) : (
                        <p className="text-slate-400">Không có quyền</p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {payment ? (
                        <>
                          <p className="font-semibold text-slate-900">
                            {payment.amount.toLocaleString("vi-VN")} ₫ ·{" "}
                            {METHOD_LABEL[payment.method] || payment.method}
                          </p>
                          <p className="text-xs text-slate-500">
                            {PAYMENT_STATUS[payment.status] || payment.status} ·{" "}
                            {formatTime(payment.paidAt || payment.createdAt)}
                          </p>
                        </>
                      ) : (
                        <p className="text-slate-400">Chưa thanh toán</p>
                      )}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {formatTime(device.lastSeenInTour || device.lastActivity)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <button
                        type="button"
                        disabled={grantingId === device.deviceId}
                        onClick={() => void grant(device)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <KeyRound size={14} />
                        Cấp lại quyền
                      </button>

                      {device.access && (
                        <button
                          type="button"
                          disabled={grantingId === device.deviceId}
                          onClick={() => void revoke(device)}
                          className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Ban size={14} />
                          Thu hồi
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
