import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  trackOrder,
  type OrderStatus,
  type TrackedOrder,
} from "@/lib/orders";
import { Clock, Copy, ExternalLink, Hash, Menu, MessageCircle, Phone, ReceiptText, Search, X } from "lucide-react";
import { toast } from "sonner";

const STORE_NAME = "Chitti Naidu Pulao";
const STORE_PHONE = "+918008800467";
const STORE_PHONE_DISPLAY = "+91 8008800467";
const STORE_ADDRESS = "8HC6+P98, Sriram Nagar Colony, Balaji Colony Phase 2, B.N Reddy Nagar, Hyderabad, Telangana 500070";
const RAPIDO_URL = "https://www.rapido.bike/";
const PORTER_URL = "https://porter.in/";

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  confirmed: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatPrice(price: number) {
  return `₹${(price / 100).toFixed(2)}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getOrderItemName(item: TrackedOrder["items"][number]) {
  return item.menuItemName || item.name || item.menuItem?.name || `Menu Item #${item.menuItemId}`;
}

function getPickupDetailsText(order: TrackedOrder) {
  return [
    `Store Name: ${STORE_NAME}`,
    `Store Address: ${STORE_ADDRESS}`,
    `Order ID: #${order.id}`,
    `Customer Name: ${order.customerName}`,
    `Customer Phone: ${order.customerPhone}`,
    `Total Amount: ${formatPrice(order.totalPrice)}`,
    "",
    "Please collect this pickup order from the store.",
  ].join("\n");
}

