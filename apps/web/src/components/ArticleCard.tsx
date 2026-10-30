import { ArrowUpRight, Bookmark, Layers } from "lucide-react";
import { useState } from "react";
import type { Article } from "@techpulse/shared";
import { CONTENT_LABELS } from "@techpulse/shared";
import { usePreferences } from "../hooks/usePreferences";
import { Highlight } from "./TextHighlight";
import { fullDate, relativeTime, bangladeshDate } from "../utils/format";
export function SourceMark({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="source-mark"
      aria-hidden="true"
      style={{ "--source": color } as React.CSSProperties}
    >
      {name === "Hacker News"
        ? "Y"
        : name === "TechCrunch"
          ? "TC"
          : name === "The Verge"
            ? "V"
            : name === "Ars Technica"
              ? "ars"
              : name === "Engadget"
                ? "e"
                : name === "WIRED"
                  ? "W"
                  : name.charAt(0)}
    </span>
  );
}
export function ArticleImage({
  article,
  hero = false,
}: {
  article: Article;
  hero?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <div
      className={`article-image ${!article.imageUrl || broken ? "image-fallback" : ""} category-${article.categories[0]?.slug || "general"}`}
    >
      {article.imageUrl && !broken ? (
        <img
          src={article.imageUrl}
          alt=""
          loading={hero ? "eager" : "lazy"}
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="fallback-art" aria-hidden="true">
          <span className="orb orb-one" />
          <span className="orb orb-two" />
          <span className="fallback-monogram">
            ts<span>.</span>
          </span>
          <span className="fallback-label">TECHSPILL / NO PUBLISHER IMAGE</span>
          <span className="fallback-publisher">{article.source.name}</span>
        </div>
      )}
    </div>
  );
}
export function SaveButton({
  article,
  className = "",
}: {
  article: Article;
  className?: string;
}) {
  const { saved, toggleSave } = usePreferences();
  const isSaved = saved.includes(article.id);
  return (
    <button
      className={`icon-button save-button ${isSaved ? "is-saved" : ""} ${className}`}
      aria-label={`${isSaved ? "Unsave" : "Save"} ${article.title}`}
      title={isSaved ? "Remove from saved" : "Save story"}
      aria-pressed={isSaved}
      onClick={() => toggleSave(article.id)}
    >
      <Bookmark size={17} fill={isSaved ? "currentColor" : "none"} />
    </button>
  );
}
export function ArticleCard({
  article,
  hero = false,
  compact = false,
  regional = false,
  searchTerm,
}: {
  article: Article;
  hero?: boolean;
  compact?: boolean;
  regional?: boolean;
  searchTerm?: string | null;
}) {
  return (
    <article
      lang={article.language || undefined}
      className={`article-card ${hero ? "hero-card" : ""} ${compact ? "compact-card" : ""} ${regional ? "regional-card" : ""}`}
    >
      <a
        className="image-link"
        href={article.originalUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Read ${article.title} at ${article.source.name}`}
        tabIndex={-1}
      >
        <ArticleImage article={article} hero={hero} />
      </a>
      <div className="article-body">
        <div className="article-topline">
          <span className="category-label">
            {article.categories[0]?.name || "Technology"}
          </span>
          {hero && (
            <span className="featured-label">
              <span /> IN FOCUS
            </span>
          )}
          {!hero && <SaveButton article={article} />}
        </div>
        <h3>
          <a
            href={article.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Highlight text={article.title} term={searchTerm} />
            <ArrowUpRight className="headline-arrow" size={19} />
          </a>
        </h3>
        {article.description && (
          <p className="article-description">
            <Highlight text={article.description} term={searchTerm} />
          </p>
        )}
        {!regional &&
          article.contentKind &&
          article.contentKind !== "REPORTING" && (
            <span className="content-disclosure global-disclosure">
              {CONTENT_LABELS[article.contentKind]}
            </span>
          )}
        {hero && (
          <div className="hero-tags">
            {article.tags.slice(0, 3).map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        )}
        <div className="article-footer">
          <div className="article-byline">
            <SourceMark
              name={article.source.name}
              color={article.source.color}
            />
            <span
              title={
                article.publisherName
                  ? `${article.publisherName} via ${article.source.name}`
                  : article.source.name
              }
            >
              {article.publisherName || article.source.name}
            </span>
            <i>·</i>
            <time
              dateTime={article.publishedAt}
              title={
                regional
                  ? `${bangladeshDate(article.publishedAt)} · Asia/Dhaka`
                  : fullDate(article.publishedAt)
              }
            >
              {regional
                ? bangladeshDate(article.publishedAt)
                : relativeTime(article.publishedAt)}
            </time>
          </div>
          {hero ? (
            <SaveButton article={article} />
          ) : (
            <ArrowUpRight size={17} className="read-arrow" aria-hidden="true" />
          )}
        </div>
        {article.coverageCount > 1 && (
          <span className="coverage-label">
            <Layers size={12} />
            {article.coverageCount} sources covering this story
          </span>
        )}
        {!regional && (
          <a
            href={article.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="read-original"
          >
            Read original <ArrowUpRight size={13} />
          </a>
        )}
        {regional && (
          <div className="regional-card-actions">
            <span className="language-badge">
              {article.language === "bn"
                ? "বাংলা"
                : article.language === "en"
                  ? "English"
                  : article.language || "Language unknown"}
            </span>
            {article.contentKind && article.contentKind !== "REPORTING" && (
              <span
                className={`content-disclosure disclosure-${article.contentKind.toLowerCase()}`}
              >
                {CONTENT_LABELS[article.contentKind]}
              </span>
            )}
            <a
              href={article.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="read-original"
            >
              Read original
              <ArrowUpRight size={13} />
            </a>
          </div>
        )}
        {regional && !hero && article.classificationReason && (
          <details className="relevance-details">
            <summary>Why this story is here</summary>
            <p>{article.classificationReason}</p>
            <span>
              {article.classificationLocked
                ? "Reviewed by an editor"
                : "Relevance checked by rules; not independent fact verification."}
            </span>
          </details>
        )}
      </div>
    </article>
  );
}
