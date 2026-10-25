import { deviceHeaders } from "./userService";

const API_URL = (
  import.meta.env.VITE_API_URL || ""
).replace(/\/+$/, "");

// Tham số đầu (token) giữ lại cho tương thích, không còn dùng:
// du khách được nhận diện bằng mã thiết bị.
export async function chatWithAgent(
  _token,
  question,
  language = "vi"
) {
  const response = await fetch(
    `${API_URL}/api/agent/chat`,
    {
      method: "POST",

      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...deviceHeaders(),
      },

      body: JSON.stringify({
        question,
        language,
      }),
    }
  );

  const data =
    await response.json().catch(
      () => null
    );

  if (!response.ok) {
    throw new Error(
      data?.message ||
        "Không thể kết nối với AI."
    );
  }

  return data;
}