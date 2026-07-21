# PyBe Latest

<<<<<<< Updated upstream
MERN starter — `/client` (React + Vite + Tailwind) and `/server` (Express + MongoDB).
=======
Pair-programming tutorial platform featuring AI-generated, personalized stories (powered by Groq), in-browser Python execution (via Pyodide), and adaptive learning paths with placement quizzes and case studies.

**`/client`** — React 18 + Vite + Tailwind CSS + React Router
**`/server`** — Express + MongoDB (Mongoose) + JWT authentication

---
>>>>>>> Stashed changes

## Quick start

Open two terminals in this folder.

### 1. Server

```bash
cd server
npm install
npm run dev
# → http://localhost:5000
```

`GET /api/health` → `{ "status": "ok" }`

Environment variables live in `server/.env`:

| Key         | Example                                       |
| ----------- | --------------------------------------------- |
| `PORT`      | `5000`                                        |
| `MONGO_URI` | `mongodb://localhost:27017/pybe-latest`       |
| `JWT_SECRET`| any long random string                        |

### 2. Client

```bash
cd client
npm install
npm run dev
# → http://localhost:5173
```

<<<<<<< Updated upstream
The Vite dev server proxies `/api/*` to `http://localhost:5000`, so the React
app can call `/api/health` directly without CORS issues.
=======
The Vite dev server proxies `/api/*` → `http://localhost:5000`, so the React
app can call API endpoints without CORS issues.

---

## Environment variables (`server/.env`)

| Key               | Default                              | Notes                                      |
| ----------------- | ------------------------------------ | ------------------------------------------ |
| `PORT`            | `5000`                               | API server port                            |
| `MONGO_URI`       | `mongodb://localhost:27017/pybe-latest` | Change for staging/production MongoDB      |
| `JWT_SECRET`      | _(empty)_                            | **Required.** Min 32 chars. Generate with: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `ALLOW_INSECURE_DEV` | _(unset)_                        | Set to `1` only in local dev to skip JWT secret strength check |
| `GROQ_API_KEY`    | _(empty)_                            | **Required for AI generation.** Get a key from console.groq.com |

---
>>>>>>> Stashed changes

## Project layout

```
PyBe-Latest/
├── client/                  # React + Vite + Tailwind
│   ├── src/
│   │   ├── App.jsx          # fetches /api/health
│   │   ├── main.jsx
│   │   └── index.css        # Tailwind directives
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js       # proxy /api → :5000
└── server/                  # Express API
    ├── index.js             # GET /api/health
    ├── package.json
    └── .env                 # PORT, MONGO_URI, JWT_SECRET
```
<<<<<<< Updated upstream
=======

---

## Learning paths

| # | Path name     | Features                               |
| - | ------------- | -------------------------------------- |
| 1 | Foundations   | Variables → Conditionals → Loops       |
| 2 | Structures    | Lists → Dictionaries → Functions       |
| 3 | Design        | Exceptions → Classes → Decorators      |

Each path includes an optional **Placement Quiz** to test out of introductory modules, and ends with a **Case Study** evaluating the learner's knowledge.

Each module features: an **AI-generated story**, a **why-this-pairing** explanation, a **practical task**, an **in-browser code execution** block (Pyodide), an **AI evaluation** of learner answers, and a **quiz**.

Completion rule: both a non-empty reflection and a correct quiz answer → module marked `completed`, next module unlocked.

---

## API endpoints

### Public
| Method | Path                | Description                     |
| ------ | ------------------- | ------------------------------- |
| GET    | `/api/health`       | `{ "status": "ok" }` if healthy |

### Auth
| Method | Path                 | Body                                    | Response              |
| ------ | -------------------- | --------------------------------------- | --------------------- |
| POST   | `/api/auth/signup`   | `{ name, email, password }`             | `{ token, user }`     |
| POST   | `/api/auth/login`    | `{ email, password }`                   | `{ token, user }`     |

### Protected (requires `Authorization: Bearer <token>`)
| Method | Path                              | Description                                  |
| ------ | --------------------------------- | -------------------------------------------- |
| GET    | `/api/me`                         | Current user                                 |
| GET    | `/api/user/summary`               | `{ totalXP, completedCount, total }`         |
| GET    | `/api/progress`                   | All paths + modules + user's status          |
| GET    | `/api/module/:id`                 | Single module + user's progress              |
| PATCH  | `/api/progress/:id/draft`         | `{ codeSubmission }` → save code draft       |
| PATCH  | `/api/progress/:id/reflection`    | `{ reflectionText }` → save + try complete   |
| POST   | `/api/progress/:id/quiz`          | `{ answer }` → check + try complete          |
| POST   | `/api/progress/:id/story/regenerate` | Generate personalized AI story via Groq      |
| POST   | `/api/progress/:id/evaluate`      | `{ learnerAnswer }` → AI evaluation feedback |
| POST   | `/api/progress/:id/reveal`        | Mark the Python solution as viewed           |

---

## Scripts

```bash
cd server

node scripts/seed.js                        # Reset paths & modules
node scripts/seed-user-progress.js          # Fix progress for pre-seed signups
node scripts/check-user-progress.js         # Diagnostic: users, modules, progress counts
node scripts/smoke-auth.js                  # Auth flow smoke test
node scripts/smoke-module.js                # Module load smoke test
node scripts/smoke-progress.js              # Progress CRUD smoke test
node scripts/smoke-completion.js            # Completion/unlock smoke test
node scripts/smoke-errors.js                # Error handling smoke test
```

---

## Tech stack

- **Frontend:** React 18, Vite 5, Tailwind CSS 3, React Router 7, Pyodide (In-browser Python)
- **Backend:** Express 4, MongoDB, Mongoose 8, JWT (jsonwebtoken), bcrypt
- **AI/LLM:** Groq API (llama3) for dynamic story generation and code evaluation
- **Dev:** nodemon (server), Vite HMR (client)
>>>>>>> Stashed changes
