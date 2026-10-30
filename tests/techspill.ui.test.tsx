import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  PreferencesProvider,
  usePreferences,
} from "../apps/web/src/hooks/usePreferences";
import { SearchOverlay } from "../apps/web/src/components/SearchOverlay";
import { Highlight } from "../apps/web/src/components/TextHighlight";
import { BangladeshSections } from "../apps/web/src/components/BangladeshSections";
import type { Article } from "@techpulse/shared";
vi.mock("../apps/web/src/services/api", () => ({
  getNews: vi.fn(),
  getBangladeshNews: vi.fn(),
}));
import { getBangladeshNews, getNews } from "../apps/web/src/services/api";
const article: Article = {
  id: "real-fixture",
  title: "AI hardware research in Bangladesh",
  description: null,
  originalUrl: "https://example.com/research",
  imageUrl: null,
  author: null,
  publishedAt: "2026-10-20T10:00:00Z",
  fetchedAt: "2026-10-20T10:05:00Z",
  language: "en",
  region: null,
  trendingScore: 10,
  hnScore: null,
  coverageCount: 1,
  source: {
    id: "source",
    slug: "fixture",
    name: "Publisher",
    color: "#123456",
  },
  categories: [{ slug: "ai", name: "Artificial Intelligence" }],
  tags: [],
};
const payload = {
  data: [article],
  meta: { page: 1, limit: 5, total: 1, totalPages: 1, lastCollectedAt: null },
};
function PreferenceProbe() {
  const p = usePreferences();
  return (
    <>
      <span>
        {p.theme}:{p.saved.join(",")}
      </span>
      <button onClick={p.toggleTheme}>Toggle</button>
    </>
  );
}
function PathProbe() {
  const l = useLocation();
  return <output>{l.pathname + l.search}</output>;
}
function show(children: React.ReactNode, path = "/") {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <PreferencesProvider>
        <MemoryRouter initialEntries={[path]}>
          {children}
          <PathProbe />
        </MemoryRouter>
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.mocked(getNews).mockResolvedValue(payload);
  vi.mocked(getBangladeshNews).mockResolvedValue(payload);
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);
describe("TechSpill preferences", () => {
  it("defaults to dark and persists the new brand keys", () => {
    show(<PreferenceProbe />);
    expect(screen.getByText("dark:")).toBeInTheDocument();
    expect(localStorage.getItem("techspill.theme")).toBe("dark");
    fireEvent.click(screen.getByText("Toggle"));
    expect(document.documentElement.dataset.theme).toBe("light");
  });
  it("migrates existing bookmarks and an explicit light theme", () => {
    localStorage.setItem("techpulse.saved", '["previous-story"]');
    localStorage.setItem("techpulse.theme", "light");
    show(<PreferenceProbe />);
    expect(screen.getByText("light:previous-story")).toBeInTheDocument();
    expect(localStorage.getItem("techspill.saved")).toBe('["previous-story"]');
  });
  it("prefers new values and handles corrupt bookmarks", () => {
    localStorage.setItem("techspill.saved", "bad json");
    localStorage.setItem("techspill.theme", "dark");
    localStorage.setItem("techpulse.theme", "light");
    show(<PreferenceProbe />);
    expect(screen.getByText("dark:")).toBeInTheDocument();
  });
});
describe("TechSpill discovery", () => {
  it("highlights literal search text without interpreting markup or regex", () => {
    const { container } = render(
      <Highlight text="AI [AI] <script>" term="[AI]" />,
    );
    expect(container.querySelector("mark")).toHaveTextContent("[AI]");
    expect(container.querySelector("script")).toBeNull();
    expect(container).toHaveTextContent("<script>");
  });
  it("does not invent suggestions or request data until a reader searches", () => {
    show(<SearchOverlay open onClose={() => {}} />);
    expect(
      screen.getByText("The next rabbit hole starts here."),
    ).toBeInTheDocument();
    expect(getNews).not.toHaveBeenCalled();
    expect(getBangladeshNews).not.toHaveBeenCalled();
  });
  it("searches real global data, highlights it, and supports arrow navigation", async () => {
    show(<SearchOverlay open onClose={() => {}} />);
    const input = screen.getByRole("searchbox", {
      name: "Search technology news",
    });
    fireEvent.change(input, { target: { value: "AI" } });
    const result = await screen.findByRole("link", {
      name: /AI hardware research/,
    });
    expect(result.querySelector("mark")).toHaveTextContent("AI");
    expect(result).toHaveAttribute("rel", "noopener noreferrer");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(result).toHaveFocus();
    fireEvent.keyDown(result, { key: "Home" });
    expect(input).toHaveFocus();
    expect(vi.mocked(getNews).mock.calls[0][0].get("q")).toBe("AI");
    expect(getBangladeshNews).not.toHaveBeenCalled();
  });
  it("keeps Bangladesh search and category navigation scoped", async () => {
    const close = vi.fn();
    show(<SearchOverlay open onClose={close} />, "/bangladesh");
    fireEvent.change(
      screen.getByRole("searchbox", {
        name: "Search Bangladesh technology news",
      }),
      { target: { value: "AI" } },
    );
    fireEvent.change(screen.getByLabelText("Search category"), {
      target: { value: "ai" },
    });
    await waitFor(() =>
      expect(
        vi
          .mocked(getBangladeshNews)
          .mock.calls.some(
            ([p]) => p.get("search") === "AI" && p.get("category") === "ai",
          ),
      ).toBe(true),
    );
    fireEvent.click(screen.getByRole("button", { name: /See all results/ }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "/bangladesh?search=AI&category=ai",
    );
    expect(close).toHaveBeenCalled();
    expect(getNews).not.toHaveBeenCalled();
  });
  it("queries only populated Bangladesh categories and hides empty sections", async () => {
    vi.mocked(getBangladeshNews).mockResolvedValue({ ...payload, data: [] });
    show(
      <BangladeshSections
        categories={[
          { slug: "fintech", name: "Fintech", shortName: "Fintech", count: 1 },
        ]}
      />,
    );
    await waitFor(() => expect(getBangladeshNews).toHaveBeenCalledTimes(1));
    expect(vi.mocked(getBangladeshNews).mock.calls[0][0].get("category")).toBe(
      "fintech",
    );
    expect(screen.queryByRole("article")).toBeNull();
    expect(screen.queryByText("Fintech & Digital Economy")).toBeNull();
  });
});
