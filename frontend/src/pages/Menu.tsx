import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock3, Menu, Store, X, ShoppingCart } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { getMenuItems, normalizeMenuCategory, type MenuItem } from "@/lib/menu";
import { toast } from "sonner";
import {
  DEFAULT_STORE_HOURS,
  getStoreHoursLabel,
  normalizeStoreHours,
  type StoreHours,
} from "@shared/storeHours";

interface CartItem {
  id?: number | string;
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  stockQuantity: number;
}

interface PickupSlotAvailability {
  startIso: string;
  endIso?: string;
  dayLabel?: "Today" | "Tomorrow";
  label: string;
  pickupDate: string;
}

interface PickupAvailability {
  slots: PickupSlotAvailability[];
  acceptingOrders?: boolean;
  storeStatus?: "open" | "closed";
  storeHours?: StoreHours;
  isOpen: boolean;
  closedMessage: string;
  message?: string;
  settings: {
    acceptingOrders: boolean;
    dailyOrderLimit: number;
  };
}

interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

type PaymentMethod = "cash_on_pickup" | "online_payment";

interface RazorpayCheckout {
  open: () => void;
  on: (event: "payment.failed", handler: (response: unknown) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CLOSED_ORDER_MESSAGE = "Outlet is closed. Orders are not accepted right now.";

function OutletClosedBanner({
  storeHoursLabel,
  onViewTimings,
}: {
  storeHoursLabel: string;
  onViewTimings: () => void;
}) {
  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-purple-100 bg-white shadow-sm">
      <div className="grid md:grid-cols-[minmax(8rem,15rem)_1fr]">
        <div className="flex min-h-40 items-center justify-center bg-gradient-to-br from-purple-50 via-white to-yellow-50 p-6">
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-inner ring-1 ring-purple-100">
            <Store className="h-14 w-14 text-purple-700" strokeWidth={1.8} />
            <span className="absolute right-5 top-5 h-3 w-3 rounded-full bg-red-500 ring-4 ring-red-100" />
          </div>
        </div>
        <div className="flex flex-col justify-between gap-5 bg-purple-700 p-5 text-white sm:p-6 md:flex-row md:items-center">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase text-purple-50">
              <Clock3 className="h-4 w-4" />
              Closed now
            </div>
            <h2 className="text-2xl font-black sm:text-3xl">Oops! Outlet Closed</h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-purple-50 sm:text-base">
              This outlet isn&apos;t accepting orders right now. We&apos;ll be back shortly.
            </p>
            <p className="mt-3 text-xs font-semibold text-purple-100 sm:text-sm">
              Store hours: {storeHoursLabel}
            </p>
          </div>
          <Button
            type="button"
            onClick={onViewTimings}
            className="w-full shrink-0 bg-white font-bold text-purple-800 hover:bg-purple-50 md:w-auto"
          >
            View Timings
          </Button>
        </div>
      </div>
    </section>
  );
}

function loadRazorpayCheckout() {
  if (window.Razorpay) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Unable to load Razorpay Checkout")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay Checkout"));
    document.body.appendChild(script);
  });
}

