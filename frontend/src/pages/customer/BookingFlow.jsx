import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

export default function BookingFlow() {
  const { id } = useParams();
  const { user } = useAuth();
  const [at, setAt] = useState(null);
  const [step, setStep] = useState(0);
  const [resourceId, setResourceId] = useState(null);
  const [date, setDate] = useState("");
  const [availability, setAvailability] = useState([]);
  const [slot, setSlot] = useState(null);
  const [capacity, setCapacity] = useState(1);
  const [answers, setAnswers] = useState({});
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");
  const [booking, setBooking] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/appointments/public")
      .then((rows) => setAt(rows.find((x) => String(x.id) === String(id)) || null))
      .catch(() => setAt(null));
  }, [id]);

  const fromTo = useMemo(() => {
    if (!date) return null;
    const d = new Date(date + "T12:00:00");
    const to = new Date(d);
    to.setDate(to.getDate() + 14);
    return { from: d.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }, [date]);

  useEffect(() => {
    if (step !== 3 || !date || !at || !fromTo) return;
    const rid = at.appointment_kind === "resource" ? resourceId : "";
    api(`/api/appointments/${id}/availability?from_date=${fromTo.from}&to_date=${fromTo.to}&resource_id=${rid || ""}&tz=UTC`)
      .then(setAvailability)
      .catch((e) => setErr(e.message));
  }, [step, date, resourceId, id, at, fromTo]);

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
        appointment_type_id: Number(id),
        resource_id: at.appointment_kind === "resource" ? resourceId : null,
        start_time: slot.start,
        capacity: at.manage_capacity ? capacity : 1,
        answers: Object.keys(answers).length ? answers : null,
        payment_confirmed: at.advance_payment ? paymentConfirmed : false,
        payment_reference: at.advance_payment ? paymentReference || null : null,
      };
      setBooking(await api("/api/bookings", { method: "POST", body: JSON.stringify(body) }));
      setStep(7);
    } catch (e) { setErr(e.message); }
  }

  if (!at) return <p className="p-8 text-center text-on-surface-variant">Loading… <Link to="/" className="text-primary-container hover:underline">Home</Link></p>;
  if (!user) return <Card className="mx-auto max-w-md"><p className="mb-4">Please sign in to book.</p><Link to="/login"><Button>Sign in</Button></Link></Card>;
  if (user.role !== "customer" && user.role !== "admin") return <Card className="mx-auto max-w-md"><p>Booking is for customers. <Link to="/app" className="text-primary-container hover:underline">Console</Link></p></Card>;

  const activeSteps = STEPS.filter((s) => {
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

      {step === 0 && <StepService at={at} onNext={() => setStep(1)} />}
      {step === 1 && <StepResource at={at} resourceId={resourceId} setResourceId={setResourceId} onBack={() => setStep(0)} onNext={() => setStep(2)} />}
      {step === 2 && <StepDate date={date} setDate={setDate} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
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
          setConfirmed={setPaymentConfirmed}
          setReference={setPaymentReference}
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
