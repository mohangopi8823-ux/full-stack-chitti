import dotenv from "dotenv";
import path from "path";
import express from "express";
import { createServer } from "http";
import { z } from "zod";
import crypto from "crypto";
import cron from "node-cron";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { ENV } from "./env";
import { backupOldOrders, backupOldOrdersAndDelete } from "../jobs/backupOldOrders.js";
import {
  createOrderWithItems,
  getAllOrdersWithItems,
  getAllMenuItems,
  getAvailableMenuItems,
  isOrdersClosedError,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getActiveOffers,
  getAllOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  getOrderDetailsWithItems,
  getOrdersByPhoneNumberWithItems,
  isInvalidPickupTimeError,
  updateOrderPaymentStatus,
  updateOrderStatus,
} from "../db";

const ADMIN_COOKIE_NAME = "chitti_admin_session";
const LOCAL_DEV_FRONTEND_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5175",
]);

const envPath = path.resolve(process.cwd(), ".env.local");
const defaultPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });
dotenv.config({ path: defaultPath });

const orderApiSchema = z.object({
  customerName: z.string().trim().min(1).max(255),
  customerPhone: z.string().trim().min(10).max(20),
  customerEmail: z.string().trim().max(320).optional().transform((email) => email || undefined),
  totalPrice: z.coerce.number().int().positive(),
  pickupTime: z.coerce.date().refine((date) => date.getTime() > Date.now(), "Invalid pickup time. Please select a valid future pickup slot."),
  notes: z.string().trim().optional().transform((notes) => notes || undefined),
  paymentMethod: z.enum(["cash_on_pickup", "online_payment"]).default("cash_on_pickup"),
  paymentStatus: z.enum(["pending", "paid"]).default("pending"),
  items: z.array(z.object({
    menuItemId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive(),
    priceAtOrder: z.coerce.number().int().nonnegative(),
  })).min(1),
});

const orderStatusApiSchema = z.object({
  status: z.enum(["pending", "preparing", "confirmed", "ready", "completed", "cancelled"]),
});

const paymentStatusApiSchema = z.object({
  paymentStatus: z.enum(["pending", "paid"]),
});

const adminLoginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

const menuItemApiSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().optional().transform((value) => value || undefined),
  price: z.coerce.number().int().positive(),
  category: z.string().trim().min(1).max(100),
  imageUrl: z.string().trim().optional().transform((value) => value || undefined),
  isAvailable: z.boolean().transform((value) => value ? 1 : 0),
  stockQuantity: z.coerce.number().int().nonnegative().default(100),
  isVegetarian: z.coerce.number().int().min(0).max(1).default(0),
});

const offerApiBaseSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().optional().transform((value) => value || undefined),
  imageUrl: z.string().trim().optional().transform((value) => value || undefined),
  discountText: z.string().trim().min(1).max(120),
  startDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  isActive: z.boolean(),
});

const offerApiSchema = offerApiBaseSchema.refine((offer) => offer.endDate >= offer.startDate, {
  message: "End date must be on or after start date",
  path: ["endDate"],
});

const offerUpdateApiSchema = offerApiBaseSchema.partial().refine((offer) => {
  if (!offer.startDate || !offer.endDate) return true;
  return offer.endDate >= offer.startDate;
}, {
  message: "End date must be on or after start date",
  path: ["endDate"],
});

const trackOtpRequestSchema = z.object({
  customerPhone: z.string().trim().min(10).max(20),
});

const trackOrderRequestSchema = trackOtpRequestSchema.extend({
  orderId: z.number().int().positive(),
});

const trackOtpVerifySchema = trackOtpRequestSchema.extend({
  otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6 digit OTP"),
});

const trackOrderOtps = new Map<string, { code: string; expiresAt: number }>();
const PUBLIC_API_TIMEOUT_MS = 6_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

function getAdminSessionSecret() {
  const secret = ENV.adminSessionSecret || ENV.cookieSecret;
  if (secret) return secret;
  console.warn("[Admin Auth] ADMIN_SESSION_SECRET is missing. Using development-only fallback.");
  return "development-admin-session-secret";
}

function signAdminSession(payload: string) {
  return crypto
    .createHmac("sha256", getAdminSessionSecret())
    .update(payload)
    .digest("hex");
}

