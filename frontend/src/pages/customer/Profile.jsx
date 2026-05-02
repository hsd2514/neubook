import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { Modal } from "../../components/ui/Modal.jsx";
import { api } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import ProfileDetails from "./profile/ProfileDetails.jsx";
import BookingList from "./profile/BookingList.jsx";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loadErr, setLoadErr] = useState("");
  const [rescheduleId, setRescheduleId] = useState(null);
  const [newStart, setNewStart] = useState("");

  useEffect(() => {
    if (!user) return;
    api("/api/bookings/mine")
      .then((rows) => {
        setBookings(rows);
        setLoadErr("");
      })
      .catch((ex) => {
        setBookings([]);
        setLoadErr(ex.message || "Failed to load bookings");
      });
  }, [user]);

  async function cancelBooking(id) {
    if (!confirm("Cancel this appointment?")) return;
    try {
      await api(`/api/bookings/${id}/cancel`, { method: "POST" });
      setBookings((b) => b.map((x) => (x.id === id ? { ...x, status: "cancelled" } : x)));
    } catch (ex) { alert(ex.message); }
  }

  async function doReschedule() {
    if (!rescheduleId || !newStart) return;
    try {
      await api(`/api/bookings/${rescheduleId}/reschedule`, { method: "POST", body: JSON.stringify({ start_time: new Date(newStart).toISOString() }) });
      setBookings(await api("/api/bookings/mine"));
      setRescheduleId(null);
      setNewStart("");
    } catch (ex) { alert(ex.message); }
  }

  if (!user) return <Card className="mx-auto max-w-md"><Link to="/login"><Button>Sign in</Button></Link></Card>;

  const upcoming = bookings.filter((b) => b.status !== "cancelled" && new Date(b.start_time) >= new Date());
  const past = bookings.filter((b) => b.status === "cancelled" || new Date(b.start_time) < new Date());

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-on-surface">Profile</h1>
      {loadErr && <p className="rounded-lg bg-error-container/30 px-4 py-2 text-sm text-error">{loadErr}</p>}
      <ProfileDetails user={user} refreshUser={refreshUser} />
      <BookingList title="Upcoming" bookings={upcoming} showActions onCancel={cancelBooking} onReschedule={setRescheduleId} />
      <BookingList title="Past" bookings={past} />

      <Modal open={!!rescheduleId} onClose={() => setRescheduleId(null)} title="Reschedule">
        <p className="mb-2 text-sm text-on-surface-variant">Pick a new start time. Ensure the slot is available.</p>
        <Input label="New start" type="datetime-local" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={() => setRescheduleId(null)}>Close</Button>
          <Button onClick={doReschedule}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}
