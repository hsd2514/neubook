import { BarChart3, CalendarDays, ClipboardList, LayoutDashboard, Settings, Users, X } from "lucide-react";
import { NavLink } from "react-router-dom";

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
    isActive
      ? "bg-white/20 text-white shadow-sm"
      : "text-white/70 hover:bg-white/10 hover:text-white"
  }`;

export function Sidebar({ role, mobileOpen, onNavigate }) {
  const organiser = [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/app/appointments", label: "Appointments", icon: ClipboardList },
    { to: "/app/bookings", label: "Bookings", icon: Users },
    { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
    { to: "/app/reports", label: "Reports", icon: BarChart3 },
  ];
  const admin = [
    { to: "/admin", label: "Admin", icon: Settings, end: true },
    { to: "/admin/users", label: "Users", icon: Users },
  ];
  const items = role === "admin" ? [...organiser, ...admin] : organiser;

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 flex w-60 flex-col
        bg-gradient-to-b from-primary-container via-primary to-primary
        text-white shadow-dropdown
        transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-sm font-bold">V</div>
          <span className="text-lg font-bold tracking-tight">Neubook</span>
        </div>
        <button type="button" onClick={onNavigate} className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white lg:hidden">
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map(({ to, label, icon: Icon, end }, i) => (
          <div key={to}>
            {i > 0 && to === "/admin" && <div className="my-3 border-t border-white/10" />}
            <NavLink to={to} end={end} className={linkClass} onClick={() => onNavigate?.()}>
              <Icon size={18} strokeWidth={1.75} />
              {label}
            </NavLink>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-3">
        <NavLink to="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/60 transition hover:bg-white/10 hover:text-white">
          ← Back to home
        </NavLink>
      </div>
    </aside>
  );
}
