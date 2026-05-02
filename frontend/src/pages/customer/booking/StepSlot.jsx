import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Clock } from "lucide-react";

export default function StepSlot({ availability, err, onSelect, onBack }) {
  return (
    <Card>
      <h3 className="font-semibold text-on-surface">Pick a time</h3>
      <p className="mt-1 text-sm text-on-surface-variant">Available time slots for the next 14 days.</p>
      {err && <p className="mt-2 rounded-lg bg-error-container/30 px-3 py-2 text-sm text-error">{err}</p>}
      <div className="mt-4 max-h-[420px] space-y-5 overflow-y-auto pr-1">
        {availability.map((day) => (
          <div key={day.date}>
            <p className="sticky top-0 z-10 mb-2 bg-surface-container-lowest text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              {new Date(day.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {day.slots.map((s, idx) => (
                <button
                  key={`${day.date}-${idx}`}
                  type="button"
                  onClick={() => onSelect(s)}
                  className="group flex flex-col items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-3 transition hover:border-primary-container hover:bg-primary-container/5 hover:shadow-card"
                >
                  <Clock size={14} className="text-on-surface-variant group-hover:text-primary-container" />
                  <span className="text-sm font-semibold text-on-surface group-hover:text-primary-container">
                    {new Date(s.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">{s.available_capacity} spot{s.available_capacity !== 1 ? "s" : ""}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!availability.length && !err && <p className="mt-4 text-center text-sm text-on-surface-variant">No available slots. Please try another date or contact the organiser.</p>}
      <Button variant="secondary" className="mt-4" onClick={onBack}>Back</Button>
    </Card>
  );
}
