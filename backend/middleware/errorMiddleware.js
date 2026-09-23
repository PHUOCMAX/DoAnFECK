export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy endpoint ${req.method} ${req.originalUrl}.`,
  });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const status = error.statusCode ?? 500;

  if (status >= 500) {
    console.error(error);
  }

  return res.status(status).json({
    success: false,
    message:
      status >= 500
        ? "Đã xảy ra lỗi máy chủ."
        : error.message || "Yêu cầu không hợp lệ.",
  });
}
