import { Bell, Menu, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { Breadcrumb } from "./Breadcrumb.jsx";

export function Topbar({ onMenu, breadcrumb }) {
  const { user, logout } = useAuth();
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-4 shadow-sm">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onMenu} className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container-high lg:hidden" aria-label="Menu">
          <Menu size={20} />
        </button>
        {breadcrumb && <Breadcrumb items={breadcrumb} />}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high" aria-label="Notifications">
          <Bell size={18} />
        </button>
        {user ? (
          <div className="flex items-center gap-2">
            <Link to="/profile" className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1 hover:border-outline-variant">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container/15 text-primary-container">
                <User size={16} />
              </span>
              <span className="hidden text-sm font-medium text-on-surface sm:inline">{user.full_name}</span>
            </Link>
            <button type="button" onClick={logout} className="text-xs font-semibold text-secondary hover:underline">Log out</button>
          </div>
        ) : (
          <Link to="/login" className="text-sm font-semibold text-primary-container hover:underline">Sign in</Link>
        )}
      </div>
    </header>
  );
}
