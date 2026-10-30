import type {
  Article,
  Category,
  Source,
  NewsResponse,
  Health,
} from "@techpulse/shared";
const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export async function api<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${BASE}/api${path}`, {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(12000)])
      : AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.error?.message || "Unable to reach TechSpill. Please try again.",
    );
  }
  return response.json();
}
export const getNews = (params: URLSearchParams, signal?: AbortSignal) =>
  api<NewsResponse>(`/news?${params}`, signal);
export const getCategories = () => api<{ data: Category[] }>("/categories");
export const getSources = () =>
  api<{ data: Source[]; meta: { languages: string[]; regions: string[] } }>(
    "/sources",
  );
export const getHealth = () => api<{ data: Health }>("/health");
export const getArticle = (id: string) =>
  api<{ data: Article }>(`/news/${encodeURIComponent(id)}`);
export const getBangladeshNews = (
  params: URLSearchParams,
  signal?: AbortSignal,
) => api<NewsResponse>(`/news/bangladesh?${params}`, signal);
export const getBangladeshSources = () =>
  api<{ data: Source[]; meta: { languages: string[]; regions: string[] } }>(
    "/news/bangladesh/sources",
  );
export const getBangladeshCategories = () =>
  api<{ data: Category[] }>("/news/bangladesh/categories");
