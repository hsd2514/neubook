import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { api } from "../../services/api.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function AdminUsers() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const rows = await api("/api/users");
      setUsers(rows);
    } catch (e) {
      setUsers([]);
      setError(e?.message || "Unable to load users");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function toggleActive(u) {
    try {
      await api(`/api/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !u.is_active }) });
      load();
      toast.success(`User ${u.is_active ? "deactivated" : "activated"} successfully.`);
    } catch (e) { toast.error(e.message || "Failed to update user."); }
  }
  async function setRole(id, role) {
    try {
      await api(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify({ role }) });
      load();
      toast.success(`Role updated to ${role}.`);
    } catch (e) { toast.error(e.message || "Failed to update role."); }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-on-surface">Users</h1>
      {error ? (
        <div className="mt-4 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}
      <div className="mt-6 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold uppercase text-on-surface-variant">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Active</th><th className="px-4 py-3">Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-on-surface-variant" colSpan={5}>Loading users...</td>
              </tr>
            ) : null}
            {!loading && users.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-on-surface-variant" colSpan={5}>No users found.</td>
              </tr>
            ) : null}
            {users.map((u) => (
              <tr key={u.id} className="border-b border-outline-variant">
                <td className="px-4 py-3">{u.full_name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">
                  <select className="rounded border border-outline-variant bg-surface-container-lowest px-2 py-1 text-xs" value={u.role} onChange={(e) => setRole(u.id, e.target.value)}>
                    <option value="customer">customer</option><option value="organiser">organiser</option><option value="admin">admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">{u.is_active ? <Badge tone="success">Yes</Badge> : <Badge tone="danger">No</Badge>}</td>
                <td className="px-4 py-3"><Button variant="secondary" className="text-xs py-1" onClick={() => toggleActive(u)}>Toggle</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
