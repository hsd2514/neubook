import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "../../../components/ui/Input.jsx";
import { Select } from "../../../components/ui/Select.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { api } from "../../../services/api.js";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ScheduleSection({ appointmentId, slotSchedule, schedules, resources, onRefresh }) {
  const [sch, setSch] = useState({
    schedule_mode: slotSchedule || "weekly",
    day_of_week: 0,
    slot_date: "",
    start_time: "09:00",
    end_time: "17:00",
    resource_id: null,
  });

  async function add(e) {
    e.preventDefault();
    const payload = {
      schedule_mode: sch.schedule_mode,
      resource_id: sch.resource_id || null,
      start_time: sch.start_time,
      end_time: sch.end_time,
      day_of_week: sch.schedule_mode === "weekly" ? sch.day_of_week : null,
      slot_date: sch.schedule_mode === "flexible" ? sch.slot_date : null,
    };
    await api(`/api/appointments/mine/${appointmentId}/schedules`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setSch((prev) => ({
      ...prev,
      slot_date: "",
      day_of_week: 0,
      start_time: "09:00",
      end_time: "17:00",
      resource_id: null,
    }));
    onRefresh();
  }

  async function removeSchedule(id) {
    await api(`/api/appointments/mine/${appointmentId}/schedules/${id}`, { method: "DELETE" });
    onRefresh();
  }

  const mode = sch.schedule_mode;

  return (
    <div className="space-y-4">
      {/* Existing schedules table */}
      {schedules?.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-outline-variant">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-outline-variant bg-surface-container-low">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">Mode</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">Day / Date</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">Start</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">End</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">Resource</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">Action</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low/50">
                  <td className="px-3 py-2 font-medium capitalize">{s.schedule_mode || "weekly"}</td>
                  <td className="px-3 py-2 font-medium">
                    {s.schedule_mode === "flexible"
                      ? (s.slot_date || "-")
                      : (s.day_of_week != null ? SHORT[s.day_of_week] : "-")}
                  </td>
                  <td className="px-3 py-2">{s.start_time}</td>
                  <td className="px-3 py-2">{s.end_time}</td>
                  <td className="px-3 py-2 text-on-surface-variant">{s.resource_id ? `#${s.resource_id}` : "All"}</td>
                  <td className="px-3 py-2">
                    <Button variant="ghost" className="p-2" onClick={() => removeSchedule(s.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add new schedule */}
      <form onSubmit={add} className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low/40 p-4">
        <p className="mb-3 text-xs font-bold uppercase text-on-surface-variant">Add time window</p>
        <div className="grid gap-3 sm:grid-cols-5">
          <Select label="Mode" value={sch.schedule_mode} onChange={(e) => setSch((s) => ({ ...s, schedule_mode: e.target.value }))}>
            <option value="weekly">Weekly</option>
            <option value="flexible">Flexible</option>
          </Select>
          {mode === "weekly" ? (
            <Select label="Day" value={sch.day_of_week} onChange={(e) => setSch((s) => ({ ...s, day_of_week: Number(e.target.value) }))}>
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </Select>
          ) : (
            <Input type="date" label="Date" value={sch.slot_date} onChange={(e) => setSch((s) => ({ ...s, slot_date: e.target.value }))} required />
          )}
          <Input type="time" label="Start" value={sch.start_time} onChange={(e) => setSch((s) => ({ ...s, start_time: e.target.value }))} required />
          <Input type="time" label="End" value={sch.end_time} onChange={(e) => setSch((s) => ({ ...s, end_time: e.target.value }))} required />
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
