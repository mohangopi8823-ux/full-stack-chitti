import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { isAdminLoggedIn, logoutAdmin } from "@/lib/adminAuth";
import {
  getAllOrders,
  updateOrderPaymentStatus,
  updateOrderStatus,
  type PaymentStatus,
  type OrderStatus,
  type TrackedOrder,
} from "@/lib/orders";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { DEFAULT_ORDER_SETTINGS, type OrderSettings } from "@shared/orderLimits";
import { DEFAULT_STORE_HOURS, formatStoreTime, normalizeStoreHours, type StoreHours } from "@shared/storeHours";
import { Clock, Download, Phone, Printer, RefreshCw, ReceiptText } from "lucide-react";
import { toast } from "sonner";

const menuItemNames: Record<number, string> = {
  1: "Chicken Fry Piece Vistaraku Pulao",
  2: "Mutton Vistaraku Pulao",
  3: "Veg Vistaraku Pulao",
  4: "Gulab Jamun",
  5: "Badam Milk",
};

const statusSteps: OrderStatus[] = ["pending", "preparing", "ready", "completed"];

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  confirmed: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

const statusStyles: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-900 border-yellow-300",
  preparing: "bg-blue-100 text-blue-900 border-blue-300",
  confirmed: "bg-blue-100 text-blue-900 border-blue-300",
  ready: "bg-green-100 text-green-900 border-green-300",
  completed: "bg-gray-100 text-gray-800 border-gray-300",
  cancelled: "bg-red-100 text-red-900 border-red-300",
};

interface AdminMenuItem {
  id: number;
  name: string;
  stockQuantity: number;
}

interface AdminPickupSlot {
  startIso: string;
  pickupDate: string;
  label: string;
}

interface AdminPickupAvailability {
  slots: AdminPickupSlot[];
  settings: OrderSettings;
}

const paymentMethodLabels: Record<string, string> = {
  cash_on_pickup: "Cash on Pickup",
  online_payment: "Online Payment",
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: "Pending",
  paid: "Paid",
};

const paymentStatusStyles: Record<PaymentStatus, string> = {
  pending: "bg-yellow-100 text-yellow-900 border-yellow-300",
  paid: "bg-green-100 text-green-900 border-green-300",
};

type ExportOrder = {
  id: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  totalPrice: number;
  status: string;
  pickupTime: string;
  pickupDate: string;
  createdAt: string;
  notes: string | null;
};

type ExportOrderItem = {
  id: number;
  orderId: number;
  menuItemId: number;
  quantity: number;
  priceAtOrder: number;
};

type ExportMenuItem = {
  id: number;
  name: string;
};

function formatPrice(price: number) {
  return `₹${(price / 100).toFixed(2)}`;
}

function getOrderItemName(item: TrackedOrder["items"][number]) {
  return item.menuItemName || menuItemNames[item.menuItemId] || `Menu Item #${item.menuItemId}`;
}

