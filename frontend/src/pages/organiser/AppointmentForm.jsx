import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import QRCode from "qrcode";
import { Button } from "../../components/ui/Button.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Tabs } from "../../components/ui/Tabs.jsx";
import { Toggle } from "../../components/ui/Toggle.jsx";
import { api } from "../../services/api.js";
import { useAppointment } from "./appointment/useAppointment.js";
import BasicsSection from "./appointment/BasicsSection.jsx";
import ResourcesSection from "./appointment/ResourcesSection.jsx";
import ScheduleSection from "./appointment/ScheduleSection.jsx";
import QuestionsSection from "./appointment/QuestionsSection.jsx";
import RulesSection from "./appointment/RulesSection.jsx";

const TABS = [
  { key: "basics", label: "Basics" },
  { key: "resources", label: "Resources" },
  { key: "schedule", label: "Schedule" },
  { key: "rules", label: "Booking Rules" },
  { key: "questions", label: "Questions" },
  { key: "preview", label: "Preview" },
];

export default function AppointmentForm() {
  const { id } = useParams();
  const { isNew, form, setForm, at, setAt: refresh, err, saveBase } = useAppointment(id);
  const [tab, setTab] = useState("basics");
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const shareBookingUrl = useMemo(() => {
    if (!at?.share_link || typeof window === "undefined") return "";
    return `${window.location.origin}/book/share/${encodeURIComponent(at.share_link)}`;
  }, [at?.share_link]);

  useEffect(() => {
    let active = true;
    if (!shareBookingUrl) {
      setQrDataUrl("");
      return undefined;
    }
    QRCode.toDataURL(shareBookingUrl, { width: 220, margin: 1, errorCorrectionLevel: "M" })
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (active) setQrDataUrl("");
      });
    return () => {
      active = false;
    };
  }, [shareBookingUrl]);

  if (!isNew && !at) return <p className="p-8 text-on-surface-variant">Loading…</p>;

  async function togglePublish() {
    setForm((f) => ({ ...f, is_published: !f.is_published }));
    if (!isNew) {
      await api(`/api/appointments/mine/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_published: !form.is_published }),
      });
      refresh();
    }
  }

  async function copyShareLink() {
    if (!shareBookingUrl) return;
    try {
      await navigator.clipboard.writeText(shareBookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function downloadQr() {
    if (!qrDataUrl || !at?.name) return;
    const a = document.createElement("a");
    const safeName = at.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    a.href = qrDataUrl;
    a.download = `${safeName || "appointment"}-qr.png`;
    a.click();
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Top bar like Odoo form view */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/app/appointments" className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-high">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">{isNew ? "New appointment type" : at.name}</h1>
            {!isNew && (
              <div className="flex items-center gap-2 mt-0.5">
                <Badge tone={form.is_published ? "success" : "default"}>{form.is_published ? "Published" : "Draft"}</Badge>
                {at.share_link && (
                  <Button variant="ghost" className="h-7 px-2 text-xs" onClick={copyShareLink}>
                    {copied ? "Copied" : "Copy share link"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isNew && (
            <>
              <Toggle checked={form.is_published} onChange={togglePublish} label="Published" />
              <Link to={shareBookingUrl || `/book/${id}`} target="_blank">
                <Button variant="ghost" className="gap-1 text-sm"><ExternalLink size={16} /> Preview</Button>
              </Link>
            </>
          )}
          <Button onClick={(e) => saveBase(e)}>{isNew ? "Create" : "Save"}</Button>
        </div>
      </div>

      {!isNew && at?.share_link && (
        <div className="mb-4 rounded-lg border border-outline-variant bg-surface-container-low p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-on-surface">Booking QR</p>
              <p className="text-xs text-on-surface-variant">Scan to open the canonical booking link for this appointment.</p>
              <p className="mt-1 break-all text-xs text-on-surface-variant">{shareBookingUrl}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="text-xs" onClick={copyShareLink}>{copied ? "Copied" : "Copy link"}</Button>
              <Button variant="ghost" className="gap-1 text-xs" onClick={downloadQr} disabled={!qrDataUrl}><Download size={14} /> Download QR</Button>
            </div>
          </div>
          <div className="mt-3 inline-flex rounded-lg border border-outline-variant bg-white p-2">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Booking share link QR code" className="h-44 w-44" />
            ) : (
              <div className="flex h-44 w-44 items-center justify-center text-xs text-on-surface-variant">Generating QR…</div>
            )}
          </div>
        </div>
      )}

      {err && <p className="mb-4 rounded-lg bg-error-container/30 px-4 py-2 text-sm text-error">{err}</p>}

      {/* Tabs */}
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest shadow-card">
        {!isNew && <Tabs tabs={TABS} active={tab} onChange={setTab} />}
        <div className="p-5">
          {(isNew || tab === "basics") && <BasicsSection form={form} setForm={setForm} />}
          {!isNew && tab === "resources" && <ResourcesSection appointmentId={id} resources={at?.resources} onRefresh={refresh} />}
          {!isNew && tab === "schedule" && (
            <ScheduleSection
              appointmentId={id}
              slotSchedule={at?.slot_schedule}
              schedules={at?.schedules}
              resources={at?.resources}
              onRefresh={refresh}
            />
          )}
          {!isNew && tab === "rules" && <RulesSection form={form} setForm={setForm} />}
          {!isNew && tab === "questions" && <QuestionsSection appointmentId={id} questions={at?.questions} onRefresh={refresh} />}
          {!isNew && tab === "preview" && (
            <div className="space-y-3">
              <h3 className="font-semibold text-on-surface">Customer preview</h3>
              <p className="text-sm text-on-surface-variant">This is how customers see your appointment page when published.</p>
              <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
                <p className="text-lg font-bold text-on-surface">{at.name}</p>
                <p className="mt-1 text-sm text-on-surface-variant">{at.description || "No description"}</p>
                <div className="mt-3 flex gap-2">
                  <Badge>{at.duration_minutes} min</Badge>
                  {at.manage_capacity && <Badge tone="warning">Capacity enabled</Badge>}
                  {at.advance_payment && <Badge tone="teal">Advance pay</Badge>}
                  {at.manual_confirmation && <Badge tone="purple">Manual confirm</Badge>}
                </div>
                <p className="mt-3 text-xs text-on-surface-variant">Resources: {at.resources?.length || 0} · Schedules: {at.schedules?.length || 0} · Questions: {at.questions?.length || 0}</p>
              </div>
              <Link to={shareBookingUrl || `/book/${id}`} target="_blank">
                <Button className="gap-1 mt-2"><ExternalLink size={16} /> Open booking flow</Button>
              </Link>
            </div>
          )}
        </div>
        {/* Save button at bottom for non-new */}
        {!isNew && (tab === "basics" || tab === "rules") && (
          <div className="border-t border-outline-variant bg-surface-container-low px-5 py-3">
            <Button onClick={(e) => saveBase(e)}>Save changes</Button>
          </div>
        )}
      </div>
    </div>
  );
}
