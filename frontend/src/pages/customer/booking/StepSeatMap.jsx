import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";

export default function StepSeatMap({ at, selectedSeatIds, setSelectedSeatIds, resourceId, onBack, onNext }) {
  const seats = (at?.seats || []).filter((s) => s.status === "active");
  const filtered = resourceId ? seats.filter((s) => s.resource_id === null || s.resource_id === resourceId) : seats;
  const blocksById = Object.fromEntries((at?.seat_blocks || []).map((b) => [b.id, b]));

  function toggleSeat(id) {
    setSelectedSeatIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <Card>
      <h3 className="font-semibold text-on-surface">Pick seats</h3>
      <p className="mt-1 text-sm text-on-surface-variant">Choose one or more seats from the map.</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-4 md:grid-cols-5">
        {filtered.map((seat) => {
          const selected = selectedSeatIds.includes(seat.id);
          const block = blocksById[seat.block_id];
          return (
            <button
              key={seat.id}
              type="button"
              onClick={() => toggleSeat(seat.id)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                selected
                  ? "border-primary-container bg-primary-container/10 text-primary-container"
                  : "border-outline-variant bg-surface-container-low hover:border-primary-container"
              }`}
              style={!selected && block?.color ? { borderColor: block.color } : undefined}
            >
              <div>{seat.label}</div>
              <div className="text-[10px] font-normal text-on-surface-variant">{block?.name || "Block"}</div>
            </button>
          );
        })}
      </div>

      {!filtered.length && <p className="mt-4 text-sm text-on-surface-variant">No active seats configured.</p>}

      <div className="mt-5 flex gap-2">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button disabled={!selectedSeatIds.length} onClick={onNext}>
          Continue with {selectedSeatIds.length} seat{selectedSeatIds.length !== 1 ? "s" : ""}
        </Button>
      </div>
    </Card>
  );
}
