import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { backupOldOrders, type BackupOldOrdersResult } from "@/lib/adminApi";
import { isAdminLoggedIn, logoutAdmin } from "@/lib/adminAuth";
import { Download, LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function AdminBackup() {
  const [, setLocation] = useLocation();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BackupOldOrdersResult | null>(null);

  if (!isAdminLoggedIn()) {
    setLocation("/login");
    return null;
  }

  const handleLogout = async () => {
    await logoutAdmin();
    toast.success("Logged out");
    setLocation("/login");
  };

  const handleBackup = async (deleteAfterBackup: boolean) => {
    setIsRunning(true);
    setResult(null);

    try {
      const backupResult = await backupOldOrders(deleteAfterBackup);
      setResult(backupResult);
      toast.success(deleteAfterBackup ? "Backup and cleanup completed" : "Backup completed");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Backup failed");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="admin-page min-h-screen bg-green-50">
      <nav className="sticky top-0 z-50 border-b border-green-100 bg-white shadow-sm">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <Link href="/dashboard" className="min-w-0">
            <p className="truncate text-sm font-semibold text-yellow-600">Chitti Naidu Pulao</p>
            <h1 className="truncate text-xl font-bold text-green-700">Backup</h1>
          </Link>
          <div className="grid grid-cols-2 gap-2 md:flex">
            <Link href="/orders" className="inline-flex items-center justify-center rounded-md border border-green-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-green-50">
              Orders
            </Link>
            <Link href="/settings" className="inline-flex items-center justify-center rounded-md border border-green-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-green-50">
              Settings
            </Link>
            <Button type="button" onClick={handleLogout} className="col-span-2 bg-green-700 text-white hover:bg-green-800 md:col-span-1">
              <LogOut size={16} />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <section className="rounded-lg bg-white p-5 shadow-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-green-700">Old Orders Backup</h2>
            <p className="mt-2 text-sm text-gray-600">
              Export old order records using the existing backend backup job.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              onClick={() => handleBackup(false)}
              disabled={isRunning}
              className="bg-green-700 font-bold text-white hover:bg-green-800"
            >
              <Download size={16} />
              {isRunning ? "Running..." : "Run Backup"}
            </Button>
            <Button
              type="button"
              onClick={() => handleBackup(true)}
              disabled={isRunning}
              className="bg-yellow-500 font-bold text-gray-900 hover:bg-yellow-600"
            >
              <RefreshCw size={16} />
              Backup and Delete Old Orders
            </Button>
          </div>

          {result && (
            <div className="mt-6 rounded-lg border border-green-100 bg-green-50 p-4 text-sm font-semibold text-gray-800">
              <p>Orders backed up: {result.ordersBackedUp}</p>
              <p>Order items backed up: {result.orderItemsBackedUp}</p>
              <p>Orders deleted: {result.deletedOrders}</p>
              <p>Order items deleted: {result.deletedOrderItems}</p>
              {result.backupPath && <p>File: {result.backupPath}</p>}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
