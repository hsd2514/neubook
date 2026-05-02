import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
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
  const { isNew, form, setForm, at, setAt: refresh, err, saveBase, loading, notFound } = useAppointment(id);
  const [tab, setTab] = useState("basics");
  const previewHref = !isNew && at?.share_link && form.visibility === "unlisted" ? `/book/share/${at.share_link}` : `/book/${id}`;
  const embedUrl = at?.share_link ? `${window.location.origin}/embed/book/share/${encodeURIComponent(at.share_link)}` : "";
  const iframeSnippet = embedUrl
    ? `<iframe src="${embedUrl}" width="100%" height="760" style="border:0;" loading="lazy" title="Book appointment"></iframe>`
    : "";
  const jsSnippet = embedUrl
    ? `<div id="neubook-widget"></div><script>(function(){var f=document.createElement('iframe');f.src='${embedUrl}';f.style.width='100%';f.style.height='760px';f.style.border='0';f.loading='lazy';f.title='Book appointment';document.getElementById('neubook-widget').appendChild(f);})();</script>`
    : "";
  const [copied, setCopied] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState("");

  if (!isNew && loading) return <p className="p-8 text-on-surface-variant">Loading…</p>;
  if (!isNew && notFound) return <p className="p-8 text-error">Appointment not found or inaccessible.</p>;

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

  async function copyEmbed(kind) {
    const text = kind === "iframe" ? iframeSnippet : jsSnippet;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEmbed(kind);
      setTimeout(() => setCopiedEmbed(""), 1500);
    } catch {
      setCopiedEmbed("");
    }
  }

  async function copyShareLink() {
    if (!at?.share_link) return;
    const link = `${window.location.origin}/book/share/${encodeURIComponent(at.share_link)}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
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
                <Badge tone="teal">{(form.visibility || "public").toUpperCase()}</Badge>
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
              <Toggle checked={form.is_published} onChange={togglePublish} label={`Published (${form.visibility || "public"})`} />
              <Link to={previewHref} target="_blank">
                <Button variant="ghost" className="gap-1 text-sm"><ExternalLink size={16} /> Preview</Button>
              </Link>
            </>
          )}
          <Button onClick={(e) => saveBase(e)}>{isNew ? "Create" : "Save"}</Button>
        </div>
      </div>

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
              <Link to={previewHref} target="_blank">
                <Button className="gap-1 mt-2"><ExternalLink size={16} /> Open booking flow</Button>
              </Link>
              {at.share_link && (
                <div className="mt-4 space-y-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
                  <p className="text-sm font-semibold text-on-surface">Embed widget</p>
                  <p className="text-xs text-on-surface-variant">Paste one of these snippets into your website to embed the booking flow.</p>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase text-on-surface-variant">Iframe snippet</p>
                      <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => copyEmbed("iframe")}>{copiedEmbed === "iframe" ? "Copied" : "Copy"}</Button>
                    </div>
                    <textarea readOnly value={iframeSnippet} className="h-20 w-full rounded-lg border border-outline-variant bg-surface-container-low p-2 text-xs text-on-surface-variant" />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase text-on-surface-variant">JS snippet</p>
                      <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => copyEmbed("js")}>{copiedEmbed === "js" ? "Copied" : "Copy"}</Button>
                    </div>
                    <textarea readOnly value={jsSnippet} className="h-24 w-full rounded-lg border border-outline-variant bg-surface-container-low p-2 text-xs text-on-surface-variant" />
                  </div>
                </div>
              )}
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
