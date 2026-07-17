# PyBe Latest

MERN starter — `/client` (React + Vite + Tailwind) and `/server` (Express + MongoDB).

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

The Vite dev server proxies `/api/*` to `http://localhost:5000`, so the React
app can call `/api/health` directly without CORS issues.

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
