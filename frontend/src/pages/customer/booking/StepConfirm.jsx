import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";

export default function StepConfirm({ at, slots, capacity, err, paymentConfirmed, paymentReference, onBack, onConfirm }) {
  const slotList = slots || [];
  const fullSlots = slotList.filter((s) => (s.available_capacity ?? 1) === 0);
  const hasFullSlots = fullSlots.length > 0;

  return (
    <Card>
      <h3 className="text-lg font-bold text-on-surface">Confirm your {slotList.length > 1 ? "bookings" : "appointment"}</h3>
      <p className="mt-1 text-sm text-on-surface-variant">Please review the details before confirming.</p>

      <div className="mt-5 rounded-lg border border-outline-variant bg-surface-container-low p-4 space-y-4">
        {slotList.length > 0 && (
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-container/15 text-primary-container">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-on-surface-variant">
                Date & Time {slotList.length > 1 && <span className="ml-1 text-on-surface-variant">({slotList.length} slots)</span>}
              </p>
              <div className="space-y-1">
                {slotList.map((slot) => {
                  const d = new Date(slot.start);
                  return (
                    <p key={slot.start} className="text-sm text-on-surface">
                      {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} {" "}
                      {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-on-surface-variant">Duration</p>
            <p className="font-semibold text-on-surface">{at.duration_minutes} minutes each</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tertiary-container/20 text-tertiary-container">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-on-surface-variant">No. of people</p>
            <p className="font-semibold text-on-surface">{at.manage_capacity ? capacity : 1} per slot</p>
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
      {at.advance_payment && (
        <div className="mt-4 rounded-lg border border-secondary/30 bg-secondary/10 p-3 text-sm text-on-surface">
          <p className="font-semibold">Payment status: {paymentConfirmed ? "Paid" : "Pending"}</p>
          {paymentReference && <p className="text-on-surface-variant">Reference: {paymentReference}</p>}
        </div>
      )}

      {hasFullSlots && (
        <div className="mt-3 rounded-lg border border-[#f59e0b]/30 bg-[#fef3c7] px-3 py-2 text-sm">
          <p className="font-semibold text-[#92400e]">⚠️ Some selected slots are full</p>
          <p className="mt-0.5 text-xs text-[#78350f]">
            Confirming will attempt to book available slots. For full slots you'll be offered to join the waitlist and notified when a spot opens.
          </p>
        </div>
      )}

      {err && <p className="mt-3 rounded-lg bg-error-container/30 px-3 py-2 text-sm text-error">{err}</p>}

      <div className="mt-5 flex gap-2">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button onClick={onConfirm}>
          {hasFullSlots ? "Confirm / Join Waitlist" : `Confirm ${slotList.length > 1 ? "bookings" : "booking"}`}
        </Button>
      </div>
    </Card>
  );
}
