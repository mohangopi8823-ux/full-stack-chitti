import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  DEFAULT_ORDER_SETTINGS,
  getAvailablePickupSlots,
  getISTNow,
  getPickupAvailabilityState,
  getPickupSlotFromDate,
  normalizeOrderSettings,
  type OrderSettings,
} from "../shared/orderLimits";
import { getStoreClosedMessage, normalizeStoreHours, type StoreHours } from "../shared/storeHours";
import { InsertUser, users, menuItems, orders, orderItems, InsertOrder, InsertOrderItem, Order, storeSettings, offers, type InsertMenuItem, type InsertOffer } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

function getDatabaseConnectionHint(error: unknown) {
  if (!(error instanceof Error)) return "";

  const isConnectTimeout =
    "code" in error && (error as { code?: unknown }).code === "CONNECT_TIMEOUT";
  const isInvalidPassword =
    "code" in error && (error as { code?: unknown }).code === "28P01";
  const isDirectSupabaseHost = error.message.includes("db.") && error.message.includes("supabase.co:5432");

  if (isInvalidPassword) {
    return " Supabase rejected the database credentials. Reset/copy the database password from Project Settings > Database, URL-encode special characters, update DATABASE_URL, and restart the server.";
  }

  if (!isConnectTimeout && !isDirectSupabaseHost) return "";

  return " Supabase direct database URLs can require IPv6. Use the Supabase pooler connection string from Dashboard > Connect > Connection pooling, then restart the server.";
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  const databaseUrl = process.env.DATABASE_URL || ENV.databaseUrl;
  if (!_db && databaseUrl) {
    try {
      _client = postgres(databaseUrl, {
        max: 5,
        ssl: "require",
        prepare: false,
        connect_timeout: 15,
        idle_timeout: 20,
      });
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

const menuCategoryImages: Record<string, string> = {
  pakodi: "/menu/pakodi.png",
  "non-veg-pulaos": "/menu/non-veg-pulaos.png",
  "veg-pulaos": "/menu/veg-pulaos.png",
  "chitti-naidu-curries": "/menu/curries.png",
  "chitti-naidu-desserts": "/menu/desserts.png",
  "extra-add-ons": "/menu/add-ons.png",
};

const STORE_HOURS_SETTING_KEY = "storeHours";
const ORDER_SETTINGS_KEY = "orderSettings";
const DAILY_ORDER_LIMIT_SETTING_KEY = "dailyOrderLimit";

type OrderCreateData = Omit<InsertOrder, "pickupSlotStart" | "pickupSlotEnd" | "pickupDate"> &
  Partial<Pick<InsertOrder, "pickupSlotStart" | "pickupSlotEnd" | "pickupDate">>;

export class OrdersClosedError extends Error {
  constructor(message = "Outlet is closed. Please try again during opening hours.") {
    super(message);
    this.name = "OrdersClosedError";
  }
}

export class InvalidPickupTimeError extends Error {
  constructor() {
    super("Invalid pickup time. Please select a valid future pickup slot.");
    this.name = "InvalidPickupTimeError";
  }
}

export function isInvalidPickupTimeError(error: unknown): error is InvalidPickupTimeError {
  return error instanceof InvalidPickupTimeError;
}

export function isOrdersClosedError(error: unknown): error is OrdersClosedError {
  return error instanceof OrdersClosedError;
}

function parseStoredSetting<T>(value: unknown): Partial<T> | undefined {
  if (!value) return undefined;
  if (typeof value === "object") return value as Partial<T>;
  if (typeof value !== "string") return undefined;

  try {
    return JSON.parse(value) as Partial<T>;
  } catch (error) {
    console.warn("[Database] Ignoring invalid stored setting JSON:", value, error);
    return undefined;
  }
}

function getMenuItemImageUrl(category: string) {
  return menuCategoryImages[category] ?? null;
}

function serializeMenuItem<T extends { category: string; imageUrl?: string | null }>(item: T) {
  return {
    ...item,
    imageUrl: item.imageUrl || getMenuItemImageUrl(item.category),
  };
}

export function getAvailableMenuItems() {
  return getDb().then((db) => {
    if (!db) {
      console.warn("[Database] Cannot get menu items: database not available");
      return [];
    }

    return db
      .select()
      .from(menuItems)
      .where(eq(menuItems.isAvailable, 1))
      .orderBy(menuItems.id)
      .then((items) => items.map(serializeMenuItem));
  });
}

export function getAllMenuItems() {
  return getDb().then((db) => {
    if (!db) {
      console.warn("[Database] Cannot get menu items: database not available");
      return [];
    }

    return db
      .select()
      .from(menuItems)
      .orderBy(menuItems.id)
      .then((items) => items.map(serializeMenuItem));
  });
}

export async function createMenuItem(data: Omit<InsertMenuItem, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not configured. Set DATABASE_URL and restart the server.");
  }

  const result = await db
    .insert(menuItems)
    .values({
      ...data,
      price: Number(data.price),
      isAvailable: Number(data.isAvailable ?? 1),
      isVegetarian: Number(data.isVegetarian ?? 0),
      stockQuantity: Number(data.stockQuantity ?? 100),
      updatedAt: new Date(),
    })
    .returning();

  return serializeMenuItem(result[0]);
}

export async function updateMenuItem(menuItemId: number, data: Partial<Omit<InsertMenuItem, "id" | "createdAt" | "updatedAt">>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not configured. Set DATABASE_URL and restart the server.");
  }

  const result = await db
    .update(menuItems)
    .set({
      ...data,
      ...(data.price !== undefined ? { price: Number(data.price) } : {}),
      ...(data.isAvailable !== undefined ? { isAvailable: Number(data.isAvailable) } : {}),
      ...(data.isVegetarian !== undefined ? { isVegetarian: Number(data.isVegetarian) } : {}),
      ...(data.stockQuantity !== undefined ? { stockQuantity: Number(data.stockQuantity) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(menuItems.id, menuItemId))
    .returning();

  if (!result[0]) {
    throw new Error(`Menu item #${menuItemId} was not found.`);
  }

  return serializeMenuItem(result[0]);
}

export async function deleteMenuItem(menuItemId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not configured. Set DATABASE_URL and restart the server.");
  }

  const result = await db
    .delete(menuItems)
    .where(eq(menuItems.id, menuItemId))
    .returning({ id: menuItems.id });

  if (!result[0]) {
    throw new Error(`Menu item #${menuItemId} was not found.`);
  }

  return { success: true } as const;
}

export async function getActiveOffers() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get offers: database not available");
    return [];
  }

  const today = new Date().toISOString().slice(0, 10);

  return db
    .select()
    .from(offers)
    .where(and(
      eq(offers.isActive, true),
      lte(offers.startDate, today),
      gte(offers.endDate, today),
    ))
    .orderBy(desc(offers.createdAt));
}

export async function getAllOffers() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get offers: database not available");
    return [];
  }

  return db.select().from(offers).orderBy(desc(offers.createdAt));
}

