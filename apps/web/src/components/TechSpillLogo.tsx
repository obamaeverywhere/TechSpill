export function TechSpillLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-wordmark" aria-label="TechSpill">
      <svg
        className="brand-symbol"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M17 3C17 3 5 14 5 21a11 11 0 0 0 22 0c0-5-5-10-5-10l-5 9V3Z"
          fill="currentColor"
        />
        <path
          d="m12 23 6-7"
          stroke="var(--bg)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      {!compact && (
        <span>
          techspill<span className="brand-period">.</span>
        </span>
      )}
    </span>
  );
}
