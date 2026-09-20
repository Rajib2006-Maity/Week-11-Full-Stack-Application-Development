# Inkwell — Full Stack Blogging Platform

A complete blogging platform built with **React**, **Node.js/Express**, and **MongoDB**. Readers can browse and search posts; registered users can write, edit and delete posts, hold threaded discussions in the comments, and like posts.

> 📄 For the architecture write-up (auth flow, frontend↔backend communication, state management, deployment strategy) see **[DOCUMENTATION.md](./DOCUMENTATION.md)**.

## Project overview & objectives

This project was built to demonstrate a production-shaped full stack application:

- A React SPA that talks to a separate Node.js/Express REST API
- Real JWT authentication, including short-lived access tokens **and** refresh tokens
- Protected routes on both the frontend (route guards) and backend (middleware)
- Full CRUD for blog posts, with a lightweight built-in rich text editor
- A nested/threaded comment system
- User profiles with editable settings and password changes
- Automated backend tests (Jest + Supertest)

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, Axios, DOMPurify |
| Backend | Node.js, Express, JWT (`jsonwebtoken`), bcrypt |
| Database | MongoDB with Mongoose |
| Testing | Jest, Supertest, mongodb-memory-server |
| Deployment | Docker / docker-compose (optional) |

## Project structure

```
blogging-platform/
├── backend/
│   ├── src/
│   │   ├── config/db.js            # MongoDB connection
│   │   ├── models/                 # User, Post, Comment (Mongoose schemas)
│   │   ├── middleware/              # auth guard + centralized error handler
│   │   ├── controllers/             # request handlers / business logic
│   │   ├── routes/                  # Express routers
│   │   ├── utils/generateTokens.js  # JWT helpers
│   │   └── server.js                # app entry point
│   ├── tests/                       # Jest + Supertest test suite
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/              # Navbar, PostCard, CommentList, RichTextEditor, ...
│   │   ├── pages/                   # Home, Login, Register, PostDetail, CreatePost, ...
│   │   ├── context/AuthContext.js   # global auth state
│   │   ├── services/api.js          # axios instance + auto token-refresh
│   │   └── App.js                   # route definitions
│   ├── package.json
│   └── .env.example
├── docker-compose.yml
└── README.md
```

## Setup & installation

### Prerequisites

- Node.js 18+ and npm
- A MongoDB instance — either:
  - [MongoDB Community Server](https://www.mongodb.com/try/download/community) running locally, or
  - A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd blogging-platform
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
# edit .env and set MONGO_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
npm run dev        # starts the API on http://localhost:5000 with nodemon
```

Run the test suite:

```bash
npm test            # Jest + Supertest, spins up an in-memory MongoDB
```

> The first test run downloads a small MongoDB binary for `mongodb-memory-server` — it needs an internet connection the first time, then caches it locally.

### 3. Frontend setup

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
# edit .env if your API isn't on http://localhost:5000/api
npm start            # starts the React dev server on http://localhost:3000
```

Open **http://localhost:3000** — register an account and start writing.

### 4. Running with Docker (optional)

From the repository root:

```bash
docker compose up --build
```

This starts MongoDB, the API (port 5000) and the built frontend served by nginx (port 3000).

## Environment variables

**backend/.env**

| Variable | Description |
|---|---|
| `PORT` | Port the API listens on (default `5000`) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Secret used to sign short-lived access tokens |
| `JWT_REFRESH_SECRET` | Secret used to sign refresh tokens (must differ from the access secret) |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime, e.g. `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime, e.g. `7d` |
| `CLIENT_URL` | Origin of the frontend, for CORS + cookies |

**frontend/.env**

| Variable | Description |
|---|---|
| `REACT_APP_API_URL` | Base URL of the backend API, e.g. `http://localhost:5000/api` |

## How the technical requirements were met

| Requirement | Where it lives |
|---|---|
| Connect React frontend to Node.js API | `frontend/src/services/api.js` (axios instance) calling the Express routes in `backend/src/routes/` |
| JWT authentication with refresh tokens | `backend/src/controllers/authController.js` + `backend/src/utils/generateTokens.js`; see [DOCUMENTATION.md](./DOCUMENTATION.md#authentication-flow) |
| Protected routes for authenticated users | Backend: `requireAuth` middleware (`backend/src/middleware/auth.js`). Frontend: `<ProtectedRoute>` (`frontend/src/components/ProtectedRoute.js`) |
| Blog post creation, editing, deletion | `backend/src/controllers/postController.js`, `frontend/src/pages/CreatePost.js` / `EditPost.js` |
| Comment system with nested comments | `backend/src/models/Comment.js` (`parentComment` self-reference) + `backend/src/controllers/commentController.js`; rendered recursively in `frontend/src/components/CommentList.js` |
| User profile and settings | `backend/src/controllers/authController.js` (`updateMe`, `changePassword`) + `frontend/src/pages/Profile.js` |

Bonus features beyond the minimum: post search (MongoDB text index), pagination, likes, drafts (`published` flag), and public author profile pages.

## Deployment strategy

See [DOCUMENTATION.md](./DOCUMENTATION.md#deployment-strategy) for a full write-up. In short:

- **Database**: MongoDB Atlas (managed, free tier is enough for this project)
- **Backend**: any Node host that supports environment variables and persistent processes — Render, Railway, Fly.io, or a Docker container from the included `Dockerfile`
- **Frontend**: a static host that serves the `npm run build` output — Vercel, Netlify, or the same Docker/nginx setup in `docker-compose.yml`

## Screenshots

_Add screenshots of the running application here before submitting — see the "What to screenshot" checklist in [DOCUMENTATION.md](./DOCUMENTATION.md#screenshots-checklist)._

## Testing evidence

The backend ships with an automated test suite in `backend/tests/`:

- `auth.test.js` — registration, login (success/failure), protected-route access, refresh-token flow
- `posts.test.js` — post CRUD with author-only permission checks, nested comment creation + cascading delete, like/unlike toggling

Run with `npm test` from `backend/`. See [DOCUMENTATION.md](./DOCUMENTATION.md#testing) for sample output and notes on how it was verified during development.