export async function createOffer(data: Omit<InsertOffer, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not configured. Set DATABASE_URL and restart the server.");
  }

  const result = await db
    .insert(offers)
    .values({
      ...data,
      isActive: data.isActive ?? true,
      updatedAt: new Date(),
    })
    .returning();

  return result[0];
}

export async function updateOffer(offerId: number, data: Partial<Omit<InsertOffer, "id" | "createdAt" | "updatedAt">>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not configured. Set DATABASE_URL and restart the server.");
  }

  const result = await db
    .update(offers)
    .set({
      ...data,
      ...(data.isActive !== undefined ? { isActive: Boolean(data.isActive) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(offers.id, offerId))
    .returning();

  if (!result[0]) {
    throw new Error(`Offer #${offerId} was not found.`);
  }

  return result[0];
}

export async function deleteOffer(offerId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not configured. Set DATABASE_URL and restart the server.");
  }

  const result = await db
    .delete(offers)
    .where(eq(offers.id, offerId))
    .returning({ id: offers.id });

  if (!result[0]) {
    throw new Error(`Offer #${offerId} was not found.`);
  }

  return { success: true } as const;
}

export async function getStoreHours(): Promise<StoreHours> {
  const db = await getDb();
  if (!db) {
    return normalizeStoreHours(undefined);
  }

  try {
    const result = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.key, STORE_HOURS_SETTING_KEY))
      .limit(1);
    const value = result[0]?.value;

    if (!value) {
      return normalizeStoreHours(undefined);
    }

    return normalizeStoreHours(parseStoredSetting<StoreHours>(value));
  } catch (error) {
    console.error("[Database] Failed to get store hours:", error);
    return normalizeStoreHours(undefined);
  }
}

