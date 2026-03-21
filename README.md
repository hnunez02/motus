# Motus — AI-Powered Fitness App

Motus is a full-stack fitness coaching app powered by Atlas, an AI sports scientist built on Claude. Atlas builds personalized mesocycles, adapts training in real-time via RPE autoregulation, and coaches athletes through evidence-based programming.

## Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend  | Node.js + Express + Prisma |
| Database | PostgreSQL (Supabase) + pgvector |
| Auth     | Supabase Auth |
| AI       | Anthropic Claude (claude-sonnet-4-20250514) |
| Mobile   | Capacitor |

## Setup

### Prerequisites

- Node.js 20+
- A Supabase project with pgvector enabled
- An Anthropic API key

### 1. Clone and install

```bash
git clone <repo>
cd motus

# Install server deps
cd server && npm install

# Install client deps
cd ../client && npm install
```

### 2. Configure environment

```bash
# Server
cp server/.env.example server/.env
# Fill in DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY

# Client
cp client/.env.example client/.env
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

### 3. Set up the database

```bash
cd server

# Push Prisma schema (creates tables)
npm run db:push

# Seed exercises
npm run db:seed
```

### 4. Run development servers

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

App runs at `http://localhost:5173`. API at `http://localhost:3001`.

## Project Structure

```
/motus
  /client        React + Vite frontend
    /src
      /pages     Route-level page components
      /components UI + chat + layout components
      /hooks     Custom React hooks
      /lib       API client, Supabase, constants
  /server        Express API
    /routes      REST endpoints
    /services    Business logic (AI, adaptive, program)
    /middleware  Auth + error handling
    /prisma      Schema + seed data
  /shared        JSDoc type definitions
```

## Atlas — AI Coach

Atlas is powered by Claude and follows evidence-based programming principles:

- **Volume Landmarks** (Israetel et al.) — MEV/MAV/MRV per muscle group
- **Prilepin's Table** — set/rep schemes by goal
- **RPE Autoregulation** — prescribes effort, not percentages
- **Fatigue Management** — EMA fatigue score triggers deloads automatically
- **RAG Citations** — pgvector similarity search injects research context

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/health | Health check |
| POST   | /api/auth/sync | Sync Supabase user to DB |
| GET    | /api/auth/me | Get current user profile |
| PATCH  | /api/auth/profile | Update user profile |
| POST   | /api/program/mesocycle | Create new mesocycle |
| GET    | /api/program/active | Get active mesocycle |
| GET    | /api/program/today | Get today's planned workout |
| POST   | /api/log/set | Log a single set |
| POST   | /api/log/session | Log full session |
| GET    | /api/log/history | Get recent logged sets |
| GET    | /api/log/fatigue | Get fatigue score + deload status |
| GET    | /api/exercises | List exercises (filterable) |
| POST   | /api/ai/generate-session | Generate AI workout session |
| POST   | /api/ai/chat | Stream chat with Atlas |
