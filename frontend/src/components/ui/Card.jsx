export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-lg border border-outline-variant bg-surface-container-lowest p-4 shadow-card ${className}`}>
      {children}
    </div>
  );
}
