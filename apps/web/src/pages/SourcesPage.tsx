import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Check,
  Radio,
  RefreshCw,
  AlertCircle,
  Clock3,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getSources, getHealth } from "../services/api";
import { SourceMark } from "../components/ArticleCard";
import { ErrorState, LoadingState } from "../components/States";
import { fullDate, relativeTime } from "../utils/format";
export function SourcesPage() {
  const query = useQuery({
    queryKey: ["sources"],
    queryFn: getSources,
    refetchInterval: 60000,
  });
  const health = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    refetchInterval: 60000,
  });
  return (
    <div className="dashboard-page sources-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />
            MANY VOICES. ONE CLEARER PICTURE.
          </div>
          <h1>Your global newsroom.</h1>
          <p>
            Meet the sources behind your daily signal. See how every feed is
            doing.
          </p>
        </div>
        <button
          className="filter-button"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw size={15} />
          Refresh status
        </button>
      </div>
      <div className="sources-explainer">
        <Radio size={24} />
        <div>
          <h2>Collected independently. Connected for you.</h2>
          <p>
            Our background worker checks enabled sources automatically. A failed
            feed never replaces real reporting with generated headlines.
          </p>
        </div>
        <span
          className={`status-badge ${health.data?.data.collection.stale ? "status-warning" : ""}`}
        >
          {health.isPending
            ? "Checking worker…"
            : health.isError
              ? "Worker status unavailable"
              : health.data?.data.collection.stale
                ? "Worker check needed"
                : "Worker heartbeat received"}
        </span>
      </div>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : (
        <div className="source-grid">
          {query.data.data.map((s) => (
            <article className="source-card" key={s.id}>
              <div className="source-card-top">
                <SourceMark name={s.name} color={s.color} />
                <span
                  className={`status-badge ${s.lastError ? "status-warning" : !s.enabled ? "status-disabled" : ""}`}
                >
                  {!s.enabled
                    ? "Not enabled"
                    : s.lastError
                      ? "Temporarily unavailable"
                      : s.lastSuccessAt
                        ? "Connected"
                        : "Awaiting collection"}
                </span>
              </div>
              <h2>{s.name}</h2>
              <a href={s.websiteUrl} target="_blank" rel="noopener noreferrer">
                {new URL(s.websiteUrl).hostname}
                <ArrowUpRight size={13} />
              </a>
              <div className="source-stats">
                <div>
                  <strong>{s.articleCount.toLocaleString()}</strong>
                  <span>collected stories</span>
                </div>
                <div>
                  <strong>
                    {s.lastSuccessAt ? relativeTime(s.lastSuccessAt) : "—"}
                  </strong>
                  <span>last successful check</span>
                </div>
              </div>
              {s.lastError && (
                <p className="source-error">
                  <AlertCircle size={13} />
                  {s.lastError}
                </p>
              )}
              <div className="source-card-bottom">
                <span
                  title={
                    s.lastAttemptAt ? fullDate(s.lastAttemptAt) : undefined
                  }
                >
                  <Clock3 size={13} />
                  {s.lastAttemptAt
                    ? `Attempted ${relativeTime(s.lastAttemptAt).toLowerCase()}`
                    : s.slug === "gnews"
                      ? "Requires a licensed API key"
                      : "No collection attempt yet"}
                </span>
                <Link to={`/?source=${s.slug}`}>
                  Explore stories
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="source-policy">
        Articles belong to their original publishers. TechSpill stores metadata
        and only configured excerpts, and always links to the original story.
        Feed availability and publisher permissions can change.
      </p>
    </div>
  );
}
