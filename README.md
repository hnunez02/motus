# Motus — AI-Powered Personal Training App

> **Atlas**, your AI sports scientist, builds evidence-based workouts, autoregulates training load in real-time, and coaches you through every set.

Motus is a full-stack iOS fitness app built with React + Capacitor, powered by the Anthropic Claude API. It combines adaptive programming science (RPE autoregulation, mesocycle periodization, fatigue management) with a conversational AI coach that personalizes every session.

---

## Screenshots

| Today's Session | Workout Card | Progress |
|---|---|---|
| Atlas chat-based workout builder | Live set logging with muscle map | Body measurements + volume charts |

---

## Features

### 🦉 Atlas — AI Coach
- **Conversational workout builder** — chat-style flow asking environment, split, muscles, goal, and duration before generating a full session
- **Evidence-based programming** — Volume landmarks (Israetel et al.), Prilepin's Table, RPE autoregulation
- **Real-time adaptation** — RPE delta tracking adjusts future sessions automatically
- **HealthKit integration** — resting HR, HRV, sleep, steps, and body weight injected into session context for smarter programming
- **RAG citations** — pgvector similarity search injects relevant sports science research into every prompt

### 💪 Workout Experience
- **Full workout card** — exercise name, session title, muscle diagram, form cue, set/rep scheme, RPE target
- **Live set logging** — weight/reps stepper + RPE slider, logs each set to the server in real-time
- **Rest timer** — auto-starts between sets with skip option
- **Exercise swaps** — swap any exercise mid-workout with an AI-suggested alternative
- **Form demo videos** — "Watch Form Demo" button opens the YouTube app directly for 58 seeded exercises
- **Workout persistence** — switching tabs mid-workout preserves full state via sessionStorage (4-hour TTL)
- **Quit workout modal** — "Save progress & quit" or "Discard & quit" with bottom sheet UI

### 📊 Progress Tracking
- **Fatigue trend chart** — 28-day EMA fatigue score with deload zone indicators
- **Estimated 1RM chart** — Epley formula, per-exercise trend across sessions
- **Muscle volume heatmap** — weekly sets per muscle group with MEV/MRV color coding
- **Body measurements tracker** — 9 muscle groups (chest, biceps, waist, etc.) with trend arrows and in/cm toggle
- **Workout log** — session history grouped by day with volume, sets, avg RPE

### ⚙️ Settings & Personalization
- **9-step onboarding** — training age, goals, biological sex, height/weight, activity level, equipment, injuries, days/week, HealthKit
- **Settings sheet** — re-run onboarding, language toggle (English/Spanish), colorblind mode (4 presets)
- **i18n** — full English + Spanish translations via react-i18next, auto-detects device language

### 📶 Offline Mode
- **App loads offline** — 5s timeout on startup API call prevents infinite loading screen on airplane mode
- **Workout generation fallback** — tries server first → cached recent workouts → hardcoded 6-exercise full-body fallback
- **Offline set queue** — failed set logs are queued in localStorage and replayed when connection is restored
- **Cached session view** — Log tab shows last synced sessions when server is unreachable
- **Slow connection UX** — after 8s in generating state, shows "Slow connection detected, still working…"

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TailwindCSS |
| Mobile | Capacitor 8 (iOS) |
| Backend | Node.js + Express + Prisma ORM |
| Database | PostgreSQL (Supabase) + pgvector |
| Auth | Supabase Auth |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Deployment | Railway (backend) + iOS App Bundle |
| Animations | Framer Motion |
| State | React Query (TanStack Query) |

---

## Project Structure

