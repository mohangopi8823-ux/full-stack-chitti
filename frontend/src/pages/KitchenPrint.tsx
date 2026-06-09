import { useEffect, useMemo, useState } from "react";
import { Link, RouteComponentProps, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { isAdminLoggedIn } from "@/lib/adminAuth";
import {
  getOrderById,
  type OrderStatus,
  type TrackedOrder,
} from "@/lib/orders";
import { ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner";

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  confirmed: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatPrice(price: number) {
  return `Rs. ${(price / 100).toFixed(2)}`;
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

export default function KitchenPrint({
  params,
}: RouteComponentProps<{ id?: string }>) {
  const [, setLocation] = useLocation();
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const orderId = useMemo(() => Number(params.id), [params.id]);

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      toast.error("Please log in to print orders");
      setLocation("/admin-login");
      return;
    }

    if (!Number.isInteger(orderId) || orderId <= 0) {
      toast.error("Invalid order number");
      setLocation("/admin-orders");
      return;
    }

    async function loadOrder() {
      try {
        setIsLoading(true);
        const nextOrder = await getOrderById(orderId);

        if (!nextOrder) {
          toast.error("Order not found");
          setLocation("/admin-orders");
          return;
        }

        setOrder(nextOrder);
      } catch (error) {
        console.error(error);
        toast.error("Unable to load order for printing");
      } finally {
        setIsLoading(false);
      }
    }

    void loadOrder();
  }, [orderId, setLocation]);

  useEffect(() => {
    if (!order) return;

    const printTimer = window.setTimeout(() => {
      window.print();
    }, 350);

    return () => window.clearTimeout(printTimer);
  }, [order]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white p-6 text-center text-sm text-gray-600">
        Loading print bill...
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-white p-6 text-center text-sm text-gray-600">
        Order not available.
      </main>
    );
  }

  const statusLabel =
    statusLabels[order.status as OrderStatus] ?? order.status;

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-md items-center justify-between gap-3 print:hidden">
        <Button
          type="button"
          onClick={() => window.print()}
          className="bg-green-700 hover:bg-green-800 text-white font-bold"
        >
          <Printer size={18} />
          Print
        </Button>
        <Link
          href="/admin-orders"
          className="inline-flex items-center gap-2 rounded-md border border-green-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-green-50"
        >
          <ArrowLeft size={16} />
          Orders
        </Link>
      </div>

      <section className="mx-auto max-w-md bg-white p-5 text-black shadow-sm print:m-0 print:w-[72mm] print:max-w-none print:p-0 print:shadow-none">
        <style>{`
          @page {
            size: 72mm auto;
            margin: 4mm;
          }

          @media print {
            body {
              background: white !important;
            }
          }
        `}</style>

        <header className="text-center">
          <h1 className="text-xl font-black leading-tight print:text-[18px]">
            Chitti Naidu Pulao
          </h1>
          <p className="text-sm font-bold uppercase tracking-normal">
            Kitchen Order
          </p>
        </header>

        <div className="my-3 border-t border-dashed border-black" />

        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="font-bold">Order</dt>
            <dd>#{order.id}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-bold">Name</dt>
            <dd className="text-right">{order.customerName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-bold">Phone</dt>
            <dd>{order.customerPhone}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-bold">Pickup</dt>
            <dd className="text-right">{formatDateTime(order.pickupTime)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-bold">Status</dt>
            <dd>{statusLabel}</dd>
          </div>
        </dl>

        <div className="my-3 border-t border-dashed border-black" />

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black">
              <th className="py-1 pr-2">Item</th>
              <th className="w-10 py-1 text-center">Qty</th>
              <th className="w-20 py-1 text-right">Amt</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-dashed border-black/50">
                <td className="py-2 pr-2 font-semibold">
                  {getOrderItemName(item)}
                </td>
                <td className="py-2 text-center font-bold">
                  {item.quantity}
                </td>
                <td className="py-2 text-right">
                  {formatPrice(item.priceAtOrder * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="my-3 border-t border-dashed border-black" />

        <div className="flex justify-between text-lg font-black">
          <span>Total</span>
          <span>{formatPrice(order.totalPrice)}</span>
        </div>

        <p className="mt-4 text-center text-xs font-bold uppercase">
          Pickup from Store Only
        </p>
      </section>
    </main>
  );
}
