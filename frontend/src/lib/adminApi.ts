import { getApiUrl, getFetchErrorMessage } from "@/lib/api";

export interface AdminMenuItem {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  category: string;
  imageUrl?: string | null;
  isAvailable: number;
  stockQuantity: number;
}

export interface AdminOffer {
  id: number;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  discountText: string;
  startDate: string;
  endDate: string;
  isActive: number;
}

export interface MenuItemInput {
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  isAvailable: boolean;
  stockQuantity: number;
}

export interface OfferInput {
  title: string;
  description?: string;
  imageUrl?: string;
  discountText: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(getApiUrl(path), {
      ...init,
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        ...init?.headers,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => undefined) as { message?: string } | undefined;
      throw new Error(body?.message ?? `Request failed with status ${response.status}`);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    throw new Error(getFetchErrorMessage(error));
  }
}

export function listAdminMenuItems() {
  return apiFetch<AdminMenuItem[]>("/api/admin/menu");
}

export function createAdminMenuItem(input: MenuItemInput) {
  return apiFetch<AdminMenuItem>("/api/admin/menu", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminMenuItem(id: number, input: Partial<MenuItemInput>) {
  return apiFetch<AdminMenuItem>(`/api/admin/menu/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteAdminMenuItem(id: number) {
  return apiFetch<{ success: true }>(`/api/admin/menu/${id}`, {
    method: "DELETE",
  });
}

export function listAdminOffers() {
  return apiFetch<AdminOffer[]>("/api/admin/offers");
}

export function createAdminOffer(input: OfferInput) {
  return apiFetch<AdminOffer>("/api/admin/offers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminOffer(id: number, input: Partial<OfferInput>) {
  return apiFetch<AdminOffer>(`/api/admin/offers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteAdminOffer(id: number) {
  return apiFetch<{ success: true }>(`/api/admin/offers/${id}`, {
    method: "DELETE",
  });
}
