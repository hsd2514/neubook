import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { api } from "../../services/api.js";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  function load() { api("/api/users").then(setUsers).catch(() => setUsers([])); }
  useEffect(() => { load(); }, []);

  async function toggleActive(u) { await api(`/api/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !u.is_active }) }); load(); }
  async function setRole(id, role) { await api(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify({ role }) }); load(); }

  return (
    <div>
      <h1 className="text-2xl font-bold text-on-surface">Users</h1>
      <div className="mt-6 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold uppercase text-on-surface-variant">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Active</th><th className="px-4 py-3">Actions</th></tr>
          </thead>
          <tbody>
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
