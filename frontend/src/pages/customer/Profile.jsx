import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { Modal } from "../../components/ui/Modal.jsx";
import { api } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext.jsx";
import ProfileDetails from "./profile/ProfileDetails.jsx";
import BookingList from "./profile/BookingList.jsx";

// ─── Waitlist section ─────────────────────────────────────────────────────────
function WaitlistSection({ waitlistEntries, onLeave }) {
  if (!waitlistEntries.length) return null;

  return (
    <Card>
      <h2 className="mb-4 text-lg font-bold text-on-surface">My Waitlists</h2>
      <div className="space-y-3">
        {waitlistEntries.map((e) => {
          const d = new Date(e.start_time);
          return (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-lg border border-[#f59e0b]/30 bg-[#fef3c7] p-4"
            >
              <div>
                <p className="text-sm font-semibold text-on-surface">
                  {e.appointment_type_name || "Waitlist"}
                </p>
                {e.resource_name && (
                  <p className="text-xs text-on-surface-variant">{e.resource_name}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#f59e0b] text-xs font-bold text-white">
                    {e.position}
                  </span>
                  <span className="text-sm font-semibold text-[#92400e]">Queue position #{e.position}</span>
                </div>
                <p className="mt-1 text-sm text-on-surface">
                  {d.toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" })}{" "}
                  at {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
                {e.seat_ids?.length > 0 && (
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    Seat{e.seat_ids.length > 1 ? "s" : ""} requested: {e.seat_ids.length}
                  </p>
                )}
                <span className="mt-1 inline-flex items-center rounded-full border border-[#f59e0b]/50 bg-[#f59e0b]/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-[#b45309]">
                  {e.status}
                </span>
              </div>
              <Button
                variant="secondary"
                onClick={() => onLeave(e.id)}
                className="shrink-0 border-[#f59e0b]/30 text-[#92400e] hover:bg-[#f59e0b]/10"
              >
                Leave queue
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────
export default function Profile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [loadErr, setLoadErr] = useState("");
  const [waitlistEntries, setWaitlistEntries] = useState([]);

  useEffect(() => {
    if (!user) return;
    api("/api/bookings/mine")
      .then((rows) => { setBookings(rows); setLoadErr(""); })
      .catch((ex) => { setBookings([]); setLoadErr(ex.message || "Failed to load bookings"); });

    api("/api/waitlist/mine")
      .then(setWaitlistEntries)
      .catch(() => setWaitlistEntries([]));
  }, [user]);

  async function cancelBooking(id) {
    if (!confirm("Cancel this appointment?")) return;
    try {
      await api(`/api/bookings/${id}/cancel`, { method: "POST" });
      setBookings((b) => b.map((x) => (x.id === id ? { ...x, status: "cancelled" } : x)));
      toast.success("Appointment cancelled.");
    } catch (ex) { toast.error(ex.message || "Failed to cancel booking."); }
  }

  async function leaveWaitlist(id) {
    if (!confirm("Leave the waitlist for this slot?")) return;
    try {
      await api(`/api/waitlist/${id}`, { method: "DELETE" });
      setWaitlistEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success("Removed from waitlist.");
    } catch (ex) { toast.error(ex.message || "Failed to leave waitlist."); }
  }

  function handleReschedule(booking) {
    navigate(`/book/${booking.appointment_type_id}?reschedule=${booking.id}&resource_id=${booking.resource_id || ""}`);
  }

  if (!user) return <Card className="mx-auto max-w-md"><Link to="/login"><Button>Sign in</Button></Link></Card>;

  const upcoming = bookings.filter((b) => b.status !== "cancelled" && new Date(b.start_time) >= new Date());
  const past = bookings.filter((b) => b.status === "cancelled" || new Date(b.start_time) < new Date());

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-on-surface">Profile</h1>
      {loadErr && <p className="rounded-lg bg-error-container/30 px-4 py-2 text-sm text-error">{loadErr}</p>}
      <ProfileDetails user={user} refreshUser={refreshUser} />
      <WaitlistSection waitlistEntries={waitlistEntries} onLeave={leaveWaitlist} />
      <BookingList title="Upcoming" bookings={upcoming} showActions onCancel={cancelBooking} onReschedule={handleReschedule} />
      <BookingList title="Past" bookings={past} />
    </div>
  );
}
