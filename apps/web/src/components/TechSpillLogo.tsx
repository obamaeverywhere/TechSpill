export function TechSpillLogo({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return <img className="brand-icon" src="/favicon.svg" width="48" height="48" alt="TechSpill" />;
  }
  return (
    <span className="brand-wordmark" role="img" aria-label="TechSpill">
      <svg viewBox="442 195 1287 343" width="188" height="50" aria-hidden="true" focusable="false">
        <image href="/brand/techspill-wordmark.webp" width="2172" height="724" />
      </svg>
    </span>
  );
}
