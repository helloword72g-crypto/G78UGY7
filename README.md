# Crypto Sultan — USDT Landing Page + Admin Panel (PostgreSQL)

A full website with:
- Public landing page (rate, WhatsApp CTA, why-us, how-it-works, FAQ, etc.)
- Password-protected Admin Panel (`/admin`) to update WhatsApp number, USDT rate, and site name
- Real **PostgreSQL** database that tracks every visitor and every WhatsApp button click
- Ready to deploy on **Render.com** with a managed Postgres database, one click via `render.yaml`

---

## 1. Run it locally first (recommended)

You need [Node.js](https://nodejs.org) 18+ and a PostgreSQL database (local install, Docker, or a free cloud Postgres).

```bash
cd crypto-sultan
npm install
cp .env.example .env
```

Open `.env` and set:
```
ADMIN_PASSWORD=yourpassword
SESSION_SECRET=any-long-random-string
DATABASE_URL=postgresql://user:password@localhost:5432/crypto_sultan
```

**Don't have Postgres installed?** Easiest local option with Docker:
```bash
docker run --name crypto-sultan-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=crypto_sultan -p 5432:5432 -d postgres
```
Then set `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/crypto_sultan` and `PGSSLMODE=disable` in `.env`.

Start the server:
```bash
npm start
```

The app creates its tables automatically on first run. Open:
- **http://localhost:3000** — public site
- **http://localhost:3000/admin** — admin panel (login with the password from `.env`)

Set your real WhatsApp number in the admin panel and confirm it with the "Test WhatsApp link" button before going live.

---

## 2. Deploy on Render.com (with managed Postgres)

### Step 1 — Push this folder to GitHub
Create a GitHub repo and push everything in this `crypto-sultan` folder (including `render.yaml`, but **not** `node_modules` or `.env`).

### Step 2 — Deploy via Blueprint
1. Go to [render.com](https://render.com) → **New** → **Blueprint**.
2. Connect your GitHub repo. Render reads `render.yaml` and automatically creates:
   - A **PostgreSQL database** (`crypto-sultan-db`)
   - A **Web Service** (`crypto-sultan`), already wired to that database via `DATABASE_URL`
3. When prompted, set **ADMIN_PASSWORD** to your real admin password. `SESSION_SECRET` and `DATABASE_URL` are filled in automatically.
4. Click **Apply**. First deploy takes a couple of minutes — Render provisions the database, installs dependencies, and starts the app.

If you'd rather set it up manually instead of using the Blueprint:
- **New → PostgreSQL** → create a database, copy its **Internal Database URL**
- **New → Web Service** → connect repo → Build Command: `npm install` → Start Command: `npm start`
- Add environment variables: `ADMIN_PASSWORD`, `SESSION_SECRET`, `NODE_ENV=production`, `DATABASE_URL=<the internal database URL you copied>`

### Step 3 — Add your logo
Make sure `public/logo.png` (included in this project) is committed to your GitHub repo — both the landing page and admin panel reference it.

### Step 4 — Go live
Render gives you a URL like `https://crypto-sultan.onrender.com`.
- Public site: that URL
- Admin panel: that URL + `/admin`

Log in, set your real WhatsApp number and rate, hit **Test WhatsApp link** to confirm it opens correctly, then **Save**.

---

## Why PostgreSQL instead of SQLite?

- Data lives in Render's managed database — **no persistent disk needed**, and it survives every redeploy/restart automatically.
- Render's free Postgres plan is a real managed database (note: free databases on Render are typically time-limited/expire after a period — check current Render pricing for details, and upgrade the database plan if you want it to stay free of that limit).
- If traffic grows, Postgres scales far better than a single SQLite file.

## Changing the admin password later
Render service → **Environment** tab → edit `ADMIN_PASSWORD` → Save. Render redeploys automatically.

## Project structure
```
crypto-sultan/
├── server.js              # Express server + API routes
├── db/database.js         # PostgreSQL setup + queries
├── public/
│   ├── index.html         # Public landing page
│   ├── admin.html         # Admin login + dashboard
│   └── logo.png           # Your Crypto Sultan logo
├── render.yaml             # Render deployment blueprint (web service + Postgres)
├── package.json
├── .env.example
└── .gitignore
```

## API reference (for reference/debugging)
| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/settings` | Public | Get whatsapp number, rate, site name |
| POST | `/api/track/visit` | Public | Log a page visit |
| POST | `/api/track/click` | Public | Log a WhatsApp button click |
| POST | `/api/admin/login` | — | Log in with password |
| POST | `/api/admin/logout` | — | Log out |
| GET | `/api/admin/check` | — | Check if session is authenticated |
| GET | `/api/admin/analytics` | Admin | Visit/click totals + recent visitor log |
| POST | `/api/admin/settings` | Admin | Update whatsapp number / rate / site name |

---

Disclaimer: this template does not constitute financial or investment advice. Make sure your business complies with local regulations around cryptocurrency trading before going live.
