# Video & Equipment Manager

Full-stack app with a **React frontend** (Vercel) and **Express + MongoDB backend** (Render).

## Project Structure

```
├── backend/          # Express API + MongoDB (deploy to Render)
│   ├── src/
│   │   ├── models/   # Mongoose schemas
│   │   ├── routes/   # API routes
│   │   ├── seed.ts   # Initial data seeder
│   │   └── server.ts
│   └── .env.example
├── frontend/         # React + Vite (deploy to Vercel)
│   ├── src/
│   └── vercel.json
└── package.json      # Root helper scripts
```

## Local Development

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure backend environment

Copy `backend/.env.example` to `backend/.env` and set your MongoDB URI:

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/videomanager?appName=Cluster0
FRONTEND_URL=http://localhost:5173
PORT=5000
```

> **Important:** Add a database name in the URI (e.g. `/videomanager`) before `?appName=`.

### 3. Seed the database (first time only)

```bash
npm run seed
```

### 4. Start both servers (two terminals)

**Terminal 1 — Backend:**
```bash
npm run dev:backend
```

**Terminal 2 — Frontend:**
```bash
npm run dev:frontend
```

Open **http://localhost:5173** in your browser.

### Default login credentials

| Email | Password | Role |
|-------|----------|------|
| budalsagar2020@gmail.com | password123 | Admin |
| admin@cantordust.com | cantordust123 | Admin |

---

## Deploy Backend to Render

1. Push this repo to GitHub.
2. Go to [render.com](https://render.com) → **New Web Service**.
3. Connect your GitHub repo.
4. Set **Root Directory** to `backend`.
5. Configure:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
6. Add **Environment Variables:**
   - `MONGODB_URI` = your MongoDB Atlas connection string (with `/videomanager` database name)
   - `FRONTEND_URL` = your Vercel frontend URL (e.g. `https://your-app.vercel.app`)
   - `NODE_ENV` = `production`
7. Deploy. Note your backend URL, e.g. `https://video-equipment-backend.onrender.com`.
8. After first deploy, run the seed script locally once (with the same `MONGODB_URI`) to populate data:
   ```bash
   npm run seed
   ```

---

## Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**.
2. Import your GitHub repo.
3. Set **Root Directory** to `frontend`.
4. Framework preset: **Vite**.
5. Add **Environment Variable:**
   - `VITE_API_URL` = your Render backend URL (e.g. `https://video-equipment-backend.onrender.com`)
6. Deploy.

### After deployment checklist

- [ ] Backend health check works: `https://YOUR-BACKEND.onrender.com/health`
- [ ] `FRONTEND_URL` on Render matches your exact Vercel URL (no trailing slash)
- [ ] `VITE_API_URL` on Vercel points to the Render backend (no trailing slash)
- [ ] MongoDB Atlas **Network Access** allows connections from anywhere (`0.0.0.0/0`) or Render's IPs
- [ ] Database has been seeded (`npm run seed`)

---

## API Endpoints

All routes are prefixed with `/api`:

- `GET /health` — backend health check
- Videos: `/api/videos`
- Equipment: `/api/equipment`
- Assignments: `/api/assignments`
- Users & Auth: `/api/login`, `/api/users`
- Categories: `/api/categories`
- Operators: `/api/operators`
- Custom Folders: `/api/custom-folders`
