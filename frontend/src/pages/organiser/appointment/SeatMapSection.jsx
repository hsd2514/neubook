import { useMemo, useState } from "react";
import { Grid3X3, Plus, Save, Trash2, Wand2, LayoutGrid, Armchair, UtensilsCrossed, Monitor, MapPin } from "lucide-react";
import { Button } from "../../../components/ui/Button.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { Select } from "../../../components/ui/Select.jsx";
import { api } from "../../../services/api.js";

const TEMPLATES = [
  {
    id: "rows",
    label: "Rows & Columns",
    icon: Armchair,
    desc: "Theater, cinema, classrooms — numbered rows and seats",
    defaults: { rowStart: "A", rowEnd: "F", colStart: 1, colEnd: 10, seat_type: "normal", prefix: "" },
  },
  {
    id: "tables",
    label: "Tables & Chairs",
    icon: UtensilsCrossed,
    desc: "Restaurant, café, co-working — tables with numbered seats",
    defaults: { tableStart: 1, tableEnd: 8, seatsPerTable: 4, seat_type: "normal", prefix: "T" },
  },
  {
    id: "desks",
    label: "Desks / Workstations",
    icon: Monitor,
    desc: "Office, library, lab — individual numbered spots",
    defaults: { deskStart: 1, deskEnd: 20, seat_type: "normal", prefix: "D" },
  },
  {
    id: "zones",
    label: "Zones / Spots",
    icon: MapPin,
    desc: "Events, parking, booths — named zones with numbered spots",
    defaults: { zones: "VIP,General,Balcony", spotsPerZone: 10, seat_type: "normal" },
  },
];

