import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { isAdminLoggedIn, logoutAdmin } from "@/lib/adminAuth";
import {
  createAdminMenuItem,
  createAdminOffer,
  deleteAdminMenuItem,
  deleteAdminOffer,
  listAdminMenuItems,
  listAdminOffers,
  updateAdminMenuItem,
  updateAdminOffer,
  type AdminMenuItem,
  type AdminOffer,
  type MenuItemInput,
  type OfferInput,
} from "@/lib/adminApi";
import { Edit2, LogOut, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

const emptyMenuForm = {
  name: "",
  description: "",
  price: "",
  category: "pakodi",
  imageUrl: "",
  isAvailable: true,
  stockQuantity: "100",
};

const emptyOfferForm = {
  title: "",
  description: "",
  imageUrl: "",
  discountText: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  isActive: true,
};

type MenuForm = typeof emptyMenuForm;
type OfferForm = typeof emptyOfferForm;
type AdminTab = "menu" | "offers";

function formatPrice(price: number) {
  return `₹${(price / 100).toFixed(2)}`;
}

function menuItemToForm(item: AdminMenuItem): MenuForm {
  return {
    name: item.name,
    description: item.description ?? "",
    price: (item.price / 100).toFixed(2),
    category: item.category,
    imageUrl: item.imageUrl ?? "",
    isAvailable: Boolean(item.isAvailable),
    stockQuantity: String(item.stockQuantity ?? 0),
  };
}

function offerToForm(offer: AdminOffer): OfferForm {
  return {
    title: offer.title,
    description: offer.description ?? "",
    imageUrl: offer.imageUrl ?? "",
    discountText: offer.discountText,
    startDate: offer.startDate,
    endDate: offer.endDate,
    isActive: Boolean(offer.isActive),
  };
}

function normalizeMenuForm(form: MenuForm): MenuItemInput {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    price: Math.round(Number(form.price) * 100),
    category: form.category.trim(),
    imageUrl: form.imageUrl.trim(),
    isAvailable: form.isAvailable,
    stockQuantity: Math.max(0, Number(form.stockQuantity || 0)),
  };
}

