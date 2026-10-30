# TechSpill visual system

TechSpill's public identity is **techspill.** — **Spilling What's Next.** The existing React/Vite reader, Express API, database schema, collector, and routes remain in place.

## Interface

- Dark is the default for new readers. Explicit legacy light/dark choices and saved article IDs migrate from `techpulse.*` to `techspill.*` browser keys. Existing values under the new keys take priority; the legacy values remain available for rollback.
- The sticky navigation and mobile bottom bar link to the existing global, trending, Bangladesh, and saved routes. Source health remains available from the footer and feed rails.
- Search opens with the search button or Ctrl/Cmd+K. It debounces and cancels preview requests through TanStack Query, supports the global and Bangladesh editions and their actual categories, and highlights literal search text. Arrow keys move between original-story links; Home returns to the input; Escape closes the dialog and restores focus. Enter in the input opens the complete filtered feed.
- Grid and **Quick Spill** compact views preserve publisher attribution, original links, timestamps, and content disclosures. Bookmarks remain local to the browser.
- Bangladesh topic sections request their actual scoped categories, gated by nonzero catalog counts; empty sections are omitted. Fintech on the global topic bar links to Bangladesh's supported fintech category.
- Missing or failed publisher images use a clearly labeled abstract CSS placeholder. No synthetic news photographs or replacement headlines are used.
- Automatic polling, filtering, sorting, pagination, source health, English/Bengali rendering, relevance explanations, and Dhaka date semantics continue to use the existing APIs.

## Styling and assets

`apps/web/src/styles.css` imports focused token, base, navigation, card, feed, Bangladesh, and search styles. `styles/tokens.css` defines both themes, type families, accent colors, radii, motion timing, and the content width. Space Grotesk, Inter, and Noto Sans Bengali use Google Fonts with local system fallbacks.

Electric lime is the primary action fill with dark text. Light mode uses a darker green for accent text and a darker purple for small text to preserve contrast. Purple and pink remain selective accents. Motion respects `prefers-reduced-motion`; images reserve their aspect ratio and lazy-load except for featured images.

The wordmark/drop is native SVG in `TechSpillLogo.tsx`; `public/favicon.svg` supplies the compact identity. `public/theme-init.js` sets the saved theme before first paint using a same-origin script compatible with the API's content security policy.

Internal npm workspace names (`@techpulse/*`), database credentials/names, and deployment resource identifiers retain their established values for compatibility. They are technical identifiers; public-facing branding and service log names are TechSpill. There is no database migration or package installation required for this redesign.

## Verify

```bash
npm test
npm run test:integration
npm run build
npm run test:browser
npm run test:browser:bd
npm run test:browser:techspill
```

The integration suite needs PostgreSQL; stop the collection worker while it runs because it exercises the singleton collection lease. Browser suites need a running app with collected news, system Chrome (`CHROME_PATH` can override it), and default to port 5173. Pass `http://localhost:4000` to a browser script to check the production app served by Express. Screenshots are written to `test-results/`.

## Verified on 30 October 2026

- Production build and TypeScript checks passed.
- 77 unit/API/UI tests and 25 PostgreSQL integration tests passed (102 total).
- All 429 article IDs, source IDs, and original URLs present before regression testing were preserved.
- All three browser suites passed against the compiled Express-served app at `http://localhost:4000`, including real English/Bengali news, combined filters, pagination, saved-story persistence, and dark/light themes.
- 20 route/viewport combinations passed without horizontal overflow at widths from 320px to 1440px.
- 50 text/background token combinations passed WCAG AA's 4.5:1 text threshold; the lowest tested ratio was 4.65:1.
- Native dialog focus containment/return, Escape and arrow-key search navigation, reduced motion, metadata/favicon/theme assets, and legacy preference migration passed.
- Production API/database health is connected, and the scheduled collector resumed successfully.

Inspectable screenshots and the contrast/layout report are in `test-results/`, including `techspill-dark-viewport.png`, `techspill-light-viewport.png`, `search-mobile.png`, `bangladesh-bengali-card.png`, and `techspill-verification.json`.
