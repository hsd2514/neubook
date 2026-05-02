import { CreditCard } from "lucide-react";
import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Input } from "../../../components/ui/Input.jsx";

export default function StepPayment({
  confirmed,
  reference,
  setConfirmed,
  setReference,
  onBack,
  onNext,
}) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
          <CreditCard size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-on-surface">Advance payment</h3>
          <p className="text-sm text-on-surface-variant">
            This service requires payment before booking confirmation.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-outline-variant bg-surface-container-low p-4">
        <label className="flex items-center gap-2 text-sm text-on-surface">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          Payment completed (dev mode)
        </label>
        <div className="mt-3">
          <Input
            label="Payment reference"
            placeholder="txn_12345"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!confirmed}>
          Continue
        </Button>
      </div>
    </Card>
  );
}
