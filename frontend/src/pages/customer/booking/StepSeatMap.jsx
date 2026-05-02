import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { api } from "../../../services/api.js";

const HOLD_REFRESH_MS = 4 * 60 * 1000; // re-hold every 4 min (TTL is 5 min)
const POLL_HELD_MS = 15_000; // check others' holds every 15s

export default function StepSeatMap({ at, selectedSeatIds, setSelectedSeatIds, resourceId, slots, onBack, onNext }) {
  const allSeats = (at?.seats || []).filter((s) => s.status === "active");
  const filteredByResource = resourceId ? allSeats.filter((s) => s.resource_id === null || s.resource_id === resourceId) : allSeats;
  const blocks = at?.seat_blocks || [];
  const blocksById = Object.fromEntries(blocks.map((b) => [b.id, b]));
  const [activeBlockId, setActiveBlockId] = useState("all");
  const [takenIds, setTakenIds] = useState(new Set());
  const [heldByOthers, setHeldByOthers] = useState(new Set());
  const [loadingTaken, setLoadingTaken] = useState(false);
  const holdTimerRef = useRef(null);
  const pollTimerRef = useRef(null);

  const slotStart = slots?.[0]?.start;

  // Fetch permanently booked (taken) seats
  useEffect(() => {
    if (!at?.id || !slots?.length) return;
    setLoadingTaken(true);
    const fetches = slots.map((s) => {
      const params = new URLSearchParams({ slot_start: s.start, slot_end: s.end });
      return api(`/api/appointments/${at.id}/taken-seats?${params}`).catch(() => ({ taken_seat_ids: [] }));
    });
    Promise.all(fetches)
      .then((results) => {
        const ids = new Set();
        for (const r of results) for (const id of r.taken_seat_ids || []) ids.add(id);
        setTakenIds(ids);
      })
      .finally(() => setLoadingTaken(false));
  }, [at?.id, slots]);

  // Poll for seats held by OTHER users
  const fetchHeld = useCallback(() => {
    if (!at?.id || !slotStart) return;
    const params = new URLSearchParams({ slot_start: slotStart });
    api(`/api/appointments/${at.id}/seats/held?${params}`)
      .then((r) => setHeldByOthers(new Set(r.held_seat_ids || [])))
      .catch(() => {});
  }, [at?.id, slotStart]);

  useEffect(() => {
    fetchHeld();
    pollTimerRef.current = setInterval(fetchHeld, POLL_HELD_MS);
    return () => clearInterval(pollTimerRef.current);
  }, [fetchHeld]);

  // Hold selected seats on server, refresh before TTL expires
  const holdSeats = useCallback(
    (seatIds) => {
      if (!at?.id || !slotStart || !seatIds.length) return;
      api(`/api/appointments/${at.id}/seats/hold`, {
        method: "POST",
        body: JSON.stringify({ slot_start: slotStart, seat_ids: seatIds }),
      }).catch(() => {});
    },
    [at?.id, slotStart],
  );

  useEffect(() => {
    holdSeats(selectedSeatIds);
    clearInterval(holdTimerRef.current);
    if (selectedSeatIds.length) {
      holdTimerRef.current = setInterval(() => holdSeats(selectedSeatIds), HOLD_REFRESH_MS);
    }
    return () => clearInterval(holdTimerRef.current);
  }, [selectedSeatIds, holdSeats]);

  // Release holds when leaving the page
  useEffect(() => {
    return () => {
      if (selectedSeatIds.length && at?.id && slotStart) {
        api(`/api/appointments/${at.id}/seats/release`, {
          method: "POST",
          body: JSON.stringify({ slot_start: slotStart, seat_ids: selectedSeatIds }),
        }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (takenIds.has(id) || heldByOthers.has(id)) return;
    setSelectedSeatIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      // Release deselected seats immediately
      if (prev.includes(id)) {
        api(`/api/appointments/${at.id}/seats/release`, {
          method: "POST",
          body: JSON.stringify({ slot_start: slotStart, seat_ids: [id] }),
        }).catch(() => {});
      }
      return next;
    });
  }

  function handleBack() {
    if (selectedSeatIds.length && at?.id && slotStart) {
      api(`/api/appointments/${at.id}/seats/release`, {
        method: "POST",
        body: JSON.stringify({ slot_start: slotStart, seat_ids: selectedSeatIds }),
      }).catch(() => {});
    }
    setSelectedSeatIds([]);
    onBack();
  }

  const availableCount = filteredByResource.filter((s) => !takenIds.has(s.id) && !heldByOthers.has(s.id)).length;
  const takenCount = filteredByResource.filter((s) => takenIds.has(s.id)).length;
  const heldCount = filteredByResource.filter((s) => heldByOthers.has(s.id) && !takenIds.has(s.id)).length;

  return (
    <Card>
      <h3 className="font-semibold text-on-surface">Pick your spots</h3>
      <p className="mt-1 text-sm text-on-surface-variant">
        {availableCount} available
        {takenCount > 0 ? ` · ${takenCount} taken` : ""}
        {heldCount > 0 ? ` · ${heldCount} held` : ""}
        {loadingTaken && " · checking availability…"}
      </p>

      {/* Section filter */}
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
          All sections
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
                const taken = takenIds.has(seat.id);
                const held = heldByOthers.has(seat.id) && !taken;
                const selected = selectedSeatIds.includes(seat.id);
                const block = blocksById[seat.block_id];
                const unavailable = taken || held;
                return (
                  <button
                    key={seat.id}
                    type="button"
                    disabled={unavailable}
                    onClick={() => toggleSeat(seat.id)}
                    className={`rounded-md border px-2 py-2 text-xs font-semibold transition ${
                      taken
                        ? "cursor-not-allowed border-outline-variant/50 bg-surface-container-highest/60 text-on-surface-variant/40 line-through"
                        : held
                          ? "cursor-not-allowed border-amber-400/60 bg-amber-50 text-amber-600/70"
                          : selected
                            ? "border-primary-container bg-primary-container/15 text-primary-container shadow-sm"
                            : "border-outline-variant bg-surface-container-low hover:border-primary-container hover:bg-primary-container/5"
                    }`}
                    style={!unavailable && !selected && block?.color ? { borderColor: block.color } : undefined}
                    title={taken ? "Already booked" : held ? "Held by another user" : seat.label}
                  >
                    {taken ? "✕" : held ? "⏳" : seat.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!filtered.length && <p className="mt-4 text-sm text-on-surface-variant">No active spots configured.</p>}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-outline-variant bg-surface-container-low" />
          Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-primary-container bg-primary-container/15" />
          Selected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-amber-400/60 bg-amber-50" />
          Held
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-outline-variant/50 bg-surface-container-highest/60" />
          Taken
        </span>
        {blocks.map((b) => (
          <span key={`legend-${b.id}`} className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: b.color || "#999" }} />
            {b.name}
          </span>
        ))}
      </div>

      <div className="mt-5 flex gap-2">
        <Button variant="secondary" onClick={handleBack}>Back</Button>
        <Button disabled={!selectedSeatIds.length} onClick={onNext}>
          Continue with {selectedSeatIds.length} spot{selectedSeatIds.length !== 1 ? "s" : ""}
        </Button>
      </div>
    </Card>
  );
}
