const ADMIN_AUTH_KEY = "chitti_naidu_admin_auth";

import { getApiUrl, getFetchErrorMessage } from "@/lib/api";

export function getAdminCredentials() {
  return {
    username: import.meta.env.VITE_ADMIN_USERNAME || "admin",
    password: import.meta.env.VITE_ADMIN_PASSWORD || "admin123",
  };
}

export function isAdminLoggedIn() {
  return Boolean(getAdminToken());
}

export function getAdminToken() {
  return localStorage.getItem(ADMIN_AUTH_KEY);
}

export async function loginAdmin(username: string, password: string) {
  try {
    const response = await fetch(getApiUrl("/api/admin/login"), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username.trim(),
        password,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => undefined) as { message?: string } | undefined;
      throw new Error(body?.message ?? "Invalid username or password");
    }

    const body = await response.json().catch(() => ({})) as { token?: string };
    localStorage.setItem(ADMIN_AUTH_KEY, body.token ?? "cookie-session");
    return true;
  } catch (error) {
    throw new Error(getFetchErrorMessage(error));
  }
}

export async function logoutAdmin() {
  localStorage.removeItem(ADMIN_AUTH_KEY);
  await fetch(getApiUrl("/api/admin/logout"), {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined);
}
