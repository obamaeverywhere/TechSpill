import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  Globe2,
  LayoutGrid,
  List,
  MapPin,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { BD_CATEGORIES, CONTENT_LABELS } from "@techpulse/shared";
import {
  getBangladeshNews,
  getBangladeshSources,
  getBangladeshCategories,
} from "../services/api";
import { useFeedParams } from "../hooks/useFeedParams";
import { ArticleCard, SourceMark } from "../components/ArticleCard";
import { BangladeshFlag } from "../components/BangladeshFlag";
import { ErrorState, LoadingState } from "../components/States";
import { BangladeshSections } from "../components/BangladeshSections";
import { bangladeshDate, relativeTime } from "../utils/format";
const REFRESH = Math.max(
  15000,
  Number(import.meta.env.VITE_REFRESH_INTERVAL_MS || 60000),
);
export function BangladeshPage() {
  const [params, setParams, currentParams] = useFeedParams();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [moreFilters, setMoreFilters] = useState(false);
  const [search, setSearch] = useState(params.get("search") || "");
  useEffect(
    () => setSearch(params.get("search") || ""),
    [params.get("search")],
  );
  const queryParams = new URLSearchParams(params);
  queryParams.set("limit", "10");
  const feed = useQuery({
    queryKey: ["bangladesh-news", queryParams.toString()],
    queryFn: ({ signal }) => getBangladeshNews(queryParams, signal),
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH,
  });
  const trending = useQuery({
    queryKey: ["bangladesh-trending"],
    queryFn: ({ signal }) =>
      getBangladeshNews(
        new URLSearchParams({ sort: "trending", limit: "4" }),
        signal,
      ),
    refetchInterval: REFRESH,
  });
  const sources = useQuery({
    queryKey: ["bangladesh-sources"],
    queryFn: getBangladeshSources,
    refetchInterval: REFRESH,
  });
  const categories = useQuery({
    queryKey: ["bangladesh-categories"],
    queryFn: getBangladeshCategories,
    refetchInterval: REFRESH,
  });
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(currentParams.current);
    next.delete("page");
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };
  const clear = () => {
    setSearch("");
    setParams({});
  };
  const hasFilters = [
    "category",
    "search",
    "source",
    "language",
    "dateFrom",
    "dateTo",
  ].some((key) => params.has(key));
  const page = Number(params.get("page") || 1),
    articles = feed.data?.data || [];
  const feature =
    !hasFilters && page === 1 && !params.has("sort") && articles.length > 0;
  const stories = feature ? articles.slice(1) : articles;
  const sourceData = sources.data?.data || [],
    enabledSources = sourceData.filter((s) => s.enabled),
    lastChecked = feed.data?.meta.lastCollectedAt;
  const now = new Date();
  return (
    <div className="dashboard-page bangladesh-page">
      <div className="bd-breadcrumb">
        <Link to="/">
          <ArrowLeft size={13} />
          Global Tech News
        </Link>
        <span>/</span>
        <span>Bangladesh</span>
        <span className="bd-dhaka-clock">
          <MapPin size={11} />
          Dhaka · UTC+6
        </span>
      </div>
      <section className="bd-masthead">
        <div className="bd-masthead-copy">
          <div className="eyebrow">
            <BangladeshFlag />
            THE LOCAL SPILL
          </div>
          <h1>
            BD Tech Scene <span aria-label="Bangladesh">🇧🇩</span>
          </h1>
          <p>
            From Dhaka startups to the next big innovation — here's what's
            happening in Bangladesh's tech world.
          </p>
          <div className="bd-masthead-foot">
            <span lang="bn">বাংলাদেশের প্রযুক্তির খবর</span>
            <span className="masthead-foot-divider" />
            <span>Local roots. Global energy.</span>
          </div>
        </div>
        <div className="bd-masthead-status">
          <div className="bd-flag-art" aria-hidden="true">
            <span />
            <Globe2 size={120} strokeWidth={0.6} />
          </div>
          <time>
            {now.toLocaleDateString("en-GB", {
              timeZone: "Asia/Dhaka",
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </time>
          <span className="bd-check-time">
            <span
              className={`source-dot ${lastChecked ? "" : "dot-pending"}`}
            />
            {lastChecked
              ? `Feed check: ${bangladeshDate(lastChecked)} BST`
              : "Awaiting first successful collection"}
          </span>
        </div>
      </section>
      <section className="bd-hero">
        <span className="eyebrow">DHAKA & BEYOND ↗</span>
        <h2>
          Big Things Are Brewing <br />
          in <span>BD Tech.</span>
        </h2>
        <p>
          Startups. AI. Fintech. Innovation. Your front-row seat to Bangladesh’s
          tech revolution.
        </p>
        <a className="secondary-button" href="#bd-stories">
          Explore the scene <ArrowRight size={17} />
        </a>
        <span className="bd-hero-decoration" aria-hidden="true">
          bd.
        </span>
      </section>
      <nav className="bd-category-nav" aria-label="Bangladesh topics">
        <button
          className={!params.has("category") ? "selected" : ""}
          onClick={() => update("category", "")}
        >
          <BangladeshFlag />
          All stories
        </button>
        {BD_CATEGORIES.map(([slug, name, short]) => (
          <button
            key={slug}
            title={name}
            className={params.get("category") === slug ? "selected" : ""}
            aria-pressed={params.get("category") === slug}
            onClick={() => update("category", slug)}
          >
            {slug === "ai" && <Sparkles size={13} />} {short}
          </button>
        ))}
      </nav>
      <div className="content-columns bd-content-columns" id="bd-stories">
        <div className="news-main">
          <div className="bd-feed-toolbar">
            <div className="bd-feed-tabs">
              <button
                className={params.get("sort") !== "trending" ? "selected" : ""}
                onClick={() => update("sort", "newest")}
              >
                <Radio size={15} />
                Latest updates
              </button>
              <button
                className={params.get("sort") === "trending" ? "selected" : ""}
                onClick={() => update("sort", "trending")}
              >
                <Flame size={15} />
                Trending
              </button>
            </div>
            <button
              className={`filter-button ${moreFilters ? "filter-active" : ""}`}
              aria-expanded={moreFilters}
              aria-controls="bangladesh-extra-filters"
              onClick={() => setMoreFilters((v) => !v)}
            >
              <SlidersHorizontal size={14} />
              Filters
            </button>
            <div className="view-toggle">
              <button
                aria-label="Grid view"
                aria-pressed={view === "grid"}
                className={view === "grid" ? "active" : ""}
                onClick={() => setView("grid")}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                aria-label="Compact view"
                title="Quick Spill — compact view"
                aria-pressed={view === "list"}
                className={view === "list" ? "active" : ""}
                onClick={() => setView("list")}
              >
                <List size={16} />
              </button>
            </div>
            <button
              className={`icon-button ${feed.isFetching ? "refreshing" : ""}`}
              aria-label="Refresh Bangladesh feed"
              disabled={feed.isFetching}
              onClick={() => {
                void feed.refetch();
                void trending.refetch();
                void sources.refetch();
              }}
            >
              <RefreshCw size={15} />
            </button>
          </div>
          <div className="bd-filter-row">
            <form
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                update("search", search.trim());
              }}
            >
              <Search size={15} />
              <input
                type="search"
                aria-label="Search Bangladesh stories"
                placeholder="Search companies, ideas, developments…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button aria-label="Submit Bangladesh search">
                <ArrowRight size={15} />
              </button>
            </form>
            <label>
              <span className="sr-only">Bangladesh publisher</span>
              <select
                aria-label="Bangladesh publisher"
                value={params.get("source") || ""}
                onChange={(e) => update("source", e.target.value)}
              >
                <option value="">All sources</option>
                {sourceData
                  .filter((s) => s.enabled || s.articleCount > 0)
                  .map((s) => (
                    <option key={s.id} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Article language</span>
              <select
                aria-label="Article language"
                value={params.get("language") || ""}
                onChange={(e) => update("language", e.target.value)}
              >
                <option value="">All languages</option>
                <option value="en">English</option>
                <option value="bn">বাংলা</option>
              </select>
            </label>
          </div>
          {moreFilters && (
            <div
              id="bangladesh-extra-filters"
              className="filter-panel bd-extra-filters"
            >
              <label>
                Published from
                <input
                  type="date"
                  aria-label="Bangladesh published from"
                  value={params.get("dateFrom")?.slice(0, 10) || ""}
                  onChange={(e) => update("dateFrom", e.target.value)}
                />
              </label>
              <label>
                Published through
                <input
                  type="date"
                  aria-label="Bangladesh published through"
                  value={params.get("dateTo")?.slice(0, 10) || ""}
                  onChange={(e) => update("dateTo", e.target.value)}
                />
              </label>
              <p>
                <Clock3 size={12} />
                Date boundaries and displayed times use Asia/Dhaka.
              </p>
            </div>
          )}
          {hasFilters && (
            <div className="active-filters bd-active-filters">
              {[
                "search",
                "category",
                "source",
                "language",
                "dateFrom",
                "dateTo",
              ]
                .filter((key) => params.has(key))
                .map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      update(key, "");
                      if (key === "search") setSearch("");
                    }}
                  >
                    {key === "category"
                      ? BD_CATEGORIES.find((c) => c[0] === params.get(key))?.[2]
                      : key === "language"
                        ? params.get(key) === "bn"
                          ? "বাংলা"
                          : "English"
                        : params.get(key)}
                    <X size={11} />
                  </button>
                ))}
              <button className="clear-filters" onClick={clear}>
                Clear filters
              </button>
            </div>
          )}
          {feed.isPending ? (
            <LoadingState />
          ) : feed.isError ? (
            <ErrorState
              message={feed.error.message}
              retry={() => void feed.refetch()}
              onReset={hasFilters ? clear : undefined}
            />
          ) : (
            <>
              <div className="bd-results-line">
                <span>
                  {feed.data.meta.total.toLocaleString()}{" "}
                  {hasFilters
                    ? "matching stories"
                    : "stories with a Bangladesh connection"}
                </span>
                {feed.isFetching && (
                  <span className="updating-label" role="status">
                    <RefreshCw size={11} />
                    Updating…
                  </span>
                )}
              </div>
              {feature && (
                <section className="bd-featured">
                  <div className="section-heading">
                    <h2>
                      <span className="section-accent" />
                      Just Dropped in BD
                    </h2>
                    <span className="editor-pick">THE BANGLADESH BRIEFING</span>
                  </div>
                  <ArticleCard article={articles[0]} hero regional />
                </section>
              )}
              {articles.length === 0 ? (
                <div className="empty-state bd-empty">
                  <BangladeshFlag />
                  <h3>
                    {hasFilters
                      ? "No Bangladesh tech stories match these filters."
                      : "Your Bangladesh briefing is taking shape."}
                  </h3>
                  <p>
                    {hasFilters
                      ? "Try another topic, language, source, or date range."
                      : "New stories appear after the background worker collects and checks real source metadata."}
                  </p>
                  {hasFilters && (
                    <button className="primary-button" onClick={clear}>
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <section className="bd-latest">
                  <div className="section-heading">
                    <h2>
                      <span className="section-accent" />
                      {params.get("sort") === "trending"
                        ? "Trending in Bangladesh"
                        : hasFilters
                          ? "Your local briefing"
                          : "Fresh Spills from BD"}
                    </h2>
                    <span className="bd-dates-label">All times BST</span>
                  </div>
                  <div
                    className={`news-grid bd-news-grid ${view === "list" ? "list-view" : ""}`}
                    aria-busy={feed.isFetching}
                  >
                    {stories.map((article) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        regional
                        compact={view === "list"}
                        searchTerm={params.get("search")}
                      />
                    ))}
                  </div>
                </section>
              )}
              {feed.data.meta.totalPages > 1 && (
                <nav
                  className="pagination"
                  aria-label="Bangladesh news pagination"
                >
                  <span>
                    Page {page} of {feed.data.meta.totalPages}
                  </span>
                  <div>
                    <button
                      disabled={page <= 1 || feed.isPlaceholderData}
                      onClick={() => {
                        const next = new URLSearchParams(currentParams.current);
                        next.set("page", String(page - 1));
                        setParams(next);
                      }}
                    >
                      <ChevronLeft size={14} />
                      Previous
                    </button>
                    <button
                      disabled={
                        page >= feed.data.meta.totalPages ||
                        feed.isPlaceholderData
                      }
                      onClick={() => {
                        const next = new URLSearchParams(currentParams.current);
                        next.set("page", String(page + 1));
                        setParams(next);
                      }}
                    >
                      Next page
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </nav>
              )}
            </>
          )}
        </div>
        <aside className="right-rail bd-right-rail">
          <section className="bd-trending-panel">
            <div className="panel-heading">
              <h2>
                <Flame size={17} />
                Trending in Bangladesh
              </h2>
              <BangladeshFlag />
            </div>
            <p className="panel-subtitle">
              Developments worth keeping on your radar.
            </p>
            {trending.isError ? (
              <p className="rail-empty">Trending is temporarily unavailable.</p>
            ) : trending.isPending ? (
              <p className="rail-empty">Checking the local signal…</p>
            ) : (
              <div className="ranked-stories">
                {trending.data.data.map((article, i) => (
                  <article key={article.id}>
                    <span className="rank-number">0{i + 1}</span>
                    <div>
                      <span className="rank-category">
                        {article.categories[0]?.name || "Bangladesh technology"}
                      </span>
                      <h3 lang={article.language || undefined}>
                        <a
                          href={article.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {article.title}
                        </a>
                      </h3>
                      <div className="rank-meta">
                        <span>
                          {article.publisherName || article.source.name}
                        </span>
                        <span>·</span>
                        <span>{relativeTime(article.publishedAt)}</span>
                        {article.contentKind &&
                          article.contentKind !== "REPORTING" && (
                            <span className="content-disclosure">
                              {CONTENT_LABELS[article.contentKind]}
                            </span>
                          )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <p className="bd-rank-note">
              Calculated from freshness and reporting from distinct publisher
              hosts. Scores are not views or shares.
            </p>
            <button
              className="text-link"
              onClick={() => update("sort", "trending")}
            >
              Explore the local signal
              <ArrowRight size={14} />
            </button>
          </section>
          <section className="bd-topics-panel">
            <div className="panel-heading">
              <h2>
                <Sparkles size={16} />
                Explore the ecosystem
              </h2>
            </div>
            <div className="bd-topic-counts">
              {BD_CATEGORIES.filter(([slug]) =>
                ["startups", "ai", "fintech", "telecom", "innovation"].includes(
                  slug,
                ),
              ).map(([slug, name, short]) => (
                <button key={slug} onClick={() => update("category", slug)}>
                  <span>{short}</span>
                  <span>
                    {categories.data?.data.find((c) => c.slug === slug)
                      ?.count ?? "—"}
                    <ChevronRight size={12} />
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section className="newsroom-panel bd-newsroom">
            <div className="panel-heading">
              <h2>
                <Radio size={16} />
                The local newsroom
              </h2>
              <span className="bd-source-count">
                {sources.data ? enabledSources.length : "—"} active feeds
              </span>
            </div>
            {enabledSources.map((source) => (
              <button
                key={source.id}
                onClick={() => update("source", source.slug)}
                className="newsroom-row"
              >
                <SourceMark name={source.name} color={source.color} />
                <div>
                  <strong>{source.name}</strong>
                  <span>
                    {source.lastError
                      ? "Feed temporarily unavailable"
                      : source.lastSuccessAt
                        ? `Checked ${relativeTime(source.lastSuccessAt).toLowerCase()}`
                        : "Awaiting first feed check"}
                  </span>
                </div>
                <span
                  className={`source-dot ${source.lastError ? "dot-error" : source.lastSuccessAt ? "" : "dot-pending"}`}
                />
              </button>
            ))}
            <details className="bd-source-limitations">
              <summary>Source availability</summary>
              {sourceData
                .filter((s) => !s.enabled)
                .map((source) => (
                  <div key={source.id}>
                    <strong>{source.name}</strong>
                    <p>
                      {source.collectionNotes || "This source is not enabled."}
                    </p>
                  </div>
                ))}
            </details>
          </section>
          <section className="bd-quality-note">
            <span className="bd-quality-icon">
              <ShieldCheck size={23} />
            </span>
            <span className="eyebrow">A CLEARER LOCAL PICTURE</span>
            <h3>
              Technology.
              <br />
              With a Bangladesh connection.
            </h3>
            <p>
              Every public story passes both relevance checks. Official
              announcements, press releases, and disclosed brand stories carry
              separate labels.
            </p>
            <span>
              <CheckCheck size={14} />
              Original sources, always credited.
            </span>
          </section>
        </aside>
      </div>
      {!hasFilters && page === 1 && !params.has("sort") && (
        <BangladeshSections categories={categories.data?.data || []} />
      )}
      <div className="bd-section-footer">
        <BangladeshFlag />
        <span>Rooted in Bangladesh. Connected to the world.</span>
        <Link to="/">
          Explore global news
          <ArrowUpRight size={13} />
        </Link>
      </div>
    </div>
  );
}
