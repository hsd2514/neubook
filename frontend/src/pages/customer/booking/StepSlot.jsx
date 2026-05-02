import { useEffect, useState } from "react";
import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Clock, Users, X } from "lucide-react";
import { api } from "../../../services/api.js";

/**
 * StepSlot – shows available time slots.
 * Full slots (available_capacity === 0) are shown in amber with a "Waitlist" badge
 * so the user can still select them and join the queue after the confirm step.
 */
export default function StepSlot({ availability, selectedSlots, err, onToggle, onContinue, onBack, appointmentTypeId, resourceId }) {
  const selected = selectedSlots || [];
  const selectedSet = new Set(selected.map((s) => s.start));

  // Track waitlist counts per slot start ISO string
  const [waitlistCounts, setWaitlistCounts] = useState({});

  // Fetch waitlist info for full slots so we can show queue depth
  useEffect(() => {
    if (!appointmentTypeId) return;
    const fullSlots = availability.flatMap((day) =>
      day.slots.filter((s) => s.available_capacity === 0)
    );
    if (!fullSlots.length) return;

    Promise.all(
      fullSlots.map(async (s) => {
        try {
          const params = new URLSearchParams({
            appointment_type_id: appointmentTypeId,
            start_time: s.start,
            ...(resourceId ? { resource_id: resourceId } : {}),
          });
          const info = await api(`/api/waitlist/slot-info?${params}`);
          return { start: s.start, count: info.waiting_count, user_position: info.user_position };
        } catch {
          return { start: s.start, count: 0, user_position: null };
        }
      })
    ).then((results) => {
      const map = {};
      for (const r of results) map[r.start] = r;
      setWaitlistCounts(map);
    });
  }, [availability, appointmentTypeId, resourceId]);

  return (
    <Card>
      <h3 className="font-semibold text-on-surface">Pick times</h3>
      <p className="mt-1 text-sm text-on-surface-variant">
        Select one or more time slots. Full slots show a waitlist option.
      </p>
      {err && <p className="mt-2 rounded-lg bg-error-container/30 px-3 py-2 text-sm text-error">{err}</p>}

      {selected.length > 0 && (
        <div className="mt-3 rounded-lg border border-primary-container/30 bg-primary-container/5 p-3">
          <p className="mb-2 text-xs font-bold uppercase text-on-surface-variant">Selected ({selected.length})</p>
          <div className="flex flex-wrap gap-2">
            {selected.map((s) => (
              <span key={s.start} className="inline-flex items-center gap-1 rounded-full bg-primary-container/15 px-2 py-1 text-xs font-medium text-primary-container">
                {new Date(s.start).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}{" "}
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
                const isFull = s.available_capacity === 0;
                const wlInfo = waitlistCounts[s.start];
                const waitingCount = wlInfo?.count || 0;
                const userPos = wlInfo?.user_position ?? null;

                // Determine button style
                let btnClass = "group flex flex-col items-center gap-1 rounded-lg border p-3 transition hover:shadow-card ";
                if (isSel && isFull) {
                  // Selected for waitlist
                  btnClass += "border-[#f59e0b] bg-[#f59e0b]/15 shadow-card";
                } else if (isSel) {
                  btnClass += "border-primary-container bg-primary-container/10 shadow-card";
                } else if (isFull) {
                  btnClass += "border-[#f59e0b]/50 bg-[#fef3c7] hover:border-[#f59e0b] hover:bg-[#f59e0b]/20";
                } else {
                  btnClass += "border-outline-variant bg-surface-container-lowest hover:border-primary-container hover:bg-primary-container/5";
                }

                return (
                  <button
                    key={`${day.date}-${idx}`}
                    type="button"
                    onClick={() => onToggle(s)}
                    className={btnClass}
                  >
                    <Clock
                      size={14}
                      className={
                        isSel && isFull ? "text-[#f59e0b]"
                        : isSel ? "text-primary-container"
                        : isFull ? "text-[#f59e0b]"
                        : "text-on-surface-variant group-hover:text-primary-container"
                      }
                    />
                    <span className={`text-sm font-semibold ${
                      isSel && isFull ? "text-[#92400e]"
                      : isSel ? "text-primary-container"
                      : isFull ? "text-[#92400e]"
                      : "text-on-surface group-hover:text-primary-container"
                    }`}>
                      {new Date(s.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>

                    {isFull ? (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-[#f59e0b] leading-none">
                        {userPos ? `#${userPos} waitlist` : waitingCount > 0 ? `${waitingCount} waiting` : "Waitlist"}
                      </span>
                    ) : (
                      <span className="text-[10px] text-on-surface-variant">
                        {s.available_capacity} spot{s.available_capacity !== 1 ? "s" : ""}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!availability.length && !err && (
        <p className="mt-4 text-center text-sm text-on-surface-variant">
          No available slots. Please try another date or contact the organiser.
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button disabled={!selected.length} onClick={onContinue}>
          Continue with {selected.length} slot{selected.length !== 1 ? "s" : ""}
        </Button>
      </div>
    </Card>
  );
}
