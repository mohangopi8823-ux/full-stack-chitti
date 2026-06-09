export interface MenuItem {
  id: number | string;
  name: string;
  category: string;
  price: number;
  imageUrl?: string | null;
  description?: string | null;
  isVegetarian?: boolean | null;
  stockQuantity: number;
}

import { getApiUrl, getFetchErrorMessage } from "@/lib/api";

const MENU_FETCH_TIMEOUT_MS = 8_000;

export function normalizeMenuCategory(category: string) {
  return category.trim().toLowerCase();
}

export async function getMenuItems(): Promise<MenuItem[]> {
  let response: Response;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), MENU_FETCH_TIMEOUT_MS);

  try {
    response = await fetch(getApiUrl("/api/menu"), {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Menu is taking too long to load. Please check the backend database connection and try again.");
    }

    throw new Error(getFetchErrorMessage(error, "Unable to load menu"));
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as { message?: string } | undefined;
    throw new Error(body?.message ?? `Unable to load menu (${response.status})`);
  }

  const items = (await response.json()) as MenuItem[];

  return items.map((item) => ({
    ...item,
    category: normalizeMenuCategory(item.category),
  }));
}
