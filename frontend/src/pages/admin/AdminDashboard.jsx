import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Briefcase, Calendar, ArrowRight } from "lucide-react";
import { Card } from "../../components/ui/Card.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { api } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [s, setS] = useState(null);
  const [insights, setInsights] = useState(null);
  useEffect(() => {
    api("/api/reports/admin-summary").then(setS).catch(() => setS(null));
    api("/api/reports/admin-insights").then(setInsights).catch(() => setInsights(null));
  }, []);

  const cards = [
    { label: "Total users", value: s?.total_users ?? "—", icon: Users, color: "bg-primary-container/15 text-primary-container" },
    { label: "Service providers", value: s?.total_service_providers ?? "—", icon: Briefcase, color: "bg-secondary/15 text-secondary" },
    { label: "Total appointments", value: s?.total_appointments ?? "—", icon: Calendar, color: "bg-tertiary-container/20 text-tertiary-container" },
  ];
  const maxTrend = Math.max(1, ...(insights?.bookings_last_7_days || []).map((d) => d.count));
  const status = insights?.status_breakdown || { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
  const totalStatus = Math.max(1, status.pending + status.confirmed + status.completed + status.cancelled);

  return (
    <div>
      <h1 className="text-2xl font-bold text-on-surface">Administration</h1>
      <p className="text-sm text-on-surface-variant">Welcome, {user?.full_name}. System-wide monitoring and control.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="flex items-center gap-4 animate-enter">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}</p>
              <p className="text-2xl font-bold text-on-surface">{value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-on-surface">User management</h3>
            <p className="text-sm text-on-surface-variant">Manage roles, activate/deactivate accounts</p>
          </div>
          <Link to="/admin/users"><Button variant="ghost" className="gap-1">Manage <ArrowRight size={16} /></Button></Link>
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-on-surface">Organiser console</h3>
            <p className="text-sm text-on-surface-variant">Manage appointments, bookings, calendar</p>
          </div>
          <Link to="/app"><Button variant="ghost" className="gap-1">Open <ArrowRight size={16} /></Button></Link>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">Bookings in last 7 days</h3>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {(insights?.bookings_last_7_days || []).map((d) => (
              <div key={d.date} className="flex flex-col items-center gap-2">
                <div className="text-xs text-on-surface-variant">{d.count}</div>
                <div className="flex h-24 w-full items-end rounded bg-surface-container-low p-1">
                  <div
                    className="w-full rounded bg-primary"
                    style={{ height: `${Math.max(6, Math.round((d.count / maxTrend) * 100))}%` }}
                  />
                </div>
                <div className="text-[10px] text-on-surface-variant">{d.date.slice(5)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">Booking status mix</h3>
          <div className="mt-4 space-y-3">
            {[
              ["Pending", status.pending, "bg-amber-500"],
              ["Confirmed", status.confirmed, "bg-emerald-500"],
              ["Completed", status.completed, "bg-blue-500"],
              ["Cancelled", status.cancelled, "bg-rose-500"],
            ].map(([label, value, color]) => (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant">{label}</span>
                  <span className="font-semibold text-on-surface">{value}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded bg-surface-container-low">
                  <div className={`h-full ${color}`} style={{ width: `${Math.round((value / totalStatus) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">Top organisers by bookings</h3>
        <div className="mt-4 space-y-2">
          {(insights?.top_organisers || []).length ? (
            insights.top_organisers.map((row) => (
              <div key={`${row.name}-${row.bookings}`} className="flex items-center justify-between rounded bg-surface-container-low px-3 py-2 text-sm">
                <span className="text-on-surface">{row.name}</span>
                <span className="font-semibold text-on-surface">{row.bookings}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-on-surface-variant">No organiser activity yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
