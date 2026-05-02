import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { CalendarPicker } from "../../../components/ui/CalendarPicker.jsx";

export default function StepDate({ date, setDate, onBack, onNext }) {
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <Card>
      <h3 className="font-semibold text-on-surface">Choose a date</h3>
      <p className="mt-1 text-sm text-on-surface-variant">Select your preferred appointment date.</p>
      <div className="mt-4 flex justify-center">
        <CalendarPicker value={date} onChange={setDate} minDate={minDate} />
      </div>
      {date && <p className="mt-3 text-center text-sm font-medium text-primary-container">Selected: {new Date(date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>}
      <div className="mt-6 flex gap-2">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button onClick={onNext} disabled={!date}>View slots</Button>
      </div>
    </Card>
  );
}
