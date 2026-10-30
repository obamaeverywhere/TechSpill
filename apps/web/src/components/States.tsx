import { BrandLoader } from "./BrandLoader";
import { AlertCircle, Bookmark, Radio, SearchX } from "lucide-react";
export function LoadingState() {
  return (
    <div className="news-loading" aria-label="Loading news" role="status" aria-busy="true">
      <BrandLoader/>
      <div className="news-grid" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton skeleton-image" />
          <div className="skeleton-lines">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
export function ErrorState({
  message,
  retry,
  onReset,
}: {
  message: string;
  retry: () => void;
  onReset?: () => void;
}) {
  return (
    <div className="empty-state" role="alert">
      <AlertCircle size={34} />
      <h3>The signal is taking a moment.</h3>
      <p>{message}</p>
      <button className="primary-button" onClick={retry}>
        Try again
      </button>
      {onReset && (
        <button className="error-reset-button" onClick={onReset}>
          Clear filters
        </button>
      )}
    </div>
  );
}
export function EmptyState({
  saved,
  filtered,
  onReset,
}: {
  saved?: boolean;
  filtered?: boolean;
  onReset: () => void;
}) {
  const Icon = saved ? Bookmark : filtered ? SearchX : Radio;
  return (
    <div className="empty-state">
      <Icon size={34} />
      <h3>
        {saved
          ? "Good stories deserve a second look."
          : filtered
            ? "No stories match these filters."
            : "Waiting for the first signal."}
      </h3>
      <p>
        {saved
          ? "Tap the bookmark on any story to keep it here. Saved stories stay in this browser."
          : filtered
            ? "Try a broader search, another source, or a different date range."
            : "The collection worker is gathering real news. New stories will appear here automatically."}
      </p>
      {(saved || filtered) && (
        <button className="primary-button" onClick={onReset}>
          {saved ? "Explore the latest news" : "Clear filters"}
        </button>
      )}
    </div>
  );
}
