import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../services/api.js";

const defaultForm = {
  name: "",
  description: "",
  duration_minutes: 30,
  appointment_kind: "resource",
  slot_schedule: "weekly",
  visibility: "public",
  is_published: false,
  manage_capacity: false,
  advance_payment: false,
  manual_confirmation: false,
  assignment_mode: "manual",
  service_amount_paisa: 100,
  max_bookings_per_slot: 1,
};

export function useAppointment(id) {
  const isNew = !id || id === "new";
  const nav = useNavigate();
  const [form, setForm] = useState({ ...defaultForm });
  const [at, setAt] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [notFound, setNotFound] = useState(false);

  function refresh() {
    if (!isNew) setLoading(true);
    return api("/api/appointments/mine").then((rows) => {
      const found = rows.find((x) => String(x.id) === String(id));
      setAt(found || null);
      setNotFound(!found);
      setLoading(false);
      return found;
    }).catch((ex) => {
      setErr(ex.message || "Failed to load appointment");
      setLoading(false);
      throw ex;
    });
  }

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      setNotFound(false);
      return;
    }
    refresh().then((found) => {
      if (found) {
        setForm({
          name: found.name,
          description: found.description || "",
          duration_minutes: found.duration_minutes,
          appointment_kind: found.appointment_kind,
          slot_schedule: found.slot_schedule,
          visibility: found.visibility || "public",
          is_published: found.is_published,
          manage_capacity: found.manage_capacity,
          advance_payment: found.advance_payment,
          manual_confirmation: found.manual_confirmation,
          assignment_mode: found.assignment_mode,
          service_amount_paisa: found.service_amount_paisa ?? 100,
          max_bookings_per_slot: found.max_bookings_per_slot,
        });
      }
    }).catch(() => setAt(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew]);

  async function saveBase(e) {
    e.preventDefault();
    setErr("");
    try {
      if (isNew) {
        const created = await api("/api/appointments/mine", { method: "POST", body: JSON.stringify(form) });
        nav(`/app/appointments/${created.id}`);
      } else {
        await api(`/api/appointments/mine/${id}`, { method: "PATCH", body: JSON.stringify(form) });
        await refresh();
      }
    } catch (ex) {
      setErr(ex.message);
    }
  }

  return { isNew, form, setForm, at, setAt: refresh, err, setErr, saveBase, loading, notFound };
}
