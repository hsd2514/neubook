import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Modal } from "../../components/ui/Modal.jsx";
import { ProviderNotesPanel } from "../../components/provider/ProviderNotesPanel.jsx";
import { CustomerTags } from "../../components/provider/CustomerTags.jsx";
import { api } from "../../services/api.js";

const toneMap = { confirmed: "success", pending: "warning", cancelled: "danger" };

export default function BookingsList() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("");
  const [detail, setDetail] = useState(null);
  const [loadErr, setLoadErr] = useState("");

  function load() {
    const q = filter ? `?status_filter=${encodeURIComponent(filter)}` : "";
    setLoadErr("");
    api(`/api/bookings/organiser${q}`)
      .then((data) => { setRows(data); setLoadErr(""); })
      .catch((ex) => { setRows([]); setLoadErr(ex.message || "Failed to load bookings"); });
  }
  useEffect(() => { load(); }, [filter]);

  async function confirmBooking(id) {
    try { await api(`/api/bookings/${id}/confirm`, { method: "POST" }); load(); setDetail(null); } catch (e) { alert(e.message); }
  }
  async function cancelBooking(id) {
    if (!confirm("Cancel this booking?")) return;
    try { await api(`/api/bookings/${id}/cancel`, { method: "POST" }); load(); setDetail(null); } catch (e) { alert(e.message); }
  }

  const filters = ["", "pending", "confirmed", "cancelled"];

  return (
    <div>
      <h1 className="text-2xl font-bold text-on-surface">Bookings</h1>
      <p className="text-sm text-on-surface-variant">{rows.length} booking{rows.length !== 1 ? "s" : ""} total</p>
      {loadErr && <p className="mt-2 rounded-lg bg-error-container/30 px-4 py-2 text-sm text-error">{loadErr}</p>}

      {/* Filter bar */}
      <div className="mt-4 flex gap-1 rounded-lg border border-outline-variant bg-surface-container-low p-1">
        {filters.map((s) => (
          <button
            key={s || "all"}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              filter === s ? "bg-surface-container-lowest text-on-surface shadow-card" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
          </button>
        ))}
      </div>

      {/* Table matching mockup: ID, Customer, Appointment, Resource, Booked, End, Status, Actions */}
      <div className="mt-4 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-outline-variant bg-surface-container-low">
            <tr>
              <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">#</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">Customer</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">Booked on</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">Start</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">End</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">Cap.</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">Status</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b, i) => (
              <tr
                key={b.id}
                className={`border-b border-outline-variant transition hover:bg-surface-container-low/60 cursor-pointer ${i % 2 ? "bg-surface-container-low/20" : ""}`}
                onClick={() => setDetail(b)}
              >
                <td className="px-4 py-3 font-medium">{b.id}</td>
                <td className="px-4 py-3 text-on-surface">{b.customer_name || `User #${b.customer_id}`}</td>
                <td className="px-4 py-3 text-on-surface-variant">{new Date(b.created_at || b.start_time).toLocaleDateString()}</td>
                <td className="px-4 py-3">{new Date(b.start_time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                <td className="px-4 py-3">{new Date(b.end_time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                <td className="px-4 py-3">{b.capacity}</td>
                <td className="px-4 py-3"><Badge tone={toneMap[b.status]}>{b.status}</Badge></td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1">
                    {b.status === "pending" && (
                      <Button variant="teal" className="text-xs py-1 px-2" onClick={() => confirmBooking(b.id)}>Confirm</Button>
                    )}
                    {b.status !== "cancelled" && (
                      <Button variant="danger" className="text-xs py-1 px-2" onClick={() => cancelBooking(b.id)}>Cancel</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-on-surface-variant">No bookings found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Booking #${detail?.id}`}>
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><p className="text-xs font-bold uppercase text-on-surface-variant">Start</p><p>{new Date(detail.start_time).toLocaleString()}</p></div>
              <div><p className="text-xs font-bold uppercase text-on-surface-variant">End</p><p>{new Date(detail.end_time).toLocaleString()}</p></div>
              <div><p className="text-xs font-bold uppercase text-on-surface-variant">Capacity</p><p>{detail.capacity}</p></div>
              <div><p className="text-xs font-bold uppercase text-on-surface-variant">Status</p><Badge tone={toneMap[detail.status]}>{detail.status}</Badge></div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-outline-variant">
              {detail.status === "pending" && <Button variant="teal" onClick={() => confirmBooking(detail.id)}>Confirm</Button>}
              {detail.status !== "cancelled" && <Button variant="danger" onClick={() => cancelBooking(detail.id)}>Cancel</Button>}
            </div>
            {/* Provider-private CRM panel */}
            <div className="pt-2 border-t border-outline-variant space-y-3">
              <CustomerTags customerId={detail.customer_id} />
              <ProviderNotesPanel customerId={detail.customer_id} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