export async function updateStoreHours(hours: StoreHours): Promise<StoreHours> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not configured. Set DATABASE_URL and restart the server.");
  }

  const normalized = normalizeStoreHours(hours);

  await db.insert(storeSettings).values({
    key: STORE_HOURS_SETTING_KEY,
    value: JSON.stringify(normalized),
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: storeSettings.key,
    set: {
      value: JSON.stringify(normalized),
      updatedAt: new Date(),
    },
  });

  return normalized;
}

export async function getOrderSettings(): Promise<OrderSettings> {
  const db = await getDb();
  if (!db) {
    const fallback = normalizeOrderSettings(DEFAULT_ORDER_SETTINGS);
    console.log("[Order Settings] Fetched acceptingOrders:", fallback.acceptingOrders);
    return fallback;
  }

  try {
    const result = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.key, ORDER_SETTINGS_KEY))
      .limit(1);
    const value = result[0]?.value;
    const dailyOrderLimit = await getDailyOrderLimit();

    if (!value) {
      const fallback = normalizeOrderSettings({
        ...DEFAULT_ORDER_SETTINGS,
        dailyOrderLimit,
      });
      console.log("[Order Settings] Fetched acceptingOrders:", fallback.acceptingOrders);
      return fallback;
    }

    const normalized = normalizeOrderSettings({
      ...parseStoredSetting<OrderSettings>(value),
      dailyOrderLimit,
    });
    console.log("[Order Settings] Fetched acceptingOrders:", normalized.acceptingOrders);
    return normalized;
  } catch (error) {
    console.error("[Database] Failed to get order settings:", error);
    const fallback = normalizeOrderSettings(DEFAULT_ORDER_SETTINGS);
    console.log("[Order Settings] Fetched acceptingOrders:", fallback.acceptingOrders);
    return fallback;
  }
}

export async function updateOrderSettings(settings: OrderSettings): Promise<OrderSettings> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not configured. Set DATABASE_URL and restart the server.");
  }

  const normalized = normalizeOrderSettings({
    ...settings,
    acceptingOrders: Boolean(settings.acceptingOrders),
    dailyOrderLimit: Number(settings.dailyOrderLimit),
  });
  console.log("[Order Settings] Saving acceptingOrders:", normalized.acceptingOrders);

  await db.insert(storeSettings).values({
    key: ORDER_SETTINGS_KEY,
    value: JSON.stringify({ acceptingOrders: normalized.acceptingOrders }),
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: storeSettings.key,
    set: {
      value: JSON.stringify({ acceptingOrders: normalized.acceptingOrders }),
      updatedAt: new Date(),
    },
  });
  await updateDailyOrderLimit(normalized.dailyOrderLimit);

  return normalized;
}

export async function getDailyOrderLimit(): Promise<number> {
  const db = await getDb();
  if (!db) {
    return DEFAULT_ORDER_SETTINGS.dailyOrderLimit;
  }

  try {
    const result = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.key, DAILY_ORDER_LIMIT_SETTING_KEY))
      .limit(1);
    const parsed = Number(result[0]?.value);

    return Number.isInteger(parsed) && parsed > 0
      ? parsed
      : DEFAULT_ORDER_SETTINGS.dailyOrderLimit;
  } catch (error) {
    console.error("[Database] Failed to get daily order limit:", error);
    return DEFAULT_ORDER_SETTINGS.dailyOrderLimit;
  }
}

export async function updateDailyOrderLimit(dailyOrderLimit: number): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not configured. Set DATABASE_URL and restart the server.");
  }

  const normalized = Number.isInteger(dailyOrderLimit) && dailyOrderLimit > 0
    ? dailyOrderLimit
    : DEFAULT_ORDER_SETTINGS.dailyOrderLimit;

  await db.insert(storeSettings).values({
    key: DAILY_ORDER_LIMIT_SETTING_KEY,
    value: String(normalized),
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: storeSettings.key,
    set: {
      value: String(normalized),
      updatedAt: new Date(),
    },
  });

  return normalized;
}

