import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";

export default function StepQuestions({ questions, answers, setAnswers, onBack, onNext }) {
  return (
    <Card>
      <h3 className="font-semibold text-on-surface">Questions</h3>
      {questions.length === 0 && <p className="mt-2 text-sm text-on-surface-variant">No questions.</p>}
      {questions.map((q) => (
        <div key={q.id} className="mt-4">
          <label className="text-sm font-medium text-on-surface">
            {q.label}
            {q.is_required && <span className="text-error"> *</span>}
          </label>
          {q.field_type === "text" && (
            <input
              className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm"
              required={q.is_required}
              value={answers[q.id] || ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
            />
          )}
          {q.field_type === "checkbox" && (
            <input type="checkbox" className="mt-2" onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.checked }))} />
          )}
        </div>
      ))}
      <div className="mt-6 flex gap-2">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button onClick={onNext}>Review</Button>
      </div>
    </Card>
  );
}
