const tones = {
  default: "bg-surface-container-high text-on-surface",
  success: "bg-secondary-container text-on-secondary-container",
  warning: "bg-tertiary-container text-on-tertiary-container",
  danger: "bg-error-container text-on-error-container",
  purple: "bg-primary-container text-on-primary-container",
  teal: "bg-secondary-container text-on-secondary-container",
};

export function Badge({ children, tone = "default" }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone] || tones.default}`}>
      {children}
    </span>
  );
}
