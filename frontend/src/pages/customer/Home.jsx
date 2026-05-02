import { ArrowRight, Calendar, Clock, LogIn, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { api } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Home() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/appointments/public")
      .then((data) => { setItems(data); setLoading(false); })
      .catch((e) => { setErr(e.message); setLoading(false); });
  }, []);

  const filtered = items.filter((a) => !q || a.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="mx-auto max-w-5xl animate-enter">
      {/* Hero / Header */}
      <div className="mb-8 rounded-xl bg-gradient-to-br from-primary-container to-primary p-6 text-white shadow-elevated sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Neubook</h1>
            <p className="mt-1 text-white/80">The perfect booking system. Choose a service and pick a time.</p>
          </div>
          <div className="flex gap-2">
            {user ? (
              <>
                <Link to="/profile"><Button variant="secondary" className="bg-white/20 border-white/30 text-white hover:bg-white/30">My Profile</Button></Link>
                {(user.role === "organiser" || user.role === "admin") && (
                  <Link to="/app"><Button variant="secondary" className="bg-white/20 border-white/30 text-white hover:bg-white/30">Console</Button></Link>
                )}
              </>
            ) : (
              <Link to="/login"><Button variant="secondary" className="bg-white/20 border-white/30 text-white hover:bg-white/30 gap-1"><LogIn size={16} /> Sign in</Button></Link>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      {items.length > 0 && (
        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
          <input
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20"
            placeholder="Search services..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      )}

      {err && <p className="mb-4 rounded-lg bg-error-container/30 px-4 py-2 text-sm text-error">{err}</p>}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-container border-t-transparent" />
        </div>
      )}

      {/* Service cards */}
      {!loading && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((a, i) => (
            <Card key={a.id} className={`group flex flex-col justify-between transition hover:shadow-elevated animate-enter stagger-${(i % 3) + 1}`}>
              <div>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold text-on-surface">{a.name}</h2>
                  <Badge tone="purple">{a.duration_minutes} min</Badge>
                </div>
                <p className="line-clamp-2 text-sm text-on-surface-variant">{a.description || "No description"}</p>
                <div className="mt-2 flex gap-2">
                  {a.manage_capacity && <Badge tone="warning">Capacity</Badge>}
                  {a.advance_payment && <Badge tone="teal">Payment</Badge>}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-outline-variant pt-4">
                <span className="flex items-center gap-1 text-xs text-on-surface-variant"><Clock size={14} /> Real-time slots</span>
                <Link to={`/book/${a.id}`}><Button className="gap-1">Book <ArrowRight size={16} /></Button></Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !err && filtered.length === 0 && (
        <Card className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-container/10">
            <Calendar size={32} className="text-primary-container" />
          </div>
          <h2 className="text-lg font-bold text-on-surface">No services available yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-on-surface-variant">
            {user?.role === "organiser" || user?.role === "admin"
              ? "You haven't published any appointment types yet. Go to your console to create and publish services."
              : "There are no published appointment types available right now. Check back soon or contact the organiser."}
          </p>
          {(user?.role === "organiser" || user?.role === "admin") && (
            <Link to="/app/appointments/new" className="mt-4 inline-block">
              <Button>Create appointment type</Button>
            </Link>
          )}
          {!user && (
            <div className="mt-4 flex justify-center gap-2">
              <Link to="/login"><Button variant="secondary">Sign in</Button></Link>
              <Link to="/signup"><Button>Create account</Button></Link>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
