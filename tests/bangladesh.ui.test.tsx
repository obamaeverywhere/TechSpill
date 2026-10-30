import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PreferencesProvider } from "../apps/web/src/hooks/usePreferences";
import { BangladeshPage } from "../apps/web/src/pages/BangladeshPage";
import type { Article } from "@techpulse/shared";
vi.mock("../apps/web/src/services/api", () => ({
  getBangladeshNews: vi.fn(),
  getBangladeshSources: vi
    .fn()
    .mockResolvedValue({ data: [], meta: { languages: [], regions: [] } }),
  getBangladeshCategories: vi.fn().mockResolvedValue({ data: [] }),
}));
import { getBangladeshNews } from "../apps/web/src/services/api";
const fixture: Article = {
  id: "bd-ui-fixture",
  title: "বাংলাদেশে নতুন সফটওয়্যার গবেষণা প্রকল্প চালু",
  description: null,
  originalUrl: "https://example.com/bd-fixture",
  imageUrl: null,
  author: null,
  publishedAt: "2026-10-20T10:00:00Z",
  fetchedAt: "2026-10-20T10:05:00Z",
  language: "bn",
  region: null,
  trendingScore: 25,
  hnScore: null,
  coverageCount: 1,
  source: {
    id: "source-fixture",
    slug: "fixture",
    name: "Fixture publisher",
    color: "#117744",
  },
  categories: [{ slug: "software", name: "Software & IT Industry" }],
  tags: [],
  classificationStatus: "ACCEPTED",
  classificationReason: "Fixture metadata shows a local technology launch.",
  contentKind: "OFFICIAL_ANNOUNCEMENT",
};
const payload = {
  data: [fixture],
  meta: {
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
    lastCollectedAt: "2026-10-20T10:05:00Z",
  },
};
function show(path = "/bangladesh") {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <PreferencesProvider>
        <MemoryRouter initialEntries={[path]}>
          <BangladeshPage />
        </MemoryRouter>
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.mocked(getBangladeshNews).mockReset();
  localStorage.clear();
});
afterEach(cleanup);
describe("Bangladesh reader UI", () => {
  it("announces initial loading and never supplies generated replacement stories", () => {
    vi.mocked(getBangladeshNews).mockReturnValue(new Promise(() => {}));
    show();
    expect(
      screen.getByRole("heading", { name: /BD Tech Scene/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "Loading news" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(fixture.title)).not.toBeInTheDocument();
  });
  it("renders Bengali, Dhaka-local dates, language and official attribution with a safe original link", async () => {
    vi.mocked(getBangladeshNews).mockResolvedValue(payload);
    show();
    await screen.findAllByText(fixture.title);
    expect(screen.getByRole("link", { name: /Read original/ })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(screen.getAllByText("Official announcement")).toHaveLength(2);
    expect(screen.getByText("20 Oct, 4:00 pm")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Global Tech News" }),
    ).toHaveAttribute("href", "/");
  });
  it("keeps search and language filters scoped to the Bangladesh API", async () => {
    vi.mocked(getBangladeshNews).mockResolvedValue(payload);
    show();
    await screen.findAllByText(fixture.title);
    fireEvent.change(
      screen.getByRole("combobox", { name: "Article language" }),
      { target: { value: "bn" } },
    );
    await waitFor(() =>
      expect(
        vi
          .mocked(getBangladeshNews)
          .mock.calls.some(([params]) => params.get("language") === "bn"),
      ).toBe(true),
    );
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search Bangladesh stories" }),
      { target: { value: "সফটওয়্যার" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Submit Bangladesh search" }),
    );
    await waitFor(() =>
      expect(
        vi
          .mocked(getBangladeshNews)
          .mock.calls.some(
            ([params]) =>
              params.get("search") === "সফটওয়্যার" &&
              params.get("language") === "bn",
          ),
      ).toBe(true),
    );
  });
  it("shows honest empty and source-error states", async () => {
    vi.mocked(getBangladeshNews).mockResolvedValue({
      data: [],
      meta: { ...payload.meta, total: 0, totalPages: 0, lastCollectedAt: null },
    });
    show();
    expect(
      await screen.findByText("Your Bangladesh briefing is taking shape."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    cleanup();
    vi.mocked(getBangladeshNews).mockRejectedValue(
      new Error("Regional service unavailable"),
    );
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Regional service unavailable",
    );
  });
});
