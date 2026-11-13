// Mốc bắt đầu (UTC) của từng khoảng thời gian, tính theo ngày giờ Việt Nam.
// Chỉ dùng chuỗi trong danh sách này để ghép vào SQL.
const VN_TODAY = "DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00'))";

export const MONITORING_RANGES = {
  today: `CONVERT_TZ(${VN_TODAY}, '+07:00', '+00:00')`,
  "7d": `CONVERT_TZ(${VN_TODAY} - INTERVAL 6 DAY, '+07:00', '+00:00')`,
  month: `CONVERT_TZ(DATE_FORMAT(${VN_TODAY}, '%Y-%m-01'), '+07:00', '+00:00')`,
  all: null,
};

// Giá trị lạ (hoặc không truyền) thì xem như "all".
export function resolveMonitoringRange(value) {
  return typeof value === "string" && Object.hasOwn(MONITORING_RANGES, value)
    ? value
    : "all";
}

// Trả về hàm tạo điều kiện SQL "cột >= mốc bắt đầu" cho khoảng đã chọn.
export function monitoringFilter(range) {
  const since = MONITORING_RANGES[resolveMonitoringRange(range)];

  return (column) => (since ? `${column} >= ${since}` : "1 = 1");
}
