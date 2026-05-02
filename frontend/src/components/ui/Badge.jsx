const tones = {
  default: "bg-surface-container-high text-on-surface",
  success: "bg-secondary-container/40 text-on-secondary-container",
  warning: "bg-tertiary-container/30 text-on-tertiary-container",
  danger: "bg-error-container text-on-error-container",
  purple: "bg-primary-container/20 text-primary-container",
  teal: "bg-secondary-container/30 text-secondary",
};

export function Badge({ children, tone = "default" }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone] || tones.default}`}>
      {children}
    </span>
  );
}
