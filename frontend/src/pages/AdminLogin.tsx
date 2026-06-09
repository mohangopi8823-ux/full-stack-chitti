import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { loginAdmin } from "@/lib/adminAuth";
import { Lock, User } from "lucide-react";
import { toast } from "sonner";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await loginAdmin(username, password);
      toast.success("Admin login successful");
      setLocation("/admin-dashboard");
      return;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid username or password");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border-2 border-green-100 rounded-lg p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-700 text-white font-bold">
            CN
          </div>
          <h1 className="text-3xl font-bold text-green-700">Admin Login</h1>
          <p className="text-gray-600 mt-2">Sign in to manage menu, offers, and pickup orders.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700" size={18} />
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full pl-10 pr-3 py-3 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700" size={18} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full pl-10 pr-3 py-3 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3"
          >
            {isSubmitting ? "Signing In..." : "Login"}
          </Button>
        </form>
      </div>
    </div>
  );
}
