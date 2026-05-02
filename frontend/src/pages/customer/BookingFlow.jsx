import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { api } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import StepService from "./booking/StepService.jsx";
import StepResource from "./booking/StepResource.jsx";
import StepDate from "./booking/StepDate.jsx";
import StepSlot from "./booking/StepSlot.jsx";
import StepSeatMap from "./booking/StepSeatMap.jsx";
import StepCapacity from "./booking/StepCapacity.jsx";
import StepQuestions from "./booking/StepQuestions.jsx";
import StepPayment from "./booking/StepPayment.jsx";
import StepConfirm from "./booking/StepConfirm.jsx";
import StepDone from "./booking/StepDone.jsx";

const STEPS = ["Service", "Resource", "Date", "Slot", "Seats", "Capacity", "Questions", "Payment", "Confirm"];
const isAutoMode = (at) => at?.appointment_kind === "resource" && at?.assignment_mode === "auto";

// ─── Waitlist Dialog ──────────────────────────────────────────────────────────
function WaitlistDialog({ slots, at, resourceId, selectedSeatIds, answers, onClose, onJoined }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleJoin() {
    setErr("");
    setLoading(true);
    try {
      const joined = [];
      for (const slot of slots) {
        const entry = await api("/api/waitlist", {
          method: "POST",
          body: JSON.stringify({
            appointment_type_id: at.id,
            resource_id: resourceId ?? null,
            start_time: slot.start,
            seat_ids: selectedSeatIds.length ? selectedSeatIds : null,
            answers: Object.keys(answers || {}).length ? answers : null,
          }),
        });
        joined.push(entry);
      }
      onJoined(joined);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-enter">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-on-surface">Slot is Full</h3>
            <p className="text-sm text-on-surface-variant">Join the waitlist to get notified when a spot opens up.</p>
          </div>
        </div>

        {/* Slot details */}
        <div className="mb-4 space-y-1 rounded-lg border border-outline-variant bg-surface-container-low p-3">
          <p className="text-xs font-bold uppercase text-on-surface-variant">Selected slot{slots.length > 1 ? "s" : ""}</p>
          {slots.map((s) => {
            const d = new Date(s.start);
            return (
              <p key={s.start} className="text-sm font-medium text-on-surface">
                {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}{" "}
                {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            );
          })}
          {selectedSeatIds.length > 0 && (
            <p className="text-xs text-on-surface-variant">Seats requested: {selectedSeatIds.length}</p>
          )}
        </div>

        <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-on-surface">
          <p className="font-semibold text-warning">How it works</p>
          <ul className="mt-1 space-y-0.5 text-on-surface-variant text-xs list-disc pl-4">
            <li>Your position in the queue is reserved by the time you apply.</li>
            <li>When someone cancels, you'll get an email notification.</li>
            <li>You can leave the waitlist any time from your profile.</li>
          </ul>
        </div>

        {err && <p className="mb-3 rounded-lg bg-error-container/30 px-3 py-2 text-sm text-error">{err}</p>}

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Dismiss</Button>
          <Button onClick={handleJoin} disabled={loading}>
            {loading ? "Joining…" : "Join Waitlist"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Waitlist Done screen ─────────────────────────────────────────────────────
function WaitlistDone({ entries, at, onReset }) {
  return (
    <Card className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warning/15 text-warning animate-enter">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      <h3 className="mt-4 text-xl font-bold text-on-surface">You're on the waitlist!</h3>
      <p className="mt-1 text-sm text-on-surface-variant">
        We'll email you when a spot opens up. You're #{entries[0]?.position || "?"} in the queue.
      </p>

      <div className="mt-4 mx-auto max-w-sm space-y-2">
        {entries.map((e) => {
          const d = new Date(e.start_time);
          return (
            <div key={e.id} className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-left">
              <p className="text-xs font-bold uppercase text-warning">Waitlist #{e.position}</p>
              <p className="text-sm font-medium text-on-surface mt-0.5">
                {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}{" "}
                {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-xs text-on-surface-variant">{at?.name}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/profile"><Button variant="secondary">My appointments</Button></Link>
        <Button onClick={onReset}>Book another slot</Button>
      </div>
    </Card>
  );
}

// ─── Main BookingFlow ─────────────────────────────────────────────────────────
export default function BookingFlow() {
  const { id, token } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const [at, setAt] = useState(null);
  const [branding, setBranding] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState(0);
  const [resourceId, setResourceId] = useState(null);
  const [date, setDate] = useState("");
  const [availability, setAvailability] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [capacity, setCapacity] = useState(1);
  const [answers, setAnswers] = useState({});
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [err, setErr] = useState("");
  const [waitlistDialog, setWaitlistDialog] = useState(false);
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const navigate = useNavigate();
  const rescheduleId = searchParams.get("reschedule");
  const urlResourceId = searchParams.get("resource_id");
  const paymentDraftKey = "neubook_phonepe_draft";

  // ── fetch appointment type ──────────────────────────────────────────────────
  useEffect(() => {
    if (token) {
      api(`/api/appointments/by-share/${encodeURIComponent(token)}`)
        .then((data) => { setAt(data); setNotFound(false); })
        .catch(() => { setAt(null); setNotFound(true); });
    } else {
      api("/api/appointments/public")
        .then((rows) => {
          const found = rows.find((x) => String(x.id) === String(id)) || null;
          setAt(found);
          setNotFound(!found);
        })
        .catch(() => { setAt(null); setNotFound(true); });
    }
  }, [id, token]);

  // ── handle reschedule initialization ────────────────────────────────────────
  useEffect(() => {
    if (rescheduleId && at) {
      if (urlResourceId) setResourceId(urlResourceId);
      setStep(2); // Start at Date selection
    }
  }, [rescheduleId, at, urlResourceId]);

  const hasSeatMap = at?.booking_mode === "seat_map";
  const seatStepIdx = hasSeatMap ? 4 : null;
  const capacityStepIdx = at ? (at.manage_capacity ? (hasSeatMap ? 5 : 4) : null) : null;
  const qStepIdx = at ? ((hasSeatMap ? 5 : 4) + (at.manage_capacity ? 1 : 0)) : 5;
  const pStepIdx = (at?.advance_payment && !rescheduleId) ? qStepIdx + 1 : null;
  const cStepIdx = pStepIdx ? qStepIdx + 2 : qStepIdx + 1;

  // ── phonepe return ─────────────────────────────────────────────────────────
  useEffect(() => {
    const isReturn = searchParams.get("pp_return") === "1";
    if (!isReturn || !at) return;
    try {
      const raw = window.sessionStorage.getItem(paymentDraftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (String(draft.appointmentId) !== String(at.id)) return;
      setResourceId(draft.resourceId ?? null);
      setDate(draft.date ?? "");
      setAvailability(Array.isArray(draft.availability) ? draft.availability : []);
      setSlots(Array.isArray(draft.slots) ? draft.slots : []);
      setSelectedSeatIds(Array.isArray(draft.selectedSeatIds) ? draft.selectedSeatIds : []);
      setCapacity(draft.capacity ?? 1);
      setAnswers(draft.answers ?? {});
    } catch {
      // ignore malformed session state
    }
  }, [at, searchParams]);

  useEffect(() => {
    const isReturn = searchParams.get("pp_return") === "1";
    const orderId = searchParams.get("pp_order_id");
    if (!isReturn || !orderId || !at || paymentConfirmed) return;

    setPaymentLoading(true);
    api("/api/bookings/payments/phonepe/status", {
      method: "POST",
      body: JSON.stringify({ merchant_order_id: orderId }),
    })
      .then((res) => {
        const state = (res.state || "").toUpperCase();
        const okStates = new Set(["COMPLETED", "SUCCESS", "PAYMENT_SUCCESS", "PAID"]);
        if (!okStates.has(state)) {
          throw new Error(`Payment not successful (state: ${res.state || "UNKNOWN"})`);
        }
        setPaymentConfirmed(true);
        setPaymentReference(orderId);
        setStep(cStepIdx);
        window.sessionStorage.removeItem(paymentDraftKey);
        const next = new URLSearchParams(searchParams);
        next.delete("pp_return");
        next.delete("pp_order_id");
        setSearchParams(next, { replace: true });
      })
      .catch((e) => setErr(e.message))
      .finally(() => setPaymentLoading(false));
  }, [at, cStepIdx, paymentConfirmed, searchParams, setSearchParams]);

  // ── branding ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!at?.organiser_id) { setBranding(null); return; }
    api(`/api/users/${at.organiser_id}/branding`)
      .then(setBranding)
      .catch(() => setBranding(null));
  }, [at?.organiser_id]);

  // ── availability ───────────────────────────────────────────────────────────
  const fromTo = useMemo(() => {
    if (!date) return null;
    const d = new Date(date + "T12:00:00");
    const to = new Date(d);
    to.setDate(to.getDate() + 14);
    return { from: d.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }, [date]);

  useEffect(() => {
    if (step !== 3 || !date || !at || !fromTo) return;
    const rid = at.appointment_kind === "resource" && !isAutoMode(at) ? resourceId : null;
    const params = new URLSearchParams({ from_date: fromTo.from, to_date: fromTo.to, tz: "UTC" });
    if (rid) params.set("resource_id", rid);
    api(`/api/appointments/${at.id}/availability?${params}`)
      .then(setAvailability)
      .catch((e) => setErr(e.message));
  }, [step, date, resourceId, at, fromTo]);

  // ── slot toggle ────────────────────────────────────────────────────────────
  function toggleSlot(s) {
    setSlots((prev) => {
      const exists = prev.find((x) => x.start === s.start);
      if (exists) return prev.filter((x) => x.start !== s.start);
      return [...prev, s];
    });
  }

  function slotContinue() {
    if (hasSeatMap) { setStep(seatStepIdx); return; }
    if (capacityStepIdx !== null) { setStep(capacityStepIdx); return; }
    if ((at.questions || []).length > 0) { setStep(qStepIdx); return; }
    setStep(at.advance_payment ? pStepIdx : cStepIdx);
  }

  async function confirm() {
    setErr("");
    try {
      if (rescheduleId) {
        // Reschedule only supports one slot at a time currently
        const slot = slots[0];
        if (!slot) throw new Error("Please select a slot");
        const res = await api(`/api/bookings/${rescheduleId}/reschedule`, {
          method: "POST",
          body: JSON.stringify({ start_time: slot.start }),
        });
        setBooking(res);
        setBookings([res]);
        toast.success("Appointment rescheduled successfully! 🎉");
        setStep(99);
        return;
      }

      const results = [];
      for (const slot of slots) {
        const body = {
          appointment_type_id: at.id,
          resource_id: at.appointment_kind === "resource" && !isAutoMode(at) ? resourceId : null,
          start_time: slot.start,
          capacity: hasSeatMap ? selectedSeatIds.length : (at.manage_capacity ? capacity : 1),
          answers: Object.keys(answers).length ? answers : null,
          payment_confirmed: at.advance_payment ? paymentConfirmed : false,
          payment_reference: at.advance_payment ? paymentReference || null : null,
          seat_ids: hasSeatMap ? selectedSeatIds : null,
          ...(token ? { share_token: token } : {}),
        };
        try {
          results.push(await api("/api/bookings", { method: "POST", body: JSON.stringify(body) }));
        } catch (e) {
          // 409 = slot full → offer waitlist
          if (e.message && (e.message.includes("capacity exceeded") || e.message.includes("no longer available"))) {
            setWaitlistDialog(true);
            return;
          }
          throw e;
        }
      }
      setBookings(results);
      setBooking(results[0]);
      setStep(99);
    } catch (e) {
      setErr(e.message);
      toast.error(e.message || "Booking failed. Please try again.");
    }
  }

  // ── PhonePe payment ────────────────────────────────────────────────────────
  const pageStyle = branding ? {
    "--brand-primary": branding.primary_color,
    "--brand-accent": branding.accent_color,
  } : undefined;

  async function initiatePhonePePayment() {
    if (!at?.advance_payment) return;
    setErr("");
    setPaymentLoading(true);
    try {
      const amountPaisa = Number(at?.service_amount_paisa ?? 0);
      if (!Number.isFinite(amountPaisa) || amountPaisa < 100) {
        throw new Error("Service amount is not configured correctly for this appointment.");
      }
      if (!slots.length) throw new Error("Please select at least one slot before payment.");
      if (hasSeatMap && !selectedSeatIds.length) throw new Error("Please select seats before payment.");
      const orderId = `nb_${at.id}_${Date.now()}`;
      window.sessionStorage.setItem(
        paymentDraftKey,
        JSON.stringify({ appointmentId: at.id, resourceId, date, availability, slots, selectedSeatIds, capacity, answers }),
      );
      const basePath = token ? `/book/share/${encodeURIComponent(token)}` : `/book/${id}`;
      const redirectUrl = `${window.location.origin}${basePath}?pp_return=1&pp_order_id=${encodeURIComponent(orderId)}`;
      const response = await api("/api/bookings/payments/phonepe/initiate", {
        method: "POST",
        body: JSON.stringify({
          amount_paisa: amountPaisa * slots.length * (hasSeatMap ? Math.max(1, selectedSeatIds.length) : 1),
          redirect_url: redirectUrl,
          merchant_order_id: orderId,
        }),
      });
      if (!response.redirect_url) throw new Error("PhonePe did not return redirect URL");
      window.location.href = response.redirect_url;
    } catch (e) {
      setErr(e.message);
      setPaymentLoading(false);
    }
  }

  // ── reset after waitlist ───────────────────────────────────────────────────
  function resetFlow() {
    setStep(0);
    setSlots([]);
    setSelectedSeatIds([]);
    setCapacity(1);
    setAnswers({});
    setBooking(null);
    setBookings([]);
    setWaitlistEntries([]);
    setErr("");
  }

  // ── guard clauses ──────────────────────────────────────────────────────────
  if (notFound) return (
    <Card className="mx-auto max-w-md text-center">
      <p className="mb-2 text-lg font-semibold text-error">Appointment not found</p>
      <p className="mb-4 text-sm text-on-surface-variant">{token ? "This share link is invalid or has expired." : "The appointment you're looking for doesn't exist or is no longer available."}</p>
      <Link to="/"><Button>Back to Home</Button></Link>
    </Card>
  );
  if (!at) return <p className="p-8 text-center text-on-surface-variant">Loading… <Link to="/" className="text-primary-container hover:underline">Home</Link></p>;
  if (!user) return <Card className="mx-auto max-w-md"><p className="mb-4">Please sign in to book.</p><Link to="/login"><Button>Sign in</Button></Link></Card>;
  if (user.role !== "customer" && user.role !== "admin") return <Card className="mx-auto max-w-md"><p>Booking is for customers. <Link to="/app" className="text-primary-container hover:underline">Console</Link></p></Card>;

  const activeSteps = STEPS.filter((s) => {
    if (s === "Resource" && isAutoMode(at)) return false;
    if (s === "Seats" && !hasSeatMap) return false;
    if (s === "Capacity" && (!at.manage_capacity || hasSeatMap)) return false;
    if (s === "Payment" && !at.advance_payment) return false;
    return true;
  });

  // ── waitlist done screen ───────────────────────────────────────────────────
  if (step === 98) {
    return (
      <div className="mx-auto max-w-3xl" style={pageStyle}>
        <WaitlistDone entries={waitlistEntries} at={at} onReset={resetFlow} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl" style={pageStyle}>
      {/* Waitlist dialog overlay */}
      {waitlistDialog && (
        <WaitlistDialog
          slots={slots}
          at={at}
          resourceId={at.appointment_kind === "resource" && !isAutoMode(at) ? resourceId : null}
          selectedSeatIds={selectedSeatIds}
          answers={answers}
          onClose={() => setWaitlistDialog(false)}
          onJoined={(entries) => {
            setWaitlistEntries(entries);
            setWaitlistDialog(false);
            setStep(98);
          }}
        />
      )}

      {branding && (
        <Card className="mb-6 overflow-hidden p-0">
          <div className="px-5 py-4 text-white" style={{ background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.accent_color})` }}>
            <div className="flex items-center gap-3">
              {branding.logo_url ? (
                <img src={branding.logo_url} alt={`${branding.display_name} logo`} className="h-10 w-10 rounded-md bg-white/15 object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/20 text-sm font-bold">
                  {(branding.display_name || "B").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wide text-white/80">Hosted by</p>
                <h2 className="text-lg font-semibold">{branding.display_name}</h2>
              </div>
            </div>
          </div>
          {branding.theme === "dark" && (
            <p className="px-5 py-2 text-xs text-on-surface-variant">Brand preference: dark theme</p>
          )}
        </Card>
      )}

      {step !== 99 && (
        <div className="mb-6 flex items-center gap-1 overflow-x-auto pb-2">
          {activeSteps.map((s, i) => {
            const myStep = s === "Seats" ? seatStepIdx
              : s === "Capacity" ? capacityStepIdx
              : s === "Questions" ? qStepIdx
              : s === "Payment" ? pStepIdx
              : s === "Confirm" ? cStepIdx
              : STEPS.indexOf(s);
            const isActive = step === myStep;
            const isDone = (myStep !== null && step > myStep) || step === 99;
            return (
              <div key={s} className="flex items-center gap-1">
                {i > 0 && <span className="h-px w-4 bg-outline-variant" />}
                <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  isActive ? "bg-primary-container text-on-primary shadow-card" :
                  isDone ? "bg-secondary/15 text-secondary" :
                  "bg-surface-container-high text-on-surface-variant"
                }`}>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    isActive ? "bg-on-primary/20" : isDone ? "bg-secondary/20" : "bg-surface-container-highest"
                  }`}>{i + 1}</span>
                  {s}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {step === 0 && <StepService at={at} onNext={() => setStep(isAutoMode(at) ? 2 : 1)} />}
      {step === 1 && !isAutoMode(at) && <StepResource at={at} resourceId={resourceId} setResourceId={setResourceId} onBack={() => setStep(0)} onNext={() => setStep(2)} />}
      {step === 2 && <StepDate date={date} setDate={setDate} onBack={() => setStep(isAutoMode(at) ? 0 : 1)} onNext={() => setStep(3)} />}
      {step === 3 && <StepSlot availability={availability} selectedSlots={slots} err={err} onToggle={toggleSlot} onContinue={slotContinue} onBack={() => setStep(2)} appointmentTypeId={at?.id} resourceId={resourceId} />}
      {hasSeatMap && step === seatStepIdx && (
        <StepSeatMap
          at={at}
          resourceId={resourceId}
          selectedSeatIds={selectedSeatIds}
          setSelectedSeatIds={setSelectedSeatIds}
          slots={slots}
          onBack={() => setStep(3)}
          onNext={() => setStep(capacityStepIdx !== null ? capacityStepIdx : qStepIdx)}
        />
      )}
      {capacityStepIdx !== null && step === capacityStepIdx && at.manage_capacity && (
        <StepCapacity
          slots={slots}
          capacity={capacity}
          setCapacity={setCapacity}
          onBack={() => setStep(hasSeatMap ? seatStepIdx : 3)}
          onNext={() => setStep((at.questions || []).length ? qStepIdx : at.advance_payment ? pStepIdx : cStepIdx)}
        />
      )}
      {step === qStepIdx && (
        <StepQuestions
          questions={at.questions || []}
          answers={answers}
          setAnswers={setAnswers}
          onBack={() => {
            if (capacityStepIdx !== null) setStep(capacityStepIdx);
            else if (hasSeatMap) setStep(seatStepIdx);
            else setStep(3);
          }}
          onNext={() => setStep(at.advance_payment ? pStepIdx : cStepIdx)}
        />
      )}
      {pStepIdx !== null && step === pStepIdx && (
        <StepPayment
          confirmed={paymentConfirmed}
          reference={paymentReference}
          paymentLoading={paymentLoading}
          onInitiatePayment={initiatePhonePePayment}
          onBack={() => setStep(qStepIdx)}
          onNext={() => setStep(cStepIdx)}
        />
      )}
      {step === cStepIdx && (
        <StepConfirm
          at={at}
          slots={slots}
          capacity={hasSeatMap ? selectedSeatIds.length : capacity}
          err={err}
          paymentConfirmed={paymentConfirmed}
          paymentReference={paymentReference}
          onBack={() => setStep(at.advance_payment ? pStepIdx : qStepIdx)}
          onConfirm={confirm}
        />
      )}
      {step === 99 && booking && <StepDone booking={booking} bookings={bookings} at={at} />}
    </div>
  );
}