function normalizeOfferForm(form: OfferForm): OfferInput {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    imageUrl: form.imageUrl.trim(),
    discountText: form.discountText.trim(),
    startDate: form.startDate,
    endDate: form.endDate,
    isActive: form.isActive,
  };
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<AdminTab>("menu");
  const [menuItems, setMenuItems] = useState<AdminMenuItem[]>([]);
  const [offers, setOffers] = useState<AdminOffer[]>([]);
  const [menuForm, setMenuForm] = useState<MenuForm>(emptyMenuForm);
  const [offerForm, setOfferForm] = useState<OfferForm>(emptyOfferForm);
  const [editingMenuId, setEditingMenuId] = useState<number | null>(null);
  const [editingOfferId, setEditingOfferId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(["pakodi", ...menuItems.map((item) => item.category)])).filter(Boolean),
    [menuItems],
  );

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);

    try {
      const [nextMenuItems, nextOffers] = await Promise.all([
        listAdminMenuItems(),
        listAdminOffers(),
      ]);
      setMenuItems(nextMenuItems);
      setOffers(nextOffers);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to load dashboard");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      toast.error("Please log in to manage the restaurant");
      setLocation("/admin-login");
      return;
    }

    void loadDashboard();
  }, [loadDashboard, setLocation]);

  const handleLogout = async () => {
    await logoutAdmin();
    toast.success("Logged out");
    setLocation("/admin-login");
  };

  const handleMenuSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const input = normalizeMenuForm(menuForm);
      if (editingMenuId) {
        await updateAdminMenuItem(editingMenuId, input);
        toast.success("Menu item updated");
      } else {
        await createAdminMenuItem(input);
        toast.success("Menu item added");
      }
      setMenuForm(emptyMenuForm);
      setEditingMenuId(null);
      await loadDashboard();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to save menu item");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOfferSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const input = normalizeOfferForm(offerForm);
      if (editingOfferId) {
        await updateAdminOffer(editingOfferId, input);
        toast.success("Offer updated");
      } else {
        await createAdminOffer(input);
        toast.success("Offer added");
      }
      setOfferForm(emptyOfferForm);
      setEditingOfferId(null);
      await loadDashboard();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to save offer");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMenuItem = async (item: AdminMenuItem) => {
    if (!window.confirm(`Delete ${item.name}?`)) return;

    try {
      await deleteAdminMenuItem(item.id);
      toast.success("Menu item deleted");
      await loadDashboard();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to delete menu item");
    }
  };

  const handleDeleteOffer = async (offer: AdminOffer) => {
    if (!window.confirm(`Delete ${offer.title}?`)) return;

    try {
      await deleteAdminOffer(offer.id);
      toast.success("Offer deleted");
      await loadDashboard();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to delete offer");
    }
  };

  const handleToggleMenuAvailability = async (item: AdminMenuItem) => {
    try {
      await updateAdminMenuItem(item.id, { isAvailable: !item.isAvailable });
      toast.success(item.isAvailable ? "Marked out of stock" : "Marked available");
      await loadDashboard();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to update availability");
    }
  };

  const handleToggleOfferActive = async (offer: AdminOffer) => {
    try {
      await updateAdminOffer(offer.id, { isActive: !offer.isActive });
      toast.success(offer.isActive ? "Offer disabled" : "Offer enabled");
      await loadDashboard();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to update offer");
    }
  };

  return (
    <div className="admin-page min-h-screen w-full overflow-x-hidden bg-green-50">
      <nav className="sticky top-0 z-50 border-b border-green-100 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="truncate whitespace-nowrap text-sm font-semibold text-yellow-600">Chitti Naidu Pulao</p>
              <h1 className="truncate whitespace-nowrap text-xl font-bold text-green-700 sm:text-2xl">Admin Dashboard</h1>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap md:justify-end">
              <Link href="/admin-orders" className="inline-flex items-center justify-center rounded-md border border-green-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-green-50">
                Orders
              </Link>
              <Button type="button" onClick={loadDashboard} disabled={isLoading} className="bg-white text-gray-800 border border-green-200 hover:bg-green-50">
                <RefreshCw size={16} />
                Refresh
              </Button>
              <Button type="button" onClick={handleLogout} className="col-span-2 bg-green-700 text-white hover:bg-green-800 md:col-span-1">
                <LogOut size={16} />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-white p-2 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("menu")}
            className={`rounded-md px-4 py-3 text-sm font-bold ${activeTab === "menu" ? "bg-green-700 text-white" : "text-gray-700 hover:bg-green-50"}`}
          >
            Menu Items
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("offers")}
            className={`rounded-md px-4 py-3 text-sm font-bold ${activeTab === "offers" ? "bg-green-700 text-white" : "text-gray-700 hover:bg-green-50"}`}
          >
            Offers
          </button>
        </div>

        {isLoading ? (
          <div className="rounded-lg bg-white p-10 text-center text-gray-500 shadow-sm">
            Loading menu and offers...
          </div>
        ) : activeTab === "menu" ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_1fr]">
            <form onSubmit={handleMenuSubmit} className="max-w-full rounded-lg bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-green-700">
                  {editingMenuId ? "Edit Menu Item" : "Add Menu Item"}
                </h2>
                {editingMenuId && (
                  <Button type="button" onClick={() => { setEditingMenuId(null); setMenuForm(emptyMenuForm); }} className="bg-white text-gray-800 border border-green-200 hover:bg-green-50">
                    Cancel
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">
                  Name
                  <input value={menuForm.name} onChange={(event) => setMenuForm({ ...menuForm, name: event.target.value })} className="mt-1 w-full rounded-lg border border-green-300 px-3 py-2" required />
                </label>
                <label className="block text-sm font-semibold text-gray-700">
                  Description
                  <textarea value={menuForm.description} onChange={(event) => setMenuForm({ ...menuForm, description: event.target.value })} className="mt-1 w-full rounded-lg border border-green-300 px-3 py-2" rows={3} />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Price (INR)
                    <input type="number" min="0" step="0.01" value={menuForm.price} onChange={(event) => setMenuForm({ ...menuForm, price: event.target.value })} className="mt-1 w-full rounded-lg border border-green-300 px-3 py-2" required />
                  </label>
                  <label className="block text-sm font-semibold text-gray-700">
                    Category
                    <input list="menu-categories" value={menuForm.category} onChange={(event) => setMenuForm({ ...menuForm, category: event.target.value })} className="mt-1 w-full rounded-lg border border-green-300 px-3 py-2" required />
                    <datalist id="menu-categories">
                      {categories.map((category) => <option key={category} value={category} />)}
                    </datalist>
                  </label>
                </div>
                <label className="block text-sm font-semibold text-gray-700">
                  Image URL
                  <input value={menuForm.imageUrl} onChange={(event) => setMenuForm({ ...menuForm, imageUrl: event.target.value })} className="mt-1 w-full rounded-lg border border-green-300 px-3 py-2" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Stock Quantity
                    <input type="number" min="0" value={menuForm.stockQuantity} onChange={(event) => setMenuForm({ ...menuForm, stockQuantity: event.target.value })} className="mt-1 w-full rounded-lg border border-green-300 px-3 py-2" required />
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-3 text-sm font-semibold text-gray-800">
                    <input type="checkbox" checked={menuForm.isAvailable} onChange={(event) => setMenuForm({ ...menuForm, isAvailable: event.target.checked })} className="h-4 w-4" />
                    Available
                  </label>
                </div>
                <Button type="submit" disabled={isSaving} className="w-full bg-green-700 hover:bg-green-800 text-white font-bold">
                  <Plus size={16} />
                  {isSaving ? "Saving..." : editingMenuId ? "Update Item" : "Add Item"}
                </Button>
              </div>
            </form>

            <section className="grid max-w-full gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {menuItems.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-lg bg-white shadow-sm">
                  {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="aspect-[16/10] w-full object-cover" />}
                  <div className="p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-green-700">{item.name}</h3>
                        <p className="text-sm text-gray-500">{item.category}</p>
                      </div>
                      <span className="font-bold text-yellow-600">{formatPrice(item.price)}</span>
                    </div>
                    <p className="mb-3 text-sm text-gray-600">{item.description || "No description"}</p>
                    <p className={`mb-4 text-sm font-bold ${item.isAvailable ? "text-green-700" : "text-red-600"}`}>
                      {item.isAvailable ? `${item.stockQuantity} in stock` : "Out of Stock"}
                    </p>
                    <div className="grid gap-2">
                      <Button type="button" onClick={() => handleToggleMenuAvailability(item)} className={item.isAvailable ? "bg-red-600 text-white hover:bg-red-700" : "bg-green-700 text-white hover:bg-green-800"}>
                        {item.isAvailable ? "Mark Out of Stock" : "Mark Available"}
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button type="button" onClick={() => { setEditingMenuId(item.id); setMenuForm(menuItemToForm(item)); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="bg-white text-gray-800 border border-green-200 hover:bg-green-50">
                          <Edit2 size={16} />
                          Edit
                        </Button>
                        <Button type="button" onClick={() => handleDeleteMenuItem(item)} className="bg-white text-red-700 border border-red-200 hover:bg-red-50">
                          <Trash2 size={16} />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_1fr]">
            <form onSubmit={handleOfferSubmit} className="max-w-full rounded-lg bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-green-700">
                  {editingOfferId ? "Edit Offer" : "Add Offer"}
                </h2>
                {editingOfferId && (
                  <Button type="button" onClick={() => { setEditingOfferId(null); setOfferForm(emptyOfferForm); }} className="bg-white text-gray-800 border border-green-200 hover:bg-green-50">
                    Cancel
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">
                  Title
                  <input value={offerForm.title} onChange={(event) => setOfferForm({ ...offerForm, title: event.target.value })} className="mt-1 w-full rounded-lg border border-green-300 px-3 py-2" required />
                </label>
                <label className="block text-sm font-semibold text-gray-700">
                  Description
                  <textarea value={offerForm.description} onChange={(event) => setOfferForm({ ...offerForm, description: event.target.value })} className="mt-1 w-full rounded-lg border border-green-300 px-3 py-2" rows={3} />
                </label>
                <label className="block text-sm font-semibold text-gray-700">
                  Discount Text
                  <input value={offerForm.discountText} onChange={(event) => setOfferForm({ ...offerForm, discountText: event.target.value })} className="mt-1 w-full rounded-lg border border-green-300 px-3 py-2" placeholder="20% OFF" required />
                </label>
                <label className="block text-sm font-semibold text-gray-700">
                  Image URL
                  <input value={offerForm.imageUrl} onChange={(event) => setOfferForm({ ...offerForm, imageUrl: event.target.value })} className="mt-1 w-full rounded-lg border border-green-300 px-3 py-2" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Start Date
                    <input type="date" value={offerForm.startDate} onChange={(event) => setOfferForm({ ...offerForm, startDate: event.target.value })} className="mt-1 w-full rounded-lg border border-green-300 px-3 py-2" required />
                  </label>
                  <label className="block text-sm font-semibold text-gray-700">
                    End Date
                    <input type="date" value={offerForm.endDate} onChange={(event) => setOfferForm({ ...offerForm, endDate: event.target.value })} className="mt-1 w-full rounded-lg border border-green-300 px-3 py-2" required />
                  </label>
                </div>
                <label className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-3 text-sm font-semibold text-gray-800">
                  <input type="checkbox" checked={offerForm.isActive} onChange={(event) => setOfferForm({ ...offerForm, isActive: event.target.checked })} className="h-4 w-4" />
                  Active
                </label>
                <Button type="submit" disabled={isSaving} className="w-full bg-green-700 hover:bg-green-800 text-white font-bold">
                  <Plus size={16} />
                  {isSaving ? "Saving..." : editingOfferId ? "Update Offer" : "Add Offer"}
                </Button>
              </div>
            </form>

            <section className="grid max-w-full gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {offers.map((offer) => (
                <article key={offer.id} className="overflow-hidden rounded-lg bg-white shadow-sm">
                  {offer.imageUrl && <img src={offer.imageUrl} alt={offer.title} className="aspect-[16/10] w-full object-cover" />}
                  <div className="p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-green-700">{offer.title}</h3>
                        <p className="text-sm font-bold text-yellow-600">{offer.discountText}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${offer.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {offer.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mb-3 text-sm text-gray-600">{offer.description || "No description"}</p>
                    <p className="mb-4 text-xs text-gray-500">{offer.startDate} to {offer.endDate}</p>
                    <div className="grid gap-2">
                      <Button type="button" onClick={() => handleToggleOfferActive(offer)} className={offer.isActive ? "bg-red-600 text-white hover:bg-red-700" : "bg-green-700 text-white hover:bg-green-800"}>
                        {offer.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button type="button" onClick={() => { setEditingOfferId(offer.id); setOfferForm(offerToForm(offer)); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="bg-white text-gray-800 border border-green-200 hover:bg-green-50">
                          <Edit2 size={16} />
                          Edit
                        </Button>
                        <Button type="button" onClick={() => handleDeleteOffer(offer)} className="bg-white text-red-700 border border-red-200 hover:bg-red-50">
                          <Trash2 size={16} />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
