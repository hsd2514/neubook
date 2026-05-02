import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { Sidebar } from "./Sidebar.jsx";
import { Topbar } from "./Topbar.jsx";

export function AppShell({ breadcrumb }) {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = user?.role === "admin" ? "admin" : "organiser";

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar role={role} mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
      {mobileOpen && (
        <button type="button" className="fixed inset-0 z-30 bg-black/30 lg:hidden" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileOpen((o) => !o)} breadcrumb={breadcrumb} />
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
