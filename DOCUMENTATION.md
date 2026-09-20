# Documentation — Inkwell Full Stack Blogging Platform

This document covers the full stack architecture, authentication flow, frontend–backend communication, state management, and deployment strategy, as required by the assignment. For setup instructions, see [README.md](./README.md).

## 1. Full stack architecture

The application is split into two independently deployable pieces that only talk to each other over HTTP:

```
┌─────────────────┐        HTTPS / JSON        ┌──────────────────┐        Mongoose         ┌───────────┐
│   React SPA      │ ───────────────────────── │  Express REST API │ ──────────────────────── │  MongoDB  │
│  (frontend/)      │ ◄───────────────────────── │   (backend/)      │ ◄──────────────────────── │           │
└─────────────────┘   accessToken (header)     └──────────────────┘                          └───────────┘
                       refreshToken (httpOnly cookie)
```

- **Frontend (`frontend/`)** — a Create React App project. React Router handles client-side navigation; there is no server-rendered HTML beyond the single `index.html` shell.
- **Backend (`backend/`)** — a stateless Express API under `/api`. It never renders HTML; every response is JSON.
- **Database (`MongoDB`)** — three collections: `users`, `posts`, `comments`, modeled with Mongoose schemas in `backend/src/models/`.

Request flow for a typical page (viewing a post):

1. React Router matches `/posts/:slug` and renders `PostDetail`.
2. `PostDetail` calls `GET /api/posts/:slug` and `GET /api/posts/:id/comments` via the shared `api` axios instance.
3. Express routes the request through `postRoutes.js` → `postController.getPost`, which queries MongoDB via Mongoose, increments the view counter, and returns JSON.
4. React renders the response; the post body (stored as sanitized HTML from the rich text editor) is rendered with `dangerouslySetInnerHTML` after a second client-side sanitization pass with DOMPurify — defense in depth against stored XSS.

### Why a self-contained rich text editor instead of a library

The post editor (`frontend/src/components/RichTextEditor.js`) is a small `contentEditable` component using `document.execCommand` rather than a package like Quill or TipTap. This keeps the bundle small and the dependency surface minimal for a course project. Content is sanitized twice — once server-side with `sanitize-html` before it's stored, and again client-side with `DOMPurify` before it's rendered — so it's safe even though the editing surface is simple.

## 2. Authentication flow

The app uses the standard **access token + refresh token** pattern rather than a single long-lived token:

| Token | Lifetime | Where it lives | Purpose |
|---|---|---|---|
| Access token | 15 minutes | JS memory + `localStorage`, sent as `Authorization: Bearer <token>` | Authorizes individual API requests |
| Refresh token | 7 days | **httpOnly cookie**, scoped to `/api/auth` | Used only to mint a new access token; never touched by client-side JS |

Putting the refresh token in an `httpOnly` cookie (rather than `localStorage`, like the access token) means that even if an attacker found a way to run JavaScript on the page (XSS), they could steal the short-lived access token but **not** the refresh token — limiting the blast radius of a compromise.

### Registration / login

1. `POST /api/auth/register` or `/login` validates credentials, hashes the password with bcrypt (on register) or compares against the stored hash (on login).
2. On success, the server:
   - Signs an **access token** (`generateAccessToken`) and returns it in the JSON body.
   - Signs a **refresh token** (`generateRefreshToken`) and sets it as an httpOnly, `SameSite` cookie via `res.cookie('refreshToken', ...)`.
3. The frontend stores the access token (`setAccessToken` in `services/api.js`) and the user object in `AuthContext`.

### Silent refresh

`frontend/src/services/api.js` installs an axios response interceptor:

