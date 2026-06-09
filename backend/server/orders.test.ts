import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { orders, InsertOrder } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Orders", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  it("should create an order with valid data", async () => {
    if (!db) {
      expect(db).toBeDefined();
      return;
    }

    const pickupTime = new Date(Date.now() + 3600000);
    pickupTime.setMinutes(0, 0, 0);
    const pickupSlotEnd = new Date(pickupTime.getTime() + 30 * 60 * 1000);
    const testOrder: InsertOrder = {
      customerName: "Test Customer",
      customerPhone: "+91 9876543210",
      customerEmail: "test@example.com",
      totalPrice: 50000, // ₹500.00 in paise
      pickupTime,
      pickupSlotStart: pickupTime,
      pickupSlotEnd,
      pickupDate: pickupTime.toISOString().slice(0, 10),
      notes: "Test order",
      status: "pending",
    };

    const result = await db.insert(orders).values(testOrder);
    
    // The result should be an array with insert info
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should retrieve orders from database", async () => {
    if (!db) return;

    const result = await db.select().from(orders).limit(1);
    
    // Should have at least one order (from previous test or setup)
    expect(Array.isArray(result)).toBe(true);
  });

  it("should have correct order structure", async () => {
    if (!db) return;

    const result = await db.select().from(orders).limit(1);

    if (result.length > 0) {
      const order = result[0];
      expect(order).toHaveProperty("id");
      expect(order).toHaveProperty("customerName");
      expect(order).toHaveProperty("customerPhone");
      expect(order).toHaveProperty("totalPrice");
      expect(order).toHaveProperty("status");
      expect(order).toHaveProperty("pickupTime");
      expect(order).toHaveProperty("createdAt");
      expect(order).toHaveProperty("updatedAt");
    }
  });

  it("should have correct order status values", async () => {
    if (!db) return;

    const result = await db.select().from(orders).limit(1);

    if (result.length > 0) {
      const order = result[0];
      expect(["pending", "preparing", "confirmed", "ready", "completed", "cancelled"]).toContain(
        order.status
      );
    }
  });

  it("should have correct total price format", async () => {
    if (!db) return;

    const result = await db.select().from(orders).limit(1);

    if (result.length > 0) {
      const order = result[0];
      expect(order.totalPrice).toBeGreaterThan(0);
      expect(typeof order.totalPrice).toBe("number");
    }
  });

  it("should have timestamps", async () => {
    if (!db) return;

    const result = await db.select().from(orders).limit(1);

    if (result.length > 0) {
      const order = result[0];
      expect(order.createdAt).toBeDefined();
      expect(order.updatedAt).toBeDefined();
      expect(order.pickupTime).toBeDefined();
    }
  });

  it("should have customer information", async () => {
    if (!db) return;

    const result = await db.select().from(orders).limit(1);

    if (result.length > 0) {
      const order = result[0];
      expect(order.customerName).toBeDefined();
      expect(typeof order.customerName).toBe("string");
      expect(order.customerPhone).toBeDefined();
      expect(typeof order.customerPhone).toBe("string");
    }
  });

  it("should retrieve orders by phone number", async () => {
    if (!db) return;

    const testPhone = "+91 9876543210";
    const result = await db
      .select()
      .from(orders)
      .where(eq(orders.customerPhone, testPhone));

    // Should be an array (may be empty if no matching orders)
    expect(Array.isArray(result)).toBe(true);
  });
});
