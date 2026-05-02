import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";

export default function StepResource({ at, resourceId, setResourceId, onBack, onNext }) {
  return (
    <Card>
      <h3 className="font-semibold text-on-surface">Select resource</h3>
      {at.appointment_kind === "resource" ? (
        <div className="mt-4 space-y-2">
          {at.resources?.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setResourceId(r.id)}
              className={`flex w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
                resourceId === r.id
                  ? "border-primary-container bg-primary-container/10"
                  : "border-outline-variant hover:bg-surface-container-low"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-on-surface-variant">No resource selection required.</p>
      )}
      <div className="mt-6 flex gap-2">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button onClick={onNext} disabled={at.appointment_kind === "resource" && !resourceId}>Next</Button>
      </div>
    </Card>
  );
}