```
motus/
├── client/                     React + Vite + Capacitor frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Today.jsx           AI chat workout builder + session persistence
│   │   │   ├── Log.jsx             Workout history with offline cache fallback
│   │   │   ├── Progress.jsx        Charts: fatigue, 1RM, muscle volume
│   │   │   ├── Coach.jsx           Freeform chat with Atlas
│   │   │   ├── Onboarding.jsx      9-step onboarding flow
│   │   │   └── Settings.jsx        Profile reset, language, colorblind mode
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   ├── WorkoutCard.jsx     Full workout player with sessionStorage persistence
│   │   │   │   └── SetLogger.jsx       Set logging with offline queue
│   │   │   ├── layout/
│   │   │   │   ├── AppShell.jsx        Tab bar layout
│   │   │   │   ├── BottomNav.jsx       Animated bottom navigation
│   │   │   │   └── OnboardingGate.jsx  Route guard (checks daysPerWeek)
│   │   │   ├── AtlasAnimator.jsx       Lottie-based owl mascot animations
│   │   │   ├── ExerciseMusclePreview.jsx  SVG body diagram with muscle highlighting
│   │   │   ├── MuscleMap.jsx           Muscle group color scale
│   │   │   ├── MuscleVolumeCard.jsx    Weekly volume bar chart
│   │   │   ├── MeasurementsCard.jsx    Body measurement grid
│   │   │   ├── MeasurementSheet.jsx    Log measurement bottom sheet
│   │   │   ├── WorkoutComplete.jsx     Celebration screen + session summary
│   │   │   ├── FeedbackRing.jsx        RPE feedback animation ring
│   │   │   └── YouTubeModal.jsx        Opens YouTube app via deep link
│   │   ├── hooks/
│   │   │   ├── useAI.js            generateSession mutation + offline fallback
│   │   │   ├── useAuth.js          Supabase auth state
│   │   │   ├── useHealthKit.js     HealthKit permissions + data reads
│   │   │   └── useColorblindMode.js  CSS filter presets persisted to localStorage
│   │   ├── lib/
│   │   │   ├── api.js              Axios/CapacitorHttp wrapper with auth headers + timeouts
│   │   │   ├── supabase.js         Supabase client
│   │   │   ├── offlineQueue.js     Set queue + session cache for offline mode
│   │   │   └── constants.js        RPE descriptions, muscle groups, equipment lists
│   │   └── i18n/
│   │       ├── en.js               English translations
│   │       └── es.js               Spanish translations
│   ├── capacitor.config.json
│   └── vite.config.js
│
└── server/                     Node.js + Express API
    ├── routes/
    │   ├── ai.js               POST /generate-session (25s timeout), POST /chat (SSE)
    │   ├── auth.js             sync, me, profile PATCH, dev-setup
    │   ├── log.js              POST /set, POST /session, GET /history, GET /fatigue
    │   ├── exercises.js        GET list with filters
    │   ├── measurements.js     GET history, POST, DELETE
    │   ├── program.js          POST mesocycle, GET active, GET today
    │   └── progress.js         GET charts data
    ├── services/
    │   ├── aiService.js        Claude prompt builder + HealthKit context injection
    │   ├── adaptiveEngine.js   RPE delta, fatigue EMA, deload trigger
    │   ├── programEngine.js    Mesocycle generation, progressive overload
    │   └── ragService.js       pgvector similarity search for citations
    ├── middleware/
    │   └── auth.js             requireAuth with 5s Supabase timeout
    └── prisma/
        ├── schema.prisma       Full DB schema (8 models)
        └── seed.js             58 exercises with YouTube video IDs
```

---

## Database Schema

```
User               — profile, biometrics, goals, equipment, injury flags
PerfProfile        — fatigue score (EMA), weekly volume per muscle group
Mesocycle          — 6-week training block with goal and week tracking
WorkoutPlan        — individual workout day within a mesocycle
PlannedSet         — target weight/reps/RPE for a given exercise
Exercise           — 58 seeded exercises with muscle groups, cues, videoUrl, pgvector embedding
LoggedSet          — actual weight/reps/RPE logged by user, with RPE delta
BodyMeasurement    — circumference measurements per muscle group over time
AiCitation         — sports science papers with pgvector embeddings for RAG
```

---

## Setup

### Prerequisites
- Node.js 20+
- Supabase project with pgvector extension enabled
- Anthropic API key
- (For iOS) Xcode 15+ and Apple Developer account

### 1. Clone and install

```bash
git clone https://github.com/hnunez02/motus
cd motus

cd server && npm install
cd ../client && npm install
```

### 2. Environment variables

**`server/.env`**
```env
DATABASE_URL=postgresql://...          # Supabase pooled connection
DIRECT_URL=postgresql://...            # Supabase direct connection (for migrations)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...            # Service role key (server-side only)
ANTHROPIC_API_KEY=sk-ant-...
NODE_ENV=development
```

**`client/.env`**
```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...          # Anon/public key (safe for client)
```

### 3. Database setup

```bash
cd server

# Push schema to Supabase (never use migrate dev)
npm run db:push

# Seed 58 exercises with YouTube video IDs
npm run db:seed
```

### 4. Run locally

```bash
# Terminal 1 — backend
cd server && npm run dev       # http://localhost:3001

# Terminal 2 — frontend
cd client && npm run dev       # http://localhost:5173
```

### 5. iOS build

