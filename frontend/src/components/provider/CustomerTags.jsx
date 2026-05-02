import { useEffect, useState, useRef } from "react";
import { Tag, X, Plus, Lock } from "lucide-react";
import { api } from "../../services/api.js";

const SUGGESTED_TAGS = [
  { label: "Frequent", color: "#10b981" },
  { label: "Late canceller", color: "#ef4444" },
  { label: "New customer", color: "#3b82f6" },
  { label: "VIP", color: "#f59e0b" },
  { label: "Referred", color: "#8b5cf6" },
  { label: "Sensitive", color: "#ec4899" },
];

export function CustomerTags({ customerId }) {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  async function load() {
    if (!customerId) return;
    setLoading(true);
    try {
      const data = await api(`/api/provider-notes/tags/${customerId}`);
      setTags(data || []);
    } catch (e) {
      setTags([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [customerId]);

  useEffect(() => {
    if (showInput && inputRef.current) inputRef.current.focus();
  }, [showInput]);

  async function addTag(label, color) {
    if (!customerId) return;
    try {
      await api("/api/provider-notes/tags", {
        method: "POST",
        body: { customer_id: customerId, label, color },
      });
      setInput("");
      setShowInput(false);
      await load();
    } catch (e) {
      alert(e.message);
    }
  }

  async function removeTag(id) {
    if (!confirm("Remove this tag?")) return;
    try {
      await api(`/api/provider-notes/tags/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      alert(e.message);
    }
  }

  const existingLabels = new Set(tags.map((t) => t.label.toLowerCase()));

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest shadow-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-high px-4 py-3">
        <div className="flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-on-surface-variant" />
          <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Tags</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-on-surface-variant">
          <Lock className="h-3 w-3" />
          <span>Private</span>
        </div>
      </div>

      <div className="px-4 py-3 flex flex-wrap gap-2">
        {loading && <span className="text-xs text-on-surface-variant">Loading...</span>}
        {!loading && tags.length === 0 && !showInput && (
          <span className="text-xs text-on-surface-variant/60 italic">No tags yet.</span>
        )}

        {tags.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white cursor-pointer hover:opacity-80 transition select-none"
            style={{ backgroundColor: t.color || "#e5e7eb" }}
            title="Click to remove"
            onClick={() => removeTag(t.id)}
          >
            {t.label}
            <X className="h-3 w-3" />
          </span>
        ))}

        {showInput ? (
          <div className="w-full mt-1 space-y-2">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="New tag name..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && input.trim()) {
                    const existing = SUGGESTED_TAGS.find((s) => s.label.toLowerCase() === input.trim().toLowerCase());
                    addTag(input.trim(), existing?.color || "#e5e7eb");
                  }
                  if (e.key === "Escape") { setShowInput(false); setInput(""); }
                }}
                className="flex-1 rounded-md border border-outline-variant bg-surface px-2 py-1 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary-container"
              />
              <button
                onClick={() => addTag(input.trim(), "#e5e7eb")}
                disabled={!input.trim()}
                className="rounded-md bg-primary-container px-2 py-1 text-on-primary text-xs font-semibold disabled:opacity-40 hover:bg-primary transition"
              >
                Add
              </button>
              <button onClick={() => { setShowInput(false); setInput(""); }} className="text-on-surface-variant hover:text-on-surface">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_TAGS.filter((s) => !existingLabels.has(s.label.toLowerCase())).map((s) => (
                <button
                  key={s.label}
                  onClick={() => addTag(s.label, s.color)}
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white hover:opacity-80 transition"
                  style={{ backgroundColor: s.color }}
                >
                  + {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-2.5 py-1 text-xs text-on-surface-variant hover:bg-surface-container-low transition"
          >
            <Plus className="h-3 w-3" />
            Add tag
          </button>
        )}
      </div>
    </div>
  );
}
