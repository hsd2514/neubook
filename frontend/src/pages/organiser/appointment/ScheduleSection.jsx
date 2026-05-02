import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "../../../components/ui/Input.jsx";
import { Select } from "../../../components/ui/Select.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { api } from "../../../services/api.js";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ScheduleSection({ appointmentId, schedules, resources, onRefresh }) {
  const [sch, setSch] = useState({ day_of_week: 0, start_time: "09:00", end_time: "17:00", resource_id: null });

  async function add(e) {
    e.preventDefault();
    await api(`/api/appointments/mine/${appointmentId}/schedules`, {
      method: "POST",
      body: JSON.stringify({ ...sch, resource_id: sch.resource_id || null }),
    });
    onRefresh();
  }

  return (
    <div className="space-y-4">
      {/* Existing schedules table */}
      {schedules?.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-outline-variant">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-outline-variant bg-surface-container-low">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">Day</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">Start</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">End</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">Resource</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low/50">
                  <td className="px-3 py-2 font-medium">{SHORT[s.day_of_week]}</td>
                  <td className="px-3 py-2">{s.start_time}</td>
                  <td className="px-3 py-2">{s.end_time}</td>
                  <td className="px-3 py-2 text-on-surface-variant">{s.resource_id ? `#${s.resource_id}` : "All"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add new schedule */}
      <form onSubmit={add} className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low/40 p-4">
        <p className="mb-3 text-xs font-bold uppercase text-on-surface-variant">Add time window</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <Select label="Day" value={sch.day_of_week} onChange={(e) => setSch((s) => ({ ...s, day_of_week: Number(e.target.value) }))}>
            {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </Select>
          <Input label="Start" value={sch.start_time} onChange={(e) => setSch((s) => ({ ...s, start_time: e.target.value }))} />
          <Input label="End" value={sch.end_time} onChange={(e) => setSch((s) => ({ ...s, end_time: e.target.value }))} />
          <Select label="Resource" value={sch.resource_id || ""} onChange={(e) => setSch((s) => ({ ...s, resource_id: e.target.value ? Number(e.target.value) : null }))}>
            <option value="">All / type-level</option>
            {resources?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </div>
        <Button type="submit" className="mt-3 gap-1"><Plus size={16} /> Add slot window</Button>
      </form>
    </div>
  );
}
