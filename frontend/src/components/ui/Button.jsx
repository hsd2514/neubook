export function Button({ children, variant = "primary", className = "", disabled, ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-primary-container text-on-primary shadow-card hover:bg-primary",
    secondary: "bg-surface-container-lowest text-on-surface border border-outline-variant shadow-card hover:bg-surface-container-low",
    teal: "bg-secondary text-on-secondary shadow-card hover:bg-secondary/90",
    ghost: "bg-transparent text-primary-container hover:bg-surface-container-high",
    danger: "bg-error text-on-error hover:bg-error/90",
  };
  return (
    <button
      type="button"
      className={`${base} ${variants[variant] || variants.primary} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