function createAdminSessionToken() {
  const expiresAt = Date.now() + 12 * 60 * 60 * 1000;
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = `${expiresAt}.${nonce}`;
  return `${payload}.${signAdminSession(payload)}`;
}

function parseCookies(cookieHeader: string | undefined) {
  return Object.fromEntries(
    (cookieHeader ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf("=");
        if (separatorIndex === -1) return [part, ""];
        return [
          decodeURIComponent(part.slice(0, separatorIndex)),
          decodeURIComponent(part.slice(separatorIndex + 1)),
        ];
      }),
  );
}

function isValidAdminSessionToken(token: string | undefined) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [expiresAtText, nonce, signature] = parts;
  const payload = `${expiresAtText}.${nonce}`;
  const expectedSignature = signAdminSession(payload);
  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    return false;
  }

  const expiresAt = Number(expiresAtText);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function getAdminBearerToken(req: express.Request) {
  const value = req.headers.authorization;
  if (!value) return undefined;
  const [scheme, token] = value.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : undefined;
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const cookies = parseCookies(req.headers.cookie);

  if (
    !isValidAdminSessionToken(cookies[ADMIN_COOKIE_NAME]) &&
    !isValidAdminSessionToken(getAdminBearerToken(req))
  ) {
    res.status(401).json({ message: "Admin login required" });
    return;
  }

  next();
}

function setAdminSessionCookie(res: express.Response) {
  const token = createAdminSessionToken();

  res.cookie(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: ENV.isProduction,
    maxAge: 12 * 60 * 60 * 1000,
    path: "/",
  });

  return token;
}

function clearAdminSessionCookie(res: express.Response) {
  res.clearCookie(ADMIN_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: ENV.isProduction,
    path: "/",
  });
}

function getAdminSecretHeader(req: express.Request) {
  const value = req.headers["x-admin-secret"];
  return Array.isArray(value) ? value[0] : value;
}

function isBackupRouteAuthorized(req: express.Request) {
  const configuredSecret = ENV.backupAdminSecret;
  const providedSecret = getAdminSecretHeader(req);

  if (!configuredSecret || !providedSecret) {
    return false;
  }

  const configured = Buffer.from(configuredSecret);
  const provided = Buffer.from(providedSecret);

  return configured.length === provided.length && crypto.timingSafeEqual(configured, provided);
}

function createTrackOrderOtp(customerPhone: string) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  trackOrderOtps.set(customerPhone, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
  return code;
}

function getFast2SmsMobile(customerPhone: string) {
  const digits = customerPhone.replace(/\D/g, "");
  const mobile = digits.length > 10 ? digits.slice(-10) : digits;

  if (!/^[6-9]\d{9}$/.test(mobile)) {
    throw new Error("Enter a valid 10 digit Indian mobile number");
  }

  return mobile;
}

