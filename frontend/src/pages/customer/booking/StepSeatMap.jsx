import { useEffect, useMemo, useState } from "react";
import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { api } from "../../../services/api.js";

/**
 * StepSeatMap
 *
 * Props:
 *   at               – appointment type object (seats, seat_blocks)
 *   selectedSeatIds  – array of selected seat IDs
 *   setSelectedSeatIds – setter
 *   resourceId       – current resource filter (nullable)
 *   slots            – array of selected slot objects [{start, end}, …]
 *   onBack / onNext  – navigation callbacks
 */
export default function StepSeatMap({ at, selectedSeatIds, setSelectedSeatIds, resourceId, slots, onBack, onNext }) {
  const seats = (at?.seats || []).filter((s) => s.status === "active");
  const filteredByResource = resourceId ? seats.filter((s) => s.resource_id === null || s.resource_id === resourceId) : seats;
  const blocks = at?.seat_blocks || [];
  const blocksById = Object.fromEntries(blocks.map((b) => [b.id, b]));
  const [activeBlockId, setActiveBlockId] = useState("all");

  // ── waitlist: seats already taken for the selected slot ───────────────────
  const [takenSeatIds, setTakenSeatIds] = useState(new Set());
  const [waitlistedSeatIds, setWaitlistedSeatIds] = useState(new Set()); // seats that have someone waiting

  useEffect(() => {
    if (!at?.id || !slots?.length) return;

    // For each slot, fetch the booking seats already taken so we can mark them
    const startTime = slots[0]?.start;
    if (!startTime) return;

    const params = new URLSearchParams({
      appointment_type_id: at.id,
      start_time: startTime,
      ...(resourceId ? { resource_id: resourceId } : {}),
    });

    // Fetch active bookings for the slot to get taken seat IDs
    // We use the organiser/public availability — seats booked are reflected via BookingSeat
    // We'll use a lightweight approach: call the slot-info endpoint for waitlist
    api(`/api/waitlist/slot-info?${params}`)
      .then((info) => {
        // info.waiting_count tells us the total, but we need seat-level detail
        // For now, just track global waitlist count per slot (seat-level is future work)
        // The taken seats come from the backend's booking validation; we show them as unavailable
        // We rely on the backend returning 409 when seats are taken
      })
      .catch(() => {}); // non-critical
  }, [at?.id, slots, resourceId]);

  const filtered = useMemo(() => {
    if (activeBlockId === "all") return filteredByResource;
    return filteredByResource.filter((s) => String(s.block_id) === String(activeBlockId));
  }, [activeBlockId, filteredByResource]);

  const groupedRows = useMemo(() => {
    const rows = new Map();
    for (const seat of filtered) {
      const rowKey = seat.row_label || "Row";
      if (!rows.has(rowKey)) rows.set(rowKey, []);
      rows.get(rowKey).push(seat);
    }
    for (const list of rows.values()) {
      list.sort((a, b) => {
        const ac = Number(a.col_number || 0);
        const bc = Number(b.col_number || 0);
        if (ac && bc) return ac - bc;
        return a.label.localeCompare(b.label);
      });
    }
    return Array.from(rows.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  function toggleSeat(id) {
    if (takenSeatIds.has(id)) return; // can't toggle a taken seat
    setSelectedSeatIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <Card>
      <h3 className="font-semibold text-on-surface">Pick seats</h3>
      <p className="mt-1 text-sm text-on-surface-variant">Choose one or more seats from the map-like layout.</p>

      {/* Color legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-outline-variant bg-surface-container-low" />
          Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-primary-container bg-primary-container/10" />
          Selected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-[#f59e0b] bg-[#f59e0b]/15" />
          Waitlisted
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-outline-variant/30 bg-surface-container-highest opacity-40" />
          Taken
        </span>
      </div>

      <div className="mt-4 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
        Screen / Stage
      </div>

      {/* Block filter tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveBlockId("all")}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            activeBlockId === "all"
              ? "border-primary-container bg-primary-container/10 text-primary-container"
              : "border-outline-variant text-on-surface-variant"
          }`}
        >
          All blocks
        </button>
        {blocks.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setActiveBlockId(b.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              String(activeBlockId) === String(b.id)
                ? "bg-primary-container/10 text-primary-container"
                : "text-on-surface-variant"
            }`}
            style={{ borderColor: b.color || undefined }}
          >
            {b.name}
          </button>
        ))}
      </div>

      {/* Seat grid */}
      <div className="mt-4 space-y-3">
        {groupedRows.map(([rowKey, rowSeats]) => (
          <div key={rowKey} className="flex items-start gap-3">
            <div className="w-10 pt-2 text-xs font-bold uppercase text-on-surface-variant">{rowKey}</div>
            <div className="grid flex-1 grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-8">
              {rowSeats.map((seat) => {
                const selected = selectedSeatIds.includes(seat.id);
                const taken = takenSeatIds.has(seat.id);
                const waitlisted = !taken && waitlistedSeatIds.has(seat.id);
                const block = blocksById[seat.block_id];

                let className = "rounded-md border px-2 py-2 text-xs font-semibold transition ";
                let style = {};

                if (taken) {
                  className += "border-outline-variant/30 bg-surface-container-highest opacity-40 cursor-not-allowed";
                } else if (selected) {
                  className += "border-primary-container bg-primary-container/10 text-primary-container shadow-sm";
                } else if (waitlisted) {
                  className += "border-[#f59e0b] bg-[#f59e0b]/15 text-[#92400e] cursor-pointer hover:bg-[#f59e0b]/25";
                } else {
                  className += "border-outline-variant bg-surface-container-low hover:border-primary-container cursor-pointer";
                  if (block?.color) style = { borderColor: block.color };
                }

                return (
                  <button
                    key={seat.id}
                    type="button"
                    onClick={() => toggleSeat(seat.id)}
                    disabled={taken}
                    title={taken ? "This seat is already booked" : waitlisted ? "Someone is waiting for this seat" : seat.label}
                    className={className}
                    style={style}
                  >
                    <span>{seat.label}</span>
                    {waitlisted && (
                      <span className="ml-1 text-[8px] font-bold text-[#f59e0b]">W</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!filtered.length && <p className="mt-4 text-sm text-on-surface-variant">No active seats configured.</p>}

      {/* Block legend */}
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {blocks.map((b) => (
          <span key={`legend-${b.id}`} className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-2 py-1 text-on-surface-variant">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color || "#999" }} />
            {b.name}
          </span>
        ))}
      </div>

      <div className="mt-5 flex gap-2">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button disabled={!selectedSeatIds.length} onClick={onNext}>
          Continue with {selectedSeatIds.length} seat{selectedSeatIds.length !== 1 ? "s" : ""}
        </Button>
      </div>
    </Card>
  );
}
