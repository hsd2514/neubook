import { useState } from "react";
import { Card } from "../../../components/ui/Card.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { Select } from "../../../components/ui/Select.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { api } from "../../../services/api.js";

export default function QuestionsSection({ appointmentId, questions, onRefresh }) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState("text");
  const [err, setErr] = useState("");

  async function add(e) {
    e.preventDefault();
    if (!label.trim()) return;
    setErr("");
    try {
      await api(`/api/appointments/mine/${appointmentId}/questions`, {
        method: "POST",
        body: JSON.stringify({ label, field_type: type, is_required: false }),
      });
      setLabel("");
      onRefresh();
    } catch (ex) { setErr(ex.message); }
  }

  return (
    <Card>
      <h2 className="font-semibold text-on-surface">Booking questions</h2>
      <ul className="mt-2 text-sm">
        {questions?.map((q) => (
          <li key={q.id} className="border-b border-outline-variant py-2">{q.label} ({q.field_type})</li>
        ))}
      </ul>
      {err && <p className="mt-2 text-sm text-error">{err}</p>}
      <form onSubmit={add} className="mt-4 flex flex-wrap gap-2">
        <Input label="Question" value={label} onChange={(e) => setLabel(e.target.value)} />
        <Select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="text">Text</option>
          <option value="checkbox">Checkbox</option>
          <option value="select">Select</option>
        </Select>
        <Button type="submit" className="self-end">Add</Button>
      </form>
    </Card>
  );
}
