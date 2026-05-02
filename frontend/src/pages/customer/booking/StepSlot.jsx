import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Clock, X } from "lucide-react";

export default function StepSlot({ availability, selectedSlots, err, onToggle, onContinue, onBack }) {
  const selected = selectedSlots || [];
  const selectedSet = new Set(selected.map((s) => s.start));

  return (
    <Card>
      <h3 className="font-semibold text-on-surface">Pick times</h3>
      <p className="mt-1 text-sm text-on-surface-variant">Select one or more time slots. You can book multiple slots in one go.</p>
      {err && <p className="mt-2 rounded-lg bg-error-container/30 px-3 py-2 text-sm text-error">{err}</p>}

      {selected.length > 0 && (
        <div className="mt-3 rounded-lg border border-primary-container/30 bg-primary-container/5 p-3">
          <p className="mb-2 text-xs font-bold uppercase text-on-surface-variant">Selected ({selected.length})</p>
          <div className="flex flex-wrap gap-2">
            {selected.map((s) => (
              <span key={s.start} className="inline-flex items-center gap-1 rounded-full bg-primary-container/15 px-2 py-1 text-xs font-medium text-primary-container">
                {new Date(s.start).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} {" "}
                {new Date(s.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                <button type="button" onClick={() => onToggle(s)} className="ml-1 rounded-full p-0.5 hover:bg-primary-container/20">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 max-h-[420px] space-y-5 overflow-y-auto pr-1">
        {availability.map((day) => (
          <div key={day.date}>
            <p className="sticky top-0 z-10 mb-2 bg-surface-container-lowest text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              {new Date(day.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {day.slots.map((s, idx) => {
                const isSel = selectedSet.has(s.start);
                return (
                  <button
                    key={`${day.date}-${idx}`}
                    type="button"
                    onClick={() => onToggle(s)}
                    className={`group flex flex-col items-center gap-1 rounded-lg border p-3 transition hover:shadow-card ${
                      isSel
                        ? "border-primary-container bg-primary-container/10 shadow-card"
                        : "border-outline-variant bg-surface-container-lowest hover:border-primary-container hover:bg-primary-container/5"
                    }`}
                  >
                    <Clock size={14} className={isSel ? "text-primary-container" : "text-on-surface-variant group-hover:text-primary-container"} />
                    <span className={`text-sm font-semibold ${isSel ? "text-primary-container" : "text-on-surface group-hover:text-primary-container"}`}>
                      {new Date(s.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">{s.available_capacity} spot{s.available_capacity !== 1 ? "s" : ""}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {!availability.length && !err && <p className="mt-4 text-center text-sm text-on-surface-variant">No available slots. Please try another date or contact the organiser.</p>}
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button disabled={!selected.length} onClick={onContinue}>Continue with {selected.length} slot{selected.length !== 1 ? "s" : ""}</Button>
      </div>
    </Card>
  );
}
