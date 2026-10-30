import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
function stored(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
const Context = createContext<{
  saved: string[];
  toggleSave: (id: string) => void;
  theme: string;
  toggleTheme: () => void;
  toast: string;
  notify: (s: string) => void;
}>({
  saved: [],
  toggleSave: () => {},
  theme: "dark",
  toggleTheme: () => {},
  toast: "",
  notify: () => {},
});
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<string[]>(() => {
    try {
      const value = JSON.parse(
        stored("techspill.saved", stored("techpulse.saved", "[]")),
      );
      return Array.isArray(value)
        ? value.filter((v): v is string => typeof v === "string").slice(0, 100)
        : [];
    } catch {
      return [];
    }
  });
  const [theme, setTheme] = useState(() =>
    stored("techspill.theme", stored("techpulse.theme", "dark")) === "light"
      ? "light"
      : "dark",
  );
  const [toast, setToast] = useState("");
  useEffect(() => {
    try {
      localStorage.setItem("techspill.saved", JSON.stringify(saved));
    } catch {}
  }, [saved]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("techspill.theme", theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const notify = useCallback((message: string) => setToast(message), []);
  const toggleSave = (id: string) => {
    const exists = saved.includes(id);
    if (!exists && saved.length >= 100) {
      notify("Your reading list is full. Remove a story to save another.");
      return;
    }
    const next = exists ? saved.filter((v) => v !== id) : [id, ...saved];
    setSaved(next);
    try {
      localStorage.setItem("techspill.saved", JSON.stringify(next));
      notify(
        exists
          ? "Story removed from your reading list."
          : "Story saved to your reading list.",
      );
    } catch {
      notify("Saved for this session. Browser storage is unavailable.");
    }
  };
  return (
    <Context.Provider
      value={{
        saved,
        toggleSave,
        theme,
        toggleTheme: () => setTheme((v) => (v === "light" ? "dark" : "light")),
        toast,
        notify,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const usePreferences = () => useContext(Context);
