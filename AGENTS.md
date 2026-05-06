# AGENTS.md — Guidance for AI coding agents

Purpose: Give agents the exact, actionable context to be productive when editing or extending this React + Vite frontend.

Quick facts
- Tech: React 19 + Vite (vite v8, plugin @vitejs/plugin-react). See `package.json` for scripts.
- Dev server: vite runs on http://localhost:5173 (see `vite.config.js`).
- Backend: API calls are hardcoded to http://localhost:8080 under `src/services/*.js`.
- Router: React Router; routes are declared in `src/app.jsx`.

Where to read first (fast path)
- `package.json` — available scripts: `npm run dev` (vite), `npm run build`, `npm run preview`.
- `vite.config.js` — dev host and port.
- `src/app.jsx` — top-level routes and pages.
- `src/services/*.js` — canonical API entrypoints and auth conventions.
- `src/pages/*` + `src/components/*` — examples of service usage and UI patterns.

Coding conventions and discoverable patterns
- API services: all backend access goes through `src/services/*.js`:
  - Cards: `src/services/cardsApi.js` (fetchCard, fetchCardsPage, fetchCardsSearchPage).
  - Collections: `src/services/collectionApi.js` (fetchCollection).
  - Users/auth: `src/services/usersApi.js` (loginUser, registerUser, getAuthHeaders, localStorage keys).
  - Note: endpoints are hardcoded like `const CARDS_ENDPOINT = "http://localhost:8080/api/cards"` — modifying backend base URL should be applied consistently across these files.
- Auth storage: `usersApi.js` defines localStorage keys and normalization. Important keys: `authUser`, `accessToken`, `refreshToken`, `tokenType`, `expiresIn`, `username`, `userId`. Use `getAuthHeaders()` to attach Authorization headers.
- State + UX:
  - List pages (cardlist, cardCollection) use pagination hooks + IntersectionObserver sentinel refs to lazy-load more items.
  - Dialogs are <dialog> elements referenced via refs; they call `.showModal()` / `.close()` (see `cardlist.jsx`, `cardCollection.jsx`).
  - Session persistence: `CardList` saves UI filter state to `sessionStorage` under `cardlistState`.
- Normalization: service functions normalize backend shape (e.g., `normalizeCard`, `normalizeAuthResponse`) — agents should use these helpers or add equivalent normalization when creating new endpoints.

Integration patterns and examples (copyable)
- Calling an authenticated API:
  - Use getAuthHeaders() from `src/services/usersApi.js`:
    const headers = getAuthHeaders();
    fetch(`${CARDS_ENDPOINT}/${id}`, { method: 'GET', headers });
  - Example usage: `fetchCard(cardId)` in `src/services/cardsApi.js` and pages like `src/pages/cardDetails.jsx`.
- Adding a new service:
  - Put helper functions into `src/services/` and export them; pages import from `../services/<name>.js` (observed pattern).
- Where UI calls services:
  - Page examples: `src/pages/cardlist.jsx` calls `fetchCardsPage` / `fetchCardsSearchPage` and manages incremental loading.
  - Card detail fetch: `src/pages/cardDetails.jsx` → `fetchCard()` (see loadCard useEffect).

Developer workflows (explicit)
- Start dev server: npm run dev (Vite serves on port 5173)
- Build production bundle: npm run build
- Preview production build locally: npm run preview
- Debugging tips: open browser devtools, inspect network calls to http://localhost:8080 to observe API schemas; use the normalized payloads in `src/services/*` as reference.

Project-specific gotchas
- Backend URL is hardcoded to localhost:8080 in services — there is no environment variable file or `.env` used. If changing host/port, update all `src/services/*.js` or introduce a single config file and update imports.
- Router version: code uses React Router v7 API (Routes + Route + Navigate). When adding new pages, register routes in `src/app.jsx`.
- No central state manager — local React state + sessionStorage/localStorage patterns are used. Avoid introducing global state without documenting it.
- CSS: project uses plain CSS imported at top-level (`src/style.css`, `src/buttons.css`) and component-level CSS files (see `src/components/css/*` and `src/pages/css/*`). Follow existing class names; there is no CSS-in-JS.

Where to add agent code
- Preferred locations (discoverable and consistent):
  - If the agent will call backend APIs, implement a new module under `src/services/` (e.g. `src/services/agentApi.js`) and export functions. This keeps service usage consistent with pages.
  - For UI features driven by agents (assistant panes, prompts), add components under `src/components/` and import from pages where needed.

Minimal example: small helper that uses existing auth pattern (to be placed in `src/services/agentApi.js`)
- Import and reuse getAuthHeaders() from `src/services/usersApi.js` so tokens are attached automatically.

Final notes
- No CI/test configuration detected; changes should be sanity-checked in the dev server.
- Keep imports using relative paths as the project does (no aliasing present in vite config).

References (read these files to validate changes)
- package.json
- vite.config.js
- src/app.jsx
- src/services/cardsApi.js
- src/services/collectionApi.js
- src/services/usersApi.js
- src/pages/cardlist.jsx
- src/pages/cardDetails.jsx

Generated by an automated repo analysis. Update this file when env/config conventions change.
