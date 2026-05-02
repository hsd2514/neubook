import { Calendar, MoreHorizontal } from "lucide-react";
import { Badge } from "../../../components/ui/Badge.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";

const toneMap = { confirmed: "success", pending: "warning", cancelled: "danger" };

export default function BookingList({ title, bookings, showActions, onCancel, onReschedule }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-on-surface">{title}</h2>
        <Badge>{bookings.length}</Badge>
      </div>
      <div className="mt-4 divide-y divide-outline-variant">
        {bookings.map((b) => {
          const start = new Date(b.start_time);
          return (
            <div key={b.id} className="flex flex-wrap items-center gap-4 py-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-container/10 text-primary-container">
                <Calendar size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-on-surface">
                  {start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} at {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <Badge tone={toneMap[b.status]}>{b.status}</Badge>
                  <span className="text-xs text-on-surface-variant">Seats: {b.capacity}</span>
                </div>
              </div>
              {showActions && b.status !== "cancelled" && (
                <div className="flex gap-1.5">
                  <Button variant="secondary" className="text-xs py-1" onClick={() => onReschedule(b)}>Reschedule</Button>
                  <Button variant="danger" className="text-xs py-1" onClick={() => onCancel(b.id)}>Cancel</Button>
                </div>
              )}
            </div>
          );
        })}
        {!bookings.length && <p className="py-4 text-center text-sm text-on-surface-variant">No appointments.</p>}
      </div>
    </Card>
  );
}
