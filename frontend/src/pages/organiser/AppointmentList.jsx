import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LayoutGrid, List, Plus } from "lucide-react";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { api } from "../../services/api.js";

export default function AppointmentList() {
  const [items, setItems] = useState([]);
  const [view, setView] = useState("list");

  useEffect(() => { api("/api/appointments/mine").then(setItems).catch(() => setItems([])); }, []);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Appointment Types</h1>
          <p className="text-sm text-on-surface-variant">{items.length} type{items.length !== 1 ? "s" : ""} configured</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-outline-variant overflow-hidden">
            <button type="button" onClick={() => setView("list")} className={`p-2 ${view === "list" ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:bg-surface-container-high"}`}><List size={18} /></button>
            <button type="button" onClick={() => setView("kanban")} className={`p-2 ${view === "kanban" ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:bg-surface-container-high"}`}><LayoutGrid size={18} /></button>
          </div>
          <Link to="/app/appointments/new"><Button className="gap-1"><Plus size={18} /> New</Button></Link>
        </div>
      </div>

      {view === "list" && (
        <div className="mt-6 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-outline-variant bg-surface-container-low">
              <tr>
                <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">Name</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">Duration</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">Kind</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">Resources</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">Schedules</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-on-surface-variant">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a, i) => (
                <tr key={a.id} className={`border-b border-outline-variant transition hover:bg-surface-container-low/60 ${i % 2 ? "bg-surface-container-low/20" : ""}`}>
                  <td className="px-4 py-3">
                    <Link to={`/app/appointments/${a.id}`} className="font-medium text-primary-container hover:underline">{a.name}</Link>
                    {a.description && <p className="mt-0.5 text-xs text-on-surface-variant line-clamp-1">{a.description}</p>}
                  </td>
                  <td className="px-4 py-3">{a.duration_minutes} min</td>
                  <td className="px-4 py-3 capitalize">{a.appointment_kind}</td>
                  <td className="px-4 py-3">{a.resources?.length || 0}</td>
                  <td className="px-4 py-3">{a.schedules?.length || 0}</td>
                  <td className="px-4 py-3">{a.is_published ? <Badge tone="success">Published</Badge> : <Badge>Draft</Badge>}</td>
                </tr>
              ))}
              {!items.length && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant">No appointment types yet. Create your first one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {view === "kanban" && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[{ key: "Draft", pub: false }, { key: "Published", pub: true }].map(({ key, pub }) => (
            <div key={key} className="rounded-lg border border-outline-variant bg-surface-container-low/40 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${pub ? "bg-secondary" : "bg-outline"}`} />
                <h3 className="text-sm font-bold uppercase text-on-surface-variant">{key}</h3>
                <Badge>{items.filter((a) => a.is_published === pub).length}</Badge>
              </div>
              <div className="space-y-2">
                {items.filter((a) => a.is_published === pub).map((a) => (
                  <Link key={a.id} to={`/app/appointments/${a.id}`}>
                    <Card className="transition hover:shadow-elevated hover:border-primary-container/50">
                      <p className="font-medium text-on-surface">{a.name}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">{a.duration_minutes} min · {a.appointment_kind} · {a.resources?.length || 0} resources</p>
                    </Card>
                  </Link>
                ))}
                {!items.filter((a) => a.is_published === pub).length && <p className="text-sm text-on-surface-variant">None.</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
