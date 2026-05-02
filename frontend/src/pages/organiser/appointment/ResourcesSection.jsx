import { useState } from "react";
import { Plus, User } from "lucide-react";
import { Input } from "../../../components/ui/Input.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { api } from "../../../services/api.js";
import { useToast } from "../../../context/ToastContext.jsx";

export default function ResourcesSection({ appointmentId, resources, onRefresh }) {
  const { success, error } = useToast();
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  async function add(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setErr("");
    try {
      await api(`/api/appointments/mine/${appointmentId}/resources`, { method: "POST", body: JSON.stringify({ name }) });
      setName("");
      onRefresh();
      success("Resource added successfully");
    } catch (ex) {
      setErr(ex.message);
      error(ex.message || "Failed to add resource");
    }
  }

  return (
    <div className="space-y-4">
      {resources?.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container/15 text-primary-container">
                <User size={16} />
              </span>
              <div>
                <p className="text-sm font-medium text-on-surface">{r.name}</p>
                <p className="text-xs text-on-surface-variant">ID: {r.id}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {err && <p className="text-sm text-error">{err}</p>}
      <form onSubmit={add} className="flex gap-2">
        <Input label="New resource name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" className="gap-1 self-end"><Plus size={16} /> Add</Button>
      </form>
    </div>
  );
}
