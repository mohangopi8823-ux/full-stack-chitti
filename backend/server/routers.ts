import { COOKIE_NAME } from "../shared/const";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { normalizeOrderSettings } from "../shared/orderLimits";
import { getStoreClosedMessage, isStoreOpenAtIndiaTime, isValidStoreTime } from "../shared/storeHours";
import {
  getAllMenuItems,
  getMenuItemById,
  createOrderWithItems,
  getOrderDetails,
  getOrdersByPhoneNumber,
  getStoreHours,
  updateStoreHours,
  getOrderSettings,
  updateOrderSettings,
  getPickupAvailability,
  isInvalidPickupTimeError,
  isOrdersClosedError,
  updateMenuItemStock,
  validateOrderAvailability,
  updateOrderPaymentStatus,
} from "./db";
import { z } from "zod";

const orderInputSchema = z.object({
  customerName: z.string().trim().min(1, "Customer name is required").max(255),
  customerPhone: z.string().trim().min(10, "Enter a valid phone number").max(20),
  customerEmail: z.string().trim().max(320).optional().refine(
    (email) => !email || z.email().safeParse(email).success,
    "Enter a valid email address",
  ).transform((email) => email || undefined),
  totalPrice: z.coerce.number().int().positive("Order total must be greater than zero"),
  pickupTime: z.date().refine(
    (date) => !Number.isNaN(date.getTime()) && date.getTime() > Date.now(),
    "Invalid pickup time. Please select a valid future pickup slot.",
  ),
  notes: z.string().trim().optional().transform((notes) => notes || undefined),
  items: z.array(z.object({
    menuItemId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive(),
    priceAtOrder: z.coerce.number().int().nonnegative(),
  })).min(1, "Please add at least one item"),
});

const razorpayPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

const storeHoursInputSchema = z.object({
  openingTime: z.string().refine(isValidStoreTime, "Enter a valid opening time"),
  closingTime: z.string().refine(isValidStoreTime, "Enter a valid closing time"),
});

const orderSettingsInputSchema = z.object({
  acceptingOrders: z.boolean(),
  dailyOrderLimit: z.int().positive("Daily order limit must be greater than zero"),
});

const paymentStatusInputSchema = z.object({
  paymentStatus: z.enum(["pending", "paid"]),
});

function throwOrdersClosedIfNeeded(error: unknown): never {
  if (isInvalidPickupTimeError(error)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error.message,
    });
  }

  if (isOrdersClosedError(error)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: error.message,
    });
  }

  throw error;
}

function getRazorpayAuthHeader() {
  return `Basic ${Buffer.from(`${ENV.razorpayKeyId}:${ENV.razorpayKeySecret}`).toString("base64")}`;
}

function ensureRazorpayConfigured() {
  if (!ENV.razorpayKeyId || !ENV.razorpayKeySecret) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    });
  }
}

async function getRazorpayOrder(razorpayOrderId: string) {
  const response = await fetch(`https://api.razorpay.com/v1/orders/${razorpayOrderId}`, {
    headers: {
      Authorization: getRazorpayAuthHeader(),
    },
  });

  if (!response.ok) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unable to verify Razorpay order.",
    });
  }

  return response.json() as Promise<{
    id: string;
    amount: number;
    currency: string;
    status: string;
  }>;
}

