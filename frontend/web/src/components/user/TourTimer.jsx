import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock3 } from "lucide-react";

import {
  clearTourAuthorization,
  getTourAuthorization,
} from "../../services/userService";

/*
 * Mỗi lượt vào tour có thời hạn (mặc định 2 giờ): cho khách biết còn bao lâu,
 * cảnh báo khi còn dưới 10 phút, hết giờ thì đưa về trang quét QR.
 */
function minutesLeft() {
  const authorization = getTourAuthorization();
  const expiresAt =
    authorization?.expiresAt || authorization?.session?.expiresAt;

  if (!authorization || !expiresAt) {
    return null;
  }

  return Math.ceil((new Date(expiresAt) - Date.now()) / 60000);
}

export default function TourTimer() {
  const navigate = useNavigate();
  const [left, setLeft] = useState(minutesLeft);

  useEffect(() => {
    function tick() {
      const value = minutesLeft();

      if (value !== null && value <= 0) {
        clearTourAuthorization();
        setLeft(null);
        navigate("/scan-qr", { replace: true });
        return;
      }

      setLeft(value);
    }

    const timer = setInterval(tick, 30 * 1000);
    window.addEventListener("tour-authorization-changed", tick);

    return () => {
      clearInterval(timer);
      window.removeEventListener("tour-authorization-changed", tick);
    };
  }, [navigate]);

  if (left === null) {
    return null;
  }

  const warning = left <= 10;
  const text =
    left >= 60
      ? `Còn ${Math.floor(left / 60)} giờ ${left % 60} phút trong tour`
      : `Còn ${left} phút trong tour`;

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-bold ${
        warning ? "bg-[#fff1e6] text-[#b45309]" : "bg-[#eaf7ff] text-[#168dcc]"
      }`}
      role="status"
    >
      <Clock3 size={14} />
      {text}
      {warning && " · sắp hết giờ, quét lại QR để tiếp tục"}
    </div>
  );
}
