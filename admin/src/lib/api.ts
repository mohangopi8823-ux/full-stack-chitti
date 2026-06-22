function normalizeApiUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  const withoutTrailingSlash = trimmed.replace(/\/+$/, "");

  if (/^https:\/\/(localhost|127\.0\.0\.1)(?::|$)/i.test(withoutTrailingSlash)) {
    return withoutTrailingSlash.replace(/^https:/i, "http:");
  }

  return withoutTrailingSlash;
}

export const API_BASE_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);

export function getApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}

export function getFetchErrorMessage(error: unknown, fallback = "Request failed") {
  if (error instanceof TypeError && error.message.toLowerCase().includes("fetch")) {
    const target = API_BASE_URL || "the configured API URL";

    return `Backend is not reachable. Make sure the backend is running at ${target} and VITE_API_URL uses http, not https.`;
  }

  return error instanceof Error ? error.message : fallback;
}