export async function getPickupAvailability() {
  const [hours, settings] = await Promise.all([getStoreHours(), getOrderSettings()]);
  const nowIST = getISTNow();
  const availabilityState = getPickupAvailabilityState(hours, nowIST);
  const generatedSlots = settings.acceptingOrders ? getAvailablePickupSlots(hours, nowIST) : [];
  const isOpen = settings.acceptingOrders && availabilityState.isOpen && generatedSlots.length > 0;
  const slots = settings.acceptingOrders ? generatedSlots : [];

  console.log({
    nowIST: availabilityState.nowIST,
    currentMinutes: availabilityState.currentMinutes,
    openingMinutes: availabilityState.openingMinutes,
    closingMinutes: availabilityState.closingMinutes,
    earliestPickupMinutes: availabilityState.earliestPickupMinutes,
    isWithinStoreHours: availabilityState.isWithinStoreHours,
    hasPickupTimeAvailable: availabilityState.hasPickupTimeAvailable,
    isOpen,
  });

  console.log("[Pickup Availability] Fresh IST slots generated:", {
    timeZone: "Asia/Kolkata",
    openingTime: hours.openingTime,
    closingTime: hours.closingTime,
    slotCount: slots.length,
    firstSlot: slots[0] ?? null,
    lastSlot: slots[slots.length - 1] ?? null,
  });

  return {
    hours,
    settings,
    acceptingOrders: settings.acceptingOrders,
    storeHours: hours,
    storeStatus: isOpen ? "open" : "closed",
    isOpen,
    closedMessage: isOpen ? "" : getStoreClosedMessage(hours),
    message: isOpen ? "" : getStoreClosedMessage(hours),
    slots,
  };
}

export async function updateMenuItemStock(menuItemId: number, stockQuantity: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not configured. Set DATABASE_URL and restart the server.");
  }

  const normalizedStock = Math.max(0, Math.floor(stockQuantity));
  const result = await db
    .update(menuItems)
    .set({
      stockQuantity: normalizedStock,
      updatedAt: new Date(),
    })
    .where(eq(menuItems.id, menuItemId))
    .returning({ id: menuItems.id, stockQuantity: menuItems.stockQuantity });

  if (!result[0]) {
    throw new Error(`Menu item #${menuItemId} was not found.`);
  }

  return result[0];
}

// Order Items
export async function createOrderItem(orderData: InsertOrderItem): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    // Ensure orderId is a number
    const validatedData: InsertOrderItem = {
      orderId: Number(orderData.orderId),
      menuItemId: Number(orderData.menuItemId),
      quantity: Number(orderData.quantity),
      priceAtOrder: Number(orderData.priceAtOrder),
    };

    const result = await db
      .insert(orderItems)
      .values(validatedData)
      .returning({ id: orderItems.id });
    const insertId = result[0]?.id;
    if (!insertId) {
      throw new Error("Failed to get insert ID from order item creation");
    }
    return Number(insertId);
  } catch (error) {
    console.error("[Database] Failed to create order item:", error);
    throw error;
  }
}

// Make sure your schema tables are correctly imported here to avoid circular dependencies
// import { users, menuItems, orders, orderItems } from "./schema";
// 1. Get a single menu item by ID
export async function getMenuItemById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  try {
    const result = await db.select().from(menuItems).where(eq(menuItems.id, id))
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get menu item by ID:", error);
return undefined;
  }
}

//2. create/ insert a new order
export async function createOrder(orderData: OrderCreateData): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    return await db.transaction(async (tx) => {
      const slot = await ensureOrderCanBeAccepted(tx, orderData, [], {
        decrementStock: false,
      });
      const result = await tx
        .insert(orders)
        .values({
          ...orderData,
          pickupTime: slot.start,
          pickupSlotStart: slot.start,
          pickupSlotEnd: slot.end,
          pickupDate: slot.pickupDate,
        })
        .returning({ id: orders.id });
      const insertId = result[0]?.id;
      if (!insertId) {
        throw new Error("Failed to get insert ID from order creation");
      }
      return Number(insertId);
    });
  } catch (error) {
    console.error("[Database] Failed to create order:", error);
    throw error;
  }
}

