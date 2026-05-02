import { Link } from "react-router-dom";
import { CalendarCheck, Clock, MapPin, Users, ExternalLink } from "lucide-react";
import { Card } from "../../../components/ui/Card.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { buildGoogleCalendarLink } from "../../../utils/calendarLink.js";

export default function StepDone({ booking, at }) {
  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);

  return (
    <Card className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary/15 text-secondary animate-enter">
        <CalendarCheck size={32} />
      </div>
      <h3 className="mt-4 text-xl font-bold text-on-surface">Appointment confirmed!</h3>
      <p className="mt-1 text-sm text-on-surface-variant">
        {booking.status === "pending" ? "You will get a mail when organiser confirms your booking." : "Your booking has been confirmed."}
      </p>

      <div className="mx-auto mt-6 max-w-sm rounded-lg border border-outline-variant bg-surface-container-low p-4 text-left space-y-3">
        <div className="flex gap-3">
          <Clock size={18} className="mt-0.5 shrink-0 text-primary-container" />
          <div>
            <p className="text-xs font-bold uppercase text-on-surface-variant">Time</p>
            <p className="text-sm font-medium text-on-surface">{start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} at {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <MapPin size={18} className="mt-0.5 shrink-0 text-primary-container" />
          <div>
            <p className="text-xs font-bold uppercase text-on-surface-variant">Service</p>
            <p className="text-sm font-medium text-on-surface">{at?.name || "—"}</p>
          </div>
        </div>
        {booking.resource_id && at?.resources?.length > 0 && (
          <div className="flex gap-3">
            <MapPin size={18} className="mt-0.5 shrink-0 text-primary-container" />
            <div>
              <p className="text-xs font-bold uppercase text-on-surface-variant">Resource</p>
              <p className="text-sm font-medium text-on-surface">
                {at.resources.find((r) => r.id === booking.resource_id)?.name || `#${booking.resource_id}`}
              </p>
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <Users size={18} className="mt-0.5 shrink-0 text-primary-container" />
          <div>
            <p className="text-xs font-bold uppercase text-on-surface-variant">Seats</p>
            <p className="text-sm font-medium text-on-surface">{booking.capacity}</p>
          </div>
        </div>
        <div className="border-t border-outline-variant pt-2">
          <Badge tone={booking.status === "confirmed" ? "success" : "warning"}>{booking.status}</Badge>
          <span className="ml-2">
            <Badge tone={booking.payment_status === "paid" ? "success" : "default"}>
              payment: {booking.payment_status}
            </Badge>
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a
          href={buildGoogleCalendarLink({
            title: at?.name || "Appointment",
            description: `Booking #${booking.id}`,
            location: at?.resources?.find((r) => r.id === booking.resource_id)?.name,
            startTime: booking.start_time,
            endTime: booking.end_time,
          })}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="secondary">
            <ExternalLink size={16} className="mr-1.5" />
            Add to Google Calendar
          </Button>
        </a>
        <Link to="/profile"><Button variant="secondary">My appointments</Button></Link>
        <Link to="/"><Button>Book another</Button></Link>
      </div>
    </Card>
  );
}
