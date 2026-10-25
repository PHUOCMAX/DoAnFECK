import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  claimDeviceTransfer,
  clearPendingTourPayment,
  getDeviceId,
  getMySessionAuthorizations,
  getTourPayment,
  saveTourAuthorization,
} from "../../services/userService";

export default function PaymentResult() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [authorized, setAuthorized] = useState(false);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const status = searchParams.get("status");

  
  useEffect(() => {
    let active = true;
    let attempts = 0;
    let timer;

    async function loadPayment() {
      const sessionId = searchParams.get("sessionId");

      // Lần đầu: nếu ngân hàng đưa về trình duyệt khác, nhận lại mã thiết bị đã trả tiền.
      const transferToken = searchParams.get("device");

      if (attempts === 0 && transferToken) {
        await claimDeviceTransfer(transferToken);
        if (!active) return;
      }

      if (!sessionId || !Number.isInteger(Number(sessionId))) {
        if (active) {
          setError("Mã phiên tham quan không hợp lệ hoặc bị thiếu.");
          setLoading(false);
        }
        return;
      }

      try {
        const result = await getTourPayment(Number(sessionId));
        if (!active) return;

        const currentPayment = result?.payment ?? null;
        setPayment(currentPayment);
        setError("");

        if (currentPayment?.status === "paid") {
          // Backend đã tự cấp quyền khi thanh toán thành công:
          // chỉ cần đồng bộ quyền về trình duyệt, không cần quét lại QR.
          const data = await getMySessionAuthorizations();
          if (!active) return;

          const access = (data?.authorizations || []).find(
            (item) => Number(item.sessionId) === Number(sessionId)
          );

          if (access) {
            saveTourAuthorization(
              { ...access, deviceId: getDeviceId(), status: "active" },
              access.session
            );
            clearPendingTourPayment();
            setAuthorized(true);
            timer = setTimeout(() => navigate("/", { replace: true }), 1500);
          } else {
            setError("Đã thanh toán nhưng chưa cấp được quyền vào tour. Hãy quét lại mã QR.");
          }

          setLoading(false);
          return;
        }

        if (
          currentPayment?.status === "failed" ||
          attempts >= 9
        ) {
          setLoading(false);
          return;
        }

        attempts += 1;
        timer = setTimeout(loadPayment, 3000);
      } catch (err) {
        if (!active) return;
        setError(
          err?.message || "Không thể kiểm tra trạng thái thanh toán."
        );
        setLoading(false);
      }
    }

    loadPayment();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchParams, navigate]);


  let title = "Đang kiểm tra thanh toán";
  let description = "Vui lòng chờ trong giây lát.";

  if (!loading) {
    if (error) {
      title = "Chưa thể xác nhận thanh toán";
      description = error;
    } else if (payment?.status === "paid") {
      title = "Thanh toán thành công";
      description = authorized
        ? "Bạn đã được cấp quyền vào tour. Đang chuyển về trang chủ..."
        : "Giao dịch đã được hệ thống xác nhận.";
    } else if (payment?.status === "pending" || status === "processing") {
      title = "Đang xử lý giao dịch";
      description =
        "Hệ thống chưa xác nhận thanh toán. Vui lòng kiểm tra lại sau.";
    } else if (payment?.status === "failed") {
      title = "Thanh toán chưa thành công";
      description = "Bạn có thể quay lại trang thanh toán để thử lại.";
    } else {
      title = "Chưa tìm thấy giao dịch";
      description =
        "Không tìm thấy thông tin thanh toán phù hợp với phiên tham quan.";
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <section className="rounded-xl border border-gray-200 p-6 text-center">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-gray-600">{description}</p>

        {loading && <p className="mt-4">Đang tải...</p>}

        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/payment"
            className="rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            Quay lại thanh toán
          </Link>
          <Link
            to="/"
            className="rounded-lg border border-gray-300 px-4 py-2"
          >
            Trang chủ
          </Link>
        </div>
      </section>
    </main>
  );
}
