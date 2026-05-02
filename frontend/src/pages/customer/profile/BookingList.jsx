import { Calendar, MoreHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "../../../components/ui/Badge.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";

const toneMap = { confirmed: "success", pending: "warning", cancelled: "danger" };
const PAGE_SIZE = 5;

export default function BookingList({ title, bookings, showActions, onCancel, onReschedule }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(bookings.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = useMemo(
    () => bookings.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [bookings, safePage],
  );

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-on-surface">{title}</h2>
        <Badge>{bookings.length}</Badge>
      </div>
      <div className="mt-4 divide-y divide-outline-variant">
        {visible.map((b) => {
          const start = new Date(b.start_time);
          return (
            <div key={b.id} className="flex flex-wrap items-center gap-4 py-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-container/10 text-primary-container">
                <Calendar size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface">
                  {b.appointment_type_name || "Appointment"}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} at {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
                {b.resource_name && (
                  <p className="text-xs text-on-surface-variant">{b.resource_name}</p>
                )}
                <div className="mt-1 flex items-center gap-2">
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
      {bookings.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="secondary" className="px-3 py-1 text-xs" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Prev
          </Button>
          <span className="text-xs text-on-surface-variant">
            Page {safePage} of {totalPages}
          </span>
          <Button variant="secondary" className="px-3 py-1 text-xs" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            Next
          </Button>
        </div>
      )}
    </Card>
  );
}
