import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Briefcase, Calendar, ArrowRight } from "lucide-react";
import { Card } from "../../components/ui/Card.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { api } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [s, setS] = useState(null);
  useEffect(() => { api("/api/reports/admin-summary").then(setS).catch(() => setS(null)); }, []);

  const cards = [
    { label: "Total users", value: s?.total_users ?? "—", icon: Users, color: "bg-primary-container/15 text-primary-container" },
    { label: "Service providers", value: s?.total_service_providers ?? "—", icon: Briefcase, color: "bg-secondary/15 text-secondary" },
    { label: "Total appointments", value: s?.total_appointments ?? "—", icon: Calendar, color: "bg-tertiary-container/20 text-tertiary-container" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-on-surface">Administration</h1>
      <p className="text-sm text-on-surface-variant">Welcome, {user?.full_name}. System-wide monitoring and control.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="flex items-center gap-4 animate-enter">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}</p>
              <p className="text-2xl font-bold text-on-surface">{value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-on-surface">User management</h3>
            <p className="text-sm text-on-surface-variant">Manage roles, activate/deactivate accounts</p>
          </div>
          <Link to="/admin/users"><Button variant="ghost" className="gap-1">Manage <ArrowRight size={16} /></Button></Link>
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-on-surface">Organiser console</h3>
            <p className="text-sm text-on-surface-variant">Manage appointments, bookings, calendar</p>
          </div>
          <Link to="/app"><Button variant="ghost" className="gap-1">Open <ArrowRight size={16} /></Button></Link>
        </Card>
      </div>
    </div>
  );
}
