export const ORDERS_OFF_MESSAGE = "We are not accepting orders right now. Please try again later.";
export const DAILY_LIMIT_MESSAGE = "Today's order limit is reached. Please try again tomorrow.";

export const DEFAULT_ORDER_SETTINGS = {
  acceptingOrders: true,
  dailyOrderLimit: 100,
} as const;

export type OrderSettings = {
  acceptingOrders: boolean;
  dailyOrderLimit: number;
};

export function normalizeOrderSettings(settings: Partial<OrderSettings> | null | undefined): OrderSettings {
  return {
    acceptingOrders: settings?.acceptingOrders ?? DEFAULT_ORDER_SETTINGS.acceptingOrders,
    dailyOrderLimit: Number.isInteger(settings?.dailyOrderLimit) && settings!.dailyOrderLimit! > 0
      ? settings!.dailyOrderLimit!
      : DEFAULT_ORDER_SETTINGS.dailyOrderLimit,
  };
}
