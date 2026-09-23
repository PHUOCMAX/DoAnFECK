const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export function validateRegistrationPayload(payload = {}) {
  const { name, email, password } = payload;

  if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
    return "Vui lòng nhập đầy đủ thông tin.";
  }

  if (name.trim().length > 100) {
    return "Họ tên không được dài quá 100 ký tự.";
  }

  if (!EMAIL_PATTERN.test(normalizeEmail(email))) {
    return "Email không hợp lệ.";
  }

  if (password.length < 8) {
    return "Mật khẩu phải có ít nhất 8 ký tự.";
  }

  if (password.length > 128) {
    return "Mật khẩu không được dài quá 128 ký tự.";
  }

  return null;
}

export function validateLoginPayload(payload = {}) {
  const { email, password } = payload;

  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    return "Vui lòng nhập email và mật khẩu.";
  }

  if (!EMAIL_PATTERN.test(normalizeEmail(email))) {
    return "Email hoặc mật khẩu không đúng.";
  }

  return null;
}
