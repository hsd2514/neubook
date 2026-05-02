import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Select } from "../../components/ui/Select.jsx";
import { api } from "../../services/api.js";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  CalendarCheck,
  XCircle,
  Clock,
  BarChart3,
  PieChart,
  ArrowUpRight,
  Armchair,
} from "lucide-react";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const toneMap = { confirmed: "success", pending: "warning", cancelled: "danger", completed: "teal" };

function formatRupees(paisa) {
  if (!paisa) return "₹0";
  const rupees = paisa / 100;
  return `₹${rupees.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function MiniBarChart({ data, dataKey, color = "bg-primary-container", maxHeight = 100 }) {
  const max = Math.max(1, ...data.map((d) => d[dataKey]));
  return (
    <div className="flex items-end gap-[3px]" style={{ height: maxHeight }}>
      {data.map((d, i) => {
        const h = Math.max(2, (d[dataKey] / max) * maxHeight);
        return (
          <div key={i} className="group relative flex-1" title={`${d.date || d.day || d.hour}: ${d[dataKey]}`}>
            <div
              className={`w-full rounded-t transition-all duration-200 group-hover:opacity-80 ${color}`}
              style={{ height: `${h}px` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ segments, size = 120 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (!total) return <div className="flex items-center justify-center" style={{ width: size, height: size }}><span className="text-xs text-on-surface-variant">No data</span></div>;
  const r = (size - 16) / 2;
  const cx = size / 2;
  const cy = size / 2;
  let cum = 0;
  const arcs = segments.filter((s) => s.value > 0).map((seg) => {
    const frac = seg.value / total;
    const startAngle = cum * 2 * Math.PI - Math.PI / 2;
    cum += frac;
    const endAngle = cum * 2 * Math.PI - Math.PI / 2;
    const large = frac > 0.5 ? 1 : 0;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    return { ...seg, d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z` };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} className="transition-opacity hover:opacity-80" />)}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="var(--color-surface-container-lowest)" />
      <text x={cx} y={cy - 4} textAnchor="middle" className="fill-on-surface text-lg font-bold">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="fill-on-surface-variant text-[10px]">total</text>
    </svg>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }) {
  return (
    <Card className="flex items-start gap-3 animate-enter">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">{label}</p>
        <p className="text-xl font-bold text-on-surface">{value}</p>
        {sub && <p className="text-[11px] text-on-surface-variant">{sub}</p>}
      </div>
    </Card>
  );
}