function verifyRazorpaySignature({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: z.infer<typeof razorpayPaymentSchema>) {
  const expectedSignature = crypto
    .createHmac("sha256", ENV.razorpayKeySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  const received = Buffer.from(razorpaySignature, "hex");
  const expected = Buffer.from(expectedSignature, "hex");

  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  menu: router({
    list: publicProcedure.query(async () => {
      return getAllMenuItems();
    }),
    getById: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return getMenuItemById(input);
      }),
    updateStock: publicProcedure
      .input(z.object({
        menuItemId: z.coerce.number().int().positive(),
        stockQuantity: z.coerce.number().int().nonnegative(),
      }))
      .mutation(async ({ input }) => {
        return updateMenuItemStock(input.menuItemId, input.stockQuantity);
      }),
  }),

  storeHours: router({
    get: publicProcedure.query(async () => {
      const hours = await getStoreHours();
      const isOpen = isStoreOpenAtIndiaTime(hours);
      return {
        ...hours,
        isOpen,
        closedMessage: isOpen ? "" : getStoreClosedMessage(hours),
        timeZone: "Asia/Kolkata",
      };
    }),
    update: publicProcedure
      .input(storeHoursInputSchema)
      .mutation(async ({ input }) => {
        const hours = await updateStoreHours(input);
        const isOpen = isStoreOpenAtIndiaTime(hours);
        return {
          ...hours,
          isOpen,
          closedMessage: isOpen ? "" : getStoreClosedMessage(hours),
          timeZone: "Asia/Kolkata",
        };
      }),
  }),

  ordering: router({
    settings: publicProcedure.query(async () => {
      return getOrderSettings();
    }),
    updateSettings: publicProcedure
      .input(orderSettingsInputSchema)
      .mutation(async ({ input }) => {
        const settings = normalizeOrderSettings({
          ...input,
          acceptingOrders: Boolean(input.acceptingOrders),
        });
        console.log("[Admin Order Settings] Saving acceptingOrders:", settings.acceptingOrders);
        return updateOrderSettings(settings);
      }),
    availability: publicProcedure.query(async () => {
      return getPickupAvailability();
    }),
    validate: publicProcedure
      .input(orderInputSchema)
      .mutation(async ({ input }) => {
        const { items, ...orderData } = input;
        try {
          await validateOrderAvailability(orderData, items);
        } catch (error) {
          throwOrdersClosedIfNeeded(error);
        }
        return { success: true };
      }),
  }),

  orders: router({
    create: publicProcedure
      .input(orderInputSchema)
      .mutation(async ({ input }) => {
        const { items, ...orderData } = input;
        let orderId: number;
        try {
          orderId = await createOrderWithItems(
            {
              ...orderData,
              paymentMethod: "cash_on_pickup",
              paymentStatus: "pending",
            },
            items.map((item) => ({
              menuItemId: Number(item.menuItemId),
              quantity: Number(item.quantity),
              priceAtOrder: Number(item.priceAtOrder),
            })),
          );
        } catch (error) {
          throwOrdersClosedIfNeeded(error);
        }

        return { orderId };
      }),

    markPaymentStatus: publicProcedure
      .input(z.object({
        orderId: z.coerce.number().int().positive(),
        paymentStatus: paymentStatusInputSchema.shape.paymentStatus,
      }))
      .mutation(async ({ input }) => {
        await updateOrderPaymentStatus(input.orderId, input.paymentStatus);
        return { success: true } as const;
      }),

    getById: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        const order = await getOrderDetails(input);
        return order;
      }),

    getByPhone: publicProcedure
      .input(z.string())
      .query(async ({ input }) => {
        return getOrdersByPhoneNumber(input);
      }),
  }),

  payments: router({
    createRazorpayOrder: publicProcedure
      .input(z.object({
        amount: z.int().positive("Payment amount must be greater than zero"),
        order: orderInputSchema,
      }))
      .mutation(async ({ input }) => {
        const { items, ...orderData } = input.order;
        try {
          await validateOrderAvailability(orderData, items);
        } catch (error) {
          throwOrdersClosedIfNeeded(error);
        }
        ensureRazorpayConfigured();

        const response = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            Authorization: getRazorpayAuthHeader(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: input.amount,
            currency: "INR",
            receipt: `pickup_${Date.now()}`,
            notes: {
              source: "chitti-naidu-pulao-web",
              order_type: "pickup",
            },
          }),
        });

        if (!response.ok) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Unable to create Razorpay order. Please try again.",
          });
        }

        const razorpayOrder = await response.json() as {
          id: string;
          amount: number;
          currency: string;
        };

        return {
          keyId: ENV.razorpayKeyId,
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
        };
      }),

    verifyAndCreateOrder: publicProcedure
      .input(z.object({
        order: orderInputSchema,
        payment: razorpayPaymentSchema,
      }))
      .mutation(async ({ input }) => {
        ensureRazorpayConfigured();

        if (!verifyRazorpaySignature(input.payment)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Payment verification failed.",
          });
        }

        const razorpayOrder = await getRazorpayOrder(input.payment.razorpayOrderId);
        if (razorpayOrder.amount !== input.order.totalPrice || razorpayOrder.currency !== "INR") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Payment amount does not match the order total.",
          });
        }

        const { items, ...orderData } = input.order;
        let orderId: number;
        try {
          orderId = await createOrderWithItems(
            {
              ...orderData,
              paymentMethod: "online_payment",
              paymentStatus: "paid",
              notes: [
                orderData.notes,
                `Razorpay Order: ${input.payment.razorpayOrderId}`,
                `Razorpay Payment: ${input.payment.razorpayPaymentId}`,
              ].filter(Boolean).join("\n"),
            },
            items.map((item) => ({
              menuItemId: Number(item.menuItemId),
              quantity: Number(item.quantity),
              priceAtOrder: Number(item.priceAtOrder),
            })),
          );
        } catch (error) {
          throwOrdersClosedIfNeeded(error);
        }

        return { orderId };
      }),
  }),
});

export type AppRouter = typeof appRouter;
