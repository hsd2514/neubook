import { Minus, Plus, Users } from "lucide-react";
import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";

export default function StepCapacity({ slots, capacity, setCapacity, onBack, onNext }) {
  const slotList = slots || [];
  const max = slotList.length ? Math.min(...slotList.map((s) => s.available_capacity || 1)) : 1;

  return (
    <Card>
      <h3 className="font-semibold text-on-surface">How many people?</h3>
      <p className="mt-1 text-sm text-on-surface-variant">Select the number of seats you need.</p>
      <div className="mt-6 flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container/15 text-primary-container">
          <Users size={24} />
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setCapacity(Math.max(1, capacity - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition"
          >
            <Minus size={18} />
          </button>
          <span className="min-w-[3rem] text-center text-3xl font-bold text-on-surface">{capacity}</span>
          <button
            type="button"
            onClick={() => setCapacity(Math.min(max, capacity + 1))}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition"
          >
            <Plus size={18} />
          </button>
        </div>
        <p className="text-xs text-on-surface-variant">Max {max} available</p>
      </div>
      <div className="mt-6 flex gap-2">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button onClick={onNext}>Next</Button>
      </div>
    </Card>
  );
}
