export interface Offer {
  id: number;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  discountText: string;
  startDate: string;
  endDate: string;
  isActive: number;
}

import { getApiUrl, getFetchErrorMessage } from "@/lib/api";

const OFFERS_FETCH_TIMEOUT_MS = 8_000;

export async function getActiveOffers(): Promise<Offer[]> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), OFFERS_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(getApiUrl("/api/offers"), {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Cache-Control": "no-store",
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => undefined) as { message?: string } | undefined;
      throw new Error(body?.message ?? `Unable to load offers (${response.status})`);
    }

    return response.json() as Promise<Offer[]>;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Offers are taking too long to load. Please check the backend database connection and try again.");
    }

    throw new Error(getFetchErrorMessage(error, "Unable to load offers"));
  } finally {
    window.clearTimeout(timeout);
  }
}
