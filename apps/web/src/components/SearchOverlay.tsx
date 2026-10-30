import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Search, X } from "lucide-react";
import { BD_CATEGORIES, CATEGORIES, CONTENT_LABELS } from "@techpulse/shared";
import { getBangladeshNews, getNews } from "../services/api";
import { Highlight } from "./TextHighlight";
import { relativeTime } from "../utils/format";

export function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const location = useLocation(),
    navigate = useNavigate();
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");
  const [scope, setScope] = useState("global");
  const [category, setCategory] = useState("");
  const [active, setActive] = useState(-1);
  useEffect(() => {
    if (!open) {
      dialog.current?.close();
      return;
    }
    setScope(location.pathname.startsWith("/bangladesh") ? "bd" : "global");
    setText("");
    setDebounced("");
    setCategory("");
    setActive(-1);
    dialog.current?.showModal();
    input.current?.focus();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, [open]);
  useEffect(() => {
    setActive(-1);
    const timer = setTimeout(() => setDebounced(text.trim()), 250);
    return () => clearTimeout(timer);
  }, [text, scope, category]);
  const bd = scope === "bd";
  const searchParams = new URLSearchParams({
    [bd ? "search" : "q"]: debounced,
    limit: "5",
  });
  if (category) searchParams.set("category", category);
  const results = useQuery({
    queryKey: ["search-preview", scope, debounced, category],
    queryFn: ({ signal }) =>
      (bd ? getBangladeshNews : getNews)(searchParams, signal),
    enabled: open && !!debounced,
    staleTime: 30000,
  });
  const articles = results.data?.data || [];
  const go = () => {
    const p = new URLSearchParams();
    if (text.trim()) p.set(bd ? "search" : "q", text.trim());
    if (category) p.set("category", category);
    navigate(`${bd ? "/bangladesh" : "/"}${p.size ? `?${p}` : ""}`);
    onClose();
  };
  return (
    <dialog
      ref={dialog}
      className="search-dialog"
      aria-labelledby="search-title"
      onKeyDownCapture={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="search-dialog-inner">
        <div className="search-dialog-heading">
          <span id="search-title">Follow your curiosity.</span>
          <button
            className="icon-button"
            aria-label="Close search"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go();
          }}
        >
          <div className="palette-input">
            <Search size={23} />
            <input
              type="search"
              ref={input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's happening in tech?"
              aria-label={
                bd
                  ? "Search Bangladesh technology news"
                  : "Search technology news"
              }
              aria-controls="search-results"
              autoComplete="off"
              onKeyDown={(e) => {
                if (
                  (e.key === "ArrowDown" || e.key === "ArrowUp") &&
                  articles.length
                ) {
                  e.preventDefault();
                  const next =
                    e.key === "ArrowDown"
                      ? (active + 1) % articles.length
                      : active <= 0
                        ? articles.length - 1
                        : active - 1;
                  setActive(next);
                  document.getElementById(`search-result-${next}`)?.focus();
                }
              }}
            />
            <kbd>↵</kbd>
          </div>
          <div className="search-options">
            <label>
              Edition
              <select
                aria-label="Search edition"
                value={scope}
                onChange={(e) => {
                  setScope(e.target.value);
                  setCategory("");
                }}
              >
                <option value="global">Global tech</option>
                <option value="bd">Bangladesh</option>
              </select>
            </label>
            <label>
              Category
              <select
                aria-label="Search category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All topics</option>
                {(bd ? BD_CATEGORIES : CATEGORIES).map(([slug, name]) => (
                  <option key={slug} value={slug}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button" type="submit">
              See all results <ArrowRight size={16} />
            </button>
          </div>
        </form>
        <div id="search-results" className="search-results" aria-live="polite">
          {!text.trim() ? (
            <div className="search-prompt">
              <span className="hash-mark">↗</span>
              <h3>The next rabbit hole starts here.</h3>
              <p>
                Search real headlines and keywords. Choose an edition or topic
                to narrow it down.
              </p>
            </div>
          ) : text.trim() !== debounced || results.isPending ? (
            <p className="search-status" role="status">
              Finding fresh spills…
            </p>
          ) : results.isError ? (
            <div className="search-status" role="alert">
              <p>{results.error.message}</p>
              <button
                className="text-link"
                onClick={() => void results.refetch()}
              >
                Try again
              </button>
            </div>
          ) : !articles.length ? (
            <p className="search-status">
              No matching stories. Try another keyword or category.
            </p>
          ) : (
            articles.map((a, i) => (
              <a
                className={`search-result ${active === i ? "active" : ""}`}
                id={`search-result-${i}`}
                key={a.id}
                href={a.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onFocus={() => setActive(i)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    const next =
                      (i + (e.key === "ArrowDown" ? 1 : -1) + articles.length) %
                      articles.length;
                    document.getElementById(`search-result-${next}`)?.focus();
                  } else if (e.key === "Home") {
                    e.preventDefault();
                    input.current?.focus();
                  }
                }}
              >
                <div>
                  <span className="rank-category">
                    {a.categories[0]?.name || "Technology"}
                  </span>
                  <h3 lang={a.language || undefined}>
                    <Highlight text={a.title} term={debounced} />
                  </h3>
                  <p>
                    {a.publisherName || a.source.name} ·{" "}
                    {relativeTime(a.publishedAt)}
                  </p>
                  {a.contentKind && a.contentKind !== "REPORTING" && (
                    <span className="content-disclosure">
                      {CONTENT_LABELS[a.contentKind]}
                    </span>
                  )}
                </div>
                <ArrowRight size={18} />
              </a>
            ))
          )}
        </div>
        <div className="palette-footer">
          <span>↑ ↓ to explore · Enter to open · Esc to close</span>
          <span>Spilling What's Next.</span>
        </div>
      </div>
    </dialog>
  );
}
