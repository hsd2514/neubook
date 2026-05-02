import { useEffect, useState, useRef } from "react";
import { Lock, Send, Search, X } from "lucide-react";
import { api } from "../../services/api.js";

function formatDateLabel(d) {
  const now = new Date();
  const date = new Date(d);
  const isToday = now.toDateString() === date.toDateString();
  const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(d) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ProviderNotesPanel({ customerId }) {
  const [notes, setNotes] = useState([]);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  async function load() {
    if (!customerId) return;
    setLoading(true);
    try {
      const data = await api(`/api/provider-notes/notes/${customerId}`);
      setNotes(data || []);
    } catch (e) {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [customerId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [notes]);

  async function addNote(e) {
    e.preventDefault();
    if (!input.trim() || !customerId) return;
    setSending(true);
    try {
      await api("/api/provider-notes/notes", {
        method: "POST",
        body: { customer_id: customerId, content: input.trim() },
      });
      setInput("");
      await load();
    } finally {
      setSending(false);
    }
  }

  async function doSearch(e) {
    e.preventDefault();
    if (!query.trim()) {
      setSearching(false);
      await load();
      return;
    }
    setSearching(true);
    try {
      const data = await api(`/api/provider-notes/notes/search?q=${encodeURIComponent(query.trim())}`);
      setNotes(data || []);
    } catch (err) {
      setNotes([]);
    }
  }

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-high px-4 py-3">
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-on-surface-variant" />
          <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Private Notes
          </span>
        </div>
        <span className="text-[10px] text-on-surface-variant">
          {notes.length} note{notes.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Search bar */}
      <form onSubmit={doSearch} className="flex items-center gap-2 border-b border-outline-variant bg-surface-container-low px-3 py-2">
        <Search className="h-3.5 w-3.5 text-on-surface-variant" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all customer notes..."
          className="flex-1 bg-transparent text-xs text-on-surface outline-none placeholder:text-on-surface-variant/60"
        />
        {searching && (
          <button type="button" onClick={() => { setSearching(false); setQuery(""); load(); }} className="text-on-surface-variant hover:text-on-surface">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>

      {/* Notes log */}
      <div ref={scrollRef} className="max-h-[220px] overflow-y-auto px-4 py-3 space-y-3">
        {loading && <p className="text-xs text-on-surface-variant text-center py-4">Loading...</p>}
        {!loading && notes.length === 0 && (
          <p className="text-xs text-on-surface-variant text-center py-6">
            {searching ? "No notes match your search." : "No notes yet. Write one below."}
          </p>
        )}
        {notes.map((note, i) => {
          const prev = notes[i - 1];
          const showDate = !prev || formatDateLabel(prev.created_at) !== formatDateLabel(note.created_at);
          return (
            <div key={note.id} className="space-y-1">
              {showDate && (
                <p className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wide">
                  {formatDateLabel(note.created_at)}
                </p>
              )}
              <div className="flex gap-2">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary-container/50 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-on-surface whitespace-pre-wrap break-words">{note.content}</p>
                  <p className="mt-0.5 text-[10px] text-on-surface-variant/50">{formatTime(note.created_at)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={addNote} className="flex items-center gap-2 border-t border-outline-variant bg-surface-container-low px-3 py-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a private note..."
          className="flex-1 rounded-md border border-outline-variant bg-surface px-3 py-1.5 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary-container"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-md bg-primary-container p-1.5 text-on-primary disabled:opacity-40 hover:bg-primary transition"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
