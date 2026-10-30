import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PreferencesProvider } from "../apps/web/src/hooks/usePreferences";
import { NewsPage } from "../apps/web/src/pages/NewsPage";
import { ArticleCard } from "../apps/web/src/components/ArticleCard";
import type { Article } from "@techpulse/shared";
vi.mock("../apps/web/src/services/api", () => ({
  getNews: vi.fn(),
  getSources: vi
    .fn()
    .mockResolvedValue({ data: [], meta: { languages: [], regions: [] } }),
  getCategories: vi.fn().mockResolvedValue({ data: [] }),
  getHealth: vi
    .fn()
    .mockResolvedValue({ data: { collection: { stale: true } } }),
}));
import { getNews } from "../apps/web/src/services/api";
const fixture: Article = {
  id: "fixture-id",
  title: "Fixture software story for UI tests",
  description: "Permitted fixture excerpt.",
  originalUrl: "https://example.com/story",
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
    id: "fixture-source",
    slug: "fixture",
    name: "Fixture publisher",
    color: "#123456",
  },
  categories: [{ slug: "software-development", name: "Software Development" }],
  tags: [],
};
function wrapper(children: React.ReactNode) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <PreferencesProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  localStorage.clear();
  vi.mocked(getNews).mockReset();
});
afterEach(cleanup);
describe("news UI states", () => {
  it("announces loading while a news request is pending", () => {
    vi.mocked(getNews).mockReturnValue(new Promise(() => {}));
    wrapper(<NewsPage />);
    expect(
      screen.getByRole("status", { name: "Loading news" }),
    ).toBeInTheDocument();
  });
  it("shows a useful error and allows retrying the request", async () => {
    vi.mocked(getNews)
      .mockRejectedValueOnce(new Error("News service unavailable"))
      .mockResolvedValue({
        data: [],
        meta: {
          total: 0,
          totalPages: 0,
          page: 1,
          limit: 9,
          lastCollectedAt: null,
        },
      });
    wrapper(<NewsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "News service unavailable",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByText("Waiting for the first signal."),
    ).toBeInTheDocument();
  });
  it("shows an honest empty state instead of fabricated headlines", async () => {
    vi.mocked(getNews).mockResolvedValue({
      data: [],
      meta: {
        total: 0,
        totalPages: 0,
        page: 1,
        limit: 9,
        lastCollectedAt: null,
      },
    });
    wrapper(<NewsPage />);
    expect(
      await screen.findByText("Waiting for the first signal."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
  it("persists and removes bookmarks and links to the real publisher safely", () => {
    wrapper(<ArticleCard article={fixture} />);
    const button = screen.getByRole("button", {
      name: `Save ${fixture.title}`,
    });
    fireEvent.click(button);
    expect(JSON.parse(localStorage.getItem("techspill.saved")!)).toEqual([
      "fixture-id",
    ]);
    expect(
      screen.getByRole("button", { name: `Unsave ${fixture.title}` }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: fixture.title })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    fireEvent.click(
      screen.getByRole("button", { name: `Unsave ${fixture.title}` }),
    );
    expect(JSON.parse(localStorage.getItem("techspill.saved")!)).toEqual([]);
  });
});
