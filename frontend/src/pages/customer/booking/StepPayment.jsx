import { CreditCard } from "lucide-react";
import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";

export default function StepPayment({
  confirmed,
  reference,
  paymentLoading,
  onInitiatePayment,
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
        <p className="text-sm text-on-surface-variant">
          You will be redirected to PhonePe to complete payment.
        </p>
        {reference && (
          <p className="mt-2 text-xs text-on-surface-variant">
            Payment reference: <span className="font-medium text-on-surface">{reference}</span>
          </p>
        )}
        <div className="mt-3">
          <Button onClick={onInitiatePayment} disabled={paymentLoading}>
            {paymentLoading ? "Redirecting..." : "Pay with PhonePe"}
          </Button>
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
