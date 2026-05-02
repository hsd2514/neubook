import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "../../../components/ui/Input.jsx";
import { Select } from "../../../components/ui/Select.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { api } from "../../../services/api.js";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ScheduleSection({ appointmentId, slotSchedule, schedules, blockedSlots, resources, onRefresh }) {
  const [sch, setSch] = useState({
    schedule_mode: slotSchedule || "weekly",
    day_of_week: 0,
    slot_date: "",
    start_time: "09:00",
    end_time: "17:00",
    resource_id: null,
  });
  const [blockRows, setBlockRows] = useState([{ start_date: "", end_date: "" }]);
  const [block, setBlock] = useState({
    block_type: "one_off",
    day_of_week: 0,
    all_day: true,
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

  function addRangeRow() {
    setBlockRows((rows) => [...rows, { start_date: "", end_date: "" }]);
  }

  function removeRangeRow(index) {
    setBlockRows((rows) => rows.filter((_, i) => i !== index));
  }

  function updateRangeRow(index, key, value) {
    setBlockRows((rows) => rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  }

  async function addBlockedBulk(e) {
    e.preventDefault();
    const payload = blockRows
      .filter((r) => r.start_date && r.end_date)
      .map((r) => ({
        block_type: block.block_type,
        resource_id: block.resource_id || null,
        start_date: r.start_date,
        end_date: r.end_date,
        day_of_week: block.block_type === "recurring" ? Number(block.day_of_week) : null,
        start_time: block.all_day ? null : block.start_time,
        end_time: block.all_day ? null : block.end_time,
      }));
    if (!payload.length) return;
    await api(`/api/appointments/mine/${appointmentId}/blocked-slots/bulk`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setBlockRows([{ start_date: "", end_date: "" }]);
    onRefresh();
  }

  async function removeBlocked(id) {
    await api(`/api/appointments/mine/${appointmentId}/blocked-slots/${id}`, { method: "DELETE" });
    onRefresh();
  }

  async function removeSchedule(id) {
    await api(`/api/appointments/mine/${appointmentId}/schedules/${id}`, { method: "DELETE" });
    onRefresh();
  }

  const mode = sch.schedule_mode;

  return (
    <div className="space-y-4">
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

      <form onSubmit={addBlockedBulk} className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low/40 p-4">
        <p className="mb-3 text-xs font-bold uppercase text-on-surface-variant">Bulk block slots</p>
        <div className="grid gap-3 sm:grid-cols-5">
          <Select label="Type" value={block.block_type} onChange={(e) => setBlock((prev) => ({ ...prev, block_type: e.target.value }))}>
            <option value="one_off">One-off range</option>
            <option value="recurring">Recurring</option>
            <option value="holiday">Holiday / off-day</option>
          </Select>
          {block.block_type === "recurring" ? (
            <Select label="Recurring day" value={block.day_of_week} onChange={(e) => setBlock((prev) => ({ ...prev, day_of_week: Number(e.target.value) }))}>
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </Select>
          ) : <div />}
          <Select label="Scope" value={block.resource_id || ""} onChange={(e) => setBlock((prev) => ({ ...prev, resource_id: e.target.value ? Number(e.target.value) : null }))}>
            <option value="">All / type-level</option>
            {resources?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
          <Select label="Window" value={block.all_day ? "all_day" : "partial"} onChange={(e) => setBlock((prev) => ({ ...prev, all_day: e.target.value === "all_day" }))}>
            <option value="all_day">All day</option>
            <option value="partial">Specific time</option>
          </Select>
          {!block.all_day ? (
            <div className="grid grid-cols-2 gap-2">
              <Input type="time" label="Start" value={block.start_time} onChange={(e) => setBlock((prev) => ({ ...prev, start_time: e.target.value }))} required />
              <Input type="time" label="End" value={block.end_time} onChange={(e) => setBlock((prev) => ({ ...prev, end_time: e.target.value }))} required />
            </div>
          ) : <div />}
        </div>
        <div className="mt-3 space-y-2">
          {blockRows.map((row, idx) => (
            <div key={`${idx}-${row.start_date}-${row.end_date}`} className="grid gap-2 sm:grid-cols-5">
              <Input type="date" label={`Start date ${idx + 1}`} value={row.start_date} onChange={(e) => updateRangeRow(idx, "start_date", e.target.value)} required />
              <Input type="date" label={`End date ${idx + 1}`} value={row.end_date} onChange={(e) => updateRangeRow(idx, "end_date", e.target.value)} required />
              <div className="flex items-end">
                <Button type="button" variant="ghost" className="h-10" onClick={() => removeRangeRow(idx)} disabled={blockRows.length === 1}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={addRangeRow}>Add range</Button>
          <Button type="submit" className="gap-1"><Plus size={16} /> Save bulk block</Button>
        </div>
      </form>

      {blockedSlots?.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-outline-variant">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-outline-variant bg-surface-container-low">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">Type</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">Range</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">Day</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">Time</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">Resource</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">Action</th>
              </tr>
            </thead>
            <tbody>
              {blockedSlots.map((b) => (
                <tr key={b.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low/50">
                  <td className="px-3 py-2 font-medium capitalize">{(b.block_type || "one_off").replace("_", " ")}</td>
                  <td className="px-3 py-2">{b.start_date} → {b.end_date}</td>
                  <td className="px-3 py-2">{b.day_of_week != null ? SHORT[b.day_of_week] : "-"}</td>
                  <td className="px-3 py-2">{b.start_time && b.end_time ? `${b.start_time}-${b.end_time}` : "All day"}</td>
                  <td className="px-3 py-2 text-on-surface-variant">{b.resource_id ? `#${b.resource_id}` : "All"}</td>
                  <td className="px-3 py-2">
                    <Button variant="ghost" className="p-2" onClick={() => removeBlocked(b.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