```bash
cd client
npm run build
npx cap sync ios
# Open in Xcode, select device, hit Run
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | — | Health check |
| POST | `/api/auth/sync` | ✓ | Upsert Supabase user to DB |
| GET | `/api/auth/me` | ✓ | Get current user profile |
| PATCH | `/api/auth/profile` | ✓ | Update profile + biometrics |
| POST | `/api/program/mesocycle` | ✓ | Create new 6-week mesocycle |
| GET | `/api/program/active` | ✓ | Get active mesocycle |
| GET | `/api/program/today` | ✓ | Get today's planned workout |
| POST | `/api/ai/generate-session` | ✓ | Generate AI workout (25s timeout, offline→503) |
| POST | `/api/ai/chat` | ✓ | Stream chat with Atlas (SSE) |
| POST | `/api/log/set` | ✓ | Log a single set |
| POST | `/api/log/session` | ✓ | Log full session (batch) |
| GET | `/api/log/history` | ✓ | Recent sets (default 60 days) |
| GET | `/api/log/fatigue` | ✓ | Fatigue score + deload status |
| GET | `/api/exercises` | ✓ | Exercise list (filterable by equipment/env) |
| GET | `/api/measurements` | ✓ | Body measurement history |
| POST | `/api/measurements` | ✓ | Log new measurement |
| DELETE | `/api/measurements/:id` | ✓ | Delete measurement |
| GET | `/api/progress/charts` | ✓ | 1RM trend + fatigue chart data |

---

## Atlas — Programming Philosophy

Atlas is built on peer-reviewed sports science, not bro-science:

| Concept | Source | Implementation |
|---|---|---|
| Volume Landmarks (MEV/MAV/MRV) | Israetel et al. | `MuscleVolumeCard` color thresholds |
| RPE Autoregulation | Zourdos et al. | `SetLogger` RPE slider → `rpeDelta` → adaptive engine |
| Prilepin's Table | Prilepin (1974) | Set/rep scheme selection by goal |
| EMA Fatigue Tracking | Custom | `adaptiveEngine.js` — 7-day EMA, deload at score > 7 |
| Progressive Overload | Standard | `programEngine.js` — 5% load increase per mesocycle week |
| Periodization | Block model | Mesocycle: accumulation → intensification → peak |

---

## Offline Architecture

```
App starts
  └─ OnboardingGate calls /api/auth/me
       ├─ Success → render app
       ├─ Network error → render app anyway (5s safety timeout)
       └─ No connection → 5s timer fires → render app

User generates workout
  └─ api.post('/api/ai/generate-session')
       ├─ Success → save to motus_recent_workouts (localStorage, last 5)
       ├─ Server 503 { offline: true } → load cached workout
       ├─ NSURLErrorDomain / ERR_NETWORK → load cached workout
       └─ No cache → load FALLBACK_WORKOUT (hardcoded 6-exercise full-body)

User logs a set
  └─ api.post('/api/log/set')
       ├─ Success → update fatigue score, advance workout
       └─ Any error → enqueue to motus_offline_set_queue (localStorage)
            └─ window 'online' event fires → flushQueue() replays all queued sets

User views Log tab
  └─ useQuery(['workout-history'])
       ├─ Success → show server data
       └─ Error → show getCachedSessions() with ⚡ offline banner
```

---

## Key Implementation Notes

### CapacitorHttp vs Axios
On iOS native, Capacitor intercepts HTTP and uses `WKURLSchemeHandler`. All requests go through `CapacitorHttp`, not browser fetch/axios. This means:
- Error objects have `code: "NSURLErrorDomain"` not `"ERR_NETWORK"`
- Auth headers must be set explicitly — interceptors don't work the same way
- `connectTimeout` and `readTimeout` must be set on every call

### Session Persistence
Active workout state is split across two sessionStorage keys:
- `motus_active_workout` — the full `ctx` object including `generatedPlan`
- `motus_workout_progress` — WorkoutCard internal state (`currentExIdx`, `currentSetIdx`, `loggedSets`, `swapped`)

Both are restored on mount via lazy `useState` initializers and cleared on workout complete/quit.

### Server Auth Timeout
The `requireAuth` middleware wraps `supabase.auth.getUser()` in a `Promise.race` with a 5-second timeout. If Supabase can't be reached (offline gym, spotty signal), the server returns `503 { offline: true }` within 5 seconds instead of hanging the request for 60+ seconds.

---

## Deployment

### Railway (Backend)
- Push to `main` → Railway auto-deploys
- Required env vars: `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`, `NODE_ENV=production`
- `BYPASS_AUTH` must NOT be set in production

### iOS (via Xcode)
```bash
cd client && npm run build && npx cap sync ios
# Open ios/ in Xcode → select device → Product → Run
```

For friend testing without TestFlight: plug in device, trust computer, run from Xcode. Each friend creates their own Supabase account on first launch — all data is fully isolated per user ID.

---

## Roadmap

- [ ] Email + password sign-up/login screen (required before public testing)
- [ ] Ludwig mascot (Lottie animations ready, swap from Atlas owl)
- [ ] Push notifications for rest timer and daily workout reminders
- [ ] TestFlight distribution
- [ ] Android support via Capacitor
- [ ] Apple Watch companion app
- [ ] Social features (share workout summary)

---

## License

Private — all rights reserved. Built by Hector Nunez.
