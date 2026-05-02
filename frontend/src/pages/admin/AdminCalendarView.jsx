import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookingCalendar } from "../../components/calendar/BookingCalendar.jsx";
import { api } from "../../services/api.js";

export default function AdminCalendarView() {
  const [bookings, setBookings] = useState([]);
  const [appointmentTypes, setAppointmentTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadErr, setLoadErr] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api("/api/bookings/admin")
      .then(setBookings)
      .catch((ex) => setLoadErr(ex.message || "Failed to load bookings"));

    // Fetch all appointment types (admin can see all)
    api("/api/appointments")
      .then((rows) => setAppointmentTypes(rows || []))
      .catch(() => setAppointmentTypes([]));

    // Fetch users to map organiser names
    api("/api/users")
      .then((rows) => setUsers(rows || []))
      .catch(() => setUsers([]));
  }, []);

  const enrichedBookings = bookings.map((b) => {
    const at = appointmentTypes.find((a) => a.id === b.appointment_type_id);
    const organiser = at ? users.find((u) => u.id === at.organiser_id) : null;
    return {
      ...b,
      appointment_type_name: b.appointment_type_name || at?.name || `Type #${b.appointment_type_id}`,
      organiser_name: organiser?.full_name || organiser?.email || "Unknown",
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">System Calendar</h1>
        <p className="text-sm text-on-surface-variant">View all bookings across all organisers in a monthly calendar.</p>
      </div>

      {loadErr && (
        <div className="rounded-lg bg-error-container/30 px-4 py-2 text-sm text-error">
          {loadErr}
        </div>
      )}

      <BookingCalendar
        bookings={enrichedBookings}
        appointmentTypes={appointmentTypes}
        onBookingClick={(b) => {
          // Admin has no booking detail page; show nothing or navigate to organiser's view
        }}
        title="All Bookings"
        subtitle={`${enrichedBookings.length} total bookings across all organisers`}
      />
    </div>
  );
}
