import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  ClipboardCheck,
  Layers,
  Plus,
  ArrowRight,
  DollarSign,
  TrendingUp,
  XCircle,
  Users,
  CalendarCheck,
  Clock,
} from "lucide-react";
import { Card } from "../../components/ui/Card.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { api } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";

const toneMap = { confirmed: "success", pending: "warning", cancelled: "danger", completed: "teal" };

function formatRupees(paisa) {
  if (!paisa) return "₹0";
  const rupees = paisa / 100;
  return `₹${rupees.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [s, setS] = useState(null);
  const [detailed, setDetailed] = useState(null);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    api("/api/reports/organiser-summary").then(setS).catch(() => setS(null));
    api("/api/reports/organiser-detailed?days=7").then(setDetailed).catch(() => setDetailed(null));
    api("/api/appointments/mine").then(setAppointments).catch(() => setAppointments([]));
  }, []);

  const stats = [
    { label: "Total bookings", value: s?.total_bookings ?? "—", icon: Layers, color: "bg-primary-container/15 text-primary-container" },
    { label: "Today", value: s?.today_appointments ?? "—", icon: Calendar, color: "bg-secondary/15 text-secondary" },
    { label: "Pending", value: s?.pending_confirmations ?? "—", icon: ClipboardCheck, color: "bg-tertiary-container/20 text-tertiary-container" },
    { label: "Revenue", value: formatRupees(s?.total_revenue_paisa), icon: DollarSign, color: "bg-secondary/10 text-secondary" },
    { label: "This week", value: s?.upcoming_this_week ?? "—", icon: CalendarCheck, color: "bg-primary-container/10 text-primary-container" },
    { label: "Cancelled", value: s?.cancelled_bookings ?? "—", icon: XCircle, color: "bg-error/10 text-error" },
  ];

  const trend = detailed?.booking_trend || [];
  const maxTrend = Math.max(1, ...trend.map((t) => t.total));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Welcome, {user?.full_name?.split(" ")[0] || "Organiser"}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Here's an overview of your appointment business.</p>
        </div>
        <Link to="/app/appointments/new">
          <Button className="gap-1"><Plus size={18} /> New appointment</Button>
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map(({ label, value, icon: Icon, color }, idx) => (
          <Card key={label} className={`flex items-center gap-3 animate-enter ${idx > 0 ? `stagger-${Math.min(idx, 3)}` : ""}`}>
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">{label}</p>
              <p className="text-xl font-bold text-on-surface">{value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Mini 7-day trend + quick links */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-primary-container" />
              <h3 className="font-semibold text-on-surface">Last 7 days</h3>
            </div>
            <Link to="/app/reports" className="text-xs font-semibold text-primary-container hover:underline">Full reports →</Link>
          </div>
          {trend.length > 0 ? (
            <div className="flex items-end gap-[5px]" style={{ height: 80 }}>
              {trend.map((t, i) => {
                const h = Math.max(4, (t.total / maxTrend) * 80);
                const dayLabel = new Date(t.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "short" });
                return (
                  <div key={i} className="group relative flex flex-1 flex-col items-center justify-end">
                    <div
                      className="w-full rounded-t bg-primary-container/60 transition-all group-hover:bg-primary-container"
                      style={{ height: `${h}px` }}
                    />
                    <span className="mt-1 text-[9px] text-on-surface-variant">{dayLabel}</span>
                    <span className="absolute -top-5 hidden rounded bg-inverse-surface px-1.5 py-0.5 text-[10px] text-inverse-on-surface group-hover:block">
                      {t.total}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-on-surface-variant">No bookings yet.</p>
          )}
        </Card>

        <div className="space-y-3 lg:col-span-2">
          <Card className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-on-surface">Appointment types</h3>
              <p className="text-sm text-on-surface-variant">{appointments.length} configured · {appointments.filter((a) => a.is_published).length} published</p>
            </div>
            <Link to="/app/appointments"><Button variant="ghost" className="gap-1">View <ArrowRight size={16} /></Button></Link>
          </Card>
          <Card className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-on-surface">Bookings</h3>
              <p className="text-sm text-on-surface-variant">Manage and confirm bookings</p>
            </div>
            <Link to="/app/bookings"><Button variant="ghost" className="gap-1">View <ArrowRight size={16} /></Button></Link>
          </Card>
          <Card className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-on-surface">Reports</h3>
              <p className="text-sm text-on-surface-variant">Deep analytics & insights</p>
            </div>
            <Link to="/app/reports"><Button variant="ghost" className="gap-1">View <ArrowRight size={16} /></Button></Link>
          </Card>
        </div>
      </div>

      {/* Recent bookings */}
      {detailed?.recent_bookings?.length > 0 && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-primary-container" />
              <h3 className="font-semibold text-on-surface">Recent bookings</h3>
            </div>
            <Link to="/app/bookings" className="text-xs font-semibold text-primary-container hover:underline">All bookings →</Link>
          </div>
          <div className="overflow-hidden rounded-lg border border-outline-variant">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant bg-surface-container-low">
                <tr>
                  <th className="px-3 py-2 text-[11px] font-bold uppercase text-on-surface-variant">#</th>
                  <th className="px-3 py-2 text-[11px] font-bold uppercase text-on-surface-variant">Customer</th>
                  <th className="px-3 py-2 text-[11px] font-bold uppercase text-on-surface-variant">Service</th>
                  <th className="px-3 py-2 text-[11px] font-bold uppercase text-on-surface-variant">Time</th>
                  <th className="px-3 py-2 text-[11px] font-bold uppercase text-on-surface-variant">Status</th>
                </tr>
              </thead>
              <tbody>
                {detailed.recent_bookings.slice(0, 5).map((b) => (
                  <tr key={b.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low/60 transition">
                    <td className="px-3 py-2 font-medium">{b.id}</td>
                    <td className="px-3 py-2">{b.customer_name}</td>
                    <td className="px-3 py-2 text-on-surface-variant">{b.appointment_name}</td>
                    <td className="px-3 py-2 text-on-surface-variant">
                      {new Date(b.start_time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-3 py-2"><Badge tone={toneMap[b.status]}>{b.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {appointments.length === 0 && (
        <Card className="border-dashed text-center py-8">
          <Calendar size={32} className="mx-auto text-primary-container/50" />
          <h3 className="mt-3 font-semibold text-on-surface">Get started</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-on-surface-variant">
            Create your first appointment type, add resources and schedules, then publish it so customers can book.
          </p>
          <Link to="/app/appointments/new" className="mt-4 inline-block">
            <Button className="gap-1"><Plus size={16} /> Create appointment type</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
