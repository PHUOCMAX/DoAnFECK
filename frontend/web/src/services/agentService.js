const API_URL = (
  import.meta.env.VITE_API_URL ||""
).replace(/\/+$/, "");

export async function chatWithAgent(
  token,
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
        Authorization: `Bearer ${token}`,
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