export default function MenuPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("pakodi");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    email: "",
    pickupTime: "",
  });
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);
  const [lastOrderMessage, setLastOrderMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_pickup");

  const queryClient = useQueryClient();
  const {
    data: menuItems = [],
    error: menuError,
    isError: isMenuError,
    isLoading,
  } = useQuery({
    queryKey: ["menuItems"],
    queryFn: getMenuItems,
  });
  const { data: storeHoursData } = trpc.storeHours.get.useQuery(undefined, {
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const { data: rawAvailability } = trpc.ordering.availability.useQuery(undefined, {
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const availability = rawAvailability as PickupAvailability | undefined;
  const trpcUtils = trpc.useUtils();
  const createCashOrder = trpc.orders.create.useMutation();
  const createRazorpayOrder = trpc.payments.createRazorpayOrder.useMutation();
  const verifyPaymentAndCreateOrder = trpc.payments.verifyAndCreateOrder.useMutation();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const placeOrderSectionRef = useRef<HTMLDivElement>(null);
  const storeStatusRef = useRef<HTMLDivElement>(null);
  const shouldScrollToPlaceOrderRef = useRef(false);

  useEffect(() => {
    const refreshPickupState = () => {
      void trpcUtils.ordering.availability.invalidate();
    };
    const timer = window.setInterval(refreshPickupState, 60_000);
    const handleFocus = () => refreshPickupState();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshPickupState();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [trpcUtils]);

  useEffect(() => {
    if (!showCart) {
      return;
    }

    void trpcUtils.ordering.availability.invalidate();
  }, [showCart, trpcUtils]);

  const scrollToPlaceOrderSection = () => {
    window.requestAnimationFrame(() => {
      placeOrderSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  useEffect(() => {
    if (!showCart || !shouldScrollToPlaceOrderRef.current) {
      return;
    }

    shouldScrollToPlaceOrderRef.current = false;
    scrollToPlaceOrderSection();
  }, [showCart]);

  const preferredCategories = [
    "pakodi",
    "non-veg-pulaos",
    "veg-pulaos",
    "chitti-naidu-curries",
    "chitti-naidu-desserts",
    "extra-add-ons",
  ];
  const categoryLabels: Record<string, string> = {
    pakodi: "Pakodi",
    "non-veg-pulaos": "Non Veg Pulaos",
    "veg-pulaos": "Veg Pulaos",
    "chitti-naidu-curries": "Chitti Naidu Curries",
    "chitti-naidu-desserts": "Chitti Naidu Desserts",
    "extra-add-ons": "Extra Add Ons",
  };

  const availableCategories = Array.from(
    new Set(menuItems.map((item) => normalizeMenuCategory(item.category))),
  );
  const categories = [
    ...preferredCategories.filter((category) => availableCategories.includes(category)),
    ...availableCategories.filter((category) => !preferredCategories.includes(category)),
  ];

  useEffect(() => {
    if (categories.length > 0 && !categories.includes(selectedCategory)) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  const filteredItems = menuItems.filter(
    (item) => normalizeMenuCategory(item.category) === selectedCategory
  );

  const addToCart = (item: any) => {
    if (!isStoreOpen) {
      toast.error(CLOSED_ORDER_MESSAGE);
      return;
    }

    const stockQuantity = Number(item.stockQuantity ?? 0);
    if (stockQuantity <= 0) {
      toast.error(`${item.name} is sold out`);
      return;
    }

    setLastOrderId(null);
    setLastOrderMessage("");
    const existingItem = cart.find((i) => i.menuItemId === item.id);
    if (existingItem) {
      if (existingItem.quantity >= stockQuantity) {
        toast.error(`Only ${stockQuantity} available for ${item.name}`);
        return;
      }

      setCart(
        cart.map((i) =>
          i.menuItemId === item.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      );
    } else {
      setCart([
        ...cart,
        {
          menuItemId: Number(item.id),
          name: item.name,
          price: item.price,
          quantity: 1,
          stockQuantity,
        },
      ]);
    }
    toast.success(`${item.name} added to cart!`);
  };

  const removeFromCart = (menuItemId: number) => {
    setCart(cart.filter((i) => i.menuItemId !== menuItemId));
  };

  const updateQuantity = (menuItemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(menuItemId);
    } else {
      const cartItem = cart.find((item) => item.menuItemId === menuItemId);
      if (cartItem && quantity > cartItem.quantity && !isStoreOpen) {
        toast.error(CLOSED_ORDER_MESSAGE);
        return;
      }

      if (cartItem && quantity > cartItem.stockQuantity) {
        toast.error(`Only ${cartItem.stockQuantity} available for ${cartItem.name}`);
        return;
      }

      setCart(
        cart.map((i) =>
          i.menuItemId === menuItemId ? { ...i, quantity } : i
        )
      );
    }
  };

  const totalPrice = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const storeHours = normalizeStoreHours(storeHoursData ?? DEFAULT_STORE_HOURS);
  const availablePickupSlots = availability?.slots ?? [];
  const isAcceptingOrders = availability?.acceptingOrders ?? availability?.settings.acceptingOrders ?? true;
  const isStoreOpen = Boolean(
    isAcceptingOrders &&
    availability?.storeStatus !== "closed" &&
    availability?.isOpen &&
    availablePickupSlots.length > 0,
  );
  const storeHoursLabel = getStoreHoursLabel(storeHours);
  const selectedSlot = availablePickupSlots.find((slot) => slot.startIso === customerInfo.pickupTime);
  const showOutletClosedBanner = Boolean(availability && !isStoreOpen);

  useEffect(() => {
    if (availability?.settings) {
      console.log("[Customer Availability] Fetched acceptingOrders:", availability.settings.acceptingOrders);
    }
  }, [availability?.settings]);

  useEffect(() => {
    if (!availability) {
      return;
    }

    console.log("[Customer Pickup Slots] Fresh slots fetched:", {
      fetchedAt: new Date().toISOString(),
      slotCount: availablePickupSlots.length,
      firstSlot: availablePickupSlots[0] ?? null,
      lastSlot: availablePickupSlots[availablePickupSlots.length - 1] ?? null,
    });
  }, [availability, availablePickupSlots]);

  useEffect(() => {
    if (!customerInfo.pickupTime || selectedSlot) {
      return;
    }

    console.log("[Customer Pickup Slots] Clearing stale selected pickup time:", customerInfo.pickupTime);
    setCustomerInfo((current) => ({
      ...current,
      pickupTime: "",
    }));
  }, [customerInfo.pickupTime, selectedSlot]);

  const blockingMessage = !isAcceptingOrders
    ? CLOSED_ORDER_MESSAGE
    : !isStoreOpen
      ? CLOSED_ORDER_MESSAGE
      : "";

  const scrollToStoreStatus = () => {
    storeStatusRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const handlePlaceOrder = async () => {
    const customerName = customerInfo.name.trim();
    const customerPhone = customerInfo.phone.trim();
    const customerEmail = customerInfo.email.trim();

    if (!customerName || !customerPhone) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!customerInfo.pickupTime) {
      toast.error("Please select a pickup time");
      return;
    }

    if (customerPhone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    if (customerEmail && !emailPattern.test(customerEmail)) {
      toast.error("Please enter a valid email address or leave it blank");
      return;
    }

    if (cart.length === 0) {
      toast.error("Please add items to your cart");
      return;
    }

    if (blockingMessage) {
      toast.error(blockingMessage);
      return;
    }

    try {
      const pickupDateTime = new Date(customerInfo.pickupTime);

      const latestAvailability = await trpcUtils.ordering.availability.fetch();
      const latestPickupAvailability = latestAvailability as PickupAvailability | undefined;
      const latestAcceptingOrders = latestPickupAvailability?.acceptingOrders ?? latestPickupAvailability?.settings.acceptingOrders ?? true;
      if (!latestAcceptingOrders || latestPickupAvailability?.storeStatus === "closed" || !latestPickupAvailability?.isOpen) {
        toast.error(CLOSED_ORDER_MESSAGE);
        return;
      }

      const latestAvailablePickupSlots = latestPickupAvailability.slots ?? [];
      const isStillAvailable = latestAvailablePickupSlots.some(
        (slot) => slot.startIso === pickupDateTime.toISOString(),
      );

      if (Number.isNaN(pickupDateTime.getTime()) || !isStillAvailable) {
        toast.error("Invalid pickup time. Please select a valid future pickup slot.");
        return;
      }

      if (!selectedSlot) {
        toast.error("Please select a pickup time");
        return;
      }

      const stockProblem = cart.find((item) => item.quantity > item.stockQuantity || item.stockQuantity <= 0);
      if (stockProblem) {
        toast.error(`${stockProblem.name} is sold out or does not have enough stock.`);
        return;
      }

      const orderPayload = {
        customerName,
        customerPhone,
        ...(customerEmail ? { customerEmail } : {}),
        totalPrice: Number(totalPrice),
        pickupTime: pickupDateTime,
        items: cart.map((item) => ({
          menuItemId: Number(item.menuItemId || item.id),
          quantity: Number(item.quantity),
          priceAtOrder: Number(item.price),
        })),
      };

      setIsPlacingOrder(true);

      if (paymentMethod === "cash_on_pickup") {
        const createdOrder = await createCashOrder.mutateAsync(orderPayload);
        const orderId = createdOrder.orderId;

        localStorage.setItem("lastOrderId", String(orderId));
        setLastOrderId(orderId);
        setLastOrderMessage(`Order placed successfully. Your Order ID is #${orderId}`);
        toast.success(`Order placed successfully. Your Order ID is #${orderId}`);
        setCart([]);
        setCustomerInfo({ name: "", phone: "", email: "", pickupTime: "" });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["menuItems"] }),
          trpcUtils.ordering.availability.invalidate(),
        ]);
        setShowCart(true);
        return;
      }

      const razorpayOrder = await createRazorpayOrder.mutateAsync({
        amount: totalPrice,
        order: orderPayload,
      });

      if (razorpayOrder.amount !== totalPrice || razorpayOrder.currency !== "INR") {
        throw new Error("Payment amount mismatch. Please refresh and try again.");
      }

      await loadRazorpayCheckout();

      if (!window.Razorpay) {
        throw new Error("Razorpay Checkout is unavailable. Please try again.");
      }

      await new Promise<void>((resolve, reject) => {
        const checkout = new window.Razorpay!({
          key: razorpayOrder.keyId,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: "Chitti Naidu Pulao",
          description: "Pickup order",
          order_id: razorpayOrder.orderId,
          prefill: {
            name: customerName,
            email: customerEmail,
            contact: customerPhone,
          },
          notes: {
            order_type: "pickup",
          },
          theme: {
            color: "#15803d",
          },
          modal: {
            ondismiss: () => reject(new Error("Payment was cancelled.")),
          },
          handler: async (response: RazorpayPaymentResponse) => {
            try {
              const createdOrder = await verifyPaymentAndCreateOrder.mutateAsync({
                order: orderPayload,
                payment: {
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                },
              });
              const orderId = createdOrder.orderId;

              localStorage.setItem("lastOrderId", String(orderId));
              setLastOrderId(orderId);
              setLastOrderMessage(`Order placed successfully. Your Order ID is #${orderId}`);
              toast.success(`Order placed successfully. Your Order ID is #${orderId}`);
              setCart([]);
              setCustomerInfo({ name: "", phone: "", email: "", pickupTime: "" });
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["menuItems"] }),
                trpcUtils.ordering.availability.invalidate(),
              ]);
              setShowCart(true);
              resolve();
            } catch (error) {
              reject(error);
            }
          },
        });

        checkout.on("payment.failed", () => {
          reject(new Error("Payment failed. Please try again."));
        });

        checkout.open();
      });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Payment failed. Please try again.";
      toast.error(message);
      console.error("Error placing order:", error);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleCartIconClick = () => {
    if (showCart) {
      scrollToPlaceOrderSection();
      return;
    }

    shouldScrollToPlaceOrderRef.current = true;
    setShowCart(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b-2 border-green-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <img
                src="/chitti-naidu-logo.png"
                alt="Chitti Naidu Pulao logo"
                className="h-14 w-14 rounded-full bg-white object-cover ring-2 ring-yellow-300 lg:h-16 lg:w-16"
              />
              <div className="min-w-0">
                <h1 className="responsive-brand-title">చిట్టి నాయుడు పులావ్</h1>
                <p className="responsive-brand-subtitle text-yellow-600">Authentic Village Taste</p>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-8">
              <Link href="/" className="text-gray-700 hover:text-green-700 font-medium transition">
                Home
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-green-700 font-medium transition">
                About
              </Link>
              <Link href="/menu" className="text-green-700 font-bold border-b-2 border-green-700">
                Menu
              </Link>
              <Link href="/track-order" className="text-gray-700 hover:text-green-700 font-medium transition">
                Track Order
              </Link>
              <Link href="/contact" className="text-gray-700 hover:text-green-700 font-medium transition">
                Contact
              </Link>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/menu" asChild>
                <Button className="hidden bg-yellow-500 font-bold text-gray-900 hover:bg-yellow-600 lg:inline-flex">
                  Order Now
                </Button>
              </Link>
              <button
                onClick={handleCartIconClick}
                type="button"
                aria-label="Toggle cart"
                className="relative shrink-0 rounded-lg p-2 text-green-700 transition hover:bg-green-50"
              >
                <ShoppingCart className="h-7 w-7 lg:h-8 lg:w-8" />
                {cart.length > 0 && (
                  <span className="absolute top-0 right-0 bg-yellow-500 text-gray-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={mobileMenuOpen}
                className="shrink-0 rounded-md p-2 hover:bg-green-50 lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-7 w-7 lg:h-8 lg:w-8" /> : <Menu className="h-7 w-7 lg:h-8 lg:w-8" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="space-y-1 border-t border-gray-200 py-4 lg:hidden">
              <Link href="/" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700">
                Home
              </Link>
              <Link href="/about" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700">
                About
              </Link>
              <Link href="/menu" className="block rounded-md px-3 py-2 font-bold text-green-700 hover:bg-green-50">
                Menu
              </Link>
              <Link href="/track-order" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700">
                Track Order
              </Link>
              <Link href="/contact" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700">
                Contact
              </Link>
              <Link href="/menu" asChild>
                <Button className="mt-3 w-full bg-yellow-500 font-bold text-gray-900 hover:bg-yellow-600">
                  Order Now
                </Button>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-10 sm:py-12 bg-gradient-to-r from-green-600 to-green-700">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="responsive-page-title text-white mb-2">Our Menu</h1>
          <p className="text-base text-green-100 sm:text-xl">
            Choose from our authentic South Indian pulao varieties
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        {showOutletClosedBanner && (
          <OutletClosedBanner
            storeHoursLabel={storeHoursLabel}
            onViewTimings={scrollToStoreStatus}
          />
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
          {/* Menu Section */}
          <div className="min-w-0">
            {/* Category Tabs */}
            <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mb-8 sm:px-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`min-h-10 shrink-0 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition sm:text-base ${
                    selectedCategory === cat
                      ? "bg-green-700 text-white"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                >
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>

            <div ref={storeStatusRef} className="mb-6 rounded-lg border border-green-100 bg-green-50 px-4 py-3">
              <p className="text-sm font-semibold text-green-800">
                Store hours: {storeHoursLabel}
              </p>
              {!isStoreOpen && (
                <p className="mt-1 text-sm font-semibold text-red-700">
                  {CLOSED_ORDER_MESSAGE}
                </p>
              )}
            </div>

            {/* Menu Items Grid */}
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading menu...</p>
              </div>
            ) : isMenuError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center">
                <p className="font-semibold text-red-700">Unable to load menu items</p>
                <p className="mt-2 text-sm text-red-600">
                  {menuError instanceof Error
                    ? menuError.message
                    : "Backend is not reachable. Make sure the backend is running at http://localhost:3000 and VITE_API_URL uses http, not https."}
                </p>
              </div>
            ) : menuItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Menu items are not available yet.</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No items in {categoryLabels[selectedCategory] ?? selectedCategory}</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-lg border-2 border-green-100 bg-white transition hover:shadow-lg"
                  >
                    {/* Image Section */}
                    <div className="flex aspect-[4/3] w-full items-center justify-center border-b-2 border-green-100 bg-gradient-to-br from-green-100 to-yellow-50 sm:aspect-[5/3]">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-6xl opacity-50">
                          {item.isVegetarian ? "🥗" : "🍖"}
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="p-4 sm:p-6">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <h3 className="min-w-0 flex-1 text-base font-bold text-green-700 sm:text-lg">{item.name}</h3>
                        <span className="shrink-0 text-lg font-bold text-yellow-600 sm:text-xl">
                          ₹{(item.price / 100).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">{item.description}</p>
                      <p className={`mb-3 text-sm font-bold ${item.stockQuantity <= 0 ? "text-red-600" : "text-green-700"}`}>
                        {item.stockQuantity <= 0 ? "Sold Out" : `${item.stockQuantity} available`}
                      </p>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs text-gray-500">
                          {item.isVegetarian ? "🥬 Vegetarian" : "🍗 Non-Vegetarian"}
                        </span>
                        <Button
                          onClick={() => addToCart(item)}
                          disabled={item.stockQuantity <= 0 || !isStoreOpen}
                          className="w-full bg-yellow-500 font-bold text-gray-900 hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                          {item.stockQuantity <= 0 ? "Sold Out" : "Add to Cart"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Sidebar */}
          <div className={`lg:block ${showCart ? "block" : "hidden"}`}>
            <div className="rounded-lg bg-green-50 p-4 sm:p-6 lg:sticky lg:top-24">
              <h2 className="mb-4 text-xl font-bold text-green-700 sm:text-2xl">Your Order</h2>

              {cart.length === 0 ? (
                lastOrderId ? (
                  <div className="rounded-lg border-2 border-green-200 bg-white p-5 text-center">
                    <CheckCircle2 className="mx-auto mb-3 text-green-700" size={36} />
                    <p className="text-sm font-semibold text-gray-600">Order placed successfully</p>
                    <p className="mt-2 text-3xl font-black text-green-700">#{lastOrderId}</p>
                    <p className="mt-2 text-sm text-gray-600">
                      {lastOrderMessage || `Order placed successfully. Your Order ID is #${lastOrderId}`}
                    </p>
                    {lastOrderMessage && (
                      <p className="mt-2 text-sm text-gray-600">
                        Enter your phone number manually on Track Order to view updates.
                      </p>
                    )}
                    <Link
                      href="/track-order"
                      className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-yellow-500 px-4 py-3 font-bold text-gray-900 hover:bg-yellow-600"
                    >
                      Track Order
                    </Link>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    Your cart is empty. Add items to get started!
                  </p>
                )
              ) : (
                <>
                  {/* Cart Items */}
                  <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div
                        key={item.menuItemId}
                        className="rounded-lg border border-green-200 bg-white p-3"
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <h4 className="min-w-0 text-sm font-semibold text-gray-800">
                            {item.name}
                          </h4>
                          <button
                            onClick={() => removeFromCart(item.menuItemId)}
                            className="text-red-500 hover:text-red-700 text-sm font-bold"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-yellow-600 font-semibold">
                            ₹{(item.price / 100).toFixed(2)}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                updateQuantity(item.menuItemId, item.quantity - 1)
                              }
                              className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                            >
                              −
                            </button>
                            <span className="w-6 text-center font-bold">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(item.menuItemId, item.quantity + 1)
                              }
                              disabled={!isStoreOpen}
                              className="rounded bg-gray-200 px-2 py-1 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="border-t-2 border-green-200 pt-4 mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-bold text-gray-800">Total:</span>
                      <span className="text-2xl font-bold text-yellow-600">
                        ₹{(totalPrice / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {blockingMessage && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                      {blockingMessage}
                    </div>
                  )}

                  {/* Customer Info */}
                  <div className="space-y-3 mb-6">
                    <input
                      type="text"
                      placeholder="Your Name *"
                      value={customerInfo.name}
                      onChange={(e) =>
                        setCustomerInfo({ ...customerInfo, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number *"
                      value={customerInfo.phone}
                      onChange={(e) =>
                        setCustomerInfo({ ...customerInfo, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="email"
                      placeholder="Email (Optional)"
                      value={customerInfo.email}
                      onChange={(e) =>
                        setCustomerInfo({ ...customerInfo, email: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Pickup Time *
                      </label>
                      <select
                        value={customerInfo.pickupTime}
                        onChange={(e) =>
                          setCustomerInfo({
                            ...customerInfo,
                            pickupTime: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        disabled={!isStoreOpen || availablePickupSlots.length === 0}
                      >
                        <option value="">Select a pickup time</option>
                        {isStoreOpen && availablePickupSlots.length === 0 && (
                          <option value="" disabled>No pickup slots available</option>
                        )}
                        {availablePickupSlots.map((slot) => (
                          <option
                            key={slot.startIso}
                            value={slot.startIso}
                          >
                            {slot.dayLabel ?? slot.pickupDate} · {slot.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-6 space-y-2">
                    <p className="text-sm font-semibold text-gray-700">Payment Method</p>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-green-200 bg-white px-3 py-3 text-sm font-semibold text-gray-800">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash_on_pickup"
                        checked={paymentMethod === "cash_on_pickup"}
                        onChange={() => setPaymentMethod("cash_on_pickup")}
                        className="h-4 w-4"
                      />
                      Cash on Pickup
                    </label>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-green-200 bg-white px-3 py-3 text-sm font-semibold text-gray-800">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="online_payment"
                        checked={paymentMethod === "online_payment"}
                        onChange={() => setPaymentMethod("online_payment")}
                        className="h-4 w-4"
                      />
                      Online Payment
                    </label>
                  </div>

                  <div ref={placeOrderSectionRef}>
                  {/* Place Order Button */}
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={Boolean(blockingMessage) || isPlacingOrder || createCashOrder.isPending || createRazorpayOrder.isPending || verifyPaymentAndCreateOrder.isPending}
                    className="w-full bg-green-700 py-3 font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {blockingMessage
                      ? "Checkout Unavailable"
                      : isPlacingOrder
                        ? paymentMethod === "cash_on_pickup"
                          ? "Placing Order..."
                          : "Opening Payment..."
                        : paymentMethod === "cash_on_pickup"
                          ? "Place Order"
                          : "Pay with UPI / GPay / PhonePe"}
                  </Button>

                  <p className="text-xs text-gray-500 text-center mt-3">
                    ✓ Pickup from Store Only
                  </p>
                  <p className="text-xs text-gray-500 text-center mt-1">
                    Store hours: {storeHoursLabel}
                  </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10 sm:py-12 mt-8 sm:mt-12">
        <div className="max-w-6xl mx-auto px-4">
            <div className="grid gap-8 mb-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="text-xl font-bold text-yellow-500 mb-4">Chitti Naidu Pulao</h3>
              <p className="text-gray-400">
                Authentic South Indian village cuisine, prepared with love and tradition.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-bold text-yellow-500 mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/" className="hover:text-yellow-500 transition">Home</Link></li>
                <li><Link href="/about" className="hover:text-yellow-500 transition">About</Link></li>
                <li><Link href="/menu" className="hover:text-yellow-500 transition">Menu</Link></li>
                <li><Link href="/track-order" className="hover:text-yellow-500 transition">Track Order</Link></li>
                <li><Link href="/contact" className="hover:text-yellow-500 transition">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-bold text-yellow-500 mb-4">Contact</h4>
              <p className="text-gray-400 mb-2">Phone: +91 8008800467</p>
              <p className="text-gray-400 mb-2">Email: info@chittinaidu.com</p>
              <p className="text-gray-400">Pickup Only</p>
            </div>

            <div>
              <h4 className="text-lg font-bold text-yellow-500 mb-4">Hours</h4>
              <p className="text-gray-400 mb-2">Mon - Sun</p>
              <p className="text-gray-400">Store hours: {storeHoursLabel}</p>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-8 text-center text-gray-400">
            <p>&copy; 2026 Chitti Naidu Pulao. All rights reserved. | Pickup from Store Only</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