export default function SeatMapSection({ appointmentId, resources, seatBlocks, seats, onRefresh }) {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [blocks, setBlocks] = useState(
    (seatBlocks || []).length
      ? seatBlocks.map((b) => ({ ...b }))
      : [{ name: "Main", seat_class: "standard", color: "#4F46E5", price_override_rupees: "", resource_id: "" }],
  );
  const [newSeats, setNewSeats] = useState([]);
  const [showGenerator, setShowGenerator] = useState(false);
  const [template, setTemplate] = useState("rows");
  const [gen, setGen] = useState({ ...TEMPLATES[0].defaults, block_id: "", resource_id: "" });

  const blockOptions = useMemo(() => seatBlocks || [], [seatBlocks]);
  const tmpl = TEMPLATES.find((t) => t.id === template) || TEMPLATES[0];

  function switchTemplate(id) {
    const t = TEMPLATES.find((x) => x.id === id);
    if (t) {
      setTemplate(id);
      setGen({ ...t.defaults, block_id: gen.block_id, resource_id: gen.resource_id });
    }
  }

  // ── Block helpers ──
  function addBlockRow() {
    setBlocks((prev) => [...prev, { name: "", seat_class: "standard", color: "#4F46E5", price_override_rupees: "", resource_id: "" }]);
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
          price_override_paisa: b.price_override_rupees ? Math.round(Number(b.price_override_rupees) * 100) : (b.price_override_paisa ? Number(b.price_override_paisa) : null),
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

  // ── Generate seats based on template ──
  function generateSeats() {
    const blockId = gen.block_id || blockOptions[0]?.id || "";
    const resId = gen.resource_id || "";
    const generated = [];

    if (template === "rows") {
      const startChar = (gen.rowStart || "A").toUpperCase().charCodeAt(0);
      const endChar = (gen.rowEnd || "A").toUpperCase().charCodeAt(0);
      const colS = Math.max(1, Number(gen.colStart) || 1);
      const colE = Math.max(colS, Number(gen.colEnd) || 1);
      for (let r = startChar; r <= endChar; r++) {
        const rowLabel = String.fromCharCode(r);
        for (let c = colS; c <= colE; c++) {
          generated.push({
            block_id: blockId,
            label: `${gen.prefix || ""}${rowLabel}${c}`,
            row_label: rowLabel,
            col_number: c,
            seat_type: gen.seat_type || "normal",
            resource_id: resId,
          });
        }
      }
    } else if (template === "tables") {
      const tS = Math.max(1, Number(gen.tableStart) || 1);
      const tE = Math.max(tS, Number(gen.tableEnd) || 1);
      const spt = Math.max(1, Number(gen.seatsPerTable) || 4);
      for (let t = tS; t <= tE; t++) {
        for (let s = 1; s <= spt; s++) {
          generated.push({
            block_id: blockId,
            label: `${gen.prefix || "T"}${t}-S${s}`,
            row_label: `${gen.prefix || "T"}${t}`,
            col_number: s,
            seat_type: gen.seat_type || "normal",
            resource_id: resId,
          });
        }
      }
    } else if (template === "desks") {
      const dS = Math.max(1, Number(gen.deskStart) || 1);
      const dE = Math.max(dS, Number(gen.deskEnd) || 1);
      for (let d = dS; d <= dE; d++) {
        generated.push({
          block_id: blockId,
          label: `${gen.prefix || "D"}${d}`,
          row_label: "Desk",
          col_number: d,
          seat_type: gen.seat_type || "normal",
          resource_id: resId,
        });
      }
    } else if (template === "zones") {
      const zoneNames = (gen.zones || "Zone 1").split(",").map((z) => z.trim()).filter(Boolean);
      const sPerZone = Math.max(1, Number(gen.spotsPerZone) || 5);
      for (const zone of zoneNames) {
        for (let s = 1; s <= sPerZone; s++) {
          generated.push({
            block_id: blockId,
            label: `${zone}-${s}`,
            row_label: zone,
            col_number: s,
            seat_type: gen.seat_type || "normal",
            resource_id: resId,
          });
        }
      }
    }

    setNewSeats((prev) => [...prev, ...generated]);
    setShowGenerator(false);
  }

  const generatedCount = useMemo(() => {
    if (template === "rows") {
      const s = (gen.rowStart || "A").toUpperCase().charCodeAt(0);
      const e = (gen.rowEnd || "A").toUpperCase().charCodeAt(0);
      const cs = Math.max(1, Number(gen.colStart) || 1);
      const ce = Math.max(cs, Number(gen.colEnd) || 1);
      return Math.max(0, e - s + 1) * Math.max(0, ce - cs + 1);
    }
    if (template === "tables") {
      return Math.max(0, (Number(gen.tableEnd) || 1) - (Number(gen.tableStart) || 1) + 1) * Math.max(1, Number(gen.seatsPerTable) || 4);
    }
    if (template === "desks") {
      return Math.max(0, (Number(gen.deskEnd) || 1) - (Number(gen.deskStart) || 1) + 1);
    }
    if (template === "zones") {
      const z = (gen.zones || "").split(",").filter((x) => x.trim()).length;
      return z * Math.max(1, Number(gen.spotsPerZone) || 5);
    }
    return 0;
  }, [template, gen]);

  // ── Seat helpers ──
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
      await api(`/api/appointments/mine/${appointmentId}/seats/append`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await onRefresh();
      setNewSeats([]);
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

      {/* ── Sections / Blocks ── */}
      <div className="rounded-lg border border-outline-variant bg-surface-container-low/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-on-surface-variant">Sections / Blocks</p>
            <p className="text-xs text-on-surface-variant">Group your spots into sections (e.g. "VIP Area", "Ground Floor", "Table Zone")</p>
          </div>
          <Button type="button" variant="ghost" onClick={addBlockRow}><Plus size={14} className="mr-1" /> Add section</Button>
        </div>
        <div className="space-y-2">
          {blocks.map((b, idx) => (
            <div key={`block-${idx}`} className="grid gap-2 sm:grid-cols-6">
              <Input label="Name" value={b.name || ""} onChange={(e) => updateBlock(idx, "name", e.target.value)} placeholder="e.g. VIP Area" />
              <Select label="Class" value={b.seat_class || "standard"} onChange={(e) => updateBlock(idx, "seat_class", e.target.value)}>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="vip">VIP</option>
              </Select>
              <Input label="Color" type="color" value={b.color || "#4F46E5"} onChange={(e) => updateBlock(idx, "color", e.target.value)} />
              <Input label="Price override (₹)" type="number" value={b.price_override_rupees ?? (b.price_override_paisa ? (b.price_override_paisa / 100) : "")} onChange={(e) => updateBlock(idx, "price_override_rupees", e.target.value)} />
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
        <Button type="button" className="mt-3" onClick={saveBlocks} disabled={busy}><Save size={14} className="mr-1" /> Save sections</Button>
      </div>

      {/* ── Add spots: templates + manual ── */}
      <div className="rounded-lg border border-outline-variant bg-surface-container-low/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-on-surface-variant">Add spots</p>
            <p className="text-xs text-on-surface-variant">Add bookable spots — seats, tables, desks, zones, or anything</p>
          </div>
          <div className="flex gap-1">
            <Button type="button" variant="ghost" onClick={() => setShowGenerator(!showGenerator)}>
              <Wand2 size={14} className="mr-1" /> Quick generate
            </Button>
            <Button type="button" variant="ghost" onClick={addSeatRow}>
              <Plus size={14} className="mr-1" /> Add one
            </Button>
          </div>
        </div>

        {/* ── Template picker + generator ── */}
        {showGenerator && (
          <div className="mb-4 rounded-lg border border-primary-container/30 bg-primary-container/5 p-4">
            <p className="mb-3 text-sm font-semibold text-on-surface">Choose a layout template</p>

            <div className="mb-4 grid gap-2 sm:grid-cols-4">
              {TEMPLATES.map((t) => {
                const Icon = t.icon;
                const active = template === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => switchTemplate(t.id)}
                    className={`rounded-lg border p-3 text-left transition ${
                      active
                        ? "border-primary-container bg-primary-container/10"
                        : "border-outline-variant hover:border-primary-container/50"
                    }`}
                  >
                    <Icon size={18} className={active ? "text-primary-container" : "text-on-surface-variant"} />
                    <p className={`mt-1.5 text-xs font-semibold ${active ? "text-primary-container" : "text-on-surface"}`}>{t.label}</p>
                    <p className="mt-0.5 text-[10px] text-on-surface-variant">{t.desc}</p>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-2 sm:grid-cols-4">
              <Select label="Section" value={gen.block_id || blockOptions[0]?.id || ""} onChange={(e) => setGen((g) => ({ ...g, block_id: e.target.value }))}>
                <option value="">Select section</option>
                {blockOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>

              {template === "rows" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Row from" value={gen.rowStart} maxLength={1} onChange={(e) => setGen((g) => ({ ...g, rowStart: e.target.value.toUpperCase().slice(0, 1) }))} />
                    <Input label="Row to" value={gen.rowEnd} maxLength={1} onChange={(e) => setGen((g) => ({ ...g, rowEnd: e.target.value.toUpperCase().slice(0, 1) }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Col from" type="number" min={1} value={gen.colStart} onChange={(e) => setGen((g) => ({ ...g, colStart: Number(e.target.value) }))} />
                    <Input label="Col to" type="number" min={1} value={gen.colEnd} onChange={(e) => setGen((g) => ({ ...g, colEnd: Number(e.target.value) }))} />
                  </div>
                </>
              )}

              {template === "tables" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Table from" type="number" min={1} value={gen.tableStart} onChange={(e) => setGen((g) => ({ ...g, tableStart: Number(e.target.value) }))} />
                    <Input label="Table to" type="number" min={1} value={gen.tableEnd} onChange={(e) => setGen((g) => ({ ...g, tableEnd: Number(e.target.value) }))} />
                  </div>
                  <Input label="Seats per table" type="number" min={1} value={gen.seatsPerTable} onChange={(e) => setGen((g) => ({ ...g, seatsPerTable: Number(e.target.value) }))} />
                </>
              )}

              {template === "desks" && (
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Desk from" type="number" min={1} value={gen.deskStart} onChange={(e) => setGen((g) => ({ ...g, deskStart: Number(e.target.value) }))} />
                  <Input label="Desk to" type="number" min={1} value={gen.deskEnd} onChange={(e) => setGen((g) => ({ ...g, deskEnd: Number(e.target.value) }))} />
                </div>
              )}

              {template === "zones" && (
                <>
                  <Input label="Zone names (comma-separated)" value={gen.zones} onChange={(e) => setGen((g) => ({ ...g, zones: e.target.value }))} placeholder="VIP, General, Balcony" className="sm:col-span-2" />
                  <Input label="Spots per zone" type="number" min={1} value={gen.spotsPerZone} onChange={(e) => setGen((g) => ({ ...g, spotsPerZone: Number(e.target.value) }))} />
                </>
              )}

              <Select label="Spot type" value={gen.seat_type} onChange={(e) => setGen((g) => ({ ...g, seat_type: e.target.value }))}>
                <option value="normal">Normal</option>
                <option value="wheelchair">Wheelchair</option>
                <option value="couple">Couple</option>
                <option value="recliner">Recliner</option>
                <option value="standing">Standing</option>
                <option value="booth">Booth</option>
              </Select>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <Button type="button" onClick={generateSeats} disabled={!gen.block_id && !blockOptions.length}>
                <Wand2 size={14} className="mr-1" />
                Generate {generatedCount} spot{generatedCount !== 1 ? "s" : ""}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowGenerator(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* ── Staged new seats ── */}
        {newSeats.length > 0 && (
          <>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-on-surface-variant">{newSeats.length} spot{newSeats.length !== 1 ? "s" : ""} ready to save (will be added to existing)</p>
              <Button type="button" variant="ghost" className="text-xs text-error" onClick={() => setNewSeats([])}>Clear all</Button>
            </div>
            <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest p-2">
              {newSeats.map((s, idx) => (
                <div key={`seat-input-${idx}`} className="grid gap-1.5 sm:grid-cols-7 items-end">
                  <Select value={s.block_id || ""} onChange={(e) => updateSeat(idx, "block_id", e.target.value)}>
                    <option value="">Section</option>
                    {blockOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </Select>
                  <Input value={s.label || ""} onChange={(e) => updateSeat(idx, "label", e.target.value)} placeholder="Label" />
                  <Input value={s.row_label || ""} onChange={(e) => updateSeat(idx, "row_label", e.target.value)} placeholder="Group" />
                  <Input type="number" value={s.col_number || ""} onChange={(e) => updateSeat(idx, "col_number", e.target.value)} placeholder="#" />
                  <Select value={s.seat_type || "normal"} onChange={(e) => updateSeat(idx, "seat_type", e.target.value)}>
                    <option value="normal">Normal</option>
                    <option value="wheelchair">Wheelchair</option>
                    <option value="couple">Couple</option>
                    <option value="recliner">Recliner</option>
                    <option value="standing">Standing</option>
                    <option value="booth">Booth</option>
                  </Select>
                  <Select value={s.resource_id || ""} onChange={(e) => updateSeat(idx, "resource_id", e.target.value)}>
                    <option value="">All</option>
                    {resources?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </Select>
                  <div className="flex items-center justify-center">
                    <button type="button" className="rounded p-1 text-on-surface-variant hover:text-error transition" onClick={() => removeSeatRow(idx)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" className="mt-3" onClick={saveSeats} disabled={busy}>
              <Save size={14} className="mr-1" /> Save {newSeats.length} spot{newSeats.length !== 1 ? "s" : ""}
            </Button>
          </>
        )}

        {newSeats.length === 0 && !showGenerator && (
          <p className="py-4 text-center text-sm text-on-surface-variant">
            Use <b>Quick generate</b> to create spots from a template, or <b>Add one</b> to add individual spots.
          </p>
        )}
      </div>

      {/* ── Existing spots ── */}
      {(seats || []).length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-on-surface-variant">
            {seats.length} spot{seats.length !== 1 ? "s" : ""} saved
          </p>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-outline-variant">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-outline-variant bg-surface-container-low">
                <tr>
                  <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">Label</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">Group</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">#</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">Section</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant">Type</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase text-on-surface-variant" />
                </tr>
              </thead>
              <tbody>
                {seats.map((s) => {
                  const block = (seatBlocks || []).find((b) => b.id === s.block_id);
                  return (
                    <tr key={s.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low/50">
                      <td className="px-3 py-1.5 font-medium">{s.label}</td>
                      <td className="px-3 py-1.5 text-on-surface-variant">{s.row_label || "—"}</td>
                      <td className="px-3 py-1.5 text-on-surface-variant">{s.col_number ?? "—"}</td>
                      <td className="px-3 py-1.5">
                        <span className="inline-flex items-center gap-1">
                          {block?.color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: block.color }} />}
                          {block?.name || s.block_id}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 capitalize">{s.seat_type}</td>
                      <td className="px-3 py-1.5">
                        <button type="button" className="rounded p-1 text-on-surface-variant hover:text-error transition" onClick={() => deleteSeat(s.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
