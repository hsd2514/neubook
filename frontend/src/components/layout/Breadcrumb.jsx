import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export function Breadcrumb({ items }) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-on-surface-variant">
      {items.map((it, i) => (
        <span key={it.href || it.label} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={14} className="text-outline" />}
          {it.href ? (
            <Link to={it.href} className="hover:text-primary-container">{it.label}</Link>
          ) : (
            <span className="font-medium text-on-surface">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
