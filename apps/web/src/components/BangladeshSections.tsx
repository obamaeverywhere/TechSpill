import { useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { Category } from "@techpulse/shared";
import { getBangladeshNews } from "../services/api";
import { ArticleCard } from "./ArticleCard";
const sections = [
  ["startups", "Startup Spotlight"],
  ["ai,innovation", "AI & Innovation"],
  ["fintech", "Fintech & Digital Economy"],
  ["telecom", "Telecom & Connectivity"],
  ["cybersecurity", "Cybersecurity"],
  ["government-ict", "Government & ICT"],
];
export function BangladeshSections({ categories }: { categories: Category[] }) {
  const queries = useQueries({
    queries: sections.map(([category]) => ({
      queryKey: ["bangladesh-section", category],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getBangladeshNews(
          new URLSearchParams({ category, limit: "2" }),
          signal,
        ),
      enabled: category
        .split(",")
        .some((slug) => categories.some((c) => c.slug === slug && c.count > 0)),
      staleTime: 60000,
      refetchInterval: 60000,
    })),
  });
  return (
    <div className="bd-editorial-sections">
      {sections.map(([category, title], i) => {
        const articles = queries[i].data?.data;
        if (
          !articles?.length ||
          !category
            .split(",")
            .some((slug) =>
              categories.some((c) => c.slug === slug && c.count > 0),
            )
        )
          return null;
        return (
          <section key={category} className="bd-editorial-section">
            <div className="section-heading">
              <h2>{title}</h2>
              <Link
                className="text-link"
                to={`/bangladesh?category=${category}`}
              >
                Explore <ArrowUpRight size={15} />
              </Link>
            </div>
            <div className="news-grid">
              {articles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  compact
                  regional
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
