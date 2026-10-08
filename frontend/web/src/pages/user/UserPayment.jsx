import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  WalletCards,
} from "lucide-react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import UserLayout from "../../components/user/UserLayout";

import {
  authorizeSessionByQr,
  clearPendingTourPayment,
  createTourPayment,
  getPendingTourPayment,
  getTourPayment,
  saveTourAuthorization,
} from "../../services/userService";

export default function UserPayment() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const pending =
    useMemo(
      () =>
        location.state?.pending ||
        getPendingTourPayment(),
      [location.state]
    );

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("online");

  const [payment, setPayment] =
    useState(
      pending?.payment || null
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const session =
    pending?.session || null;

  const qrToken =
    pending?.qrToken || "";

  async function authorizeAfterPaid() {
    const result =
      await authorizeSessionByQr(
        qrToken
      );

    if (!result.ok) {
      throw new Error(
        result.data?.message ||
          "Thanh toán đã hoàn tất nhưng chưa thể cấp quyền tour."
      );
    }

    const authorization =
      result.data
        ?.authorization;

    if (
      authorization?.status !==
      "active"
    ) {
      throw new Error(
        "Authorization chưa ở trạng thái active."
      );
    }

    saveTourAuthorization(
      authorization,
      result.data?.session
    );

    clearPendingTourPayment();

    setSuccess(
      "Thanh toán đã được xác nhận. Bạn đã được cấp quyền vào tour."
    );

    setTimeout(() => {
      navigate(
        "/",
        {
          replace: true,
        }
      );
    }, 700);
  }

  /*
   * Payment pending:
   * kiểm tra mỗi 3 giây.
   */
  useEffect(() => {
    if (
      !session?.id ||
      !qrToken ||
      payment?.status !==
        "pending"
    ) {
      return undefined;
    }

    let active = true;

    const interval =
      setInterval(
        async () => {
          try {
            const result =
              await getTourPayment(
                Number(
                  session.id
                )
              );

            const nextPayment =
              result?.payment ||
              null;

            if (!active) {
              return;
            }

            setPayment(
              nextPayment
            );

            if (
              nextPayment?.status ===
              "paid"
            ) {
              clearInterval(
                interval
              );

              await authorizeAfterPaid();
            }
          } catch (err) {
            if (active) {
              setError(
                err?.message ||
                  "Không thể kiểm tra trạng thái thanh toán."
              );
            }
          }
        },
        3000
      );

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [
    payment?.status,
    qrToken,
    session?.id,
  ]);

  async function handleCreatePayment() {
    if (!session?.id) {
      setError(
        "Không có thông tin session. Hãy quét QR lại."
      );

      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result =
        await createTourPayment({
          sessionId:
            Number(
              session.id
            ),
          method:
            paymentMethod,
        });

      const nextPayment =
        result?.payment ||
        null;

      setPayment(
        nextPayment
      );

      if (
        nextPayment?.status ===
        "paid"
      ) {
        await authorizeAfterPaid();
      }
    } catch (err) {
      setError(
        err?.message ||
          "Không thể tạo yêu cầu thanh toán."
      );
    } finally {
      setLoading(false);
    }
  }

  if (
    !session ||
    !qrToken
  ) {
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
                navigate(
                  "/scan-qr",
                  {
                    replace: true,
                  }
                )
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
      <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">

        <button
          type="button"
          onClick={() =>
            navigate(
              "/scan-qr"
            )
          }
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
              {session.name ||
                `Tour #${session.id}`}
            </p>

            <p className="mt-4 text-sm font-bold text-[#777]">
              Số tiền
            </p>

            <p className="mt-1 text-3xl font-extrabold text-[#168dcc]">
              {Number(
                session.price || 0
              ).toLocaleString(
                "vi-VN"
              )}{" "}
              {session.currency ||
                "VND"}
            </p>

          </div>

          <div className="mt-6">

            <p className="mb-3 text-sm font-extrabold text-[#222]">
              Phương thức thanh toán
            </p>

            {[
              {
                value: "online",
                title:
                  "Thanh toán online",
                icon: CreditCard,
                description:
                  "Hiện đang ở chế độ demo và chờ Admin xác nhận.",
              },
              {
                value: "offline",
                title:
                  "Thanh toán tiền mặt",
                icon: WalletCards,
                description:
                  "Yêu cầu ở trạng thái pending cho tới khi Admin xác nhận.",
              },
            ].map(
              ({
                value,
                title,
                icon: Icon,
                description,
              }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setPaymentMethod(
                      value
                    )
                  }
                  className={`mb-3 flex w-full items-center justify-between rounded-2xl border p-4 text-left ${
                    paymentMethod ===
                    value
                      ? "border-[#2196F3] bg-[#f0f7ff]"
                      : "border-[#dfe5eb]"
                  }`}
                >
                  <span className="flex items-center gap-3">

                    <Icon size={20} />

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
                    className={`h-5 w-5 rounded-full border-2 ${
                      paymentMethod ===
                      value
                        ? "border-[6px] border-[#2196F3]"
                        : "border-[#b8bec7]"
                    }`}
                  />
                </button>
              )
            )}

          </div>

          {payment?.status ===
          "pending" ? (
            <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#fff7e6] p-4 text-sm leading-6 text-[#8a5a00]">

              <LoaderCircle
                size={18}
                className="mt-0.5 shrink-0 animate-spin"
              />

              <div>
                <p className="font-extrabold">
                  Đang chờ xác nhận thanh toán
                </p>

                <p className="mt-1">
                  Trang tự kiểm tra trạng thái mỗi 3 giây.
                </p>
              </div>

            </div>
          ) : null}

          {success ? (
            <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#eaf8ef] p-4 text-sm leading-6 text-[#18794e]">
              <CheckCircle2
                size={18}
              />
              <p className="font-extrabold">
                {success}
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-2xl bg-[#fff1f1] p-4 text-sm leading-6 text-[#c62828]">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            disabled={
              loading ||
              payment?.status ===
                "pending"
            }
            onClick={() =>
              void handleCreatePayment()
            }
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2196F3] px-5 py-3.5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <LoaderCircle
                size={17}
                className="animate-spin"
              />
            ) : (
              <CreditCard
                size={17}
              />
            )}

            {loading
              ? "Đang tạo yêu cầu..."
              : "Tạo yêu cầu thanh toán"}
          </button>

        </div>
      </section>
    </UserLayout>
  );
}