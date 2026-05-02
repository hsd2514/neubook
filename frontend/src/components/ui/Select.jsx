export function Select({ label, children, className = "", ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          {label}
        </span>
      )}
      <select
        className={`w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm outline-none transition focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
