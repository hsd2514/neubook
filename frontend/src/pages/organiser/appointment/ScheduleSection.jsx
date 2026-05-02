import { useState } from "react";
import { CalendarPlus, Plus, Trash2, Wand2, Ban } from "lucide-react";
import { Input } from "../../../components/ui/Input.jsx";
import { Select } from "../../../components/ui/Select.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { api } from "../../../services/api.js";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ScheduleSection({ appointmentId, slotSchedule, schedules, blockedSlots, resources, onRefresh }) {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sch, setSch] = useState({
    schedule_mode: slotSchedule || "weekly",
    selectedDays: [0],
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

  // ── Schedule presets ──
  async function applyPreset(preset) {
    setErr("");
    setBusy(true);
    try {
      let entries = [];
      if (preset === "weekdays") {
        entries = [0, 1, 2, 3, 4].map((d) => ({
          schedule_mode: "weekly",
          day_of_week: d,
          slot_date: null,
          start_time: "09:00",
          end_time: "17:00",
          resource_id: sch.resource_id || null,
        }));
      } else if (preset === "fullweek") {
        entries = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
          schedule_mode: "weekly",
          day_of_week: d,
          slot_date: null,
          start_time: "09:00",
          end_time: "17:00",
          resource_id: sch.resource_id || null,
        }));
      } else if (preset === "mornings") {
        entries = [0, 1, 2, 3, 4].map((d) => ({
          schedule_mode: "weekly",
          day_of_week: d,
          slot_date: null,
          start_time: "09:00",
          end_time: "13:00",
          resource_id: sch.resource_id || null,
        }));
      } else if (preset === "evenings") {
        entries = [0, 1, 2, 3, 4].map((d) => ({
          schedule_mode: "weekly",
          day_of_week: d,
          slot_date: null,
          start_time: "17:00",
          end_time: "21:00",
          resource_id: sch.resource_id || null,
        }));
      }
      for (const entry of entries) {
        await api(`/api/appointments/mine/${appointmentId}/schedules`, {
          method: "POST",
          body: JSON.stringify(entry),
        });
      }
      await onRefresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  function toggleDay(dayIdx) {
    setSch((prev) => {
      const selected = prev.selectedDays.includes(dayIdx)
        ? prev.selectedDays.filter((d) => d !== dayIdx)
        : [...prev.selectedDays, dayIdx].sort();
      return { ...prev, selectedDays: selected.length ? selected : [dayIdx] };
    });
  }

  async function addSchedule(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (sch.schedule_mode === "weekly") {
        for (const day of sch.selectedDays) {
          await api(`/api/appointments/mine/${appointmentId}/schedules`, {
            method: "POST",
            body: JSON.stringify({
              schedule_mode: "weekly",
              resource_id: sch.resource_id || null,
              start_time: sch.start_time,
              end_time: sch.end_time,
              day_of_week: day,
              slot_date: null,
            }),
          });
        }
      } else {
        await api(`/api/appointments/mine/${appointmentId}/schedules`, {
          method: "POST",
          body: JSON.stringify({
            schedule_mode: "flexible",
            resource_id: sch.resource_id || null,
            start_time: sch.start_time,
            end_time: sch.end_time,
            day_of_week: null,
            slot_date: sch.slot_date || null,
          }),
        });
      }
      await onRefresh();
      setSch((prev) => ({ ...prev, slot_date: "", selectedDays: [0] }));
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  // ── Blocked slot presets ──
  async function blockPreset(preset) {
    setErr("");
    setBusy(true);
    try {
      const today = new Date();
      const iso = (d) => d.toISOString().slice(0, 10);

      let entries = [];
      if (preset === "this_week") {
        const dow = today.getDay();
        const monOffset = dow === 0 ? -6 : 1 - dow;
        const monday = new Date(today);
        monday.setDate(today.getDate() + monOffset);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        entries = [{
          block_type: "one_off",
          resource_id: block.resource_id || null,
          start_date: iso(monday),
          end_date: iso(sunday),
          day_of_week: null,
          start_time: null,
          end_time: null,
        }];
      } else if (preset === "next_week") {
        const dow = today.getDay();
        const monOffset = dow === 0 ? 1 : 8 - dow;
        const nextMon = new Date(today);
        nextMon.setDate(today.getDate() + monOffset);
        const nextSun = new Date(nextMon);
        nextSun.setDate(nextMon.getDate() + 6);
        entries = [{
          block_type: "one_off",
          resource_id: block.resource_id || null,
          start_date: iso(nextMon),
          end_date: iso(nextSun),
          day_of_week: null,
          start_time: null,
          end_time: null,
        }];
      } else if (preset === "weekends") {
        const start = new Date(today);
        const end = new Date(today);
        end.setMonth(end.getMonth() + 3);
        entries = [5, 6].map((dow) => ({
          block_type: "recurring",
          resource_id: block.resource_id || null,
          start_date: iso(start),
          end_date: iso(end),
          day_of_week: dow,
          start_time: null,
          end_time: null,
        }));
      }
      if (entries.length) {
        await api(`/api/appointments/mine/${appointmentId}/blocked-slots/bulk`, {
          method: "POST",
          body: JSON.stringify(entries),
        });
        await onRefresh();
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
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
    setErr("");
    setBusy(true);
    try {
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
      await onRefresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeBlocked(id) {
    setErr("");
    try {
      await api(`/api/appointments/mine/${appointmentId}/blocked-slots/${id}`, { method: "DELETE" });
      await onRefresh();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function removeSchedule(id) {
    setErr("");
    try {
      await api(`/api/appointments/mine/${appointmentId}/schedules/${id}`, { method: "DELETE" });
      await onRefresh();
    } catch (e) {
      setErr(e.message);
    }
  }

  const mode = sch.schedule_mode;

  return (
    <div className="space-y-5">
      {err && <p className="rounded-lg bg-error-container/30 px-3 py-2 text-sm text-error">{err}</p>}

      {/* ── Existing schedules ── */}
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
                <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant" />
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => {
                const resName = resources?.find((r) => r.id === s.resource_id)?.name;
                return (
                  <tr key={s.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low/50">
                    <td className="px-3 py-2 font-medium capitalize">{s.schedule_mode || "weekly"}</td>
                    <td className="px-3 py-2 font-medium">
                      {s.schedule_mode === "flexible"
                        ? (s.slot_date || "—")
                        : (s.day_of_week != null ? SHORT[s.day_of_week] : "—")}
                    </td>
                    <td className="px-3 py-2">{s.start_time}</td>
                    <td className="px-3 py-2">{s.end_time}</td>
                    <td className="px-3 py-2 text-on-surface-variant">{resName || (s.resource_id ? `#${s.resource_id}` : "All")}</td>
                    <td className="px-3 py-2">
                      <button type="button" className="rounded p-1 text-on-surface-variant hover:text-error transition" onClick={() => removeSchedule(s.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Quick fill presets ── */}
      <div className="rounded-lg border border-primary-container/30 bg-primary-container/5 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Wand2 size={16} className="text-primary-container" />
          <p className="text-sm font-semibold text-on-surface">Quick-fill schedule</p>
        </div>
        <p className="mb-3 text-xs text-on-surface-variant">
          One click to add common schedules. Select a resource first if needed.
        </p>
        <div className="mb-3">
          <Select label="Resource (optional)" value={sch.resource_id || ""} onChange={(e) => setSch((s) => ({ ...s, resource_id: e.target.value ? Number(e.target.value) : null }))}>
            <option value="">All / type-level</option>
            {resources?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={busy} onClick={() => applyPreset("weekdays")}>
            Mon–Fri 9am–5pm
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => applyPreset("fullweek")}>
            All 7 days 9am–5pm
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => applyPreset("mornings")}>
            Weekday mornings 9am–1pm
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => applyPreset("evenings")}>
            Weekday evenings 5pm–9pm
          </Button>
        </div>
      </div>

      {/* ── Add custom time window ── */}
      <form onSubmit={addSchedule} className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low/40 p-4">
        <div className="mb-3 flex items-center gap-2">
          <CalendarPlus size={16} className="text-on-surface-variant" />
          <p className="text-xs font-bold uppercase text-on-surface-variant">Add custom time window</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Select label="Mode" value={sch.schedule_mode} onChange={(e) => setSch((s) => ({ ...s, schedule_mode: e.target.value }))}>
            <option value="weekly">Weekly</option>
            <option value="flexible">Flexible (specific date)</option>
          </Select>
          <Input type="time" label="Start time" value={sch.start_time} onChange={(e) => setSch((s) => ({ ...s, start_time: e.target.value }))} required />
          <Input type="time" label="End time" value={sch.end_time} onChange={(e) => setSch((s) => ({ ...s, end_time: e.target.value }))} required />
          <Select label="Resource" value={sch.resource_id || ""} onChange={(e) => setSch((s) => ({ ...s, resource_id: e.target.value ? Number(e.target.value) : null }))}>
            <option value="">All / type-level</option>
            {resources?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </div>

        {mode === "weekly" ? (
          <div className="mt-3">
            <p className="mb-2 text-xs font-semibold text-on-surface-variant">Select day(s):</p>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d, i) => {
                const active = sch.selectedDays.includes(i);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? "border-primary-container bg-primary-container/15 text-primary-container"
                        : "border-outline-variant text-on-surface-variant hover:border-primary-container/50"
                    }`}
                  >
                    {SHORT[i]}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <Input type="date" label="Specific date" value={sch.slot_date} onChange={(e) => setSch((s) => ({ ...s, slot_date: e.target.value }))} required />
          </div>
        )}

        <Button type="submit" className="mt-3 gap-1" disabled={busy}>
          <Plus size={16} />
          Add {mode === "weekly" && sch.selectedDays.length > 1 ? `${sch.selectedDays.length} slots` : "slot"}
        </Button>
      </form>

      {/* ── Blocked slots ── */}
      <div className="space-y-3">
        <div className="rounded-lg border border-error/20 bg-error/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Ban size={16} className="text-error" />
            <p className="text-sm font-semibold text-on-surface">Block time slots</p>
          </div>
          <p className="mb-3 text-xs text-on-surface-variant">
            Quick block common periods, or use the custom form below.
          </p>
          <div className="mb-3">
            <Select label="Resource (optional)" value={block.resource_id || ""} onChange={(e) => setBlock((b) => ({ ...b, resource_id: e.target.value ? Number(e.target.value) : null }))}>
              <option value="">All / type-level</option>
              {resources?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="danger" className="text-xs" disabled={busy} onClick={() => blockPreset("this_week")}>Block this week</Button>
            <Button type="button" variant="danger" className="text-xs" disabled={busy} onClick={() => blockPreset("next_week")}>Block next week</Button>
            <Button type="button" variant="danger" className="text-xs" disabled={busy} onClick={() => blockPreset("weekends")}>Block weekends (3 months)</Button>
          </div>
        </div>

        <form onSubmit={addBlockedBulk} className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low/40 p-4">
          <p className="mb-3 text-xs font-bold uppercase text-on-surface-variant">Custom block</p>
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
            <Select label="Resource" value={block.resource_id || ""} onChange={(e) => setBlock((prev) => ({ ...prev, resource_id: e.target.value ? Number(e.target.value) : null }))}>
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
              <div key={`block-range-${idx}`} className="grid gap-2 sm:grid-cols-5">
                <Input type="date" label={`Start date`} value={row.start_date} onChange={(e) => updateRangeRow(idx, "start_date", e.target.value)} required />
                <Input type="date" label={`End date`} value={row.end_date} onChange={(e) => updateRangeRow(idx, "end_date", e.target.value)} required />
                <div className="flex items-end">
                  <button type="button" className="rounded p-2 text-on-surface-variant hover:text-error transition" onClick={() => removeRangeRow(idx)} disabled={blockRows.length === 1}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={addRangeRow}>+ Add date range</Button>
            <Button type="submit" className="gap-1" disabled={busy}><Plus size={16} /> Save blocks</Button>
          </div>
        </form>
      </div>

      {/* ── Existing blocked slots ── */}
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
                <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant" />
              </tr>
            </thead>
            <tbody>
              {blockedSlots.map((b) => {
                const resName = resources?.find((r) => r.id === b.resource_id)?.name;
                return (
                  <tr key={b.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low/50">
                    <td className="px-3 py-2 font-medium capitalize">{(b.block_type || "one_off").replace("_", " ")}</td>
                    <td className="px-3 py-2">{b.start_date} → {b.end_date}</td>
                    <td className="px-3 py-2">{b.day_of_week != null ? SHORT[b.day_of_week] : "—"}</td>
                    <td className="px-3 py-2">{b.start_time && b.end_time ? `${b.start_time}–${b.end_time}` : "All day"}</td>
                    <td className="px-3 py-2 text-on-surface-variant">{resName || (b.resource_id ? `#${b.resource_id}` : "All")}</td>
                    <td className="px-3 py-2">
                      <button type="button" className="rounded p-1 text-on-surface-variant hover:text-error transition" onClick={() => removeBlocked(b.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
