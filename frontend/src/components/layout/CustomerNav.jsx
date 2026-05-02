import { Link } from "react-router-dom";
import { LogIn, LogOut, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

export function CustomerNav() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-outline-variant bg-surface-container-lowest/80 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary-container to-primary text-xs font-bold text-white">V</div>
          <span className="text-sm font-bold text-on-surface">Neubook</span>
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/profile" className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-on-surface-variant hover:bg-surface-container-high transition">
                <User size={16} />
                <span className="hidden sm:inline">{user.full_name}</span>
              </Link>
              {(user.role === "organiser" || user.role === "admin") && (
                <Link to="/app" className="rounded-lg px-2 py-1.5 text-xs font-semibold text-secondary hover:bg-secondary/10 transition">Console</Link>
              )}
              <button type="button" onClick={logout} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-error hover:bg-error/10 transition">
                <LogOut size={14} /> Log out
              </button>
            </>
          ) : (
            <Link to="/login" className="flex items-center gap-1 rounded-lg bg-primary-container px-3 py-1.5 text-xs font-semibold text-on-primary shadow-card transition hover:bg-primary">
              <LogIn size={14} /> Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
