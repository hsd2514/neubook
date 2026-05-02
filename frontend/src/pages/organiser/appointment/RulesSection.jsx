import { Input } from "../../../components/ui/Input.jsx";
import { Toggle } from "../../../components/ui/Toggle.jsx";

export default function RulesSection({ form, setForm }) {
  const toggle = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">
      <Input
        label="Max bookings per slot"
        type="number"
        min={1}
        value={form.max_bookings_per_slot}
        onChange={(e) => setForm((f) => ({ ...f, max_bookings_per_slot: Number(e.target.value) }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low p-3">
          <div>
            <p className="text-sm font-medium text-on-surface">Manage capacity</p>
            <p className="text-xs text-on-surface-variant">Allow customers to book multiple seats</p>
          </div>
          <Toggle checked={form.manage_capacity} onChange={toggle("manage_capacity")} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low p-3">
          <div>
            <p className="text-sm font-medium text-on-surface">Advance payment</p>
            <p className="text-xs text-on-surface-variant">Require payment before confirmation</p>
          </div>
          <Toggle checked={form.advance_payment} onChange={toggle("advance_payment")} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low p-3">
          <div>
            <p className="text-sm font-medium text-on-surface">Manual confirmation</p>
            <p className="text-xs text-on-surface-variant">Organiser must confirm each booking</p>
          </div>
          <Toggle checked={form.manual_confirmation} onChange={toggle("manual_confirmation")} />
        </div>
      </div>
    </div>
  );
}
