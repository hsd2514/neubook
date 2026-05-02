import { Input } from "../../../components/ui/Input.jsx";
import { Select } from "../../../components/ui/Select.jsx";

export default function BasicsSection({ form, setForm }) {
  const set = (k) => (e) =>
    setForm((f) => ({
      ...f,
      [k]:
        typeof f[k] === "boolean" ? e.target.checked
        : typeof f[k] === "number" ? Number(e.target.value)
        : e.target.value,
    }));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Input label="Name" value={form.name} onChange={set("name")} required />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Description</label>
        <textarea
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 text-sm outline-none transition focus:border-primary-container focus:ring-2 focus:ring-primary-container/20"
          rows={3}
          value={form.description}
          onChange={set("description")}
        />
      </div>
      <Input label="Duration (minutes)" type="number" min={5} value={form.duration_minutes} onChange={set("duration_minutes")} />
      <Select label="Appointment kind" value={form.appointment_kind} onChange={set("appointment_kind")}>
        <option value="resource">Resource</option>
        <option value="user">User</option>
      </Select>
      <Select label="Slot schedule" value={form.slot_schedule} onChange={set("slot_schedule")}>
        <option value="weekly">Weekly</option>
        <option value="flexible">Flexible</option>
      </Select>
      <Select label="Visibility" value={form.visibility} onChange={set("visibility")}>
        <option value="public">Public</option>
        <option value="unlisted">Unlisted</option>
        <option value="private">Private</option>
      </Select>
      <Select label="Assignment" value={form.assignment_mode} onChange={set("assignment_mode")}>
        <option value="manual">Manual</option>
        <option value="auto">Auto</option>
      </Select>
    </div>
  );
}
