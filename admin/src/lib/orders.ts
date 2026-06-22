export interface OrderItemInput {
  menuItemId: number;
  quantity: number;
  priceAtOrder: number;
}

export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  totalPrice: number;
  pickupTime: Date;
  items: OrderItemInput[];
}

export interface TrackedOrder {
  id: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  totalPrice: number;
  paymentMethod: "cash_on_pickup" | "online_payment";
  paymentStatus: "pending" | "paid";
  status: string;
  pickupTime: string;
  pickupSlotStart: string;
  pickupSlotEnd: string;
  pickupDate: string;
  createdAt: string;
  items: TrackedOrderItem[];
}

export interface TrackedOrderItem {
  id: number;
  orderId: number;
  menuItemId: number;
  menuItemName?: string | null;
  name?: string | null;
  menuItem?: {
    name?: string | null;
  } | null;
  quantity: number;
  priceAtOrder: number;
}

export type OrderStatus = "pending" | "preparing" | "confirmed" | "ready" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "paid";

import { getApiUrl, getFetchErrorMessage } from "@/lib/api";
import { getAdminToken } from "@/lib/adminAuth";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(getApiUrl(path), {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        ...(getAdminToken() ? { Authorization: `Bearer ${getAdminToken()}` } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    throw new Error(getFetchErrorMessage(error));
  }

  if (!response.ok) {
    const body = await response.json().catch(() => undefined) as { message?: string } | undefined;
    throw new Error(body?.message ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function createOrder({
  customerName,
  customerPhone,
  customerEmail,
  totalPrice,
  pickupTime,
  items,
}: CreateOrderInput) {
  return apiFetch<{ orderId: number }>("/api/orders", {
    method: "POST",
    body: JSON.stringify({
      customerName,
      customerPhone,
      customerEmail,
      totalPrice: Number(totalPrice),
      pickupTime: pickupTime.toISOString(),
      items: items.map((item) => ({
        menuItemId: Number(item.menuItemId),
        quantity: Number(item.quantity),
        priceAtOrder: Number(item.priceAtOrder),
      })),
    }),
  });
}

export async function getOrdersByPhone(customerPhone: string): Promise<TrackedOrder[]> {
  const phone = customerPhone.trim();
  return apiFetch<TrackedOrder[]>(`/api/orders/phone/${encodeURIComponent(phone)}`);
}

export async function trackOrder(customerPhone: string, orderId: number): Promise<TrackedOrder> {
  return apiFetch<TrackedOrder>("/api/orders/track", {
    method: "POST",
    cache: "no-store",
    body: JSON.stringify({
      customerPhone: customerPhone.trim(),
      orderId,
    }),
  });
}

export async function requestTrackOrderOtp(customerPhone: string) {
  return apiFetch<{ success: true; message: string; devOtp?: string }>("/api/orders/track-otp", {
    method: "POST",
    body: JSON.stringify({ customerPhone: customerPhone.trim() }),
  });
}

export async function verifyTrackOrderOtp(customerPhone: string, otp: string): Promise<TrackedOrder[]> {
  return apiFetch<TrackedOrder[]>("/api/orders/verify-track-otp", {
    method: "POST",
    body: JSON.stringify({
      customerPhone: customerPhone.trim(),
      otp: otp.trim(),
    }),
  });
}

export async function getAllOrders(): Promise<TrackedOrder[]> {
  return apiFetch<TrackedOrder[]>("/api/orders");
}

export async function getOrderById(orderId: number): Promise<TrackedOrder | null> {
  try {
    return await apiFetch<TrackedOrder>(`/api/orders/${orderId}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Order not found")) {
      return null;
    }

    throw error;
  }
}

export async function updateOrderStatus(orderId: number, status: OrderStatus) {
  return apiFetch<{ success: true; id: number; status: OrderStatus }>(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    cache: "no-store",
    body: JSON.stringify({ status }),
  });
}

export async function updateOrderPaymentStatus(orderId: number, paymentStatus: PaymentStatus) {
  await apiFetch<{ success: true }>(`/api/orders/${orderId}/payment-status`, {
    method: "PATCH",
    body: JSON.stringify({ paymentStatus }),
  });
}
