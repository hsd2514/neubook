import { useEffect, useState } from "react";
import { Card } from "../../components/ui/Card.jsx";
import { api } from "../../services/api.js";

export default function OrganiserReports() {
  const [data, setData] = useState(null);
  useEffect(() => { api("/api/reports/insights").then(setData).catch(() => setData(null)); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-on-surface">Reports & insights</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-on-surface">Peak booking hours (UTC)</h2>
          <div className="mt-4 flex h-40 items-end gap-1">
            {(data?.peak_hours || []).map((h) => (
              <div key={h.hour} className="flex flex-1 flex-col items-center justify-end">
                <div className="w-full rounded-t bg-secondary/70" style={{ height: `${Math.min(100, h.count * 12)}px` }} title={`${h.count} bookings`} />
                <span className="mt-1 text-[10px] text-on-surface-variant">{h.hour}h</span>
              </div>
            ))}
            {!data?.peak_hours?.length && <p className="text-sm text-on-surface-variant">No data yet.</p>}
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold text-on-surface">Provider utilization</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {(data?.provider_utilization || []).map((p) => (
              <li key={String(p.resource_id)} className="flex justify-between border-b border-outline-variant py-2">
                <span className="text-on-surface-variant">Resource {p.resource_id ?? "—"}</span>
                <span className="font-semibold text-primary-container">{p.bookings}</span>
              </li>
            ))}
            {!data?.provider_utilization?.length && <p className="text-on-surface-variant">No bookings.</p>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
