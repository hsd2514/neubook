import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { api } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import StepService from "./booking/StepService.jsx";
import StepResource from "./booking/StepResource.jsx";
import StepDate from "./booking/StepDate.jsx";
import StepSlot from "./booking/StepSlot.jsx";
import StepCapacity from "./booking/StepCapacity.jsx";
import StepQuestions from "./booking/StepQuestions.jsx";
import StepPayment from "./booking/StepPayment.jsx";
import StepConfirm from "./booking/StepConfirm.jsx";
import StepDone from "./booking/StepDone.jsx";

const STEPS = ["Service", "Resource", "Date", "Slot", "Capacity", "Questions", "Payment", "Confirm"];
const isAutoMode = (at) => at?.appointment_kind === "resource" && at?.assignment_mode === "auto";

export default function BookingFlow() {
  const { id, token } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [at, setAt] = useState(null);
  const [branding, setBranding] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState(0);
  const [resourceId, setResourceId] = useState(null);
  const [date, setDate] = useState("");
  const [availability, setAvailability] = useState([]);
  const [slots, setSlots] = useState([]);
  const [capacity, setCapacity] = useState(1);
  const [answers, setAnswers] = useState({});
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [err, setErr] = useState("");
  const paymentDraftKey = "neubook_phonepe_draft";

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
        setStep(at.advance_payment ? (at.manage_capacity ? 7 : 6) : 0);
        window.sessionStorage.removeItem(paymentDraftKey);
        const next = new URLSearchParams(searchParams);
        next.delete("pp_return");
        next.delete("pp_order_id");
        setSearchParams(next, { replace: true });
      })
      .catch((e) => setErr(e.message))
      .finally(() => setPaymentLoading(false));
  }, [at, paymentConfirmed, searchParams, setSearchParams]);

  useEffect(() => {
    if (!at?.organiser_id) {
      setBranding(null);
      return;
    }
    api(`/api/users/${at.organiser_id}/branding`)
      .then(setBranding)
      .catch(() => setBranding(null));
  }, [at?.organiser_id]);

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

  function toggleSlot(s) {
    setSlots((prev) => {
      const exists = prev.find((x) => x.start === s.start);
      if (exists) return prev.filter((x) => x.start !== s.start);
      return [...prev, s];
    });
  }

  function slotContinue() {
    if (at.manage_capacity) {
      setStep(4);
      return;
    }
    if ((at.questions || []).length) {
      setStep(4);
      return;
    }
    setStep(at.advance_payment ? 5 : 5);
  }

  async function confirm() {
    setErr("");
    try {
      const results = [];
      for (const slot of slots) {
        const body = {
          appointment_type_id: at.id,
          resource_id: at.appointment_kind === "resource" && !isAutoMode(at) ? resourceId : null,
          start_time: slot.start,
          capacity: at.manage_capacity ? capacity : 1,
          answers: Object.keys(answers).length ? answers : null,
          payment_confirmed: at.advance_payment ? paymentConfirmed : false,
          payment_reference: at.advance_payment ? paymentReference || null : null,
          ...(token ? { share_token: token } : {}),
        };
        results.push(await api("/api/bookings", { method: "POST", body: JSON.stringify(body) }));
      }
      setBookings(results);
      setBooking(results[0]);
      setStep(7);
    } catch (e) { setErr(e.message); }
  }

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
      if (!slots.length) {
        throw new Error("Please select at least one slot before payment.");
      }
      const orderId = `nb_${at.id}_${Date.now()}`;
      window.sessionStorage.setItem(
        paymentDraftKey,
        JSON.stringify({
          appointmentId: at.id,
          resourceId,
          date,
          availability,
          slots,
          capacity,
          answers,
        }),
      );
      const basePath = token ? `/book/share/${encodeURIComponent(token)}` : `/book/${id}`;
      const redirectUrl = `${window.location.origin}${basePath}?pp_return=1&pp_order_id=${encodeURIComponent(orderId)}`;
      const response = await api("/api/bookings/payments/phonepe/initiate", {
        method: "POST",
        body: JSON.stringify({
          amount_paisa: amountPaisa * slots.length,
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
    if (s === "Capacity" && !at.manage_capacity) return false;
    if (s === "Payment" && !at.advance_payment) return false;
    return true;
  });
  const qStep = at.manage_capacity ? 5 : 4;
  const pStep = at.advance_payment ? qStep + 1 : null;
  const cStep = at.advance_payment ? qStep + 2 : qStep + 1;

  return (
    <div className="mx-auto max-w-3xl" style={pageStyle}>
      {branding && (
        <Card className="mb-6 overflow-hidden p-0">
          <div
            className="px-5 py-4 text-white"
            style={{ background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.accent_color})` }}
          >
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

      {/* Step indicator matching mockup tab-style */}
      {step < 7 && (
        <div className="mb-6 flex items-center gap-1 overflow-x-auto pb-2">
          {activeSteps.map((s, i) => {
            const stepIdx = STEPS.indexOf(s);
            const isActive =
              step === stepIdx ||
              (s === "Questions" && step === qStep) ||
              (s === "Payment" && step === pStep) ||
              (s === "Confirm" && step === cStep);
            const isDone = step > stepIdx || (step === 7);
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
      {step === 3 && <StepSlot availability={availability} selectedSlots={slots} err={err} onToggle={toggleSlot} onContinue={slotContinue} onBack={() => setStep(2)} />}
      {step === 4 && at.manage_capacity && (
        <StepCapacity
          slots={slots}
          capacity={capacity}
          setCapacity={setCapacity}
          onBack={() => setStep(3)}
          onNext={() => setStep((at.questions || []).length ? qStep : at.advance_payment ? pStep : cStep)}
        />
      )}
      {step === qStep && (
        <StepQuestions
          questions={at.questions || []}
          answers={answers}
          setAnswers={setAnswers}
          onBack={() => setStep(at.manage_capacity ? 4 : 3)}
          onNext={() => setStep(at.advance_payment ? pStep : cStep)}
        />
      )}
      {pStep !== null && step === pStep && (
        <StepPayment
          confirmed={paymentConfirmed}
          reference={paymentReference}
          paymentLoading={paymentLoading}
          onInitiatePayment={initiatePhonePePayment}
          onBack={() => setStep(qStep)}
          onNext={() => setStep(cStep)}
        />
      )}
      {step === cStep && (
        <StepConfirm
          at={at}
          slots={slots}
          capacity={capacity}
          err={err}
          paymentConfirmed={paymentConfirmed}
          paymentReference={paymentReference}
          onBack={() => setStep(at.advance_payment ? pStep : qStep)}
          onConfirm={confirm}
        />
      )}
      {step === 7 && booking && <StepDone booking={booking} bookings={bookings} at={at} />}
    </div>
  );
}
