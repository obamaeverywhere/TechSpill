import { useEffect, useRef, useState } from "react";
import { NavLink, Link, Outlet, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  Bookmark,
  Flame,
  Home,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { usePreferences } from "../hooks/usePreferences";
import { TechSpillLogo } from "./TechSpillLogo";
import { SearchOverlay } from "./SearchOverlay";
import { BangladeshFlag } from "./BangladeshFlag";
const links = [
  ["/", "For You"],
  ["/?sort=newest", "Latest"],
  ["/trending", "Trending"],
  ["/?category=artificial-intelligence", "AI"],
  ["/?category=startups", "Startups"],
  ["/bangladesh", "Bangladesh"],
];
export function Layout() {
  const { theme, toggleTheme, saved, toast } = usePreferences();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useRef<HTMLDialogElement>(null),
    about = useRef<HTMLDialogElement>(null);
  const location = useLocation();
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);
  useEffect(() => {
    if (!menuOpen) {
      menu.current?.close();
      return;
    }
    menu.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, [menuOpen]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMenuOpen(false);
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    const edition =
      location.pathname === "/bangladesh"
        ? "BD Tech Scene"
        : location.pathname === "/saved"
          ? "Saved stories"
          : location.pathname === "/trending"
            ? "Hot Right Now"
            : location.pathname === "/sources"
              ? "Our sources"
              : "Spilling What's Next.";
    document.title = `TechSpill — ${edition}`;
  }, [location.pathname]);
  const nav = links.map(([to, label]) => {
    const target = new URL(to, "https://techspill.local");
    const filters = new URLSearchParams(location.search);
    const active =
      location.pathname === target.pathname &&
      (target.search
        ? [...target.searchParams].every(
            ([key, value]) => filters.get(key) === value,
          )
        : to !== "/" || (!filters.has("category") && !filters.has("sort")));
    return (
      <Link
        key={to}
        to={to}
        className={active ? "active" : ""}
        aria-current={active ? "page" : undefined}
      >
        {label === "Bangladesh" && <BangladeshFlag />}
        {label}
      </Link>
    );
  });
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to news
      </a>
      <header className="app-navbar">
        <div className="navbar-inner">
          <Link to="/" className="brand-link" aria-label="TechSpill home">
            <TechSpillLogo />
          </Link>
          <nav className="primary-nav" aria-label="Main navigation">
            {nav}
          </nav>
          <div className="nav-actions">
            <button
              className="search-trigger"
              aria-label="Open search"
              aria-keyshortcuts="Control+k Meta+k"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={18} />
              <span>Search</span>
              <kbd>⌘ K</kbd>
            </button>
            <NavLink
              className="icon-button nav-saved"
              to="/saved"
              aria-label={`Saved stories (${saved.length})`}
            >
              <Bookmark size={19} />
              {saved.length > 0 && (
                <span className="saved-count">{saved.length}</span>
              )}
            </NavLink>
            <button
              className="icon-button"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              className="icon-button mobile-menu-trigger"
              aria-label="Open navigation"
              aria-expanded={menuOpen}
              aria-controls="main-navigation"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={21} />
            </button>
          </div>
        </div>
      </header>
      <main id="main-content" className="main-content">
        <Outlet />
      </main>
      <footer className="app-footer">
        <div>
          <Link to="/" aria-label="TechSpill home">
            <TechSpillLogo />
          </Link>
          <p>Spilling What's Next.</p>
        </div>
        <div className="footer-links">
          <Link to="/sources">
            News sources <ArrowUpRight size={14} />
          </Link>
          <button onClick={() => about.current?.showModal()}>
            About TechSpill
          </button>
          <span>Original stories. Original publishers.</span>
        </div>
      </footer>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <NavLink to="/" end>
          <Home size={20} />
          Home
        </NavLink>
        <NavLink to="/trending">
          <Flame size={20} />
          Trending
        </NavLink>
        <NavLink to="/bangladesh">
          <BangladeshFlag />
          BD Tech
        </NavLink>
        <NavLink to="/saved">
          <Bookmark size={20} />
          Saved
        </NavLink>
        <button onClick={() => setSearchOpen(true)}>
          <Search size={20} />
          Search
        </button>
      </nav>
      <dialog
        ref={menu}
        className="navigation-dialog"
        id="main-navigation"
        aria-label="Navigation"
        onCancel={() => setMenuOpen(false)}
      >
        <div className="dialog-top">
          <TechSpillLogo />
          <button
            className="icon-button"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          >
            <X />
          </button>
        </div>
        <nav onClick={() => setMenuOpen(false)}>
          {nav}
          <Link to="/saved">Saved stories ({saved.length})</Link>
          <Link to="/sources">News sources</Link>
        </nav>
        <p>Spilling What's Next.</p>
      </dialog>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <dialog
        ref={about}
        className="about-dialog"
        aria-labelledby="about-title"
      >
        <div className="dialog-top">
          <h2 id="about-title">Meet TechSpill.</h2>
          <button
            className="icon-button"
            aria-label="Close about"
            onClick={() => about.current?.close()}
          >
            <X />
          </button>
        </div>
        <p>
          Your daily fix of what’s shaping tomorrow. TechSpill aggregates real
          technology stories, with links to the original publishers.
        </p>
        <p>
          Trending scores combine freshness, source coverage, and verified
          Hacker News points. They are calculated signals, not audience views or
          shares.
        </p>
        <p>
          Bangladesh coverage is checked for technology relevance and a local
          connection. Classification is not independent fact verification.
          Official announcements, sponsored stories, and press releases are
          labeled.
        </p>
        <p>
          Bookmarks are stored in this browser. Feeds update automatically;
          timestamps always refer to the original publication.
        </p>
        <Link to="/sources" onClick={() => about.current?.close()}>
          Explore our sources <ArrowUpRight size={15} />
        </Link>
      </dialog>
      {toast && (
        <div className="toast" role="status">
          <Bookmark size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