export default function TrackOrder() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCopyPickupDetails = async (trackedOrder: TrackedOrder) => {
    const details = getPickupDetailsText(trackedOrder);

    try {
      await navigator.clipboard.writeText(details);
      toast.success("Pickup details copied");
    } catch (error) {
      console.error(error);
      toast.error("Unable to copy pickup details");
    }
  };

  useEffect(() => {
    const savedOrderId = localStorage.getItem("lastOrderId");

    if (savedOrderId && /^\d+$/.test(savedOrderId)) {
      setOrderId(savedOrderId);
    }
  }, []);

  const handleTrackOrder = async (event: React.FormEvent) => {
    event.preventDefault();

    const customerPhone = phone.trim();
    if (customerPhone.length < 10) {
      toast.error("Please enter the phone number used for the order");
      return;
    }

    const parsedOrderId = Number(orderId);
    if (!Number.isInteger(parsedOrderId) || parsedOrderId <= 0) {
      toast.error("Please enter a valid Order ID");
      return;
    }

    try {
      setIsLoading(true);
      const matchingOrder = await trackOrder(customerPhone, parsedOrderId);
      setOrder(matchingOrder);
      setHasSearched(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to track order. Please try again.";
      toast.error(message);
      setOrder(null);
      setHasSearched(true);
      console.error("Error tracking order:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
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
              <Link href="/menu" className="text-gray-700 hover:text-green-700 font-medium transition">
                Menu
              </Link>
              <Link href="/track-order" className="text-green-700 font-bold border-b-2 border-green-700">
                Track Order
              </Link>
              <Link href="/contact" className="text-gray-700 hover:text-green-700 font-medium transition">
                Contact
              </Link>
            </div>

            <div className="hidden lg:block">
              <Link href="/menu" asChild>
                <Button className="bg-yellow-500 font-bold text-gray-900 hover:bg-yellow-600">
                  Order Now
                </Button>
              </Link>
            </div>

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

          {mobileMenuOpen && (
            <div className="space-y-1 border-t border-gray-200 py-4 lg:hidden">
              <Link href="/" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700">
                Home
              </Link>
              <Link href="/about" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700">
                About
              </Link>
              <Link href="/menu" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700">
                Menu
              </Link>
              <Link href="/track-order" className="block rounded-md px-3 py-2 font-bold text-green-700 hover:bg-green-50">
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

      <section className="py-10 sm:py-12 bg-gradient-to-r from-green-600 to-green-700">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="responsive-page-title text-white mb-2">Track Order</h1>
          <p className="text-base text-green-100 sm:text-xl">Enter your phone number and Order ID to see your pickup status.</p>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <form onSubmit={handleTrackOrder} className="bg-green-50 rounded-lg p-4 mb-8 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700" size={18} />
              <input
                type="tel"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setOrder(null);
                  setHasSearched(false);
                }}
                placeholder="Enter phone number used while ordering"
                className="w-full pl-10 pr-3 py-3 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Order ID
              </label>
              <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700" size={18} />
              <input
                type="text"
                inputMode="numeric"
                value={orderId}
                onChange={(event) => {
                  setOrderId(event.target.value.replace(/\D/g, ""));
                  setOrder(null);
                  setHasSearched(false);
                }}
                placeholder="Enter Order ID"
                className="w-full pl-10 pr-3 py-3 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold px-6 py-3 lg:w-auto"
            >
              <Search size={18} />
              {isLoading ? "Checking..." : "Track Order"}
            </Button>
          </div>
        </form>

        {hasSearched && !order && (
          <div className="border-2 border-dashed border-green-200 rounded-lg p-8 text-center">
            <ReceiptText className="mx-auto text-green-700 mb-3" size={36} />
            <h2 className="text-xl font-bold text-gray-800 mb-2">No orders found</h2>
            <p className="text-gray-600">
              Check the phone number and Order ID, then try again.
            </p>
          </div>
        )}

        {order && (
          <div className="space-y-6">
              <article className="border-2 border-green-100 rounded-lg overflow-hidden bg-white">
                <div className="flex flex-col gap-3 border-b border-green-100 bg-green-50 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Order #{order.id}</p>
                    <h2 className="text-xl font-bold text-green-700 sm:text-2xl">{order.customerName}</h2>
                  </div>
                  <span className="self-start md:self-center rounded-full bg-yellow-500 px-3 py-1 text-sm font-bold text-gray-900 capitalize">
                    {statusLabels[order.status as OrderStatus] ?? order.status}
                  </span>
                </div>

                <div className="grid gap-4 border-b border-green-100 p-4 sm:p-5 md:grid-cols-3">
                  <div className="flex gap-3">
                    <Phone className="text-yellow-500 mt-1" size={20} />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-semibold text-gray-800">{order.customerPhone}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Clock className="text-yellow-500 mt-1" size={20} />
                    <div>
                      <p className="text-sm text-gray-500">Pickup Time</p>
                      <p className="font-semibold text-gray-800">{formatDateTime(order.pickupTime)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-2xl font-bold text-yellow-600">{formatPrice(order.totalPrice)}</p>
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <h3 className="font-bold text-gray-800 mb-3">Items</h3>
                  <div className="divide-y divide-green-100">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                        <div>
                          <p className="font-semibold text-gray-800">
                            {getOrderItemName(item)}
                          </p>
                          <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                        </div>
                        <p className="font-bold text-gray-800">
                          {formatPrice(item.priceAtOrder * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              {order.status === "ready" && (
                <section className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4 sm:p-5">
                  <div className="mb-5">
                    <p className="text-sm font-bold uppercase tracking-wide text-yellow-700">
                      Ready for Pickup
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">
                      Delivery Help
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-gray-700 sm:text-base">
                      If you want delivery, please book Rapido / Porter / Dunzo by yourself and send the rider to our store.
                    </p>
                  </div>

                  <div className="mb-5 rounded-lg border border-yellow-200 bg-white p-4">
                    <h3 className="mb-3 font-bold text-green-700">Pickup Details</h3>
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-gray-500">Store Name</p>
                        <p className="font-semibold text-gray-900">{STORE_NAME}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Order ID</p>
                        <p className="font-semibold text-gray-900">#{order.id}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-gray-500">Store Address</p>
                        <p className="font-semibold text-gray-900">{STORE_ADDRESS}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Customer Name</p>
                        <p className="font-semibold text-gray-900">{order.customerName}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Customer Phone</p>
                        <p className="font-semibold text-gray-900">{order.customerPhone}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total Amount</p>
                        <p className="font-semibold text-yellow-700">{formatPrice(order.totalPrice)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Store Phone</p>
                        <p className="font-semibold text-gray-900">{STORE_PHONE_DISPLAY}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <Button
                      type="button"
                      onClick={() => handleCopyPickupDetails(order)}
                      className="w-full bg-green-700 font-bold text-white hover:bg-green-800"
                    >
                      <Copy size={18} />
                      Copy Pickup Details
                    </Button>
                    <a
                      href={RAPIDO_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-gray-900 shadow-xs ring-1 ring-yellow-200 hover:bg-yellow-100"
                    >
                      <ExternalLink size={18} />
                      Open Rapido
                    </a>
                    <a
                      href={PORTER_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-gray-900 shadow-xs ring-1 ring-yellow-200 hover:bg-yellow-100"
                    >
                      <ExternalLink size={18} />
                      Open Porter
                    </a>
                    <a
                      href={`tel:${STORE_PHONE}`}
                      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-gray-900 shadow-xs ring-1 ring-yellow-200 hover:bg-yellow-100"
                    >
                      <Phone size={18} />
                      Call Store
                    </a>
                    <a
                      href={`https://wa.me/${STORE_PHONE.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-gray-900 shadow-xs ring-1 ring-yellow-200 hover:bg-yellow-100"
                    >
                      <MessageCircle size={18} />
                      WhatsApp Store
                    </a>
                  </div>
                </section>
              )}
          </div>
        )}
      </main>
    </div>
  );
}
