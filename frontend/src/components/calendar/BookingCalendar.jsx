import { useMemo, useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Briefcase,
  Filter,
  X,
  CheckCircle2,
  AlertCircle,
  Ban,
  Hourglass,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

const STATUS_META = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Hourglass },
  confirmed: { label: "Confirmed", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200", icon: Ban },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-700 border-blue-200", icon: CheckCircle2 },
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const d = new Date(year, month, 1);
  let day = d.getDay(); // 0 = Sun
  return day === 0 ? 6 : day - 1; // shift so Mon=0, Sun=6
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateKey(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function BookingCalendar({
  bookings = [],
  appointmentTypes = [],
  onBookingClick,
  title = "Calendar",
  subtitle,
}) {
  const today = useMemo(() => new Date(), []);
  const [current, setCurrent] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedDay, setSelectedDay] = useState(null);

  const year = current.getFullYear();
  const month = current.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (filterType !== "all" && String(b.appointment_type_id) !== filterType) return false;
      if (filterStatus !== "all" && b.status !== filterStatus) return false;
      return true;
    });
  }, [bookings, filterType, filterStatus]);

  const bookingsByDay = useMemo(() => {
    const map = {};
    filteredBookings.forEach((b) => {
      const d = new Date(b.start_time);
      const key = toDateKey(d);
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    });
    return map;
  }, [filteredBookings]);

  const goPrev = useCallback(() => {
    setCurrent((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrent((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const goToday = useCallback(() => {
    setCurrent(new Date(today.getFullYear(), today.getMonth(), 1));
  }, [today]);

  const monthLabel = current.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const selectedDayBookings = selectedDay ? bookingsByDay[toDateKey(selectedDay)] || [] : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary-container" />
            {title}
          </h2>
          {subtitle && <p className="text-sm text-on-surface-variant mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={goPrev} className="px-2">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center font-semibold text-on-surface">{monthLabel}</span>
          <Button variant="ghost" onClick={goNext} className="px-2">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="secondary" onClick={goToday} className="text-xs">
            Today
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
          <Filter className="h-4 w-4" />
          <span>Filters:</span>
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
        >
          <option value="all">All appointment types</option>
          {appointmentTypes.map((at) => (
            <option key={at.id} value={String(at.id)}>
              {at.name}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
        {(filterType !== "all" || filterStatus !== "all") && (
          <Button variant="ghost" onClick={() => { setFilterType("all"); setFilterStatus("all"); }} className="text-xs">
            Clear
          </Button>
        )}
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-7 border-b border-outline-variant">
          {weekdays.map((wd) => (
            <div key={wd} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant bg-surface-container-high">
              {wd}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[96px] border-r border-b border-outline-variant/40 bg-surface-container-lowest/50" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const date = new Date(year, month, dayNum);
            const key = toDateKey(date);
            const dayBookings = bookingsByDay[key] || [];
            const isToday = isSameDay(date, today);
            const isSelected = selectedDay && isSameDay(date, selectedDay);

            return (
              <div
                key={dayNum}
                onClick={() => setSelectedDay(date)}
                className={`min-h-[96px] border-r border-b border-outline-variant/40 p-1.5 cursor-pointer transition-colors hover:bg-surface-container-low ${
                  isToday ? "bg-primary-container/5" : ""
                } ${isSelected ? "ring-2 ring-inset ring-primary-container" : ""}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday ? "bg-primary-container text-on-primary" : "text-on-surface"
                    }`}
                  >
                    {dayNum}
                  </span>
                  {dayBookings.length > 0 && (
                    <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded-full">
                      {dayBookings.length}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {dayBookings.slice(0, 3).map((b) => {
                    const meta = STATUS_META[b.status] || STATUS_META.pending;
                    return (
                      <div
                        key={b.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onBookingClick?.(b);
                        }}
                        className={`text-[10px] truncate rounded px-1.5 py-0.5 border ${meta.color} cursor-pointer hover:opacity-80`}
                        title={`${b.customer_name || "Guest"} — ${b.appointment_type_name || "Booking"} — ${formatTime(b.start_time)}`}
                      >
                        {formatTime(b.start_time)} {b.customer_name || `Booking #${b.id}`}
                      </div>
                    );
                  })}
                  {dayBookings.length > 3 && (
                    <div className="text-[10px] text-on-surface-variant pl-1">
                      +{dayBookings.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Selected day detail panel */}
      {selectedDay && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-on-surface flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary-container" />
              {selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h3>
            <button onClick={() => setSelectedDay(null)} className="text-on-surface-variant hover:text-on-surface">
              <X className="h-4 w-4" />
            </button>
          </div>
          {selectedDayBookings.length === 0 ? (
            <p className="text-sm text-on-surface-variant py-4 text-center">No bookings for this day.</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {selectedDayBookings.map((b) => {
                const meta = STATUS_META[b.status] || STATUS_META.pending;
                const Icon = meta.icon;
                return (
                  <div
                    key={b.id}
                    onClick={() => onBookingClick?.(b)}
                    className="flex items-start gap-3 rounded-lg border border-outline-variant p-3 cursor-pointer hover:bg-surface-container-low transition-colors"
                  >
                    <div className={`mt-0.5 rounded-full p-1 ${meta.color.split(" ")[0]}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-on-surface truncate">
                          {b.appointment_type_name || "Booking"}
                        </span>
                        <Badge variant={b.status === "confirmed" ? "success" : b.status === "cancelled" ? "danger" : b.status === "completed" ? "info" : "warning"}>
                          {meta.label}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(b.start_time)} — {formatTime(b.end_time)}
                        </span>
                        {b.customer_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {b.customer_name}
                          </span>
                        )}
                        {b.resource_name && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {b.resource_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["pending", "confirmed", "cancelled", "completed"].map((status) => {
          const count = filteredBookings.filter((b) => b.status === status).length;
          const meta = STATUS_META[status];
          return (
            <Card key={status} className="p-3 text-center">
              <div className={`inline-flex rounded-full p-1.5 mb-1 ${meta.color.split(" ")[0]}`}>
                <meta.icon className="h-4 w-4" />
              </div>
              <div className="text-lg font-bold text-on-surface">{count}</div>
              <div className="text-xs text-on-surface-variant">{meta.label}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
