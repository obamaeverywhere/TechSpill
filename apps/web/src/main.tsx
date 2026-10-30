import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PreferencesProvider } from "./hooks/usePreferences";
import { Layout } from "./components/Layout";
import { NewsPage } from "./pages/NewsPage";
import { SourcesPage } from "./pages/SourcesPage";
import { BangladeshPage } from "./pages/BangladeshPage";
import "./styles.css";
const client = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1, refetchOnWindowFocus: true },
  },
});
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <PreferencesProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<NewsPage />} />
              <Route path="trending" element={<NewsPage />} />
              <Route path="saved" element={<NewsPage />} />
              <Route path="sources" element={<SourcesPage />} />
              <Route path="bangladesh" element={<BangladeshPage />} />
              <Route
                path="*"
                element={
                  <div className="empty-state">
                    <h1>This page is off the radar.</h1>
                    <a href="/">Back to your news feed</a>
                  </div>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </PreferencesProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
