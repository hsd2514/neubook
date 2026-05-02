import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, ClipboardCheck, Layers, Plus, ArrowRight } from "lucide-react";
import { Card } from "../../components/ui/Card.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { api } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Dashboard() {
  const { user } = useAuth();
  const [s, setS] = useState(null);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    api("/api/reports/organiser-summary").then(setS).catch(() => setS(null));
    api("/api/appointments/mine").then(setAppointments).catch(() => setAppointments([]));
  }, []);

  const stats = [
    { label: "Total bookings", value: s?.total_bookings ?? "—", icon: Layers, color: "bg-primary-container/15 text-primary-container" },
    { label: "Today", value: s?.today_appointments ?? "—", icon: Calendar, color: "bg-secondary/15 text-secondary" },
    { label: "Pending", value: s?.pending_confirmations ?? "—", icon: ClipboardCheck, color: "bg-tertiary-container/20 text-tertiary-container" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Welcome, {user?.full_name?.split(" ")[0] || "Organiser"}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Here's an overview of your appointment business.</p>
        </div>
        <Link to="/app/appointments/new">
          <Button className="gap-1"><Plus size={18} /> New appointment</Button>
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
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

      {/* Quick links */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-on-surface">Appointment types</h3>
            <p className="text-sm text-on-surface-variant">{appointments.length} configured · {appointments.filter((a) => a.is_published).length} published</p>
          </div>
          <Link to="/app/appointments"><Button variant="ghost" className="gap-1">View <ArrowRight size={16} /></Button></Link>
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-on-surface">Bookings</h3>
            <p className="text-sm text-on-surface-variant">Manage and confirm bookings</p>
          </div>
          <Link to="/app/bookings"><Button variant="ghost" className="gap-1">View <ArrowRight size={16} /></Button></Link>
        </Card>
      </div>

      {appointments.length === 0 && (
        <Card className="mt-6 border-dashed text-center py-8">
          <Calendar size={32} className="mx-auto text-primary-container/50" />
          <h3 className="mt-3 font-semibold text-on-surface">Get started</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-on-surface-variant">
            Create your first appointment type, add resources and schedules, then publish it so customers can book.
          </p>
          <Link to="/app/appointments/new" className="mt-4 inline-block">
            <Button className="gap-1"><Plus size={16} /> Create appointment type</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
