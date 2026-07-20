# PyBe Latest

Pair-programming tutorial platform — three learning paths, nine modules, a story-driven approach to Python concepts.

**`/client`** — React 18 + Vite + Tailwind CSS + React Router
**`/server`** — Express + MongoDB (Mongoose) + JWT authentication

---

## Quick start

You need **Node.js**, **MongoDB**, and **Git**.

### 1. Clone & install

```bash
git clone https://github.com/LOHITHKUMAR-09/PyBe-Latest.git
cd PyBe-Latest

# Server dependencies
cd server && npm install && cd ..

# Client dependencies
cd client && npm install && cd ..
```

### 2. Configure environment

```bash
cd server
cp .env.example .env
# Edit .env — see Environment variables below.
```

### 3. Seed the database

```bash
cd server
node scripts/seed.js
# → Clears existing paths/modules, inserts 3 paths × 3 modules = 9 total.
```

### 4. Start the servers

```bash
# Terminal 1 — API server
cd server
npm run dev
# → http://localhost:5000

# Terminal 2 — React dev server
cd client
npm run dev
# → http://localhost:5173
```

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

---

## Project layout

```
PyBe-Latest/
├── client/                              # React 18 + Vite + Tailwind
│   ├── src/
│   │   ├── App.jsx                      # Router: /, /login, /signup, /dashboard, /module/:id
│   │   ├── main.jsx
│   │   ├── index.css                    # Tailwind directives
│   │   ├── api.js                       # fetch wrapper — JWT auth, 401 handling, ApiError
│   │   ├── auth/
│   │   │   ├── AuthContext.jsx          # AuthProvider — token-in-memory + localStorage sync
│   │   │   └── ProtectedRoute.jsx       # Redirects unauthenticated users to /login
│   │   ├── components/
│   │   │   ├── PathTrail.jsx            # SVG snake-trail for one learning path
│   │   │   └── Skeleton.jsx             # Loading skeletons (Trail, Card, Block, Line)
│   │   └── pages/
│   │       ├── Home.jsx                 # Landing page
│   │       ├── Login.jsx
│   │       ├── Signup.jsx
│   │       ├── Dashboard.jsx            # XP counter, progress bar, PathTrails
│   │       └── Module.jsx               # Story → Why → Task → Code → Reflection → Quiz
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js                   # Proxies /api/* → http://localhost:5000
│   └── package.json
│
├── server/                              # Express API
│   ├── index.js                         # Boot: JWT guard → Express → MongoDB → listen
│   ├── package.json
│   ├── .env                             # PORT, MONGO_URI, JWT_SECRET, ALLOW_INSECURE_DEV
│   ├── middleware/
│   │   └── auth.js                      # authRequired() — validates Bearer JWT
│   ├── models/
│   │   ├── index.js
│   │   ├── User.js                      # email, name, passwordHash, xp
│   │   ├── LearningPath.js              # name, description, order
│   │   ├── Module.js                    # pathId, name, order, story, whyPairing, practicalTask, quizQuestion, quizChoices, quizAnswer, reflectionPrompt
│   │   └── UserProgress.js             # userId, moduleId, status, codeSubmission, reflectionText, quizPassed, xpEarned, completedAt, updatedAt
│   ├── routes/
│   │   ├── auth.js                      # POST /api/auth/signup, POST /api/auth/login
│   │   ├── me.js                        # GET /api/me — current user
│   │   ├── user.js                      # GET /api/user/summary — XP, completed count, total
│   │   ├── module.js                    # GET /api/module/:id — module + progress for one module
│   │   └── progress.js                  # GET /api/progress, PATCH /draft, PATCH /reflection, POST /quiz
│   ├── utils/
│   │   ├── completion.js               # tryCompleteAndUnlock() — marks module done, unlocks next
│   │   └── learner.js
│   └── scripts/
│       ├── seed.js                      # Seeds 3 paths and 9 modules
│       ├── seed-user-progress.js        # Fixes progress for existing users who signed up before seeding
│       ├── check-user-progress.js       # DB diagnostic for UserProgress
│       └── smoke-*.js / verify-*.js     # Various test/verification scripts
```

---

## Learning paths

| # | Path name   | Modules                           |
| - | ----------- | --------------------------------- |
| 1 | Path Alpha  | Variables → Conditionals → Loops  |
| 2 | Path Beta   | Lists → Dictionaries → Functions  |
| 3 | Path Gamma  | Exceptions → Classes → Decorators |

Each module has: a **story**, a **why-this-pairing** explanation, a **practical task**, a **code draft** textarea, a **reflection** field, and a **quiz** question.

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

- **Frontend:** React 18, Vite 5, Tailwind CSS 3, React Router 7
- **Backend:** Express 4, MongoDB, Mongoose 8, JWT (jsonwebtoken), bcrypt
- **Dev:** nodemon (server), Vite HMR (client)