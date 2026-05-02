import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookingCalendar } from "../../components/calendar/BookingCalendar.jsx";
import { api } from "../../services/api.js";

export default function CalendarView() {
  const [bookings, setBookings] = useState([]);
  const [appointmentTypes, setAppointmentTypes] = useState([]);
  const [loadErr, setLoadErr] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api("/api/bookings/organiser")
      .then(setBookings)
      .catch((ex) => setLoadErr(ex.message || "Failed to load bookings"));
    api("/api/appointments/mine")
      .then((rows) => setAppointmentTypes(rows || []))
      .catch(() => setAppointmentTypes([]));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">My Calendar</h1>
        <p className="text-sm text-on-surface-variant">View and manage your bookings in a monthly calendar.</p>
      </div>

      {loadErr && (
        <div className="rounded-lg bg-error-container/30 px-4 py-2 text-sm text-error">
          {loadErr}
        </div>
      )}

      <BookingCalendar
        bookings={bookings}
        appointmentTypes={appointmentTypes}
        onBookingClick={(b) => navigate(`/app/bookings/${b.id}`)}
        title="My Calendar"
      />
    </div>
  );
}
