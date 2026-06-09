import { boolean, date, integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const orderStatus = pgEnum("order_status", ["pending", "preparing", "confirmed", "ready", "completed", "cancelled"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRole("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const menuItems = pgTable("menuItems", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  imageUrl: text("image"),
  isVegetarian: integer("isVegetarian").default(0).notNull(),
  isAvailable: integer("isAvailable").default(1).notNull(),
  stockQuantity: integer("stockQuantity").default(100).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = typeof menuItems.$inferInsert;

export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  discountText: text("discount_text"),
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Offer = typeof offers.$inferSelect;
export type InsertOffer = typeof offers.$inferInsert;

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 20 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }),
  totalPrice: integer("totalPrice").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 32 }).default("online_payment").notNull(),
  paymentStatus: varchar("paymentStatus", { length: 32 }).default("paid").notNull(),
  status: orderStatus("status").default("pending").notNull(),
  pickupTime: timestamp("pickupTime").notNull(),
  pickupSlotStart: timestamp("pickupSlotStart").notNull(),
  pickupSlotEnd: timestamp("pickupSlotEnd").notNull(),
  pickupDate: varchar("pickupDate", { length: 10 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export const orderItems = pgTable("orderItems", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  menuItemId: integer("menuItemId").notNull(),
  quantity: integer("quantity").notNull(),
  priceAtOrder: integer("priceAtOrder").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

export const dailyOrderCounts = pgTable("dailyOrderCounts", {
  pickupDate: varchar("pickupDate", { length: 10 }).primaryKey(),
  orderCount: integer("orderCount").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DailyOrderCount = typeof dailyOrderCounts.$inferSelect;
export type InsertDailyOrderCount = typeof dailyOrderCounts.$inferInsert;

export const storeSettings = pgTable("storeSettings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type StoreSetting = typeof storeSettings.$inferSelect;
export type InsertStoreSetting = typeof storeSettings.$inferInsert;