function formatCsvPrice(price: number | null | undefined) {
  if (typeof price !== "number") {
    return "";
  }

  return (price / 100).toFixed(2);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCsvDate(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeCsvValue(value: string | number | null | undefined) {
  const stringValue = value == null ? "" : String(value);

  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob(["\uFEFF", csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminOrders() {
  const [, setLocation] = useLocation();
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [updatingPaymentOrderId, setUpdatingPaymentOrderId] = useState<number | null>(null);
  const [storeHoursForm, setStoreHoursForm] = useState<StoreHours>(DEFAULT_STORE_HOURS);
  const [orderSettingsForm, setOrderSettingsForm] = useState<OrderSettings>(DEFAULT_ORDER_SETTINGS);
  const [acceptingOrders, setAcceptingOrders] = useState<boolean>(DEFAULT_ORDER_SETTINGS.acceptingOrders);
  const [stockDrafts, setStockDrafts] = useState<Record<number, number>>({});
  const trpcUtils = trpc.useUtils();
  const { data: storeHoursData, isLoading: isStoreHoursLoading } = trpc.storeHours.get.useQuery();
  const updateStoreHours = trpc.storeHours.update.useMutation();
  const { data: rawAvailability } = trpc.ordering.availability.useQuery(undefined, {
    refetchInterval: 10000,
  });
  const availability = rawAvailability as AdminPickupAvailability | undefined;
  const updateOrderSettings = trpc.ordering.updateSettings.useMutation();
  const { data: rawMenuItems = [] } = trpc.menu.list.useQuery();
  const menuItems = rawMenuItems as AdminMenuItem[];
  const updateStock = trpc.menu.updateStock.useMutation();

  const loadOrders = useCallback(async () => {
    setIsLoading(true);

    try {
      const nextOrders = await getAllOrders();
      setOrders(nextOrders);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load orders");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      toast.error("Please log in to manage orders");
      setLocation("/admin-login");
      return;
    }

    void loadOrders();

    const refreshTimer = window.setInterval(() => {
      void loadOrders();
    }, 10000);

    return () => window.clearInterval(refreshTimer);
  }, [loadOrders, setLocation]);

  useEffect(() => {
    if (!storeHoursData) return;
    setStoreHoursForm(normalizeStoreHours(storeHoursData));
  }, [storeHoursData]);

  useEffect(() => {
    if (!availability?.settings) return;
    setOrderSettingsForm(availability.settings);
    setAcceptingOrders(Boolean(availability.settings.acceptingOrders));
    console.log("[Admin Order Settings] Fetched acceptingOrders:", availability.settings.acceptingOrders);
  }, [availability?.settings]);

  useEffect(() => {
    setStockDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      for (const item of menuItems) {
        if (nextDrafts[item.id] === undefined) {
          nextDrafts[item.id] = item.stockQuantity ?? 0;
        }
      }
      return nextDrafts;
    });
  }, [menuItems]);

  const handleLogout = () => {
    logoutAdmin();
    toast.success("Logged out");
    setLocation("/admin-login");
  };

  const handleStoreHoursSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const updatedHours = await updateStoreHours.mutateAsync(storeHoursForm);
      setStoreHoursForm(normalizeStoreHours(updatedHours));
      await trpcUtils.storeHours.get.invalidate();
      toast.success("Store hours updated");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to update store hours");
    }
  };

  const handleOrderSettingsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const settingsToSave: OrderSettings = {
        ...orderSettingsForm,
        acceptingOrders: Boolean(acceptingOrders),
      };
      console.log("[Admin Order Settings] Saving acceptingOrders:", settingsToSave.acceptingOrders);
      const updatedSettings = await updateOrderSettings.mutateAsync(settingsToSave);
      setOrderSettingsForm(updatedSettings);
      setAcceptingOrders(Boolean(updatedSettings.acceptingOrders));
      await trpcUtils.ordering.availability.invalidate();
      toast.success("Checkout settings updated");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to update checkout settings");
    }
  };

  const handleStockSubmit = async (menuItemId: number) => {
    try {
      await updateStock.mutateAsync({
        menuItemId,
        stockQuantity: Math.max(0, Number(stockDrafts[menuItemId] ?? 0)),
      });
      await trpcUtils.menu.list.invalidate();
      toast.success("Stock updated");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to update stock");
    }
  };

  const handleStatusChange = async (orderId: number, status: OrderStatus) => {
    setUpdatingOrderId(orderId);

    try {
      const updatedOrder = await updateOrderStatus(orderId, status);
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId ? { ...order, status: updatedOrder.status } : order,
        ),
      );
      await loadOrders();
      toast.success(`Order #${orderId} marked ${statusLabels[updatedOrder.status].toLowerCase()}`);
    } catch (error) {
      console.error(error);
      toast.error("Unable to update order status");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleMarkAsPaid = async (orderId: number) => {
    setUpdatingPaymentOrderId(orderId);

    try {
      await updateOrderPaymentStatus(orderId, "paid");
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId ? { ...order, paymentStatus: "paid" } : order,
        ),
      );
      toast.success(`Order #${orderId} marked paid`);
    } catch (error) {
      console.error(error);
      toast.error("Unable to update payment status");
    } finally {
      setUpdatingPaymentOrderId(null);
    }
  };

  const handlePrintKitchenBill = (order: TrackedOrder) => {
    const printWindow = window.open(
      `/admin-orders/${order.id}/print`,
      "_blank",
      "width=420,height=720",
    );

    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups for this website.");
    }
  };

  const handleExportOrders = async () => {
    setIsExporting(true);
    toast.loading("Exporting orders...", { id: "export-orders" });

    try {
      const [ordersResult, orderItemsResult, menuItemsResult] = await Promise.all([
        supabase
          .from("orders")
          .select("id, customerName, customerPhone, customerEmail, totalPrice, status, pickupTime, pickupDate, createdAt, notes")
          .order("createdAt", { ascending: false }),
        supabase
          .from("orderItems")
          .select("id, orderId, menuItemId, quantity, priceAtOrder"),
        supabase
          .from("menuItems")
          .select("id, name"),
      ]);

      if (ordersResult.error) {
        throw ordersResult.error;
      }

      if (orderItemsResult.error) {
        throw orderItemsResult.error;
      }

      if (menuItemsResult.error) {
        throw menuItemsResult.error;
      }

      const exportOrders = (ordersResult.data ?? []) as ExportOrder[];
      const exportOrderItems = (orderItemsResult.data ?? []) as ExportOrderItem[];
      const exportMenuItems = (menuItemsResult.data ?? []) as ExportMenuItem[];
      const menuItemsById = new Map(
        exportMenuItems.map((menuItem) => [menuItem.id, menuItem.name]),
      );
      const orderItemsByOrderId = exportOrderItems.reduce((itemsByOrder, item) => {
        const currentItems = itemsByOrder.get(item.orderId) ?? [];
        currentItems.push(item);
        itemsByOrder.set(item.orderId, currentItems);
        return itemsByOrder;
      }, new Map<number, ExportOrderItem[]>());
      const headers = [
        "Order ID",
        "Customer Name",
        "Customer Phone",
        "Customer Email",
        "Item Name",
        "Quantity",
        "Price At Order",
        "Total Price",
        "Order Status",
        "Pickup Time",
        "Pickup Date",
        "Created At",
        "Notes",
      ];
      const rows = exportOrders.flatMap((order) => {
        const items = orderItemsByOrderId.get(order.id) ?? [];

        if (items.length === 0) {
          return [[
            order.id,
            order.customerName,
            order.customerPhone,
            order.customerEmail,
            "",
            "",
            "",
            formatCsvPrice(order.totalPrice),
            order.status,
            formatCsvDate(order.pickupTime),
            order.pickupDate,
            formatCsvDate(order.createdAt),
            order.notes,
          ]];
        }

        return items.map((item) => [
          order.id,
          order.customerName,
          order.customerPhone,
          order.customerEmail,
          menuItemsById.get(item.menuItemId) ?? `Menu Item #${item.menuItemId}`,
          item.quantity,
          formatCsvPrice(item.priceAtOrder),
          formatCsvPrice(item.priceAtOrder * item.quantity),
          order.status,
          formatCsvDate(order.pickupTime),
          order.pickupDate,
          formatCsvDate(order.createdAt),
          order.notes,
        ]);
      });
      const csvContent = [headers, ...rows]
        .map((row) => row.map(escapeCsvValue).join(","))
        .join("\r\n");
      const today = new Date().toISOString().slice(0, 10);

      downloadCsv(`restaurant-orders-${today}.csv`, csvContent);
      toast.success("Orders exported successfully", { id: "export-orders" });
    } catch (error) {
      console.error("Failed to export orders:", error);
      toast.error("Unable to export orders. Please try again.", { id: "export-orders" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="admin-page min-h-screen w-full overflow-x-hidden bg-white">
      <nav className="sticky top-0 z-50 bg-white border-b-2 border-green-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
            <Link href="/" className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-lg font-bold text-green-700 md:h-auto md:w-auto md:bg-transparent md:text-2xl">
                CN
              </div>
              <div className="min-w-0">
                <h1 className="truncate whitespace-nowrap text-lg font-bold text-green-700 md:text-xl">Admin Orders</h1>
                <p className="truncate whitespace-nowrap text-xs text-yellow-600">Chitti Naidu Pulao</p>
              </div>
            </Link>

            <div className="grid w-full grid-cols-3 gap-2 md:flex md:w-auto md:flex-wrap md:items-center md:justify-end md:gap-3">
              <Link href="/track-order" className="hidden sm:inline text-gray-700 hover:text-green-700 font-medium transition">
                Track Order
              </Link>
              <Link href="/menu" className="hidden sm:inline text-gray-700 hover:text-green-700 font-medium transition">
                Menu
              </Link>
              <Button
                type="button"
                onClick={handleLogout}
                className="min-w-0 bg-white px-2 text-xs text-gray-800 border border-green-200 hover:bg-green-50 sm:text-sm md:px-4"
              >
                Logout
              </Button>
              <Button
                type="button"
                onClick={loadOrders}
                disabled={isLoading || isExporting}
                className="min-w-0 bg-green-700 px-2 text-xs font-bold text-white hover:bg-green-800 sm:text-sm md:px-4"
              >
                <RefreshCw className="h-4 w-4 shrink-0 md:h-[18px] md:w-[18px]" />
                Refresh
              </Button>
              <Button
                type="button"
                onClick={handleExportOrders}
                disabled={isExporting}
                className="min-w-0 bg-yellow-500 px-2 text-xs font-bold text-gray-900 hover:bg-yellow-600 sm:text-sm md:px-4"
              >
                <Download className="h-4 w-4 shrink-0 md:h-[18px] md:w-[18px]" />
                {isExporting ? "Exporting..." : <><span className="sm:hidden">Export</span><span className="hidden sm:inline">Export Orders</span></>}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <section className="py-10 bg-gradient-to-r from-green-600 to-green-700">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-white mb-2">Orders</h1>
          <p className="text-green-100 text-lg">
            Update each pickup order as it moves from pending to completed.
          </p>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <form
          onSubmit={handleStoreHoursSubmit}
          className="mb-8 max-w-full rounded-lg border-2 border-green-100 bg-green-50 p-4 sm:p-5"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-green-700">
                <Clock size={20} />
                <h2 className="text-xl font-bold">Store Active Time</h2>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Customers can view the menu anytime, but checkout is available only during these India time hours.
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-800">
                Current: {formatStoreTime(storeHoursForm.openingTime)} to {formatStoreTime(storeHoursForm.closingTime)} IST
              </p>
            </div>

            <div className="grid w-full gap-3 md:grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_auto] md:items-end lg:w-auto">
              <label className="text-sm font-semibold text-gray-700">
                Opening Time
                <input
                  type="time"
                  value={storeHoursForm.openingTime}
                  onChange={(event) =>
                    setStoreHoursForm((current) => ({
                      ...current,
                      openingTime: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-green-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Closing Time
                <input
                  type="time"
                  value={storeHoursForm.closingTime}
                  onChange={(event) =>
                    setStoreHoursForm((current) => ({
                      ...current,
                      closingTime: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-green-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </label>
              <Button
                type="submit"
                disabled={isStoreHoursLoading || updateStoreHours.isPending}
                className="w-full bg-green-700 hover:bg-green-800 text-white font-bold md:w-auto"
              >
                {updateStoreHours.isPending ? "Saving..." : "Save Hours"}
              </Button>
            </div>
          </div>
        </form>

        <form
          onSubmit={handleOrderSettingsSubmit}
          className="mb-8 max-w-full rounded-lg border-2 border-yellow-100 bg-yellow-50 p-4 sm:p-5"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900">Checkout Controls</h2>
              <p className="mt-1 text-sm text-gray-600">
                Menu stays visible; these controls decide whether checkout can accept pickup orders.
              </p>
            </div>

            <div className="grid w-full gap-3 md:grid-cols-[auto_auto] md:items-end lg:w-auto">
              <label className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={acceptingOrders}
                  onChange={(event) => setAcceptingOrders(event.target.checked)}
                  className="h-4 w-4"
                />
                Accepting Orders
              </label>
              <Button
                type="submit"
                disabled={updateOrderSettings.isPending}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold md:w-auto"
              >
                {updateOrderSettings.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        </form>

        <div className="mb-8">
          <section className="max-w-full rounded-lg border-2 border-green-100 bg-white p-4 sm:p-5">
            <h2 className="text-xl font-bold text-green-700">Item Stock</h2>
            <p className="mt-1 text-sm text-gray-600">
              Stock automatically reduces after each successful order.
            </p>
            <div className="mt-4 max-h-80 divide-y divide-green-100 overflow-y-auto">
              {menuItems.map((item) => (
                <div key={item.id} className="grid gap-3 py-3 md:grid-cols-[1fr_120px_auto] md:items-center">
                  <div>
                    <p className="font-semibold text-gray-800">{item.name}</p>
                    <p className={`text-sm font-semibold ${item.stockQuantity <= 0 ? "text-red-600" : "text-gray-500"}`}>
                      {item.stockQuantity <= 0 ? "Sold Out" : `${item.stockQuantity} in stock`}
                    </p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={stockDrafts[item.id] ?? item.stockQuantity ?? 0}
                    onChange={(event) =>
                      setStockDrafts((current) => ({
                        ...current,
                        [item.id]: Number(event.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-green-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <Button
                    type="button"
                    onClick={() => handleStockSubmit(item.id)}
                    disabled={updateStock.isPending}
                    className="w-full bg-green-700 hover:bg-green-800 text-white font-bold md:w-auto"
                  >
                    Save Stock
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {isLoading && (
          <div className="text-center py-12 text-gray-500">Loading orders...</div>
        )}

        {!isLoading && orders.length === 0 && (
          <div className="border-2 border-dashed border-green-200 rounded-lg p-8 text-center">
            <ReceiptText className="mx-auto text-green-700 mb-3" size={36} />
            <h2 className="text-xl font-bold text-gray-800 mb-2">No orders yet</h2>
            <p className="text-gray-600">New customer orders will appear here.</p>
          </div>
        )}

        {!isLoading && orders.length > 0 && (
          <div className="space-y-6">
            {orders.map((order) => {
              const currentStatus = order.status as OrderStatus;
              const paymentStatus = order.paymentStatus as PaymentStatus;

              return (
                <article key={order.id} className="border-2 border-green-100 rounded-lg overflow-hidden bg-white">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-green-50 p-5 border-b border-green-100">
                    <div>
                      <p className="text-sm text-gray-500">Order #{order.id}</p>
                      <h2 className="text-2xl font-bold text-green-700">{order.customerName}</h2>
                    </div>
                    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                      <Button
                        type="button"
                        onClick={() => handlePrintKitchenBill(order)}
                        className="col-span-2 min-w-0 bg-yellow-500 px-3 text-xs font-bold text-gray-900 hover:bg-yellow-600 sm:col-span-1 sm:text-sm"
                      >
                        <Printer className="h-4 w-4 shrink-0 md:h-[18px] md:w-[18px]" />
                        Print Kitchen Bill
                      </Button>
                      {statusSteps.map((status) => (
                        <Button
                          key={status}
                          type="button"
                          onClick={() => handleStatusChange(order.id, status)}
                          disabled={updatingOrderId === order.id || currentStatus === status}
                          className={
                            currentStatus === status
                              ? "min-w-0 bg-green-700 px-3 text-xs text-white hover:bg-green-700 sm:text-sm"
                              : "min-w-0 bg-white px-3 text-xs text-gray-800 border border-green-200 hover:bg-green-50 sm:text-sm"
                          }
                        >
                          {statusLabels[status]}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-5 gap-4 p-5 border-b border-green-100">
                    <div className="flex gap-3">
                      <Phone className="text-yellow-500 mt-1" size={20} />
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-semibold text-gray-800">{order.customerPhone}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-semibold text-gray-800">{order.customerEmail || "Not provided"}</p>
                    </div>
                    <div className="flex gap-3">
                      <Clock className="text-yellow-500 mt-1" size={20} />
                      <div>
                        <p className="text-sm text-gray-500">Pickup</p>
                        <p className="font-semibold text-gray-800">{formatDateTime(order.pickupTime)}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${statusStyles[currentStatus] ?? statusStyles.pending}`}>
                        {statusLabels[currentStatus] ?? currentStatus}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Payment</p>
                      <p className="font-semibold text-gray-800">
                        {paymentMethodLabels[order.paymentMethod] ?? order.paymentMethod}
                      </p>
                      <span className={`mt-1 inline-flex rounded-full border px-3 py-1 text-sm font-bold ${paymentStatusStyles[paymentStatus] ?? paymentStatusStyles.pending}`}>
                        {paymentStatusLabels[paymentStatus] ?? paymentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-[1fr_auto] gap-5 p-5">
                    <div>
                      <h3 className="font-bold text-gray-800 mb-3">Items</h3>
                      <div className="divide-y divide-green-100">
                        {order.items.length === 0 ? (
                          <p className="py-3 text-sm text-gray-500">No items saved for this order.</p>
                        ) : (
                          order.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                              <div>
                                <p className="font-semibold text-gray-800">
                                  {getOrderItemName(item)}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Qty {item.quantity} x {formatPrice(item.priceAtOrder)}
                                </p>
                              </div>
                              <p className="font-bold text-gray-800">
                                {formatPrice(item.priceAtOrder * item.quantity)}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="lg:min-w-48 lg:text-right border-t lg:border-t-0 lg:border-l border-green-100 pt-4 lg:pt-0 lg:pl-5">
                      <p className="text-sm text-gray-500">Order Total</p>
                      <p className="text-3xl font-bold text-yellow-600">{formatPrice(order.totalPrice)}</p>
                      {paymentStatus !== "paid" && (
                        <Button
                          type="button"
                          onClick={() => handleMarkAsPaid(order.id)}
                          disabled={updatingPaymentOrderId === order.id}
                          className="mt-4 bg-green-700 hover:bg-green-800 text-white font-bold"
                        >
                          {updatingPaymentOrderId === order.id ? "Updating..." : "Mark as Paid"}
                        </Button>
                      )}
                      <p className="text-sm text-gray-500 mt-2">
                        Placed {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
