export function Input({ label, className = "", id, ...props }) {
  const cid = id || (label && label.toLowerCase().replace(/\s+/g, "-"));
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          {label}
        </span>
      )}
      <input
        id={cid}
        className={`w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 ${className}`}
        {...props}
      />
    </label>
  );
}