async function ensureOrderCanBeAccepted(
  dbOrTx: any,
  orderData: OrderCreateData,
  items: Omit<InsertOrderItem, "orderId">[],
  options: { decrementStock: boolean },
) {
  const [hoursResult, settingsResult] = await Promise.all([
    dbOrTx.select().from(storeSettings).where(eq(storeSettings.key, STORE_HOURS_SETTING_KEY)).limit(1),
    dbOrTx.select().from(storeSettings).where(eq(storeSettings.key, ORDER_SETTINGS_KEY)).limit(1),
  ]);
  const hours = normalizeStoreHours(parseStoredSetting<StoreHours>(hoursResult[0]?.value));
  const dailyOrderLimit = await getDailyOrderLimit();
  const settings = normalizeOrderSettings({
    ...parseStoredSetting<OrderSettings>(settingsResult[0]?.value),
    dailyOrderLimit,
  });
  console.log("[Order Settings] Fetched acceptingOrders before order:", settings.acceptingOrders);

  if (!settings.acceptingOrders) {
    throw new OrdersClosedError();
  }

  const nowIST = getISTNow();
  const availabilityState = getPickupAvailabilityState(hours, nowIST);
  if (!availabilityState.isOpen) {
    throw new OrdersClosedError();
  }

  const slot = getPickupSlotFromDate(orderData.pickupTime);
  const freshSlots = getAvailablePickupSlots(hours, nowIST);
  const validSlot = freshSlots
    .some((availableSlot) => availableSlot.startIso === slot.start.toISOString());

  console.log("[Pickup Availability] Validating selected pickup slot:", {
    validatedAtIST: nowIST,
    selectedSlot: slot.start.toISOString(),
    freshSlotCount: freshSlots.length,
    isValid: validSlot,
  });

  if (!validSlot) {
    throw freshSlots.length === 0
      ? new OrdersClosedError()
      : new InvalidPickupTimeError();
  }

  for (const item of items) {
    const quantity = Number(item.quantity);
    const result = options.decrementStock
      ? await dbOrTx
        .update(menuItems)
        .set({
          stockQuantity: sql`${menuItems.stockQuantity} - ${quantity}`,
          updatedAt: new Date(),
        })
        .where(and(
          eq(menuItems.id, Number(item.menuItemId)),
          eq(menuItems.isAvailable, 1),
          gte(menuItems.stockQuantity, quantity),
        ))
        .returning({
          id: menuItems.id,
          name: menuItems.name,
          stockQuantity: menuItems.stockQuantity,
        })
      : await dbOrTx
        .select({
          id: menuItems.id,
          name: menuItems.name,
          stockQuantity: menuItems.stockQuantity,
        })
        .from(menuItems)
        .where(and(
          eq(menuItems.id, Number(item.menuItemId)),
          eq(menuItems.isAvailable, 1),
          gte(menuItems.stockQuantity, quantity),
        ))
        .limit(1);

    if (!result[0]) {
      const menuItem = await dbOrTx
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, Number(item.menuItemId)))
        .limit(1);
      const itemName = menuItem[0]?.name ?? `Menu item #${item.menuItemId}`;
      throw new Error(`${itemName} is sold out or does not have enough stock.`);
    }
  }

  return slot;
}

export async function validateOrderAvailability(
  orderData: OrderCreateData,
  items: Omit<InsertOrderItem, "orderId">[],
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not configured. Set DATABASE_URL and restart the server.");
  }

  await ensureOrderCanBeAccepted(db, orderData, items, {
    decrementStock: false,
  });
}

export async function createOrderWithItems(
  orderData: OrderCreateData,
  items: Omit<InsertOrderItem, "orderId">[],
): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not configured. Set DATABASE_URL and restart the server.");
  }

  try {
    return await db.transaction(async (tx) => {
      const slot = await ensureOrderCanBeAccepted(tx, orderData, items, {
        decrementStock: true,
      });
      const orderResult = await tx.insert(orders).values({
        ...orderData,
        pickupTime: slot.start,
        pickupSlotStart: slot.start,
        pickupSlotEnd: slot.end,
        pickupDate: slot.pickupDate,
      }).returning({ id: orders.id });
      const orderId = orderResult[0]?.id;

      if (!orderId) {
        throw new Error("Failed to get insert ID from order creation");
      }

      if (items.length > 0) {
        await tx.insert(orderItems).values(
          items.map((item) => ({
            orderId: Number(orderId),
            menuItemId: Number(item.menuItemId),
            quantity: Number(item.quantity),
            priceAtOrder: Number(item.priceAtOrder),
          })),
        );
      }

      return Number(orderId);
    });
  } catch (error) {
    const hint = getDatabaseConnectionHint(error);
    console.error("[Database] Failed to create anonymous order:", error);
    throw hint && error instanceof Error
      ? new Error(`${error.message}.${hint}`)
      : error;
  }
}

