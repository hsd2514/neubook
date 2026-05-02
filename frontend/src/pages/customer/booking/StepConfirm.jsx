import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";

export default function StepConfirm({ at, slot, capacity, err, onBack, onConfirm }) {
  const startDate = slot ? new Date(slot.start) : null;

  return (
    <Card>
      <h3 className="text-lg font-bold text-on-surface">Confirm your appointment</h3>
      <p className="mt-1 text-sm text-on-surface-variant">Please review the details before confirming.</p>

      <div className="mt-5 rounded-lg border border-outline-variant bg-surface-container-low p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-container/15 text-primary-container">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-on-surface-variant">Date & Time</p>
            <p className="font-semibold text-on-surface">
              {startDate?.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
            <p className="text-sm text-on-surface-variant">
              {startDate?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-on-surface-variant">Duration</p>
            <p className="font-semibold text-on-surface">{at.duration_minutes} minutes</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tertiary-container/20 text-tertiary-container">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-on-surface-variant">No. of people</p>
            <p className="font-semibold text-on-surface">{at.manage_capacity ? capacity : 1} {at.manage_capacity && slot ? `(${slot.available_capacity} spots total)` : ""}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-container/15 text-primary-container">
            <MapPin size={20} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-on-surface-variant">Service</p>
            <p className="font-semibold text-on-surface">{at.name}</p>
          </div>
        </div>
      </div>

      {err && <p className="mt-3 rounded-lg bg-error-container/30 px-3 py-2 text-sm text-error">{err}</p>}

      <div className="mt-5 flex gap-2">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button onClick={onConfirm}>Confirm booking</Button>
      </div>
    </Card>
  );
}
