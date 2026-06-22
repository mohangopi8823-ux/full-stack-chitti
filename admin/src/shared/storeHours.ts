export const INDIA_TIME_ZONE = "Asia/Kolkata";

export const DEFAULT_STORE_HOURS = {
  openingTime: "11:00",
  closingTime: "23:00",
} as const;

export type StoreHours = {
  openingTime: string;
  closingTime: string;
};

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidStoreTime(value: string) {
  return timePattern.test(value);
}

export function normalizeStoreHours(hours: Partial<StoreHours> | null | undefined): StoreHours {
  return {
    openingTime: isValidStoreTime(hours?.openingTime ?? "")
      ? hours!.openingTime!
      : DEFAULT_STORE_HOURS.openingTime,
    closingTime: isValidStoreTime(hours?.closingTime ?? "")
      ? hours!.closingTime!
      : DEFAULT_STORE_HOURS.closingTime,
  };
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatStoreTime(value: string) {
  const normalized = isValidStoreTime(value) ? value : DEFAULT_STORE_HOURS.openingTime;
  const [hourValue, minuteValue] = normalized.split(":").map(Number);
  const suffix = hourValue >= 12 ? "PM" : "AM";
  const displayHour = hourValue % 12 || 12;

  return `${displayHour}:${String(minuteValue).padStart(2, "0")} ${suffix}`;
}

export function getStoreClosedMessage(hours: StoreHours) {
  return "Outlet is closed. Pickup orders are currently not available.";
}

export function getStoreHoursLabel(hours: StoreHours) {
  const normalized = normalizeStoreHours(hours);
  return `${formatStoreTime(normalized.openingTime)} to ${formatStoreTime(normalized.closingTime)} IST`;
}

export function getIndiaTimeMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: INDIA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0) % 24;
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);

  return hour * 60 + minute;
}

export function isStoreOpenAtIndiaTime(hours: StoreHours, date = new Date()) {
  const normalized = normalizeStoreHours(hours);
  const openingMinutes = timeToMinutes(normalized.openingTime);
  const closingMinutes = timeToMinutes(normalized.closingTime);
  const currentMinutes = getIndiaTimeMinutes(date);

  if (openingMinutes === closingMinutes) {
    return true;
  }

  if (openingMinutes < closingMinutes) {
    return currentMinutes >= openingMinutes && currentMinutes < closingMinutes;
  }

  return currentMinutes >= openingMinutes || currentMinutes < closingMinutes;
}

export function getStoreClosedNotice(hours: StoreHours, date = new Date()) {
  const normalized = normalizeStoreHours(hours);

  if (isStoreOpenAtIndiaTime(normalized, date)) {
    return "";
  }

  return "Outlet is closed. Pickup orders are currently not available.";
}
