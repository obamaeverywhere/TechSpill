import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  Globe2,
  LayoutGrid,
  List,
  Radio,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useEffect, useState } from "react";
import {
  CATEGORIES,
  CONTENT_LABELS,
  type Article,
  type Source,
} from "@techpulse/shared";
import { getNews, getSources, getCategories, getHealth } from "../services/api";
import { usePreferences } from "../hooks/usePreferences";
import { useFeedParams } from "../hooks/useFeedParams";
import { ArticleCard, SourceMark } from "../components/ArticleCard";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { HeroSection } from "../components/HeroSection";
import { fullDate, relativeTime } from "../utils/format";
const REFRESH = Math.max(
  15000,
  Number(import.meta.env.VITE_REFRESH_INTERVAL_MS || 60000),
);
function TrendingSidebar({
  articles,
  sources,
  onTopic,
}: {
  articles: Article[];
  sources: Source[];
  onTopic: (s: string) => void;
}) {
  const topics = [...new Set(articles.flatMap((a) => a.tags))].slice(0, 7);
  return (
    <aside className="right-rail">
      <section className="trending-panel">
        <div className="panel-heading">
          <h2>
            <TrendingUp size={17} />
            HOT RIGHT NOW
          </h2>
          <span className="live-dot" />
        </div>
        <p className="panel-subtitle">
          Ranked by freshness, coverage, and Hacker News points — not audience
          engagement.
        </p>
        <div className="ranked-stories">
          {articles.slice(0, 5).map((a, i) => (
            <article key={a.id}>
              <span className="rank-number">0{i + 1}</span>
              <div>
                <span className="rank-category">
                  {a.categories[0]?.name || "Technology"}
                </span>
                <h3>
                  <a
                    href={a.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {a.title}
                  </a>
                </h3>
                <div className="rank-meta">
                  {a.publisherName || a.source.name}
                  <span>·</span>
                  {relativeTime(a.publishedAt)}
                  {a.contentKind && a.contentKind !== "REPORTING" && (
                    <span className="content-disclosure">
                      {CONTENT_LABELS[a.contentKind]}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
        {!articles.length && (
          <p className="rail-empty">
            Trending stories will appear after the first collection.
          </p>
        )}
        <Link className="text-link" to="/trending">
          Explore trending <ArrowRight size={15} />
        </Link>
      </section>
      {topics.length > 0 && (
        <section className="topics-panel">
          <div className="panel-heading">
            <h2>
              <span className="hash-mark">#</span>The rabbit holes
            </h2>
          </div>
          <div className="topic-cloud">
            {topics.map((t) => (
              <button key={t} onClick={() => onTopic(t)}>
                # {t}
              </button>
            ))}
          </div>
          <p>Topics from the current trending stories.</p>
        </section>
      )}
      <section className="newsroom-panel">
        <div className="panel-heading">
          <h2>
            <Radio size={17} />
            From the newsroom
          </h2>
          <Link to="/sources" aria-label="View all source health">
            <ArrowUpRight size={17} />
          </Link>
        </div>
        {sources
          .filter((s) => s.enabled)
          .slice(0, 4)
          .map((s) => (
            <Link key={s.id} to={`/?source=${s.slug}`} className="newsroom-row">
              <SourceMark name={s.name} color={s.color} />
              <div>
                <strong>{s.name}</strong>
                <span>
                  {s.lastError
                    ? "Feed temporarily unavailable"
                    : s.lastSuccessAt
                      ? `Checked ${relativeTime(s.lastSuccessAt).toLowerCase()}`
                      : "Awaiting first collection"}
                </span>
              </div>
              <span
                className={`source-dot ${s.lastError ? "dot-error" : s.lastSuccessAt ? "" : "dot-pending"}`}
              />
            </Link>
          ))}
      </section>
      <div className="curiosity-card">
        <div className="curiosity-art">
          <Globe2 size={49} strokeWidth={0.8} />
          <Sparkles size={18} />
        </div>
        <span className="eyebrow">LESS NOISE. MORE PERSPECTIVE.</span>
        <h3>
          Stay curious.
          <br />
          Stay a step ahead.
        </h3>
        <p>
          Original publishers. Fresh perspectives.
          <br />
          Your world of technology, connected.
        </p>
        <Link to="/sources">
          Meet your sources <ArrowUpRight size={15} />
        </Link>
      </div>
    </aside>
  );
}
export function NewsPage() {
  const [params, setParams, currentParams] = useFeedParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { saved } = usePreferences();
  const isSaved = location.pathname === "/saved",
    isTrending = location.pathname === "/trending";
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const queryParams = new URLSearchParams(params);
  queryParams.set("limit", "9");
  if (isTrending && !params.has("sort")) queryParams.set("sort", "trending");
  if (isSaved) queryParams.set("ids", saved.join(","));
  const query = useQuery({
    queryKey: ["news", location.pathname, queryParams.toString()],
    queryFn: ({ signal }) => getNews(queryParams, signal),
    refetchInterval: REFRESH,
    placeholderData: keepPreviousData,
  });
  const trending = useQuery({
    queryKey: ["trending-preview"],
    queryFn: ({ signal }) =>
      getNews(new URLSearchParams({ sort: "trending", limit: "5" }), signal),
    refetchInterval: REFRESH,
  });
  const sources = useQuery({
    queryKey: ["sources"],
    queryFn: getSources,
    refetchInterval: REFRESH,
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    refetchInterval: REFRESH,
  });
  const health = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    refetchInterval: REFRESH,
  });
  const category = params.get("category");
  const categoryName = CATEGORIES.find((c) => c[0] === category)?.[1];
  const term = params.get("q");
  const page = Number(params.get("page") || 1);
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(currentParams.current);
    next.delete("page");
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };
  const reset = () => setParams({});
  const hasFilters = [
    "q",
    "category",
    "source",
    "from",
    "to",
    "language",
    "region",
  ].some((k) => params.has(k));
  const isHome =
    !isSaved && !isTrending && !hasFilters && page === 1 && !params.has("sort");
  const articles = query.data?.data || [];
  const featured = isHome ? articles.slice(0, 1) : [];
  const latest = isHome ? articles.slice(1) : articles;
  const lastCollected = query.data?.meta.lastCollectedAt;
  const date = new Date(now);
  const sourceSlugs = params.get("source")?.split(",") || [];
  const toggleSource = (slug: string) =>
    update(
      "source",
      (sourceSlugs.includes(slug)
        ? sourceSlugs.filter((s) => s !== slug)
        : [...sourceSlugs, slug]
      ).join(","),
    );
  const title = isSaved
    ? "Your reading list."
    : isTrending
      ? "Hot Right Now."
      : term
        ? `Results for “${term}”`
        : categoryName
          ? `${categoryName}.`
          : "Fresh Spills.";
  const activeCount = ["source", "from", "to", "language", "region"].filter(
    (k) => params.has(k),
  ).length;
  const clearOne = (key: string) => {
    const next = new URLSearchParams(currentParams.current);
    next.delete(key);
    next.delete("page");
    setParams(next);
  };
  return (
    <div className="dashboard-page">
      {isHome && <HeroSection article={featured[0]} />}
      <div className={`page-intro ${isHome ? "home-intro" : ""}`}>
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />
            {isSaved
              ? "COLLECT YOUR CURIOSITY"
              : isTrending
                ? "THE STORIES TO WATCH"
                : "THE TECHNOLOGY BRIEFING"}
          </div>
          {isHome ? <h2>JUST DROPPED ⚡</h2> : <h1>{title}</h1>}
          <p>
            {isSaved
              ? "The stories you want to come back to. All in one place."
              : isTrending
                ? "Ranked by freshness, source coverage, and Hacker News points."
                : "The latest in technology. The stories that matter. All in one place."}
          </p>
        </div>
        <div className="date-status">
          <span>
            <Clock3 size={14} />
            {date.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span
            className="collection-status"
            title={
              lastCollected
                ? fullDate(lastCollected)
                : "Awaiting worker collection"
            }
          >
            <span
              className={`source-dot ${health.data?.data.collection.stale ? "dot-error" : lastCollected ? "" : "dot-pending"}`}
            />
            {lastCollected
              ? `Feeds checked ${relativeTime(lastCollected).toLowerCase()}`
              : "Waiting for collection"}
            <button
              className={`refresh-button ${query.isFetching ? "refreshing" : ""}`}
              disabled={query.isFetching}
              aria-label="Refresh news from database"
              onClick={() => {
                void query.refetch();
                void trending.refetch();
                void sources.refetch();
                void health.refetch();
              }}
            >
              <RefreshCw size={13} />
            </button>
          </span>
        </div>
      </div>
      <div className="obsession-heading">
        <h2>Pick Your Obsession</h2>
        <span>Your feed. Your frequency.</span>
      </div>
      <div
        className="category-strip"
        role="navigation"
        aria-label="Quick topics"
      >
        <button
          className={!category ? "selected" : ""}
          aria-pressed={!category}
          onClick={() => clearOne("category")}
        >
          <LayoutGrid size={15} />
          All news
        </button>
        {[
          ["artificial-intelligence", "AI"],
          ["cybersecurity", "Cybersecurity"],
          ["consumer-electronics", "Gadgets"],
          ["startups", "Startups"],
          ["gaming", "Gaming"],
          ["cloud-computing", "Cloud"],
          ["robotics", "Robotics"],
          ["space-technology", "Space Tech"],
          ["software-development", "Coding"],
        ].map(([slug, name]) => (
          <button
            className={category === slug ? "selected" : ""}
            key={slug}
            aria-pressed={category === slug}
            onClick={() => update("category", slug)}
          >
            {slug === "artificial-intelligence" && <Sparkles size={14} />}{" "}
            {name}
          </button>
        ))}
        <Link to="/bangladesh?category=fintech" className="fintech-pill">
          Fintech ↗
        </Link>
        <select
          aria-label="More categories"
          value={
            category &&
            ![
              "artificial-intelligence",
              "cybersecurity",
              "consumer-electronics",
              "startups",
              "gaming",
              "cloud-computing",
              "robotics",
              "space-technology",
              "software-development",
            ].includes(category)
              ? category
              : ""
          }
          onChange={(e) => {
            if (e.target.value) update("category", e.target.value);
          }}
        >
          <option value="">More topics</option>
          {CATEGORIES.map(([slug, name]) => (
            <option value={slug} key={slug}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="content-columns">
        <div className="news-main">
          {query.isError ? (
            <ErrorState
              message={query.error.message}
              retry={() => void query.refetch()}
              onReset={hasFilters ? reset : undefined}
            />
          ) : query.isPending ? (
            <LoadingState />
          ) : (
            <>
              <section className="latest-section" id="fresh-spills">
                <div className="section-heading latest-heading">
                  <h2>
                    {isSaved ? (
                      <Bookmark size={20} />
                    ) : isTrending ? (
                      <Flame size={20} />
                    ) : (
                      <span className="section-accent" />
                    )}
                    {isSaved
                      ? "Saved stories"
                      : isTrending
                        ? "Trending now"
                        : hasFilters
                          ? "Your news feed"
                          : "Fresh Spills"}{" "}
                    <span className="story-count">
                      {query.data.meta.total.toLocaleString()}
                    </span>
                  </h2>
                  <div className="feed-controls">
                    <button
                      className={`filter-button ${filterOpen || activeCount ? "filter-active" : ""}`}
                      onClick={() => setFilterOpen((v) => !v)}
                      aria-expanded={filterOpen}
                      aria-controls="filter-panel"
                    >
                      <SlidersHorizontal size={14} />
                      Filters{activeCount > 0 && <span>{activeCount}</span>}
                    </button>
                    <label className="sort-label">
                      <span className="sr-only">Sort articles</span>
                      <ArrowDown size={13} />
                      <select
                        aria-label="Sort articles"
                        value={
                          params.get("sort") ||
                          (isTrending ? "trending" : "newest")
                        }
                        onChange={(e) => update("sort", e.target.value)}
                      >
                        <option value="newest">Newest first</option>
                        <option value="trending">Trending score</option>
                      </select>
                    </label>
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
                  </div>
                </div>
                {filterOpen && (
                  <div className="filter-panel" id="filter-panel">
                    <div className="filter-panel-title">
                      <strong>Make the feed yours</strong>
                      <button
                        className="icon-button"
                        aria-label="Close filters"
                        onClick={() => setFilterOpen(false)}
                      >
                        <X size={17} />
                      </button>
                    </div>
                    <fieldset>
                      <legend>News sources</legend>
                      <div className="source-checkboxes">
                        {sources.data?.data
                          .filter((s) => s.enabled || s.articleCount)
                          .map((s) => (
                            <label key={s.id}>
                              <input
                                type="checkbox"
                                checked={sourceSlugs.includes(s.slug)}
                                onChange={() => toggleSource(s.slug)}
                              />
                              <SourceMark name={s.name} color={s.color} />
                              {s.name}
                            </label>
                          ))}
                      </div>
                    </fieldset>
                    <div className="filter-fields">
                      <label>
                        Published from
                        <input
                          type="date"
                          aria-label="Published from"
                          value={params.get("from")?.slice(0, 10) || ""}
                          onChange={(e) =>
                            update(
                              "from",
                              e.target.value
                                ? `${e.target.value}T00:00:00.000Z`
                                : "",
                            )
                          }
                        />
                      </label>
                      <label>
                        Published through
                        <input
                          type="date"
                          aria-label="Published through"
                          value={params.get("to")?.slice(0, 10) || ""}
                          onChange={(e) =>
                            update(
                              "to",
                              e.target.value
                                ? `${e.target.value}T23:59:59.999Z`
                                : "",
                            )
                          }
                        />
                      </label>
                      <label>
                        Language
                        <select
                          aria-label="Language"
                          value={params.get("language") || ""}
                          onChange={(e) => update("language", e.target.value)}
                        >
                          <option value="">All languages</option>
                          {sources.data?.meta.languages.map((l) => (
                            <option key={l} value={l}>
                              {new Intl.DisplayNames(["en"], {
                                type: "language",
                              }).of(l) || l}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Coverage region
                        <select
                          aria-label="Coverage region"
                          value={params.get("region") || ""}
                          onChange={(e) => update("region", e.target.value)}
                          disabled={!sources.data?.meta.regions.length}
                        >
                          <option value="">
                            {sources.data?.meta.regions.length
                              ? "All available regions"
                              : "Not reported by feeds"}
                          </option>
                          {sources.data?.meta.regions.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="filter-panel-bottom">
                      <span>
                        Dates use UTC. Region appears only when supplied by a
                        source.
                      </span>
                      <button onClick={reset}>Reset all</button>
                    </div>
                  </div>
                )}
                {hasFilters && (
                  <div className="active-filters">
                    {[
                      "q",
                      "category",
                      "source",
                      "from",
                      "to",
                      "language",
                      "region",
                    ]
                      .filter((k) => params.has(k))
                      .map((key) => (
                        <button key={key} onClick={() => clearOne(key)}>
                          {key === "category"
                            ? categoryName
                            : key === "q"
                              ? `Search: ${term}`
                              : `${key}: ${params.get(key)?.replace(/T.*/, "")}`}
                          <X size={12} />
                        </button>
                      ))}
                    <button className="clear-filters" onClick={reset}>
                      Clear all
                    </button>
                  </div>
                )}
                {query.isFetching && (
                  <div className="updating-label" role="status">
                    <RefreshCw size={11} />
                    Updating your feed…
                  </div>
                )}
                {articles.length === 0 ? (
                  <EmptyState
                    saved={isSaved}
                    filtered={hasFilters}
                    onReset={() => (isSaved ? navigate("/") : reset())}
                  />
                ) : (
                  <div
                    className={`news-grid ${view === "list" ? "list-view" : ""}`}
                  >
                    {latest.map((a) => (
                      <ArticleCard
                        key={a.id}
                        article={a}
                        compact={view === "list"}
                        searchTerm={term}
                      />
                    ))}
                  </div>
                )}
                {isTrending && articles.length > 0 && (
                  <p className="ranking-note">
                    <TrendingUp size={13} />
                    Calculated from freshness, source coverage, and verified
                    Hacker News points. Scores are not views or shares.
                  </p>
                )}
                {query.data.meta.totalPages > 1 && (
                  <nav className="pagination" aria-label="News pagination">
                    <span>
                      Page {page} of{" "}
                      {query.data.meta.totalPages.toLocaleString()}
                    </span>
                    <div>
                      <button
                        disabled={page <= 1}
                        onClick={() => {
                          const p = new URLSearchParams(currentParams.current);
                          p.set("page", String(page - 1));
                          setParams(p);
                        }}
                      >
                        <ChevronLeft size={15} />
                        Previous
                      </button>
                      <button
                        disabled={page >= query.data.meta.totalPages}
                        onClick={() => {
                          const p = new URLSearchParams(currentParams.current);
                          p.set("page", String(page + 1));
                          setParams(p);
                        }}
                      >
                        Next page
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </nav>
                )}
              </section>
            </>
          )}
        </div>
        <TrendingSidebar
          articles={trending.data?.data || []}
          sources={sources.data?.data || []}
          onTopic={(topic) => {
            navigate(`/?q=${encodeURIComponent(topic)}`);
          }}
        />
      </div>
    </div>
  );
}
