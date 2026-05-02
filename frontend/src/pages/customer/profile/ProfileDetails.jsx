import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { Card } from "../../../components/ui/Card.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { api } from "../../../services/api.js";

export default function ProfileDetails({ user, refreshUser }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (user) { setFullName(user.full_name); setEmail(user.email); }
  }, [user]);

  async function save(e) {
    e.preventDefault();
    setMsg("");
    try {
      await api("/api/users/me", { method: "PATCH", body: JSON.stringify({ full_name: fullName, email }) });
      await refreshUser();
      setMsg("Profile updated successfully.");
    } catch (ex) { setMsg(ex.message); }
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container/15 text-primary-container">
          <User size={22} />
        </div>
        <div>
          <h2 className="font-semibold text-on-surface">Details</h2>
          <p className="text-xs text-on-surface-variant">Manage your personal information</p>
        </div>
      </div>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div className="sm:col-span-2 flex items-center gap-3">
          <Button type="submit">Save changes</Button>
          {msg && <p className={`text-sm ${msg.includes("success") ? "text-secondary" : "text-error"}`}>{msg}</p>}
        </div>
      </form>
    </Card>
  );
}
