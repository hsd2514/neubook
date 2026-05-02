import { Calendar, Clock, Users } from "lucide-react";
import { Card } from "../../../components/ui/Card.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { Button } from "../../../components/ui/Button.jsx";

export default function StepService({ at, onNext }) {
  const amountPaisa = Number(at?.service_amount_paisa ?? 0);
  const amountInr = amountPaisa > 0 ? (amountPaisa / 100).toFixed(2) : null;

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-on-surface">{at.name}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{at.description || "No description provided."}</p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-container/15 text-primary-container">
          <Calendar size={24} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3 text-center">
          <Clock size={18} className="mx-auto text-on-surface-variant" />
          <p className="mt-1 text-lg font-bold text-on-surface">{at.duration_minutes}</p>
          <p className="text-[10px] uppercase text-on-surface-variant">minutes</p>
        </div>
        <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3 text-center">
          <Users size={18} className="mx-auto text-on-surface-variant" />
          <p className="mt-1 text-lg font-bold text-on-surface">{at.max_bookings_per_slot || 1}</p>
          <p className="text-[10px] uppercase text-on-surface-variant">max per slot</p>
        </div>
        <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3 text-center">
          <Calendar size={18} className="mx-auto text-on-surface-variant" />
          <p className="mt-1 text-lg font-bold text-on-surface capitalize">{at.slot_schedule}</p>
          <p className="text-[10px] uppercase text-on-surface-variant">schedule</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {amountInr && <Badge tone="teal">Price: INR {amountInr}</Badge>}
        {at.manage_capacity && <Badge tone="warning">Capacity management</Badge>}
        {at.advance_payment && <Badge tone="teal">Advance payment</Badge>}
        {at.manual_confirmation && <Badge tone="purple">Manual confirmation</Badge>}
      </div>
      <Button className="mt-6 w-full" onClick={onNext}>Book appointment</Button>
    </Card>
  );
}