//3. Get order details by order ID (including items)
export async function getOrderDetails(orderId: number) {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const orderResult = await db.select().from(orders).where(eq(orders.id, orderId))
    return orderResult.length > 0 ? orderResult[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get order details:", error);
    return undefined;
  }
}

// 4. Get all orders linked to a specific phone number
export async function getOrdersByPhoneNumber(phoneNumber: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    const ordersResult = await db
      .select()
      .from(orders)
      .where(eq(orders.customerPhone, phoneNumber))
      .orderBy(desc(orders.createdAt));
    return ordersResult;
  } catch (error) {
    console.error("[Database] Failed to get orders by phone number:", error);
    return [];
  }
}

export type OrderStatus = Order["status"];

function serializeOrder(order: Order) {
  return {
    ...order,
    pickupTime: order.pickupTime.toISOString(),
    pickupSlotStart: order.pickupSlotStart.toISOString(),
    pickupSlotEnd: order.pickupSlotEnd.toISOString(),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

async function attachItemsToOrders(orderRows: Order[]) {
  if (orderRows.length === 0) return [];

  const db = await getDb();
  if (!db) return [];

  const orderIds = orderRows.map((order) => order.id);
  const itemRows = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      menuItemId: orderItems.menuItemId,
      quantity: orderItems.quantity,
      priceAtOrder: orderItems.priceAtOrder,
      createdAt: orderItems.createdAt,
      menuItemName: menuItems.name,
    })
    .from(orderItems)
    .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .where(inArray(orderItems.orderId, orderIds));

  const itemsByOrderId = new Map<number, typeof itemRows>();
  for (const item of itemRows) {
    const orderId = Number(item.orderId);
    const existing = itemsByOrderId.get(orderId) ?? [];
    existing.push(item);
    itemsByOrderId.set(orderId, existing);
  }

  return orderRows.map((order) => ({
    ...serializeOrder(order),
    id: Number(order.id),
    totalPrice: Number(order.totalPrice),
    items: (itemsByOrderId.get(Number(order.id)) ?? []).map((item) => ({
      ...item,
      id: Number(item.id),
      orderId: Number(item.orderId),
      menuItemId: Number(item.menuItemId),
      quantity: Number(item.quantity),
      priceAtOrder: Number(item.priceAtOrder),
    })),
  }));
}

export async function getAllOrdersWithItems() {
  const db = await getDb();
  if (!db) return [];

  const orderRows = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt));

  return attachItemsToOrders(orderRows);
}

export async function getOrdersByPhoneNumberWithItems(phoneNumber: string) {
  const db = await getDb();
  if (!db) return [];

  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.customerPhone, phoneNumber.trim()))
    .orderBy(desc(orders.createdAt));

  return attachItemsToOrders(orderRows);
}

export async function getOrderDetailsWithItems(orderId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  const results = await attachItemsToOrders(orderRows);
  return results[0];
}

export async function updateOrderStatus(orderId: number, status: OrderStatus) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not configured. Set DATABASE_URL and restart the server.");
  }

  const result = await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning({ id: orders.id, status: orders.status });

  if (!result[0]) {
    throw new Error(`Order #${orderId} was not found.`);
  }

  return {
    id: Number(result[0].id),
    status: result[0].status,
  };
}

export async function updateOrderPaymentStatus(orderId: number, paymentStatus: "pending" | "paid") {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not configured. Set DATABASE_URL and restart the server.");
  }

  const result = await db
    .update(orders)
    .set({ paymentStatus, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning({ id: orders.id });

  if (!result[0]) {
    throw new Error(`Order #${orderId} was not found.`);
  }
}

// 5. Create/Insert attached order items for a specific order
export async function createOrderItems(orderItemsData: any[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const results = await db
      .insert(orderItems)
      .values(orderItemsData)
      .returning({ id: orderItems.id });

      return results[0];
  } catch (error) {
    console.error("[Database] Failed to create order items:", error);
    throw error;
  }
}
