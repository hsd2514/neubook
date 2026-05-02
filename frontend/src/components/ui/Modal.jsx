import { X } from "lucide-react";

export function Modal({ title, open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-lg border border-outline-variant bg-surface-container-lowest shadow-dropdown animate-enter">
        <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
          <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high">
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