export default function OrganiserReports() {
  const [summary, setSummary] = useState(null);
  const [detailed, setDetailed] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api("/api/reports/organiser-summary"),
      api(`/api/reports/organiser-detailed?days=${days}`),
    ])
      .then(([s, d]) => { setSummary(s); setDetailed(d); })
      .catch(() => { setSummary(null); setDetailed(null); })
      .finally(() => setLoading(false));
  }, [days]);

  const statusSegments = useMemo(() => {
    if (!detailed) return [];
    const s = detailed.status_breakdown;
    return [
      { label: "Confirmed", value: s.confirmed, color: "#059669" },
      { label: "Completed", value: s.completed, color: "#006a68" },
      { label: "Pending", value: s.pending, color: "#d97706" },
      { label: "Cancelled", value: s.cancelled, color: "#dc2626" },
    ];
  }, [detailed]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary-container border-t-transparent" />
          <p className="mt-3 text-sm text-on-surface-variant">Loading reports…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Deep insights into your appointment business performance.
          </p>
        </div>
        <Select value={days} onChange={(e) => setDays(Number(e.target.value))} label="Period">
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </Select>
      </div>

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={CalendarCheck} label="Total bookings" value={summary?.total_bookings ?? 0} sub={`${summary?.upcoming_this_week ?? 0} upcoming this week`} color="bg-primary-container/15 text-primary-container" />
        <KpiCard icon={DollarSign} label="Revenue" value={formatRupees(summary?.total_revenue_paisa)} sub="From paid bookings" color="bg-secondary/15 text-secondary" />
        <KpiCard icon={XCircle} label="Cancellation rate" value={`${detailed?.cancellation_rate ?? 0}%`} sub={`${summary?.cancelled_bookings ?? 0} cancelled`} color="bg-error/10 text-error" />
        <KpiCard icon={Users} label="Avg. capacity" value={detailed?.avg_capacity ?? 0} sub="Per booking" color="bg-tertiary-container/15 text-tertiary-container" />
      </div>

      {/* Second KPI row */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="animate-enter stagger-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">Pending</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{summary?.pending_confirmations ?? 0}</p>
        </Card>
        <Card className="animate-enter stagger-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">Confirmed</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{summary?.confirmed_bookings ?? 0}</p>
        </Card>
        <Card className="animate-enter stagger-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">Completed</p>
          <p className="mt-1 text-2xl font-bold text-secondary">{summary?.completed_bookings ?? 0}</p>
        </Card>
        <Card className="animate-enter">
          <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">Today</p>
          <p className="mt-1 text-2xl font-bold text-primary-container">{summary?.today_appointments ?? 0}</p>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Booking trend */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-primary-container" />
              <h2 className="font-semibold text-on-surface">Booking trend</h2>
            </div>
            <div className="flex gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-primary-container" /> Total</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-secondary" /> Confirmed</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-error" /> Cancelled</span>
            </div>
          </div>
          {detailed?.booking_trend?.length ? (
            <div className="space-y-2">
              <MiniBarChart data={detailed.booking_trend} dataKey="total" maxHeight={80} />
              <div className="flex justify-between text-[9px] text-on-surface-variant">
                <span>{detailed.booking_trend[0]?.date}</span>
                <span>{detailed.booking_trend[detailed.booking_trend.length - 1]?.date}</span>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-on-surface-variant">No booking data in this period.</p>
          )}
        </Card>

        {/* Status donut */}
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <PieChart size={16} className="text-primary-container" />
            <h2 className="font-semibold text-on-surface">Status breakdown</h2>
          </div>
          <div className="flex flex-col items-center gap-3">
            <DonutChart segments={statusSegments} />
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
              {statusSegments.map((s) => (
                <span key={s.label} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}: <b>{s.value}</b>
                </span>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Revenue trend */}
      {detailed?.revenue_trend?.some((r) => r.revenue_paisa > 0) && (
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <DollarSign size={16} className="text-secondary" />
            <h2 className="font-semibold text-on-surface">Revenue trend</h2>
          </div>
          <MiniBarChart data={detailed.revenue_trend} dataKey="revenue_paisa" color="bg-secondary/70" maxHeight={70} />
          <div className="mt-2 flex justify-between text-[9px] text-on-surface-variant">
            <span>{detailed.revenue_trend[0]?.date}</span>
            <span>{detailed.revenue_trend[detailed.revenue_trend.length - 1]?.date}</span>
          </div>
        </Card>
      )}

      {/* Peak hours + Peak days */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Clock size={16} className="text-primary-container" />
            <h2 className="font-semibold text-on-surface">Peak booking hours (UTC)</h2>
          </div>
          {detailed?.peak_hours?.length ? (
            <div className="flex h-32 items-end gap-1">
              {detailed.peak_hours.map((h) => {
                const max = Math.max(1, ...detailed.peak_hours.map((x) => x.count));
                const pct = Math.max(4, (h.count / max) * 100);
                return (
                  <div key={h.hour} className="group relative flex flex-1 flex-col items-center justify-end">
                    <div
                      className="w-full rounded-t bg-primary-container/70 transition-all group-hover:bg-primary-container"
                      style={{ height: `${pct}%` }}
                    />
                    <span className="mt-1 text-[9px] text-on-surface-variant">{h.hour}h</span>
                    <span className="absolute -top-5 hidden rounded bg-inverse-surface px-1.5 py-0.5 text-[10px] text-inverse-on-surface group-hover:block">
                      {h.count}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-on-surface-variant">No data yet.</p>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <CalendarCheck size={16} className="text-secondary" />
            <h2 className="font-semibold text-on-surface">Bookings by day of week</h2>
          </div>
          {detailed?.peak_days?.length ? (
            <div className="space-y-2">
              {detailed.peak_days.map((d) => {
                const max = Math.max(1, ...detailed.peak_days.map((x) => x.count));
                const pct = Math.max(2, (d.count / max) * 100);
                return (
                  <div key={d.day} className="flex items-center gap-3">
                    <span className="w-8 text-xs font-semibold text-on-surface-variant">{d.day}</span>
                    <div className="flex-1">
                      <div
                        className="h-5 rounded bg-secondary/60 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs font-bold text-on-surface">{d.count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-on-surface-variant">No data yet.</p>
          )}
        </Card>
      </div>

      {/* Per-appointment table */}
      {detailed?.per_appointment?.length > 0 && (
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <ArrowUpRight size={16} className="text-primary-container" />
            <h2 className="font-semibold text-on-surface">Per appointment type</h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-outline-variant">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant bg-surface-container-low">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase text-on-surface-variant">Name</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase text-on-surface-variant">Mode</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase text-on-surface-variant">Bookings</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase text-on-surface-variant">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {detailed.per_appointment.map((a) => (
                  <tr key={a.appointment_type_id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low/60 transition">
                    <td className="px-4 py-2.5 font-medium text-on-surface">{a.name}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={a.booking_mode === "seat_map" ? "purple" : undefined}>{a.booking_mode === "seat_map" ? "Seat map" : "Capacity"}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">{a.total_bookings}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-secondary">{formatRupees(a.revenue_paisa)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Per-resource table */}
      {detailed?.per_resource?.length > 0 && (
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Users size={16} className="text-primary-container" />
            <h2 className="font-semibold text-on-surface">Resource utilization</h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-outline-variant">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant bg-surface-container-low">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase text-on-surface-variant">Resource</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase text-on-surface-variant">Bookings</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase text-on-surface-variant">Share</th>
                </tr>
              </thead>
              <tbody>
                {detailed.per_resource.map((r, i) => {
                  const total = detailed.per_resource.reduce((s, x) => s + x.total_bookings, 0);
                  const pct = total > 0 ? Math.round((r.total_bookings / total) * 100) : 0;
                  return (
                    <tr key={`res-${i}`} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low/60 transition">
                      <td className="px-4 py-2.5 font-medium text-on-surface">{r.resource_name}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{r.total_bookings}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-surface-container-high">
                            <div className="h-full rounded-full bg-primary-container" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-on-surface-variant">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Seat utilization */}
      {detailed?.seat_utilization?.length > 0 && (
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Armchair size={16} className="text-primary-container" />
            <h2 className="font-semibold text-on-surface">Seat map utilization</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {detailed.seat_utilization.map((su) => (
              <div key={su.appointment_type_id} className="rounded-lg border border-outline-variant bg-surface-container-low/40 p-4">
                <p className="font-semibold text-on-surface">{su.name}</p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="relative h-16 w-16">
                    <svg viewBox="0 0 36 36" className="h-16 w-16">
                      <path
                        className="text-surface-container-high"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      <path
                        className="text-primary-container"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={`${su.utilization_pct}, 100`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-on-surface">{su.utilization_pct}%</span>
                  </div>
                  <div>
                    <p className="text-sm text-on-surface-variant">{su.booked_seats} of {su.total_seats} seats booked</p>
                    <p className="text-xs text-on-surface-variant">(unique seats with active bookings)</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent bookings */}
      {detailed?.recent_bookings?.length > 0 && (
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <CalendarCheck size={16} className="text-primary-container" />
            <h2 className="font-semibold text-on-surface">Recent bookings</h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-outline-variant">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant bg-surface-container-low">
                <tr>
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase text-on-surface-variant">#</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase text-on-surface-variant">Customer</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase text-on-surface-variant">Service</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase text-on-surface-variant">Time</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase text-on-surface-variant">Cap</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase text-on-surface-variant">Status</th>
                </tr>
              </thead>
              <tbody>
                {detailed.recent_bookings.map((b) => (
                  <tr key={b.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low/60 transition">
                    <td className="px-3 py-2.5 font-medium">{b.id}</td>
                    <td className="px-3 py-2.5 text-on-surface">{b.customer_name}</td>
                    <td className="px-3 py-2.5 text-on-surface-variant">{b.appointment_name}</td>
                    <td className="px-3 py-2.5 text-on-surface-variant">{new Date(b.start_time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-3 py-2.5">{b.capacity}</td>
                    <td className="px-3 py-2.5"><Badge tone={toneMap[b.status]}>{b.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
