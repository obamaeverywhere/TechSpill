import { ArrowDown, ArrowUpRight } from "lucide-react";
import type { Article } from "@techpulse/shared";
import { ArticleCard } from "./ArticleCard";
import { Link } from "react-router-dom";
export function HeroSection({ article }: { article?: Article }) {
  return (
    <section className="hero-section" aria-labelledby="hero-heading">
      <div className="hero-copy">
        <span className="eyebrow">
          <span className="live-dot" />
          CURIOUS MINDS. NEXT BIG THINGS.
        </span>
        <h1 id="hero-heading">
          The internet moves fast.
          <br />
          <span>We spill faster.</span>
        </h1>
        <p>
          Your daily fix of tech news, AI breakthroughs, startup moves, and
          everything shaping tomorrow.
        </p>
        <div className="hero-actions">
          <a className="primary-button" href="#fresh-spills">
            Catch the Latest <ArrowDown size={17} />
          </a>
          <Link className="secondary-button" to="/bangladesh">
            Explore BD Tech <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
      {article ? (
        <div className="hero-story">
          <span className="hero-story-label">JUST DROPPED ⚡</span>
          <ArticleCard article={article} hero />
        </div>
      ) : (
        <div className="hero-stamp" aria-hidden="true">
          <span>STAY CURIOUS</span>
          <svg viewBox="0 0 100 100" fill="none">
            <path
              d="M50 7v86M7 50h86M20 20l60 60m0-60L20 80"
              stroke="currentColor"
              strokeWidth="10"
            />
          </svg>
          <span>SPILL WHAT'S NEXT ↗</span>
        </div>
      )}
    </section>
  );
}
