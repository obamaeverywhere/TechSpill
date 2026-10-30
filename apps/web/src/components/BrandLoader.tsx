import { TechSpillLogo } from "./TechSpillLogo";

export function BrandLoader({ label = "Gathering fresh spills…", compact = false }: { label?: string; compact?: boolean }) {
  return <div className={`brand-loader ${compact ? "brand-loader-compact" : ""}`}>
    <TechSpillLogo compact={compact}/>
    <span className="spill-loader-dots" aria-hidden="true"><i/><i/><i/></span>
    <p>{label}</p>
  </div>;
}
