import { useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/Button.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { Select } from "../../../components/ui/Select.jsx";
import { api } from "../../../services/api.js";

export default function SeatMapSection({ appointmentId, resources, seatBlocks, seats, onRefresh }) {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [blocks, setBlocks] = useState(
    (seatBlocks || []).length
      ? seatBlocks.map((b) => ({ ...b }))
      : [{ name: "Main", seat_class: "standard", color: "#4F46E5", price_override_paisa: "", resource_id: "" }],
  );
  const [newSeats, setNewSeats] = useState([{ block_id: "", label: "A1", row_label: "A", col_number: 1, seat_type: "normal", resource_id: "" }]);

  const blockOptions = useMemo(() => seatBlocks || [], [seatBlocks]);

  function addBlockRow() {
    setBlocks((prev) => [...prev, { name: "", seat_class: "standard", color: "#4F46E5", price_override_paisa: "", resource_id: "" }]);
  }

  function updateBlock(idx, key, value) {
    setBlocks((prev) => prev.map((b, i) => (i === idx ? { ...b, [key]: value } : b)));
  }

  function removeBlock(idx) {
    setBlocks((prev) => prev.filter((_, i) => i !== idx));
  }

  async function saveBlocks() {
    setErr("");
    setBusy(true);
    try {
      const payload = blocks
        .filter((b) => b.name?.trim())
        .map((b) => ({
          name: b.name.trim(),
          seat_class: b.seat_class || "standard",
          color: b.color || null,
          price_override_paisa: b.price_override_paisa ? Number(b.price_override_paisa) : null,
          resource_id: b.resource_id ? Number(b.resource_id) : null,
          x: Number(b.x || 0),
          y: Number(b.y || 0),
          width: Number(b.width || 1),
          height: Number(b.height || 1),
        }));
      await api(`/api/appointments/mine/${appointmentId}/seat-blocks/bulk`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await onRefresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  function addSeatRow() {
    const fallbackBlock = blockOptions[0]?.id || "";
    setNewSeats((prev) => [...prev, { block_id: fallbackBlock, label: "", row_label: "", col_number: "", seat_type: "normal", resource_id: "" }]);
  }

  function updateSeat(idx, key, value) {
    setNewSeats((prev) => prev.map((s, i) => (i === idx ? { ...s, [key]: value } : s)));
  }

  function removeSeatRow(idx) {
    setNewSeats((prev) => prev.filter((_, i) => i !== idx));
  }

  async function saveSeats() {
    setErr("");
    setBusy(true);
    try {
      const payload = newSeats
        .filter((s) => s.block_id && s.label?.trim())
        .map((s, index) => ({
          block_id: Number(s.block_id),
          label: s.label.trim(),
          row_label: s.row_label || null,
          col_number: s.col_number ? Number(s.col_number) : null,
          seat_type: s.seat_type || "normal",
          status: "active",
          resource_id: s.resource_id ? Number(s.resource_id) : null,
          x: index,
          y: 0,
        }));
      await api(`/api/appointments/mine/${appointmentId}/seats/bulk`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await onRefresh();
      setNewSeats([{ block_id: blockOptions[0]?.id || "", label: "", row_label: "", col_number: "", seat_type: "normal", resource_id: "" }]);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteSeat(seatId) {
    setErr("");
    try {
      await api(`/api/appointments/mine/${appointmentId}/seats/${seatId}`, { method: "DELETE" });
      await onRefresh();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="space-y-5">
      {err && <p className="rounded-lg bg-error-container/30 px-3 py-2 text-sm text-error">{err}</p>}

      <div className="rounded-lg border border-outline-variant bg-surface-container-low/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase text-on-surface-variant">Seat blocks</p>
          <Button type="button" variant="ghost" onClick={addBlockRow}><Plus size={14} className="mr-1" /> Add block</Button>
        </div>
        <div className="space-y-2">
          {blocks.map((b, idx) => (
            <div key={`block-${idx}`} className="grid gap-2 sm:grid-cols-6">
              <Input label="Name" value={b.name || ""} onChange={(e) => updateBlock(idx, "name", e.target.value)} />
              <Select label="Class" value={b.seat_class || "standard"} onChange={(e) => updateBlock(idx, "seat_class", e.target.value)}>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="vip">VIP</option>
              </Select>
              <Input label="Color" value={b.color || ""} onChange={(e) => updateBlock(idx, "color", e.target.value)} />
              <Input label="Price override (paisa)" type="number" value={b.price_override_paisa || ""} onChange={(e) => updateBlock(idx, "price_override_paisa", e.target.value)} />
              <Select label="Resource" value={b.resource_id || ""} onChange={(e) => updateBlock(idx, "resource_id", e.target.value)}>
                <option value="">All</option>
                {resources?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
              <div className="flex items-end">
                <Button type="button" variant="ghost" className="h-10" onClick={() => removeBlock(idx)}><Trash2 size={14} /></Button>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" className="mt-3" onClick={saveBlocks} disabled={busy}><Save size={14} className="mr-1" /> Save blocks</Button>
      </div>

      <div className="rounded-lg border border-outline-variant bg-surface-container-low/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase text-on-surface-variant">Seats</p>
          <Button type="button" variant="ghost" onClick={addSeatRow}><Plus size={14} className="mr-1" /> Add seat row</Button>
        </div>
        <div className="space-y-2">
          {newSeats.map((s, idx) => (
            <div key={`seat-input-${idx}`} className="grid gap-2 sm:grid-cols-7">
              <Select label="Block" value={s.block_id || ""} onChange={(e) => updateSeat(idx, "block_id", e.target.value)}>
                <option value="">Select block</option>
                {blockOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
              <Input label="Seat label" value={s.label || ""} onChange={(e) => updateSeat(idx, "label", e.target.value)} />
              <Input label="Row" value={s.row_label || ""} onChange={(e) => updateSeat(idx, "row_label", e.target.value)} />
              <Input label="Column" type="number" value={s.col_number || ""} onChange={(e) => updateSeat(idx, "col_number", e.target.value)} />
              <Select label="Type" value={s.seat_type || "normal"} onChange={(e) => updateSeat(idx, "seat_type", e.target.value)}>
                <option value="normal">Normal</option>
                <option value="wheelchair">Wheelchair</option>
                <option value="couple">Couple</option>
                <option value="recliner">Recliner</option>
              </Select>
              <Select label="Resource" value={s.resource_id || ""} onChange={(e) => updateSeat(idx, "resource_id", e.target.value)}>
                <option value="">All</option>
                {resources?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
              <div className="flex items-end">
                <Button type="button" variant="ghost" className="h-10" onClick={() => removeSeatRow(idx)}><Trash2 size={14} /></Button>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" className="mt-3" onClick={saveSeats} disabled={busy}><Save size={14} className="mr-1" /> Save seats</Button>
      </div>

      {(seats || []).length > 0 && (
        <div className="overflow-hidden rounded-lg border border-outline-variant">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-outline-variant bg-surface-container-low">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">Seat</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">Block</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">Type</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">Action</th>
              </tr>
            </thead>
            <tbody>
              {seats.map((s) => {
                const block = (seatBlocks || []).find((b) => b.id === s.block_id);
                return (
                  <tr key={s.id} className="border-b border-outline-variant last:border-0">
                    <td className="px-3 py-2 font-medium">{s.label}</td>
                    <td className="px-3 py-2">{block?.name || s.block_id}</td>
                    <td className="px-3 py-2 capitalize">{s.seat_type}</td>
                    <td className="px-3 py-2">
                      <Button type="button" variant="ghost" className="p-2" onClick={() => deleteSeat(s.id)}>
                        <Trash2 size={14} />
                      </Button>
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
