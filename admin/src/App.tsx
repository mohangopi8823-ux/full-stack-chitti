import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import type { ComponentType } from "react";
import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AdminDashboard from "./pages/AdminDashboard";
import AdminOrders from "./pages/AdminOrders";
import AdminLogin from "./pages/AdminLogin";
import AdminSettings from "./pages/AdminSettings";
import AdminBackup from "./pages/AdminBackup";
import KitchenPrint from "./pages/KitchenPrint";
import { isAdminLoggedIn } from "./lib/adminAuth";

function ProtectedPage({ component: Component, ...props }: { component: ComponentType<any> } & Record<string, unknown>) {
  const [, setLocation] = useLocation();
  const loggedIn = isAdminLoggedIn();

  useEffect(() => {
    if (!loggedIn) setLocation("/login");
  }, [loggedIn, setLocation]);

  return loggedIn ? <Component {...props} /> : null;
}

function AdminRoot() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation(isAdminLoggedIn() ? "/dashboard" : "/login");
  }, [setLocation]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AdminRoot} />
      <Route path="/login" component={AdminLogin} />
      <Route path="/dashboard">{(props) => <ProtectedPage component={AdminDashboard} {...props} />}</Route>
      <Route path="/orders/:id/print">{(props) => <ProtectedPage component={KitchenPrint} {...props} />}</Route>
      <Route path="/orders">{(props) => <ProtectedPage component={AdminOrders} {...props} />}</Route>
      <Route path="/menu">{(props) => <ProtectedPage component={AdminDashboard} {...props} />}</Route>
      <Route path="/settings">{(props) => <ProtectedPage component={AdminSettings} {...props} />}</Route>
      <Route path="/backup">{(props) => <ProtectedPage component={AdminBackup} {...props} />}</Route>
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook
const App = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
