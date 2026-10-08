import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  LoaderCircle,
  QrCode,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import UserLayout from "../../components/user/UserLayout";

import {
  authorizeSessionByQr,
  savePendingTourPayment,
  saveTourAuthorization,
} from "../../services/userService";

function normalizeQrToken(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  /*
   * QR có thể chứa:
   * - token trực tiếp
   * - URL có ?qrToken=...
   * - URL có ?token=...
   */
  try {
    const url = new URL(text);

    return (
      url.searchParams.get("qrToken") ||
      url.searchParams.get("token") ||
      text
    );
  } catch {
    return text;
  }
}

export default function UserScanQR() {
  const navigate = useNavigate();

  const processingRef = useRef(false);
  const autoQrProcessedRef = useRef(false);

  const [tokenInput, setTokenInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleQrToken = useCallback(
    async (rawToken) => {
      const qrToken = normalizeQrToken(rawToken);

      if (
        !qrToken ||
        processingRef.current
      ) {
        return;
      }

      processingRef.current = true;

      setProcessing(true);
      setError("");

      try {
        const result = await authorizeSessionByQr(
          qrToken
        );

        /*
         * 402 = tour yêu cầu thanh toán
         */
        if (
          result.status === 402 &&
          result.data?.paymentRequired
        ) {
          savePendingTourPayment({
            qrToken,
            session: result.data.session,
            payment:
              result.data.payment || null,
          });

          navigate("/payment", {
            replace: true,
          });

          return;
        }

        if (!result.ok) {
          throw new Error(
            result.data?.message ||
              "Không thể xác thực QR."
          );
        }

        const authorization =
          result.data?.authorization;

        const session =
          result.data?.session;

        if (
          authorization?.status !== "active"
        ) {
          throw new Error(
            "Authorization chưa ở trạng thái active."
          );
        }

        saveTourAuthorization(
          authorization,
          session
        );

        /*
         * PoiProvider sẽ nhận event
         * tour-authorization-changed
         * và bắt đầu load POI.
         */
        navigate("/", {
          replace: true,
        });
      } catch (err) {
        setError(
          err?.message ||
            "Không thể xử lý QR."
        );
      } finally {
        processingRef.current = false;
        setProcessing(false);
      }
    },
    [navigate]
  );

  /*
   * QR được quét bằng Camera native
   * của điện thoại.
   *
   * Camera sẽ mở URL dạng:
   *
   * /scan-qr?qrToken=ABC123
   *
   * Web chỉ lấy token từ URL và xử lý.
   */
  useEffect(() => {
    if (autoQrProcessedRef.current) {
      return;
    }

    const params = new URLSearchParams(
      window.location.search
    );

    const qrToken =
      params.get("qrToken") ||
      params.get("token");

    if (!qrToken) {
      return;
    }

    autoQrProcessedRef.current = true;

    setTokenInput(qrToken);

    void handleQrToken(qrToken);
  }, [handleQrToken]);

  return (
    <UserLayout>
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#2196F3]"
        >
          <ArrowLeft size={17} />
          Quay lại
        </button>

        <div className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-[#e7ecef]">
          <div className="bg-[#2196F3] px-6 py-7 text-white sm:px-8">
            <div className="flex items-center gap-3">
              <QrCode size={30} />

              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-white/75">
                  TOUR ACCESS
                </p>

                <h1 className="mt-1 text-2xl font-extrabold">
                  Quét QR để tham gia tour
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">
              Dùng Camera của điện thoại để quét mã QR
              tại cổng tham quan. Sau khi quét, điện thoại
              sẽ mở trang này và hệ thống tự xác thực phiên
              tham quan.
            </p>
          </div>

          <div className="p-5 sm:p-7">
            <div className="rounded-2xl border border-[#dfe5eb] bg-[#f8fafc] p-6 text-center">
              <QrCode
                size={42}
                className="mx-auto text-[#2196F3]"
              />

              <h2 className="mt-4 text-lg font-extrabold text-[#222]">
                Camera điện thoại sẽ quét mã QR
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Web không cần truy cập camera.
                Sau khi camera điện thoại quét QR,
                mã phiên sẽ được gửi tới hệ thống để
                kiểm tra thanh toán và cấp quyền tour.
              </p>

              {processing ? (
                <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-[#f0f7ff] px-4 py-3 text-sm font-extrabold text-[#168dcc]">
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                  Đang xác thực QR...
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl bg-[#fff1f1] p-4 text-sm leading-6 text-[#c62828]">
                {error}
              </div>
            ) : null}

            <div className="mt-6">
              <div className="mb-2 flex items-center gap-2 text-sm font-extrabold text-[#222]">
                <QrCode size={16} />
                Nhập mã QR thủ công để test
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={tokenInput}
                  onChange={(event) =>
                    setTokenInput(
                      event.target.value
                    )
                  }
                  className="min-w-0 flex-1 rounded-xl border border-[#dfe5eb] px-4 py-3 text-sm outline-none focus:border-[#2196F3]"
                  placeholder="Dán qr_token hoặc URL QR tại đây..."
                />

                <button
                  type="button"
                  disabled={
                    !tokenInput.trim() ||
                    processing
                  }
                  onClick={() =>
                    void handleQrToken(
                      tokenInput
                    )
                  }
                  className="inline-flex items-center justify-center rounded-xl bg-[#2196F3] px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing
                    ? "Đang xử lý..."
                    : "Xác thực mã"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </UserLayout>
  );
}