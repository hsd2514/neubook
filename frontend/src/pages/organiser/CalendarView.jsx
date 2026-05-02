import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { api } from "../../services/api.js";

export default function CalendarView() {
  const [bookings, setBookings] = useState([]);
  const [cursor, setCursor] = useState(() => new Date());

  useEffect(() => { api("/api/bookings/organiser").then(setBookings).catch(() => setBookings([])); }, []);

  const weekStart = useMemo(() => {
    const d = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    const dow = d.getDay();
    d.setDate(d.getDate() - dow + (dow === 0 ? -6 : 1));
    return d;
  }, [cursor]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const x = new Date(weekStart); x.setDate(weekStart.getDate() + i); return x; }), [weekStart]);
  const inDay = (b, d) => { const t = new Date(b.start_time); return t.toDateString() === d.toDateString(); };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Calendar</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setCursor((c) => { const d = new Date(c); d.setDate(d.getDate() - 7); return d; })}><ChevronLeft size={18} /></Button>
          <Button variant="secondary" onClick={() => setCursor((c) => { const d = new Date(c); d.setDate(d.getDate() + 7); return d; })}><ChevronRight size={18} /></Button>
        </div>
      </div>
      <p className="text-sm text-on-surface-variant">Week of {weekStart.toLocaleDateString()}</p>
      <div className="mt-6 grid grid-cols-7 gap-2">
        {days.map((d) => (
          <Card key={d.toISOString()} className="min-h-[220px] p-2">
            <p className="border-b border-outline-variant pb-2 text-center text-xs font-bold text-on-surface-variant">{d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}</p>
            <div className="mt-2 space-y-1">
              {bookings.filter((b) => inDay(b, d) && b.status !== "cancelled").map((b) => (
                <div key={b.id} className="rounded bg-primary-container/15 px-2 py-1 text-[10px] font-medium text-primary-container">{new Date(b.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
