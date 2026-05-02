import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function pad(n) { return String(n).padStart(2, "0"); }

export function CalendarPicker({ value, onChange, minDate }) {
  const selected = value ? new Date(value + "T12:00:00") : null;
  const [cursor, setCursor] = useState(() => selected || new Date());

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    let startDow = first.getDay();
    if (startDow === 0) startDow = 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const rows = [];
    let day = 1 - (startDow - 1);
    for (let w = 0; w < 6; w++) {
      const row = [];
      for (let d = 0; d < 7; d++, day++) {
        if (day >= 1 && day <= daysInMonth) row.push(day);
        else row.push(null);
      }
      if (row.some((d) => d !== null)) rows.push(row);
    }
    return rows;
  }, [year, month]);

  function prev() { setCursor(new Date(year, month - 1, 1)); }
  function next() { setCursor(new Date(year, month + 1, 1)); }

  function pick(day) {
    const iso = `${year}-${pad(month + 1)}-${pad(day)}`;
    if (minDate && iso < minDate) return;
    onChange(iso);
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  return (
    <div className="w-fit select-none">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={prev} className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-on-surface">
          {cursor.toLocaleString("default", { month: "long" })} {year}
        </span>
        <button type="button" onClick={next} className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high">
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
        {DAYS.map((d) => (
          <span key={d} className="py-1 font-bold text-on-surface-variant">{d}</span>
        ))}
        {cells.flat().map((day, i) => {
          if (day === null) return <span key={`e-${i}`} />;
          const iso = `${year}-${pad(month + 1)}-${pad(day)}`;
          const isSelected = value === iso;
          const isToday = iso === todayStr;
          const isPast = minDate && iso < minDate;
          return (
            <button
              key={iso}
              type="button"
              disabled={isPast}
              onClick={() => pick(day)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm transition ${
                isSelected
                  ? "bg-primary-container text-on-primary font-bold shadow-card"
                  : isToday
                  ? "bg-secondary/15 text-secondary font-semibold"
                  : isPast
                  ? "text-outline/40 cursor-not-allowed"
                  : "text-on-surface hover:bg-surface-container-high"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
