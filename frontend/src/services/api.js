const base = () => (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") || "";

function getToken() {
  return localStorage.getItem("access_token");
}

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  let body = options.body;
  if (!(body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    if (body && typeof body === "object") {
      body = JSON.stringify(body);
    }
  }
  const t = getToken();
  if (t) headers["Authorization"] = `Bearer ${t}`;

  const res = await fetch(`${base()}${path}`, { ...options, headers, body });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { detail: text };
  }
  if (!res.ok) {
    let msg = data?.detail;
    if (Array.isArray(msg)) msg = msg.map((m) => m.msg || m).join(", ");
    if (typeof msg !== "string") msg = JSON.stringify(msg || data);
    throw new Error(msg || "Request failed");
  }
  return data;
}

export function setTokens(access, refresh) {
  if (access) localStorage.setItem("access_token", access);
  if (refresh) localStorage.setItem("refresh_token", refresh);
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function getRefreshToken() {
  return localStorage.getItem("refresh_token");
}
