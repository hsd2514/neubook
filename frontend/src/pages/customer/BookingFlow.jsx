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
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState(0);
  const [resourceId, setResourceId] = useState(null);
  const [date, setDate] = useState("");
  const [availability, setAvailability] = useState([]);
  const [slot, setSlot] = useState(null);
  const [capacity, setCapacity] = useState(1);
  const [answers, setAnswers] = useState({});
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [booking, setBooking] = useState(null);
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
      setSlot(draft.slot ?? null);
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

  function selectSlot(s) {
    setSlot(s);
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
      setBooking(await api("/api/bookings", { method: "POST", body: JSON.stringify(body) }));
      setStep(7);
    } catch (e) { setErr(e.message); }
  }

  async function initiatePhonePePayment() {
    if (!at?.advance_payment) return;
    setErr("");
    setPaymentLoading(true);
    try {
      const orderId = `nb_${at.id}_${Date.now()}`;
      window.sessionStorage.setItem(
        paymentDraftKey,
        JSON.stringify({
          appointmentId: at.id,
          resourceId,
          date,
          availability,
          slot,
          capacity,
          answers,
        }),
      );
      const basePath = token ? `/book/share/${encodeURIComponent(token)}` : `/book/${id}`;
      const redirectUrl = `${window.location.origin}${basePath}?pp_return=1&pp_order_id=${encodeURIComponent(orderId)}`;
      const response = await api("/api/bookings/payments/phonepe/initiate", {
        method: "POST",
        body: JSON.stringify({
          // TODO: replace with real appointment pricing once price model is introduced.
          amount_paisa: 100,
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
    <div className="mx-auto max-w-3xl">
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
      {step === 3 && <StepSlot availability={availability} err={err} onSelect={selectSlot} onBack={() => setStep(2)} />}
      {step === 4 && at.manage_capacity && (
        <StepCapacity
          slot={slot}
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
          slot={slot}
          capacity={capacity}
          err={err}
          paymentConfirmed={paymentConfirmed}
          paymentReference={paymentReference}
          onBack={() => setStep(at.advance_payment ? pStep : qStep)}
          onConfirm={confirm}
        />
      )}
      {step === 7 && booking && <StepDone booking={booking} at={at} />}
    </div>
  );
}
