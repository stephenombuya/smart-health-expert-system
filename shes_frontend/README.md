# SHES Frontend — Smart Health Expert System

**React 18 · TypeScript 5 · Tailwind CSS 3 · Vite 5**

Frontend for the Smart Health Expert System — an AI-driven clinical decision support platform designed for Kenya's healthcare context. Connects to the Django REST backend via a typed API layer.

---

## ✨ Features

| Module | What it does |
|---|---|
| **Symptom Triage** | Multi-symptom entry form → inference engine → urgency result with plain-language explanation |
| **Medications** | Browse KEML catalogue, manage personal prescriptions, pairwise drug interaction checker |
| **Chronic Tracking** | Log blood glucose and blood pressure; trend charts (Recharts); 7-day summary cards |
| **Mental Health** | Mood logger (1–10 slider + emotion tags + journal); coping strategy recommendations; 14-day trend |
| **Lab Results** | Submit lab reports; view NLP-generated plain-language interpretation per test |
| **Profile** | Edit account info, medical profile (blood group, allergies, emergency contacts), change password |
| **Dashboard** | Health overview — 7-day averages, latest triage, mood breakdown, quick action cards |

---

## 🏗️ Architecture

```
src/
├── api/
│   ├── client.ts          # Axios instance + JWT attach + 401 → refresh interceptor
│   └── services.ts        # Typed API functions for every backend endpoint
├── components/
│   ├── common/            # Button, Input, Select, Textarea, Card, Badge, Modal,
│   │                      # Spinner, EmptyState, StatCard, PageHeader, UrgencyBadge…
│   └── layout/
│       ├── AppLayout.tsx  # Sidebar + responsive top bar + <Outlet />
│       └── ProtectedRoute.tsx
├── contexts/
│   └── AuthContext.tsx    # Global auth state (login / register / logout / refreshUser)
├── pages/
│   ├── auth/              # LoginPage, RegisterPage
│   ├── dashboard/         # DashboardPage
│   ├── triage/            # TriagePage, TriageHistoryPage
│   ├── medications/       # MedicationsPage
│   ├── chronic/           # ChronicPage (glucose + BP + Recharts)
│   ├── mental/            # MentalPage (mood + coping strategies + chart)
│   ├── lab/               # LabPage
│   └── profile/           # ProfilePage
├── types/
│   └── index.ts           # All TypeScript interfaces mirroring Django models
├── utils/
│   └── index.ts           # cn(), formatDate(), urgency/mood/lab colour maps, etc.
└── __tests__/
    ├── setup.ts
    ├── utils/             # 27 utility function tests
    ├── components/        # 40+ component tests
    ├── hooks/             # Auth context + API client tests
    └── pages/             # Login/Register page integration tests
```

---

## 🚀 Quick Start

### Option A — Docker (with backend, recommended)

```bash
# From the project root (parent of shes_frontend/)
cd shes_frontend
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1

### Option B — Local development

**Prerequisites:** Node.js 20+, SHES backend running on port 8000

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# .env already has VITE_API_URL=/api/v1 which Vite proxies to localhost:8000

# 3. Start dev server (with HMR)
npm run dev
```

Open http://localhost:3000

---

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report (outputs to ./coverage/)
npm run test:coverage
```

Test coverage targets: **70% lines / 70% functions / 65% branches**

---

## 🔧 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite development server with HMR |
| `npm run build` | TypeScript compile + production bundle |
| `npm run preview` | Preview production build locally |
| `npm test` | Run test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript type check (no emit) |

---

## 🔒 Security Features

| Feature | Implementation |
|---|---|
| JWT authentication | Tokens stored in `localStorage`; auto-refreshed via Axios interceptor |
| Token blacklisting | Logout POSTs refresh token to `/auth/logout/` (backend blacklists it) |
| Route protection | `<ProtectedRoute>` redirects unauthenticated users to `/login` |
| Guest routes | `<GuestRoute>` redirects logged-in users away from auth pages |
| HTTPS headers | Nginx config enforces `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` |
| Input validation | All forms use `zod` schemas + `react-hook-form` — no raw DOM manipulation |

---

## 🎨 Design System

**Fonts:** Outfit (display/headings) + DM Sans (body) — loaded from Google Fonts

**Colour palette:**
- Primary: Emerald green (`primary-50` → `primary-950`) — clinical, trustworthy
- Emergency: Red `#dc2626`
- Doctor Visit: Amber `#d97706`
- Self-Care: Emerald `#059669`
- Surface: Warm off-white `#fafaf8`

**Components follow:**
- Rounded corners (`rounded-xl`, `rounded-2xl`)
- Subtle shadows (`shadow-card`, `shadow-card-hover`)
- Consistent focus rings (`focus-visible:ring-2 focus-visible:ring-primary-500`)
- CSS animations: `animate-fade-in`, `animate-slide-up`, `animate-slide-in-left`

---

## 📦 Key Dependencies

| Package | Purpose |
|---|---|
| `react-router-dom` v6 | Client-side routing with lazy-loaded pages |
| `@tanstack/react-query` v5 | Server state management, caching, background refetch |
| `react-hook-form` + `zod` | Form state + schema validation |
| `axios` | HTTP client with JWT interceptors |
| `recharts` | Blood glucose, BP, and mood trend charts |
| `lucide-react` | Icon library (consistent set, tree-shakeable) |
| `clsx` | Conditional class name merging |
| `date-fns` | Date formatting and manipulation |
| `vitest` + `@testing-library/react` | Unit and integration testing |

---

## 🔌 Connecting to the Backend

The frontend communicates with the Django backend via `/api/v1/`.

In **development**, Vite's proxy (`vite.config.ts`) forwards `/api` → `http://localhost:8000`.

In **production**, Nginx (`nginx.conf`) proxies `/api/` → `http://shes_backend:8000`.

To point at a different backend, set `VITE_API_URL` in `.env`:
```
VITE_API_URL=https://your-backend-domain.com/api/v1
```

---

## 📁 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `/api/v1` | Backend API base URL |

---

*© 2025 Stephen Ombuya · Co-operative University of Kenya · BSSEC01/1589/2022*
