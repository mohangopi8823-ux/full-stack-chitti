import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Menu, X, LogOut, User, Mail, Phone, Calendar, ShoppingBag } from "lucide-react";
import { trpc } from "@/lib/trpc";
import App from "@/App";

export default function Profile() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-green-700 mb-4">Not Logged In</h1>
          <p className="text-gray-600 mb-6">You need to be logged in to view your profile.</p>
          <div className="flex gap-4 flex-col">
            <Link href="/login" asChild>
              <Button className="bg-green-600 hover:bg-green-700">Sign In</Button>
            </Link>
            <Link href="/signup" asChild>
              <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">Create Account</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b-2 border-green-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/chitti-naidu-logo.png"
                alt="Chitti Naidu Pulao logo"
                className="h-14 w-14 rounded-full bg-white object-cover ring-2 ring-yellow-300 lg:h-16 lg:w-16"
              />
              <div>
                <h1 className="text-xl font-bold text-red-700">చిట్టి నాయుడు పులావ్</h1>
                <p className="text-xs text-yellow-600">Authentic Village Taste</p>
              </div>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-gray-700 hover:text-green-700 font-medium transition">
                Home
              </Link>
              <Link href="/menu" className="text-gray-700 hover:text-green-700 font-medium transition">
                Menu
              </Link>
              <Link href="/profile" className="text-green-700 font-bold border-b-2 border-green-700">
                Profile
              </Link>
            </div>

            {/* User Menu */}
            <div className="hidden md:flex items-center gap-4">
              <span className="text-gray-700">Welcome, {user.name}</span>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut size={18} />
                Logout
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-7 w-7 lg:h-8 lg:w-8" /> : <Menu className="h-7 w-7 lg:h-8 lg:w-8" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 border-t border-gray-200">
              <Link href="/" className="block py-2 text-gray-700 hover:text-green-700">
                Home
              </Link>
              <Link href="/menu" className="block py-2 text-gray-700 hover:text-green-700">
                Menu
              </Link>
              <Link href="/profile" className="block py-2 text-green-700 font-bold">
                Profile
              </Link>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full mt-4 border-red-600 text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
              >
                <LogOut size={18} />
                Logout
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Profile Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-green-100">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="text-white" size={40} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                <p className="text-gray-600 text-sm mt-1">Member since {new Date(user.createdAt).toLocaleDateString()}</p>
              </div>

              <div className="space-y-4 border-t border-gray-200 pt-4">
                <div className="flex items-center gap-3">
                  <Mail className="text-green-600" size={20} />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-semibold text-gray-900">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="text-green-600" size={20} />
                  <div>
                    <p className="text-xs text-gray-500">Last Signed In</p>
                    <p className="text-sm font-semibold text-gray-900">{new Date(user.lastSignedIn).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleLogout}
                className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
              >
                <LogOut size={18} />
                Logout
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2">
            {/* Order History Section */}
            <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-green-100">
              <div className="flex items-center gap-3 mb-6">
                <ShoppingBag className="text-green-600" size={28} />
                <h3 className="text-2xl font-bold text-gray-900">Order History</h3>
              </div>

              <div className="space-y-4">
                {/* Empty State */}
                <div className="text-center py-12">
                  <ShoppingBag className="mx-auto text-gray-300 mb-4" size={48} />
                  <p className="text-gray-600 mb-4">You haven't placed any orders yet</p>
                  <Link href="/menu" asChild>
                    <Button className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold">
                      Start Ordering
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Account Settings */}
            <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-green-100 mt-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-600">Receive order updates via email</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-green-600" />
                </div>

                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900">SMS Notifications</p>
                    <p className="text-sm text-gray-600">Receive order updates via SMS</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-green-600" />
                </div>

                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900">Marketing Emails</p>
                    <p className="text-sm text-gray-600">Receive special offers and promotions</p>
                  </div>
                  <input type="checkbox" className="w-5 h-5 text-green-600" />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                  Edit Profile
                </Button>
                <Button variant="outline" className="ml-3 border-gray-300 text-gray-700 hover:bg-gray-50">
                  Change Password
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
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
                <li><Link href="/menu" className="hover:text-yellow-500 transition">Menu</Link></li>
                <li><Link href="/profile" className="hover:text-yellow-500 transition">Profile</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-bold text-yellow-500 mb-4">Contact</h4>
              <p className="text-gray-400 mb-2">Phone: +91 8008800467</p>
              <p className="text-gray-400">Pickup Only</p>
            </div>

            <div>
              <h4 className="text-lg font-bold text-yellow-500 mb-4">Hours</h4>
              <p className="text-gray-400 mb-2">Mon - Sun</p>
              <p className="text-gray-400">11:00 AM - 9:00 PM</p>
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
