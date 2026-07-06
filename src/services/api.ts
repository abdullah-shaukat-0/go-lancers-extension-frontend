const BASE_URL = "http://localhost:5050/api";

export async function request(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("shms_token");
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if ((options.method === "POST" || options.method === "PUT") && !options.body) {
    options.body = JSON.stringify({});
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.Message || errorData.message || `API request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
