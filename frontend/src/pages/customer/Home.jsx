import { ArrowRight, Calendar, Clock, LogIn, Search, SlidersHorizontal, X, ArrowUpDown } from "lucide-react";
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
  const [maxPrice, setMaxPrice] = useState(null); // number | null
  const [isFreeOnly, setIsFreeOnly] = useState(false);
  const [durationFilter, setDurationFilter] = useState(null); // "under30" | "30to60" | "over60" | null
  const [sortBy, setSortBy] = useState("default"); // default | priceAsc | priceDesc | durationAsc | durationDesc
  const [sortOpen, setSortOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/appointments/public")
      .then((data) => { setItems(data); setLoading(false); })
      .catch((e) => { setErr(e.message); setLoading(false); });
  }, []);

  let filtered = items.filter((a) => {
    if (q && !a.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (isFreeOnly && a.advance_payment) return false;
    if (maxPrice !== null && a.service_amount_paisa / 100 > maxPrice) return false;
    if (durationFilter === "under30" && a.duration_minutes >= 30) return false;
    if (durationFilter === "30to60" && (a.duration_minutes < 30 || a.duration_minutes > 60)) return false;
    if (durationFilter === "over60" && a.duration_minutes <= 60) return false;
    return true;
  });

  if (sortBy === "priceAsc") {
    filtered = [...filtered].sort((a, b) => a.service_amount_paisa - b.service_amount_paisa);
  } else if (sortBy === "priceDesc") {
    filtered = [...filtered].sort((a, b) => b.service_amount_paisa - a.service_amount_paisa);
  } else if (sortBy === "durationAsc") {
    filtered = [...filtered].sort((a, b) => a.duration_minutes - b.duration_minutes);
  } else if (sortBy === "durationDesc") {
    filtered = [...filtered].sort((a, b) => b.duration_minutes - a.duration_minutes);
  }

  const hasFilters = isFreeOnly || maxPrice !== null || durationFilter !== null || sortBy !== "default";
  function clearAll() {
    setMaxPrice(null);
    setIsFreeOnly(false);
    setDurationFilter(null);
    setSortBy("default");
    setSortOpen(false);
  }

  const sortLabel = {
    default: "Recommended",
    priceAsc: "Price: Low to High",
    priceDesc: "Price: High to Low",
    durationAsc: "Duration: Short to Long",
    durationDesc: "Duration: Long to Short",
  }[sortBy];

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

      {/* Search + filters */}
      {items.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
            <input
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20"
              placeholder="Search services..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-start gap-3">
            {/* Left: filters */}
            <div className="flex flex-1 flex-wrap items-center gap-2 text-xs">
              {/* Price input */}
              <div className="relative">
                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">₹</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  className="w-20 rounded-md border border-outline-variant bg-surface-container-low py-1 pl-5 pr-2 text-xs outline-none focus:border-primary-container"
                  value={maxPrice ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    setMaxPrice(val);
                    if (val !== null) setIsFreeOnly(false);
                  }}
                />
              </div>

              {/* Quick price pills */}
              {["100", "500", "1000"].map((val) => {
                const num = Number(val);
                const active = maxPrice === num;
                return (
                  <button
                    key={`price-${val}`}
                    onClick={() => {
                      setMaxPrice(active ? null : num);
                      setIsFreeOnly(false);
                    }}
                    className={`rounded-full border px-2.5 py-1 transition ${active ? "border-primary bg-primary text-white" : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"}`}
                  >
                    Under ₹{val}
                  </button>
                );
              })}
              <button
                onClick={() => {
                  setIsFreeOnly(!isFreeOnly);
                  if (!isFreeOnly) setMaxPrice(null);
                }}
                className={`rounded-full border px-2.5 py-1 transition ${isFreeOnly ? "border-primary bg-primary text-white" : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"}`}
              >
                Free
              </button>

              {/* Duration chips */}
              {[
                ["under30", "Under 30 min"],
                ["30to60", "30–60 min"],
                ["over60", "Over 60 min"],
              ].map(([key, label]) => {
                const active = durationFilter === key;
                return (
                  <button
                    key={`dur-${key}`}
                    onClick={() => setDurationFilter(active ? null : key)}
                    className={`rounded-full border px-2.5 py-1 transition ${active ? "border-primary bg-primary text-white" : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Right: sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortOpen((v) => !v)}
                className="flex items-center gap-1 rounded-md border border-outline-variant bg-surface-container-low px-2 py-1 text-xs text-on-surface hover:bg-surface-container-high"
              >
                <ArrowUpDown size={14} />
                <span className="hidden sm:inline">{sortLabel}</span>
              </button>
              {sortOpen && (
                <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-outline-variant bg-surface-container-lowest p-1 shadow-elevated">
                  {[
                    ["default", "Recommended"],
                    ["priceAsc", "Price: Low to High"],
                    ["priceDesc", "Price: High to Low"],
                    ["durationAsc", "Duration: Short to Long"],
                    ["durationDesc", "Duration: Long to Short"],
                  ].map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => { setSortBy(v); setSortOpen(false); }}
                      className={`block w-full rounded-md px-3 py-1.5 text-left text-xs transition ${sortBy === v ? "bg-primary-container text-white" : "text-on-surface hover:bg-surface-container-high"}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active filter pills */}
          {hasFilters && (
            <div className="flex flex-wrap items-center gap-1.5">
              {maxPrice !== null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                  Under ₹{maxPrice}
                  <button onClick={() => setMaxPrice(null)} className="hover:text-primary-container"><X size={10} /></button>
                </span>
              )}
              {isFreeOnly && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                  Free
                  <button onClick={() => setIsFreeOnly(false)} className="hover:text-primary-container"><X size={10} /></button>
                </span>
              )}
              {durationFilter && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                  {durationFilter === "under30" ? "Under 30 min" : durationFilter === "30to60" ? "30–60 min" : "Over 60 min"}
                  <button onClick={() => setDurationFilter(null)} className="hover:text-primary-container"><X size={10} /></button>
                </span>
              )}
              {sortBy !== "default" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                  {sortLabel}
                  <button onClick={() => setSortBy("default")} className="hover:text-primary-container"><X size={10} /></button>
                </span>
              )}
              <button onClick={clearAll} className="ml-1 text-[11px] text-error hover:underline">Clear all</button>
            </div>
          )}

          {/* Result count */}
          <p className="text-xs text-on-surface-variant">Showing {filtered.length} service{filtered.length !== 1 ? "s" : ""}</p>
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
