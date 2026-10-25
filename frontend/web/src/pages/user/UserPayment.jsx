
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  WalletCards,
  QrCode,
  XCircle,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useLocation, useNavigate } from "react-router-dom";

import UserLayout from "../../components/user/UserLayout";
import {
  authorizeSessionByQr,
  clearPendingTourPayment,
  createTourPayment,
  getPendingTourPayment,
  getTourPayment,
  saveTourAuthorization,
  setDemoTourPaymentResult,
} from "../../services/userService";


export default function UserPayment() {
  const navigate = useNavigate();
  const location = useLocation();

  const pending = useMemo(
    () => location.state?.pending || getPendingTourPayment(),
    [location.state]
  );

  const [paymentMethod, setPaymentMethod] = useState("online");
  const [payment, setPayment] = useState(pending?.payment || null);
  const [loading, setLoading] = useState(false);
  const [resultLoading, setResultLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const session = pending?.session || null;
  const qrToken = pending?.qrToken || "";
  const amount = Number(session?.price ?? 0);
  const currency = session?.currency || "VND";

  async function authorizeAfterPaid() {
    const result = await authorizeSessionByQr(qrToken);

    if (!result.ok) {
      throw new Error(
        result.data?.message ||
          "Thanh toán thành công nhưng chưa thể cấp quyền tour."
      );
    }

    const authorization = result.data?.authorization;

    if (authorization?.status !== "active") {
      throw new Error("Authorization chưa ở trạng thái active.");
    }

    saveTourAuthorization(authorization, result.data?.session);
    clearPendingTourPayment();

    setSuccess("Thanh toán thành công. Bạn đã được cấp quyền vào tour.");

    setTimeout(() => navigate("/", { replace: true }), 900);
  }

  useEffect(() => {
    if (!session?.id || !qrToken || payment?.status !== "pending") {
      return undefined;
    }

    let active = true;

    const interval = setInterval(async () => {
      try {
        const result = await getTourPayment(Number(session.id));
        const nextPayment = result?.payment || null;

        if (!active) return;

        setPayment(nextPayment);

        if (nextPayment?.status === "paid") {
          clearInterval(interval);
          await authorizeAfterPaid();
        } else if (nextPayment?.status === "failed") {
          clearInterval(interval);
          setError("Thanh toán thất bại. Bạn có thể thử lại.");
        }
      } catch (err) {
        if (active) {
          setError(
            err?.message || "Không thể kiểm tra trạng thái thanh toán."
          );
        }
      }
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [payment?.status, qrToken, session?.id]);

  async function handleCreatePayment() {
    if (!session?.id || !qrToken) {
      setError("Không có thông tin session. Hãy quét QR lại.");
      return;
    }

    if (amount <= 0 || !Number.isFinite(amount)) {
      setError("Session chưa có giá hợp lệ.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await createTourPayment({
        sessionId: Number(session.id),
        method: paymentMethod,
      });

      const nextPayment = result?.payment || null;

if (paymentMethod === "online") {
  const paymentUrl = result?.paymentUrl;

  if (!paymentUrl) {
    throw new Error(
      "Backend chưa trả về paymentUrl của VNPAY."
    );
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(paymentUrl);
  } catch {
    throw new Error("URL thanh toán VNPAY không hợp lệ.");
  }

  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.hostname !== "sandbox.vnpayment.vn"
  ) {
    throw new Error("URL thanh toán không thuộc VNPAY Sandbox.");
  }

  window.location.assign(parsedUrl.href);
  return;
}

setPayment(nextPayment);

if (nextPayment?.status === "paid") {
  await authorizeAfterPaid();
}
    } catch (err) {
      setError(err?.message || "Không thể tạo yêu cầu thanh toán.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoResult(status) {
    if (!payment?.id) {
      setError("Chưa có đơn thanh toán để xác nhận.");
      return;
    }

    setResultLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await setDemoTourPaymentResult({
        paymentId: Number(payment.id),
        status,
      });

      const updatedPayment = result?.payment || {
        ...payment,
        status,
      };

      setPayment(updatedPayment);

      if (status === "paid") {
        await authorizeAfterPaid();
      } else {
        setError("Thanh toán thất bại. Bạn có thể thử lại.");
      }
    } catch (err) {
      setError(
        err?.message || "Không thể cập nhật kết quả thanh toán."
      );
    } finally {
      setResultLoading(false);
    }
  }

  if (!session || !qrToken) {
    return (
      <UserLayout>
        <section className="mx-auto max-w-2xl px-4 py-10">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-[#e7ecef]">
            <h1 className="text-2xl font-extrabold">
              Không có phiên thanh toán
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#777]">
              Thông tin QR hoặc session đã mất.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate("/scan-qr", { replace: true })
              }
              className="mt-6 rounded-xl bg-[#2196F3] px-5 py-3 text-sm font-extrabold text-white"
            >
              Quét QR lại
            </button>
          </div>
        </section>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate("/scan-qr")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#2196F3]"
        >
          <ArrowLeft size={17} />
          Quay lại quét QR
        </button>

        <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#e7ecef] sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf7ff] text-[#168dcc]">
              <WalletCards size={24} />
            </div>

            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#168dcc]">
                TOUR PAYMENT
              </p>

              <h1 className="mt-1 text-2xl font-extrabold">
                Thanh toán để vào tour
              </h1>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-[#f4f8fc] p-5">
            <p className="text-sm font-bold text-[#777]">
              Session
            </p>

            <p className="mt-1 text-lg font-extrabold">
              {session.name || `Tour #${session.id}`}
            </p>

            <p className="mt-4 text-sm font-bold text-[#777]">
              Số tiền thanh toán
            </p>

            <p className="mt-1 text-3xl font-extrabold text-[#168dcc]">
              {amount.toLocaleString("vi-VN")} {currency}
            </p>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-sm font-extrabold text-[#222]">
              Phương thức thanh toán
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                {
                  value: "online",
                  title: "Thanh toán online",
                  icon: CreditCard,
                  description: "Quét mã QR để thanh toán.",
                },
                {
                  value: "offline",
                  title: "Thanh toán tiền mặt",
                  icon: WalletCards,
                  description: "Thanh toán trực tiếp với nhân viên.",
                },
              ].map(({ value, title, icon: Icon, description }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(value);
                    setError("");
                  }}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-left ${
                    paymentMethod === value
                      ? "border-[#2196F3] bg-[#f0f7ff]"
                      : "border-[#dfe5eb]"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={21} />

                    <span>
                      <span className="block text-sm font-extrabold">
                        {title}
                      </span>

                      <span className="mt-1 block text-xs leading-5 text-[#777]">
                        {description}
                      </span>
                    </span>
                  </span>

                  <span
                    className={`h-5 w-5 shrink-0 rounded-full border-2 ${
                      paymentMethod === value
                        ? "border-[6px] border-[#2196F3]"
                        : "border-[#b8bec7]"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === "online" &&
  payment &&
  payment.provider !== "vnpay" &&
  ["pending", "failed"].includes(payment.status) && (
              <div className="mt-6 rounded-2xl border border-[#dfeaf4] p-5">
                <div className="flex flex-col items-center">
                  <QRCodeSVG
                    value={JSON.stringify({
                      type: "TOUR_PAYMENT",
                      paymentId: payment.id,
                      sessionId: Number(session.id),
                      amount,
                      currency,
                    })}
                    size={190}
                    level="M"
                    includeMargin
                  />

                  <p className="mt-3 text-sm font-extrabold">
                    {amount.toLocaleString("vi-VN")} {currency}
                  </p>

                  {payment.status === "failed" && (
                    <p className="mt-2 text-sm font-semibold text-red-600">
                      Thanh toán thất bại. Hãy tạo yêu cầu mới để thử lại.
                    </p>
                  )}
                </div>

                {payment.status === "pending" &&
  payment.provider !== "vnpay" && (
  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={resultLoading}
                      onClick={() => void handleDemoResult("paid")}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
                    >
                      {resultLoading ? (
                        <LoaderCircle size={17} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={18} />
                      )}
                      Thanh toán thành công
                    </button>

                    <button
                      type="button"
                      disabled={resultLoading}
                      onClick={() => void handleDemoResult("failed")}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
                    >
                      {resultLoading ? (
                        <LoaderCircle size={17} className="animate-spin" />
                      ) : (
                        <XCircle size={18} />
                      )}
                      Thanh toán thất bại
                    </button>
                  </div>
                )}
              </div>
            )}

          {payment?.status === "pending" && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#fff7e6] p-4 text-sm text-[#8a5a00]">
              <LoaderCircle size={18} className="animate-spin" />
              <span>Đang chờ xác nhận thanh toán</span>
            </div>
          )}

          {success && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#eaf8ef] p-4 text-sm font-bold text-[#18794e]">
              <CheckCircle2 size={18} />
              {success}
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-2xl bg-[#fff1f1] p-4 text-sm text-[#c62828]">
              {error}
            </div>
          )}

          {payment?.status !== "paid" && (
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleCreatePayment()}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2196F3] px-5 py-3.5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <CreditCard size={17} />
              )}

              {loading
                ? "Đang tạo yêu cầu..."
                : paymentMethod === "offline"
                  ? "Tạo yêu cầu thanh toán tiền mặt"
                  : payment?.status === "pending" && payment?.method === "online"
                    ? "Thanh toán lại với VNPAY"
                    : "Thanh toán online qua VNPAY"}
            </button>
          )}
        </div>
      </section>
    </UserLayout>
  );
}