1. Any request that fails with `401` (expired/invalid access token) triggers a call to `POST /api/auth/refresh-token`.
2. The browser automatically attaches the httpOnly cookie to that request (this is why `withCredentials: true` is set on the axios instance, and why CORS is configured with `credentials: true` and an explicit origin on the backend — wildcard origins can't be combined with credentialed requests).
3. `authController.refreshToken` verifies the refresh token, checks its embedded `tokenVersion` against the user's current `tokenVersion` (see below), and — if valid — issues a **new** access token *and* rotates the refresh token (defense against replay if a refresh token is ever intercepted).
4. The interceptor stores the new access token and retries the original request transparently — the user never sees the failure.
5. If the refresh call itself fails (refresh token expired or revoked), the interceptor clears local state and dispatches an `auth:logout` event that `AuthContext` listens for, logging the user out in the UI.

This also means a hard page refresh doesn't log the user out: on mount, `AuthContext` calls `/api/auth/refresh-token` if there's no access token in memory, using the still-valid cookie to re-establish a session silently.

### Logout & password changes

- `POST /api/auth/logout` simply clears the refresh-token cookie.
- Changing a password (`PUT /api/auth/me/password`) or explicitly logging out of *all* devices (`POST /api/auth/logout-all`) increments the user's `tokenVersion` field in MongoDB. Because every refresh token embeds the `tokenVersion` it was issued with, this instantly invalidates every outstanding refresh token without needing a server-side token blacklist/store.

### Protected routes

- **Backend**: `requireAuth` middleware (`backend/src/middleware/auth.js`) verifies the access token and attaches `req.user`; routes like `POST /api/posts` list it before the controller.
- **Frontend**: `<ProtectedRoute>` (`frontend/src/components/ProtectedRoute.js`) checks `AuthContext`'s `isAuthenticated` flag and redirects unauthenticated users to `/login`, remembering the page they were headed to via `location.state`.

## 3. Frontend ↔ backend communication

- All communication happens over a single axios instance (`frontend/src/services/api.js`) with `baseURL` pointed at `REACT_APP_API_URL`.
- Every request/response is JSON except the refresh-token cookie, which travels as a normal `Set-Cookie` / `Cookie` header.
- CORS on the backend (`backend/src/server.js`) is locked to a single configured origin (`CLIENT_URL`) with `credentials: true`, which is required for the browser to send the httpOnly cookie cross-origin during local development (frontend on port 3000, API on port 5000).
- Errors are normalized: the backend's centralized error handler (`middleware/errorHandler.js`) always responds with `{ error: "message" }`, so the frontend can read `err.response?.data?.error` in one consistent place.

## 4. State management

The app deliberately avoids a global state library (Redux, Zustand, etc.) — the state surface is small enough that React's built-in tools are sufficient and easier to follow:

- **Auth / current user** — `AuthContext` (React Context + `useState`), because it's needed in many places across the tree (navbar, protected routes, profile settings) and changes relatively rarely.
- **Page-local data** (a list of posts, a single post + its comments, a profile) — plain `useState`/`useEffect` inside each page component, fetched fresh on mount. There's no cross-page cache; navigating back to a page re-fetches. This is a deliberate simplicity trade-off — a production app with heavier data-sharing needs would reach for React Query or SWR here.
- **Access token** — lives outside React entirely, in a module-level variable inside `services/api.js` (mirrored to `localStorage` so it survives a refresh). It doesn't need to be reactive state because nothing renders based on its raw value — components only care about the derived `isAuthenticated` boolean from `AuthContext`.

## 5. Deployment strategy

The two halves of the app deploy independently:

**Database** — [MongoDB Atlas](https://www.mongodb.com/atlas) free tier. Managed, backed up, and reachable from any host without running your own database server.

**Backend** — any Node-friendly host works since it's a standard Express app with no special build step:
- **Render / Railway / Fly.io**: point at `backend/`, set the build command to `npm install` and the start command to `npm start`, and configure the environment variables from the table in the README (in particular `MONGO_URI` pointed at the Atlas cluster, and a `CLIENT_URL` pointed at wherever the frontend ends up).
- **Docker**: `backend/Dockerfile` builds a minimal `node:20-alpine` image; `docker-compose.yml` at the repo root wires it together with MongoDB and the frontend for a one-command local (or self-hosted) deployment.

**Frontend** — a static build (`npm run build` produces `frontend/build/`), so it can go on any static host:
- **Vercel / Netlify**: point at `frontend/`, build command `npm run build`, output directory `build`, and set `REACT_APP_API_URL` to the deployed backend's URL (e.g. `https://your-api.onrender.com/api`).
- **Docker**: `frontend/Dockerfile` is a two-stage build that compiles the app and serves the static files with nginx.

**Production considerations actually implemented in the code:**
- `refreshCookieOptions()` (`backend/src/utils/generateTokens.js`) switches the cookie to `secure: true, sameSite: 'none'` automatically when `NODE_ENV=production`, since a cross-site cookie over HTTPS requires those flags.
- Rate limiting (`express-rate-limit`) is applied to the login/register endpoints to slow down credential-stuffing attempts.
- All user-authored HTML content is sanitized on both write (`sanitize-html`, server) and read (`DOMPurify`, client).

## 6. Testing

The backend has an automated Jest + Supertest suite in `backend/tests/`, run against an **in-memory MongoDB instance** (via `mongodb-memory-server`) so it doesn't touch a real database and can run in CI:

```
backend/tests/
├── setup.js        # spins up / tears down the in-memory MongoDB for each test file
├── auth.test.js     # registration, login success/failure, protected /me route, refresh-token flow
└── posts.test.js    # post CRUD + author-only permissions, nested comment creation & cascading delete, like/unlike
```

Run it with:

```bash
cd backend
npm test
```

**How this was verified while building the project:** every backend source file was syntax-checked (`node -c`), all dependencies installed cleanly, and the Express app was loaded standalone to confirm every route registers correctly (18 routes across `/api/auth`, `/api/posts`, and `/api/users`). The frontend was verified by running a full production build (`npm run build`) with ESLint warnings treated as errors — it compiles cleanly with zero errors or warnings, which catches import mistakes, unused variables, and most typos across all 20+ React source files.

_Add a screenshot of a `npm test` run (or your CI pipeline) here for submission — see the checklist below._

## Screenshots checklist

Capture and add these to your documentation before submitting:

- [ ] Registration page and a successful sign-up
- [ ] Login page
- [ ] Home page with a list of posts (and the search bar in use)
- [ ] The rich text editor while writing a post
- [ ] A published post's detail page, including tags and the like button
- [ ] The comment section with at least one nested/threaded reply
- [ ] The profile/settings page
- [ ] A terminal screenshot of `npm test` passing in `backend/`
- [ ] Your browser's Network tab showing the `Authorization: Bearer ...` header on a request and the `refreshToken` cookie in the response of `/api/auth/login`