async function sendTrackOrderOtpSms(customerPhone: string, otp: string) {
  if (!ENV.fast2smsApiKey) {
    console.warn("[Fast2SMS] FAST2SMS_API_KEY is missing. Using dev OTP only.");
    return { sent: false, reason: "missing_api_key" } as const;
  }

  const mobile = getFast2SmsMobile(customerPhone);

  if (ENV.fast2smsOtpId) {
    const response = await fetch("https://www.fast2sms.com/dev/otp/send", {
      method: "POST",
      headers: {
        authorization: ENV.fast2smsApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mobile,
        otp_id: ENV.fast2smsOtpId,
        otp_expiry: 5,
        otp_length: 6,
        otp,
      }),
    });

    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText);
      throw new Error(`Fast2SMS OTP send failed: ${message}`);
    }

    return { sent: true } as const;
  }

  const url = new URL("https://www.fast2sms.com/dev/bulkV2");
  url.searchParams.set("authorization", ENV.fast2smsApiKey);
  url.searchParams.set("variables_values", otp);
  url.searchParams.set("route", "otp");
  url.searchParams.set("numbers", mobile);

  const response = await fetch(url);
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Fast2SMS OTP send failed: ${message}`);
  }

  return { sent: true } as const;
}

function verifyTrackOrderOtp(customerPhone: string, otp: string) {
  const savedOtp = trackOrderOtps.get(customerPhone);
  if (!savedOtp || savedOtp.expiresAt < Date.now()) {
    trackOrderOtps.delete(customerPhone);
    return false;
  }

  const isValid = savedOtp.code === otp;
  if (isValid) {
    trackOrderOtps.delete(customerPhone);
  }

  return isValid;
}

function isAllowedFrontendOrigin(origin: string | undefined) {
  if (!origin) return false;
  if (origin === ENV.frontendUrl) return true;
  if (origin === ENV.adminFrontendUrl) return true;

  return !ENV.isProduction && LOCAL_DEV_FRONTEND_ORIGINS.has(origin);
}

function registerOrderApiRoutes(app: express.Express) {
  app.post("/api/admin/login", (req, res) => {
    const parsed = adminLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Username and password are required" });
      return;
    }

    const usernameMatches = parsed.data.username === ENV.adminUsername;
    const passwordMatches = parsed.data.password === ENV.adminPassword;

    if (!usernameMatches || !passwordMatches) {
      res.status(401).json({ message: "Invalid username or password" });
      return;
    }

    const token = setAdminSessionCookie(res);
    res.json({ success: true, token });
  });

  app.post("/api/admin/logout", (_req, res) => {
    clearAdminSessionCookie(res);
    res.json({ success: true });
  });

  app.get("/api/admin/session", (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    res.json({
      authenticated:
        isValidAdminSessionToken(cookies[ADMIN_COOKIE_NAME]) ||
        isValidAdminSessionToken(getAdminBearerToken(req)),
    });
  });

  app.get("/api/menu", async (_req, res) => {
    try {
      res.json(await withTimeout(getAvailableMenuItems(), PUBLIC_API_TIMEOUT_MS, "Menu query"));
    } catch (error) {
      console.error("[API] Failed to list menu items:", error);
      res.status(503).json({ message: "Menu is temporarily unavailable. Please try again." });
    }
  });

  app.get("/api/offers", async (_req, res) => {
    try {
      res.json(await withTimeout(getActiveOffers(), PUBLIC_API_TIMEOUT_MS, "Offers query"));
    } catch (error) {
      console.error("[API] Failed to list offers:", error);
      res.status(503).json({ message: "Offers are temporarily unavailable. Please try again." });
    }
  });

  app.get("/api/admin/menu", requireAdmin, async (_req, res) => {
    try {
      res.json(await withTimeout(getAllMenuItems(), PUBLIC_API_TIMEOUT_MS, "Admin menu query"));
    } catch (error) {
      console.error("[Admin API] Failed to list menu items:", error);
      res.status(503).json({ message: "Menu items are temporarily unavailable. Please try again." });
    }
  });

  app.post("/api/admin/menu", requireAdmin, async (req, res) => {
    const parsed = menuItemApiSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid menu item", issues: parsed.error.issues });
      return;
    }

    try {
      res.status(201).json(await createMenuItem(parsed.data));
    } catch (error) {
      console.error("[Admin API] Failed to create menu item:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Unable to create menu item" });
    }
  });

  app.patch("/api/admin/menu/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const parsed = menuItemApiSchema.partial().safeParse(req.body);
    if (!Number.isInteger(id) || id <= 0 || !parsed.success) {
      res.status(400).json({ message: "Invalid menu item update", issues: parsed.success ? undefined : parsed.error.issues });
      return;
    }

    try {
      res.json(await updateMenuItem(id, parsed.data));
    } catch (error) {
      console.error("[Admin API] Failed to update menu item:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Unable to update menu item" });
    }
  });

  app.delete("/api/admin/menu/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "Invalid menu item ID" });
      return;
    }

    try {
      res.json(await deleteMenuItem(id));
    } catch (error) {
      console.error("[Admin API] Failed to delete menu item:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Unable to delete menu item" });
    }
  });

  app.get("/api/admin/offers", requireAdmin, async (_req, res) => {
    try {
      res.json(await withTimeout(getAllOffers(), PUBLIC_API_TIMEOUT_MS, "Admin offers query"));
    } catch (error) {
      console.error("[Admin API] Failed to list offers:", error);
      res.status(503).json({ message: "Offers are temporarily unavailable. Please try again." });
    }
  });

  app.post("/api/admin/offers", requireAdmin, async (req, res) => {
    const parsed = offerApiSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid offer", issues: parsed.error.issues });
      return;
    }

    try {
      res.status(201).json(await createOffer(parsed.data));
    } catch (error) {
      console.error("[Admin API] Failed to create offer:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Unable to create offer" });
    }
  });

  app.patch("/api/admin/offers/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const parsed = offerUpdateApiSchema.safeParse(req.body);
    if (!Number.isInteger(id) || id <= 0 || !parsed.success) {
      res.status(400).json({ message: "Invalid offer update", issues: parsed.success ? undefined : parsed.error.issues });
      return;
    }

    try {
      res.json(await updateOffer(id, parsed.data));
    } catch (error) {
      console.error("[Admin API] Failed to update offer:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Unable to update offer" });
    }
  });

  app.delete("/api/admin/offers/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "Invalid offer ID" });
      return;
    }

    try {
      res.json(await deleteOffer(id));
    } catch (error) {
      console.error("[Admin API] Failed to delete offer:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Unable to delete offer" });
    }
  });

  app.get("/api/orders", requireAdmin, async (_req, res) => {
    try {
      res.json(await getAllOrdersWithItems());
    } catch (error) {
      console.error("[API] Failed to list orders:", error);
      res.status(500).json({ message: "Unable to load orders" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    const parsed = orderApiSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid order data", issues: parsed.error.issues });
      return;
    }

    try {
      const { items, ...orderData } = parsed.data;
      const id = await createOrderWithItems(
        {
          ...orderData,
          paymentMethod: "cash_on_pickup",
          paymentStatus: "pending",
        },
        items,
      );
      res.status(201).json({ orderId: id });
    } catch (error) {
      console.error("[API] Failed to create order:", error);
      const message = error instanceof Error ? error.message : "Unable to create order";
      res.status(isInvalidPickupTimeError(error) ? 400 : isOrdersClosedError(error) ? 403 : 500).json({ message });
    }
  });

  app.get("/api/orders/phone/:phone", async (req, res) => {
    try {
      res.json(await getOrdersByPhoneNumberWithItems(req.params.phone));
    } catch (error) {
      console.error("[API] Failed to track orders:", error);
      res.status(500).json({ message: "Unable to track orders" });
    }
  });

  app.post("/api/orders/track", async (req, res) => {
    const parsed = trackOrderRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Enter a valid phone number and Order ID" });
      return;
    }

    const { customerPhone, orderId } = parsed.data;

    try {
      const order = await getOrderDetailsWithItems(orderId);
      if (!order || order.customerPhone.trim() !== customerPhone.trim()) {
        res.status(404).json({ message: "No order found for that phone number and Order ID" });
        return;
      }

      res.set("Cache-Control", "no-store");
      res.json(order);
    } catch (error) {
      console.error("[API] Failed to track order:", error);
      res.status(500).json({ message: "Unable to track order" });
    }
  });

  app.post("/api/orders/track-otp", async (req, res) => {
    const parsed = trackOtpRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Enter a valid phone number" });
      return;
    }

    const customerPhone = parsed.data.customerPhone;
    const otp = createTrackOrderOtp(customerPhone);

    try {
      const smsResult = await sendTrackOrderOtpSms(customerPhone, otp);
      console.log(
        smsResult.sent
          ? `[Track Order OTP] Sent Fast2SMS OTP to ${customerPhone}`
          : `[Track Order OTP] ${customerPhone}: ${otp}`,
      );
    } catch (error) {
      trackOrderOtps.delete(customerPhone);
      console.error("[Fast2SMS] Failed to send track order OTP:", error);
      const message = error instanceof Error ? error.message : "Unable to send OTP";
      res.status(502).json({ message });
      return;
    }

    res.json({
      success: true,
      message: "OTP sent",
      devOtp: !ENV.fast2smsApiKey && process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  });

  app.post("/api/orders/verify-track-otp", async (req, res) => {
    const parsed = trackOtpVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Enter the 6 digit OTP" });
      return;
    }

    const { customerPhone, otp } = parsed.data;
    if (!verifyTrackOrderOtp(customerPhone, otp)) {
      res.status(401).json({ message: "Invalid or expired OTP" });
      return;
    }

    try {
      res.json(await getOrdersByPhoneNumberWithItems(customerPhone));
    } catch (error) {
      console.error("[API] Failed to track orders after OTP:", error);
      res.status(500).json({ message: "Unable to track orders" });
    }
  });

  app.get("/api/orders/:id", requireAdmin, async (req, res) => {
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      res.status(400).json({ message: "Invalid order number" });
      return;
    }

    try {
      const order = await getOrderDetailsWithItems(orderId);
      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      res.json(order);
    } catch (error) {
      console.error("[API] Failed to load order:", error);
      res.status(500).json({ message: "Unable to load order" });
    }
  });

  app.patch("/api/orders/:id/status", requireAdmin, async (req, res) => {
    const orderId = Number(req.params.id);
    const parsed = orderStatusApiSchema.safeParse(req.body);
    if (!Number.isInteger(orderId) || orderId <= 0 || !parsed.success) {
      res.status(400).json({ message: "Invalid order status update" });
      return;
    }

    try {
      const order = await updateOrderStatus(orderId, parsed.data.status);
      res.set("Cache-Control", "no-store");
      res.json({ success: true, id: order.id, status: order.status });
    } catch (error) {
      console.error("[API] Failed to update order status:", error);
      const message = error instanceof Error ? error.message : "Unable to update order status";
      res.status(500).json({ message });
    }
  });

  app.patch("/api/orders/:id/payment-status", requireAdmin, async (req, res) => {
    const orderId = Number(req.params.id);
    const parsed = paymentStatusApiSchema.safeParse(req.body);
    if (!Number.isInteger(orderId) || orderId <= 0 || !parsed.success) {
      res.status(400).json({ message: "Invalid payment status update" });
      return;
    }

    try {
      await updateOrderPaymentStatus(orderId, parsed.data.paymentStatus);
      res.json({ success: true });
    } catch (error) {
      console.error("[API] Failed to update payment status:", error);
      const message = error instanceof Error ? error.message : "Unable to update payment status";
      res.status(500).json({ message });
    }
  });
}

function registerBackupOldOrdersRoute(app: express.Express) {
  app.post("/api/admin/backup-old-orders", requireAdmin, async (req, res) => {
    const deleteAfterBackup = req.query.delete === "true";

    try {
      const result = await backupOldOrders({
        deleteAfterBackup,
        trigger: "manual",
      });
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Backup failed";
      console.error("[Old Orders Backup] Manual backup failed:", error);
      res.status(500).json({ message });
    }
  });
}

function startOldOrdersBackupCron() {
  let isRunning = false;

  cron.schedule(
    "0 2 * * *",
    async () => {
      if (isRunning) {
        console.warn("[Old Orders Backup] Previous scheduled backup is still running. Skipping this run.");
        return;
      }

      isRunning = true;
      try {
        console.log("[Old Orders Backup] Automatic 30-day backup started");
        const result = await backupOldOrdersAndDelete({
          deleteAfterBackup: true,
          trigger: "cron",
        });
        console.log("[Old Orders Backup] Backup success result:", result);
      } catch (error) {
        console.error("[Old Orders Backup] Backup failed error:", error);
      } finally {
        isRunning = false;
      }
    },
    {
      timezone: "Asia/Kolkata",
    },
  );

  console.log("[Old Orders Backup] Scheduled daily backup and cleanup at 2:00 AM Asia/Kolkata.");
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (isAllowedFrontendOrigin(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Cache-Control");
      res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
    }

    if (req.method === "OPTIONS") {
      res.sendStatus(isAllowedFrontendOrigin(origin) ? 204 : 403);
      return;
    }

    next();
  });

  app.get("/", (_req, res) => {
    res.send("Backend is running successfully");
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", message: "Backend running" });
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerBackupOldOrdersRoute(app);
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerOrderApiRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  const preferredPort = parseInt(process.env.PORT || "3000");

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Port ${preferredPort} is already in use. Stop the existing backend process or set a different PORT.`,
      );
      process.exit(1);
    }

    throw error;
  });

  server.listen(preferredPort, () => {
    console.log(`Server running on http://localhost:${preferredPort}/`);
  });

  startOldOrdersBackupCron();
}



startServer().catch(console.error);
