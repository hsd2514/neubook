export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-0 border-b border-outline-variant">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
            active === t.key
              ? "text-primary-container"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          {t.label}
          {active === t.key && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary-container" />
          )}
        </button>
      ))}
    </div>
  );
}
