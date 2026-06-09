import { formatStoreTime, isValidStoreTime, normalizeStoreHours, type StoreHours } from "./storeHours";

export const ORDERS_OFF_MESSAGE = "We are not accepting orders right now. Please try again later.";
export const DAILY_LIMIT_MESSAGE = "Today’s order limit is reached. Please try again tomorrow.";

export const DEFAULT_ORDER_SETTINGS = {
  acceptingOrders: true,
  dailyOrderLimit: 100,
} as const;

export type OrderSettings = {
  acceptingOrders: boolean;
  dailyOrderLimit: number;
};

export type PickupSlot = {
  startIso: string;
  endIso: string;
  startLabel: string;
  endLabel: string;
  label: string;
  pickupDate: string;
  dayLabel: "Today" | "Tomorrow";
};

const INDIA_OFFSET_MINUTES = 330;
const SLOT_MINUTES = 30;
const PREPARATION_MINUTES = 30;

export function normalizeOrderSettings(settings: Partial<OrderSettings> | null | undefined): OrderSettings {
  return {
    acceptingOrders: settings?.acceptingOrders ?? DEFAULT_ORDER_SETTINGS.acceptingOrders,
    dailyOrderLimit: Number.isInteger(settings?.dailyOrderLimit) && settings!.dailyOrderLimit! > 0
      ? settings!.dailyOrderLimit!
      : DEFAULT_ORDER_SETTINGS.dailyOrderLimit,
  };
}

export function timeToMinutes(value: string) {
  const normalized = isValidStoreTime(value) ? value : "00:00";
  const [hours, minutes] = normalized.split(":").map(Number);
  return hours * 60 + minutes;
}

export const getISTNow = () => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
};

function getISTDateStringFromLocalFields(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function ceilToSlotMinutes(minutes: number) {
  return Math.ceil(minutes / SLOT_MINUTES) * SLOT_MINUTES;
}

function addDaysToDateString(dateString: string, days: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return date.toISOString().slice(0, 10);
}

export function getIndiaDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

export function createIndiaDate(dateString: string, minutesFromMidnight: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const dayOffset = Math.floor(minutesFromMidnight / 1440);
  const minutes = minutesFromMidnight % 1440;
  const hours = Math.floor(minutes / 60);
  const minute = minutes % 60;

  return new Date(Date.UTC(year, month - 1, day + dayOffset, hours, minute) - INDIA_OFFSET_MINUTES * 60_000);
}

export function getPickupSlotFromDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0) % 24;
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  const pickupDate = `${year}-${month}-${day}`;
  const startMinutes = hour * 60 + minute;

  if (minute % SLOT_MINUTES !== 0) {
    throw new Error("Please select a valid 30-minute pickup time.");
  }

  return {
    pickupDate,
    start: date,
    end: createIndiaDate(pickupDate, startMinutes + SLOT_MINUTES),
  };
}

export function createPickupSlots(hours: StoreHours, startDate = getIndiaDateString(), dayCount = 2) {
  const normalizedHours = normalizeStoreHours(hours);
  const openingMinutes = timeToMinutes(normalizedHours.openingTime);
  const closingMinutes = timeToMinutes(normalizedHours.closingTime);
  const endMinutes = closingMinutes <= openingMinutes ? closingMinutes + 1440 : closingMinutes;
  const slots: PickupSlot[] = [];

  for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
    const baseDate = addDaysToDateString(startDate, dayIndex);

    for (let slotStart = openingMinutes; slotStart + SLOT_MINUTES <= endMinutes; slotStart += SLOT_MINUTES) {
      const slotEnd = slotStart + SLOT_MINUTES;
      const startDateTime = createIndiaDate(baseDate, slotStart);
      const endDateTime = createIndiaDate(baseDate, slotEnd);
      const pickupDate = slotStart >= 1440 ? addDaysToDateString(baseDate, 1) : baseDate;
      const dayLabel = pickupDate === startDate ? "Today" : "Tomorrow";
      const startTime = `${String(Math.floor((slotStart % 1440) / 60)).padStart(2, "0")}:${String(slotStart % 60).padStart(2, "0")}`;
      const endTime = `${String(Math.floor((slotEnd % 1440) / 60)).padStart(2, "0")}:${String(slotEnd % 60).padStart(2, "0")}`;
      const startLabel = formatStoreTime(startTime);
      const endLabel = formatStoreTime(endTime);

      slots.push({
        startIso: startDateTime.toISOString(),
        endIso: endDateTime.toISOString(),
        startLabel,
        endLabel,
        label: `${startLabel} - ${endLabel}`,
        pickupDate,
        dayLabel,
      });
    }
  }

  return slots;
}

export function getAvailablePickupSlots(
  hours: StoreHours,
  nowIST = getISTNow(),
) {
  const normalizedHours = normalizeStoreHours(hours);
  const openingMinutes = timeToMinutes(normalizedHours.openingTime);
  const closingMinutes = timeToMinutes(normalizedHours.closingTime);
  const today = getISTDateStringFromLocalFields(nowIST);
  const currentMinutes = nowIST.getHours() * 60 + nowIST.getMinutes();
  const earliestPickupMinutes = currentMinutes + PREPARATION_MINUTES;
  const firstSlotStart = currentMinutes < openingMinutes
    ? openingMinutes
    : ceilToSlotMinutes(earliestPickupMinutes);
  const slots: PickupSlot[] = [];

  for (
    let slotStart = firstSlotStart;
    slotStart + SLOT_MINUTES <= closingMinutes;
    slotStart += SLOT_MINUTES
  ) {
    const slotEnd = slotStart + SLOT_MINUTES;
    const startDateTime = createIndiaDate(today, slotStart);
    const endDateTime = createIndiaDate(today, slotEnd);
    const startTime = `${String(Math.floor(slotStart / 60)).padStart(2, "0")}:${String(slotStart % 60).padStart(2, "0")}`;
    const endTime = `${String(Math.floor(slotEnd / 60)).padStart(2, "0")}:${String(slotEnd % 60).padStart(2, "0")}`;
    const startLabel = formatStoreTime(startTime);
    const endLabel = formatStoreTime(endTime);

    slots.push({
      startIso: startDateTime.toISOString(),
      endIso: endDateTime.toISOString(),
      startLabel,
      endLabel,
      label: `${startLabel} - ${endLabel}`,
      pickupDate: today,
      dayLabel: "Today",
    });
  }

  return slots;
}

export function getPickupAvailabilityState(hours: StoreHours, nowIST = getISTNow()) {
  const normalizedHours = normalizeStoreHours(hours);
  const currentMinutes = nowIST.getHours() * 60 + nowIST.getMinutes();
  const openingMinutes = timeToMinutes(normalizedHours.openingTime);
  const closingMinutes = timeToMinutes(normalizedHours.closingTime);
  const preparationMinutes = PREPARATION_MINUTES;
  const earliestPickupMinutes = currentMinutes + preparationMinutes;
  const isWithinStoreHours =
    currentMinutes >= openingMinutes &&
    currentMinutes < closingMinutes;
  const hasPickupTimeAvailable =
    earliestPickupMinutes < closingMinutes;
  const isOpen = isWithinStoreHours && hasPickupTimeAvailable;

  return {
    nowIST,
    currentMinutes,
    openingMinutes,
    closingMinutes,
    preparationMinutes,
    earliestPickupMinutes,
    isWithinStoreHours,
    hasPickupTimeAvailable,
    isOpen,
  };
}
