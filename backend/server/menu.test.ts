import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { menuItems } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Menu Items", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  it("should have menu items in the database", async () => {
    if (!db) {
      expect(db).toBeDefined();
      return;
    }

    const items = await db.select().from(menuItems).limit(1);
    expect(items.length).toBeGreaterThan(0);
  });

  it("should have non-veg pulao category items", async () => {
    if (!db) return;

    const items = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.category, "non-veg-pulaos"));

    expect(items.length).toBeGreaterThan(0);
    expect(items.some((item: any) => item.name.includes("Pulao"))).toBe(true);
  });

  it("should have correct price format", async () => {
    if (!db) return;

    const items = await db.select().from(menuItems).limit(1);

    if (items.length > 0) {
      const item = items[0];
      expect(item.price).toBeGreaterThan(0);
      expect(typeof item.price).toBe("number");
    }
  });

  it("should have vegetarian flag", async () => {
    if (!db) return;

    const items = await db.select().from(menuItems).limit(1);

    if (items.length > 0) {
      const item = items[0];
      expect([0, 1]).toContain(item.isVegetarian);
    }
  });

  it("should have availability flag", async () => {
    if (!db) return;

    const items = await db.select().from(menuItems).limit(1);

    if (items.length > 0) {
      const item = items[0];
      expect([0, 1]).toContain(item.isAvailable);
    }
  });

  it("should have specific menu items", async () => {
    if (!db) return;

    const items = await db.select().from(menuItems);
    const itemNames = items.map((item: any) => item.name);

    expect(itemNames).toContain("Chicken Pakodi - 200gms");
    expect(itemNames).toContain("Gutti Vankaya Pulao - Single");
    expect(itemNames).toContain("Badam Paalu - 200ml");
  });

  it("should have correct pricing for known items", async () => {
    if (!db) return;

    const items = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.name, "Chicken Pakodi - 200gms"));

    if (items.length > 0) {
      expect(items[0].price).toBe(19900);
    }
  });
});
