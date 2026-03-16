# SHES — Smart Health Expert System

<div align="center">

```
╔═══════════════════════════════════════════════════════╗
║          SMART HEALTH EXPERT SYSTEM  (SHES)           ║
║     AI-Driven Clinical Decision Support for Kenya     ║
╚═══════════════════════════════════════════════════════╝
```

[![Backend](https://img.shields.io/badge/Backend-Django%204.2-092E20?style=flat-square&logo=django)](https://www.djangoproject.com/)
[![Frontend](https://img.shields.io/badge/Frontend-React%2018-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)


</div>

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [The Problem Being Solved](#2-the-problem-being-solved)
3. [System Features](#3-system-features)
4. [Technology Stack](#4-technology-stack)
5. [System Architecture](#5-system-architecture)
6. [Project Structure](#6-project-structure)
7. [Prerequisites](#7-prerequisites)
8. [Installation & Setup](#8-installation--setup)
   - [Database Setup](#81-database-setup)
   - [Backend Setup](#82-backend-setup)
   - [Frontend Setup](#83-frontend-setup)
9. [Running the System](#9-running-the-system)
10. [API Reference](#10-api-reference)
11. [The Inference Engine](#11-the-inference-engine)
12. [Security Architecture](#12-security-architecture)
13. [Testing](#13-testing)
14. [Environment Variables](#14-environment-variables)
15. [Docker Deployment](#15-docker-deployment)
16. [Database Schema](#16-database-schema)
17. [Knowledge Base](#17-knowledge-base)
18. [Troubleshooting](#18-troubleshooting)
19. [Contributing](#19-contributing)
20. [Acknowledgements](#20-acknowledgements)

---

## 1. Project Overview

The **Smart Health Expert System (SHES)** is a full-stack web application that provides AI-driven clinical decision support tailored to Kenya's healthcare context. It bridges the critical gap between patients and the severely overstretched healthcare system by offering instant, evidence-based medical guidance through a rule-based inference engine.

The system comprises:

- A **Django REST API backend** housing the clinical inference engine, drug interaction checker, chronic disease tracker, lab result interpreter, and mental health module.
- A **React + TypeScript frontend** providing an accessible, responsive interface for patients and healthcare providers.
- A **JSON-based Knowledge Base** encoding clinical rules drawn from the Kenya National Clinical Guidelines and WHO primary care protocols.

> ⚕️ **Disclaimer:** SHES is a clinical decision *support* tool. It does not replace professional medical diagnosis or treatment. All triage outputs are advisory only.

---

## 2. The Problem Being Solved

Kenya's healthcare system faces a severe resource crisis:

| Metric | Kenya | WHO Target |
|--------|-------|-----------|
| Doctor-to-patient ratio | 1 : 6,355 | 1 : 1,000 |
| Rural clinic accessibility | < 50% within 5km | — |
| NCD (hypertension/diabetes) management | Very limited | — |

**Key problems SHES addresses:**

- **Inefficient triage** — Emergency rooms clogged with non-urgent cases that could be handled at home.
- **Poor chronic disease management** — Patients lack tools to track glucose and blood pressure trends.
- **Medical jargon barrier** — Lab results are unintelligible to most patients without doctor interpretation.
- **Drug interaction risk** — Patients on multiple medications have no accessible interaction checker.
- **Mental health neglect** — No integrated, low-barrier mood tracking or coping strategy tool.

---

## 3. System Features

### 🩺 Symptom Triage (Inference Engine)
- Patients input symptoms with severity (1–10) and duration
- A rule-based forward-chaining engine checks for **12 emergency red flags** (e.g., chest pain, stroke symptoms, suicidal ideation)
- The engine matches symptoms against a **14-condition knowledge base** (malaria, UTI, hypertension, diabetes, anaemia, etc.)
- Outputs one of four urgency levels: **Emergency**, **Doctor Visit**, **Self-Care**, or **Undetermined**
- Returns a plain-language recommendation and personalised home-care tips

### 💊 Medication Management
- Browse the **Kenya Essential Medicines List (KEML)** drug catalogue
- Track personal prescriptions with dosage, frequency, and schedule
- **Pairwise drug interaction checker** — select multiple medications and instantly see all known interactions with severity ratings (Minor → Contraindicated)

### 📊 Chronic Disease Tracking
- Log **blood glucose** readings (fasting, post-meal, random, bedtime) with automatic WHO/MOH interpretation
- Log **blood pressure** readings with automatic JNC-8 classification (Normal → Hypertensive Crisis)
- Visual **trend charts** (Recharts) for the last 14 readings
- **7-day summary dashboard** with rolling averages

### 🧠 Mental Health Module
- Daily **mood logger** with a 1–10 score slider, emotion tag selection, and optional journal note
- Automatic **mood category** assignment (Excellent → Distressed)
- Evidence-based **coping strategy recommendations** served immediately after logging (breathing exercises, journaling, grounding techniques, physical activity)
- **14-day mood trend chart** with wellbeing concern alerts

### 🔬 Lab Results Interpreter
- Submit lab reports with test names, values, and units
- The interpreter classifies each result (Low / Normal / High / Elevated) against reference ranges drawn from the Kenya MOH guidelines
- Generates a **plain-language overall summary** with specific action items for abnormal results
- Supports 9+ common tests out of the box (Haemoglobin, HbA1c, Glucose, Cholesterol, Creatinine, WBC, Platelets, LDL, HDL)

### 👤 User & Profile Management
- Email-based registration with role selection (Patient / Doctor / Admin)
- JWT authentication with refresh token rotation and blacklisting on logout
- Extended **patient medical profile** (blood group, allergies, chronic conditions, emergency contact)
- Secure **password change** endpoint with current password verification

### 📱 Dashboard
- At-a-glance health overview with 7-day average vitals
- Latest triage session result with urgency badge
- 14-day mood breakdown by category
- Quick action cards to all modules

---

## 4. Technology Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11 | Runtime |
| Django | 4.2 | Web framework |
| Django REST Framework | 3.15 | REST API |
| djangorestframework-simplejwt | 5.3 | JWT authentication |
| django-cors-headers | 4.4 | Cross-origin resource sharing |
| psycopg2-binary | 2.9 | PostgreSQL driver |
| cryptography (Fernet) | 42.0 | Field-level encryption |
| dj-database-url | 2.2 | Database URL parsing |
| python-dotenv | 1.0 | Environment variable loading |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| TypeScript | 5.5 | Type safety |
| Vite | 5.4 | Build tool and dev server |
| Tailwind CSS | 3.4 | Utility-first styling |
| React Router | 6.26 | Client-side routing |
| TanStack Query | 5.56 | Server state management & caching |
| React Hook Form | 7.53 | Form state management |
| Zod | 3.23 | Schema-based form validation |
| Axios | 1.7 | HTTP client with JWT interceptors |
| Recharts | 2.12 | Data visualisation (charts) |
| Lucide React | 0.441 | Icon library |
| date-fns | 3.6 | Date formatting |

### Database & Infrastructure
| Technology | Purpose |
|---|---|
| PostgreSQL 15 | Primary relational database |
| Docker + Docker Compose | Containerised deployment |
| Nginx | Production static file serving + reverse proxy |

### Testing
| Technology | Purpose |
|---|---|
| pytest + Django Test Runner | Backend unit and integration tests |
| Vitest | Frontend test runner |
| Testing Library (React) | Component and page tests |
| factory_boy | Test data factories |

---

## 5. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                        │
│              React 18 + TypeScript + Tailwind CSS            │
│                    http://localhost:3000                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/JSON  (JWT Bearer Token)
                           │ Vite dev proxy → /api/*
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     DJANGO REST API                          │
│                   http://localhost:8000                       │
│                                                              │
│  ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │   Auth &   │ │  Triage  │ │   Meds   │ │   Chronic   │ │
│  │   Users    │ │  Engine  │ │  Module  │ │  Tracking   │ │
│  └────────────┘ └──────────┘ └──────────┘ └─────────────┘ │
│  ┌────────────┐ ┌────────────────────────────────────────┐  │
│  │  Mental    │ │         Lab Results Interpreter         │  │
│  │  Health    │ │                                        │  │
│  └────────────┘ └────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │             Inference Engine (Knowledge Base)         │   │
│  │   red_flags.json · conditions.json · recommendations  │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ SQL  (psycopg2)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      PostgreSQL 15                           │
│                    localhost:5432/shes_db                    │
└─────────────────────────────────────────────────────────────┘
```

### Request Lifecycle

```
User fills symptom form
        │
        ▼
React validates with Zod schema
        │
        ▼
Axios POSTs to /api/v1/triage/start/
  (Bearer token attached by interceptor)
        │
        ▼
Django authenticates JWT → routes to TriageView
        │
        ▼
InferenceEngine.evaluate(symptoms)
  ├── Step 1: Scan for red flags → EMERGENCY?
  ├── Step 2: Match against 14-condition KB
  ├── Step 3: Escalate based on severity/duration
  └── Step 4: Return TriageResult
        │
        ▼
TriageSession saved to PostgreSQL
        │
        ▼
JSON response → React renders result card
```

---

## 6. Project Structure

```
shes/                          ← Root workspace
├── shes_backend/              ← Django REST API
│   ├── apps/
│   │   ├── authentication/    # User model, JWT views, patient profiles
│   │   ├── triage/            # Inference engine, session models
│   │   ├── medications/       # KEML catalogue, interaction checker
│   │   ├── chronic_tracking/  # Glucose + BP models and views
│   │   ├── mental_health/     # Mood entries, coping strategies
│   │   └── lab_results/       # Interpreter engine, result models
│   ├── knowledge_base/
│   │   ├── red_flags.json     # 12 emergency symptom triggers
│   │   ├── conditions.json    # 14 clinical condition rule sets
│   │   └── recommendations.json
│   ├── shes_backend/
│   │   ├── settings/
│   │   │   ├── base.py        # Shared settings
│   │   │   ├── development.py # SQLite + relaxed security
│   │   │   └── production.py  # HTTPS + HSTS + secure cookies
│   │   ├── encryption.py      # Fernet field-level encryption
│   │   ├── middleware.py      # Audit log middleware
│   │   ├── exceptions.py      # Consistent JSON error envelope
│   │   └── urls.py            # Root URL config
│   ├── tests/                 # 75+ test cases
│   │   ├── factories.py       # factory_boy model factories
│   │   ├── test_authentication.py
│   │   ├── test_triage.py
│   │   ├── test_medications.py
│   │   ├── test_chronic_mental_lab.py
│   │   ├── test_inference_engine.py
│   │   ├── test_lab_interpreter.py
│   │   ├── test_models.py
│   │   └── test_security.py
│   ├── manage.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── .env.example
│
└── shes_frontend/             ← React + TypeScript SPA
    ├── src/
    │   ├── api/
    │   │   ├── client.ts      # Axios + JWT refresh interceptor
    │   │   └── services.ts    # 25+ typed API functions
    │   ├── components/
    │   │   ├── common/        # Button, Input, Card, Modal, Badge, etc.
    │   │   └── layout/        # AppLayout (sidebar), ProtectedRoute
    │   ├── contexts/
    │   │   └── AuthContext.tsx # Global auth state
    │   ├── pages/
    │   │   ├── auth/          # LoginPage, RegisterPage
    │   │   ├── dashboard/     # DashboardPage
    │   │   ├── triage/        # TriagePage, TriageHistoryPage
    │   │   ├── medications/   # MedicationsPage
    │   │   ├── chronic/       # ChronicPage (with Recharts)
    │   │   ├── mental/        # MentalPage (with Recharts)
    │   │   ├── lab/           # LabPage
    │   │   └── profile/       # ProfilePage
    │   ├── types/index.ts     # 50+ TypeScript interfaces
    │   └── utils/index.ts     # Helpers, colour maps, formatters
    ├── src/__tests__/         # 90+ test cases
    │   ├── setup.ts
    │   ├── components/        # UI component tests
    │   ├── hooks/             # AuthContext + API client tests
    │   ├── pages/             # Login/Register integration tests
    │   └── utils/             # Utility function tests
    ├── public/favicon.svg
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── Dockerfile
    ├── nginx.conf
    ├── docker-compose.yml
    └── .env.example
```

---

## 7. Prerequisites

Ensure the following are installed before setup:

| Tool | Minimum Version | Download |
|------|----------------|----------|
| Python | 3.11 | https://www.python.org/downloads/ |
| Node.js | 20 (LTS) | https://nodejs.org/ |
| PostgreSQL | 15 | https://www.postgresql.org/download/ |
| Git | Any | https://git-scm.com/ |
| VS Code | Any | https://code.visualstudio.com/ |

**Recommended VS Code Extensions:**
- Python (Microsoft)
- Pylance
- ESLint
- Tailwind CSS IntelliSense
- Thunder Client (API testing — alternative to Postman)
- PostgreSQL (cweijan)

---

## 8. Installation & Setup

### 8.1 Database Setup

**Open a terminal (PowerShell on Windows, bash on Mac/Linux):**

```bash
# Connect to PostgreSQL as the superuser
psql -U postgres
```

Run the following SQL commands:

```sql
-- Create the database
CREATE DATABASE shes_db;

-- Create a dedicated user
CREATE USER shes_user WITH PASSWORD 'shes_password';

-- Grant full access
GRANT ALL PRIVILEGES ON DATABASE shes_db TO shes_user;

-- PostgreSQL 15+ requires this additional grant
\c shes_db
GRANT ALL ON SCHEMA public TO shes_user;

-- Verify and exit
\l          -- list databases (you should see shes_db)
\q          -- quit psql
```

---

### 8.2 Backend Setup

```bash
# 1. Navigate to the backend directory
cd shes_backend

# 2. Create a Python virtual environment
python -m venv .venv

# 3. Activate it
# Windows:
.venv\Scripts\Activate.ps1
# Mac/Linux:
source .venv/bin/activate

# 4. Install all Python dependencies
pip install -r requirements.txt

# 5. Create your environment file
cp .env.example .env
```

Edit `.env` with your actual values:

```env
DJANGO_SECRET_KEY=replace-with-a-50-plus-character-random-string-here-123456789
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgres://shes_user:shes_password@localhost:5432/shes_db
FIELD_ENCRYPTION_KEY=
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

```bash
# 6. Create the logs directory
mkdir logs       # Windows: md logs

# 7. Run database migrations (creates all tables)
python manage.py migrate

# 8. Seed clinical knowledge base data
python manage.py seed_knowledge_base

# 9. Create a superuser for the admin panel
python manage.py createsuperuser

# 10. Start the development server
python manage.py runserver
```

✅ **Backend is running at http://localhost:8000**

---

### 8.3 Frontend Setup

Open a **new terminal window** (keep the backend running):

```bash
# 1. Navigate to the frontend directory
cd shes_frontend

# 2. Install Node.js dependencies
npm install

# 3. Create the environment file
cp .env.example .env
```

The `.env` file should contain:

```env
VITE_API_URL=/api/v1
```

> The Vite dev server is already configured to proxy all `/api` requests to `http://localhost:8000`, so this is all you need.

```bash
# 4. Start the frontend development server
npm run dev
```

✅ **Frontend is running at http://localhost:3000**

---

## 9. Running the System

Once both servers are running, open **http://localhost:3000** in your browser.

### First Steps

**Register a patient account:**
1. Click **"Create one"** on the login page
2. Fill in your name, email, password, select role **Patient**
3. You are automatically logged in and redirected to the Dashboard

**Try the triage engine:**
1. Click **Symptom Triage** in the sidebar
2. Add symptoms: `fever` (severity 7, 2 days), `chills` (severity 6), `headache` (severity 5)
3. Click **Assess Symptoms**
4. Observe the urgency result, matched conditions, and plain-language advice

**Log a glucose reading:**
1. Go to **Chronic Tracking**
2. Click **Log Glucose** → enter a value, select context, set date/time
3. The system immediately interprets the result (Normal / Pre-diabetic / High)

**Admin panel:**

Navigate to **http://localhost:8000/admin/** and log in with your superuser credentials to inspect all database records.

### Daily Startup Checklist

```
□ PostgreSQL service is running
□ Terminal 1: cd shes_backend → activate .venv → python manage.py runserver
□ Terminal 2: cd shes_frontend → npm run dev
□ Browser: http://localhost:3000
```

---

## 10. API Reference

All endpoints are prefixed with `/api/v1/`. Authentication uses JWT Bearer tokens.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register/` | None | Create new account |
| `POST` | `/auth/login/` | None | Obtain access + refresh tokens |
| `POST` | `/auth/refresh/` | None | Refresh access token |
| `POST` | `/auth/logout/` | ✅ | Blacklist refresh token |
| `GET/PATCH` | `/auth/profile/` | ✅ | View / update own account |
| `GET/PATCH` | `/auth/patient-profile/` | ✅ | Medical profile (patients) |
| `PUT` | `/auth/change-password/` | ✅ | Change password |

### Triage

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/triage/start/` | ✅ | Submit symptoms → run inference engine |
| `GET` | `/triage/history/` | ✅ | List past triage sessions |
| `GET` | `/triage/<id>/` | ✅ | Retrieve single session |

**Example — Start a triage session:**
```json
POST /api/v1/triage/start/
Authorization: Bearer <access_token>

{
  "symptoms": [
    { "name": "fever", "severity": 7, "duration_days": 2 },
    { "name": "chills", "severity": 6 },
    { "name": "sweating", "severity": 5 },
    { "name": "headache", "severity": 5 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "urgency_level": "doctor_visit",
    "recommendation": "🩺 DOCTOR VISIT RECOMMENDED: ...",
    "layman_explanation": "Your symptoms most closely match 'Malaria'...",
    "red_flags_detected": [],
    "matched_conditions": [
      { "name": "Malaria", "match_ratio": 0.71, "home_care_tips": [...] }
    ],
    "symptoms": [...],
    "completed": true,
    "created_at": "2025-01-15T09:30:00Z"
  }
}
```

### Medications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/medications/list/?search=metformin` | ✅ | Search KEML catalogue |
| `GET/POST` | `/medications/my/` | ✅ | List / add personal medications |
| `GET/PATCH/DELETE` | `/medications/my/<id>/` | ✅ | Manage single medication |
| `POST` | `/medications/interaction-check/` | ✅ | Check pairwise interactions |

**Example — Check drug interactions:**
```json
POST /api/v1/medications/interaction-check/

{ "medication_ids": [1, 2, 5] }
```

### Chronic Tracking

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET/POST` | `/chronic/glucose/` | ✅ | Log / list glucose readings |
| `GET/PATCH/DELETE` | `/chronic/glucose/<id>/` | ✅ | Manage reading |
| `GET/POST` | `/chronic/blood-pressure/` | ✅ | Log / list BP readings |
| `GET/PATCH/DELETE` | `/chronic/blood-pressure/<id>/` | ✅ | Manage reading |
| `GET` | `/chronic/summary/` | ✅ | 7-day averages |

### Mental Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET/POST` | `/mental-health/mood/` | ✅ | Log / list mood entries |
| `GET/PATCH/DELETE` | `/mental-health/mood/<id>/` | ✅ | Manage entry |
| `GET` | `/mental-health/coping-strategies/` | ✅ | Browse strategies |
| `GET` | `/mental-health/summary/` | ✅ | 14-day mood trend |

### Lab Results

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET/POST` | `/lab/results/` | ✅ | Submit / list lab results |
| `GET/DELETE` | `/lab/results/<id>/` | ✅ | View / delete result |
| `GET` | `/lab/references/` | ✅ | Supported tests catalogue |

### Standard Error Response

All errors follow a consistent envelope:

```json
{
  "success": false,
  "error": {
    "code": 400,
    "detail": {
      "email": ["This field is required."]
    }
  }
}
```

---

## 11. The Inference Engine

The triage inference engine (`apps/triage/inference_engine.py`) implements a forward-chaining rule-based expert system.

### Resolution Order

```
Input: List of symptoms with severity and duration
         │
         ▼
Step 1 ── Red Flag Scan ─────────────────────────────
│         Check each symptom against 12 emergency     │
│         triggers (chest pain, stroke, overdose…)    │
│         IF match → urgency = EMERGENCY, stop.       │
         │
         ▼
Step 2 ── Condition Matching ────────────────────────
│         Compare symptom set against 14-condition KB  │
│         Match ratio threshold = 50%                 │
│         Returns ranked list of matched conditions   │
         │
         ▼
Step 3 ── Urgency Resolution ────────────────────────
│         Merge condition urgency + severity signals  │
│         Escalation rules:                           │
│           max_severity ≥ 9 → DOCTOR_VISIT           │
│           avg_severity ≥ 6 → DOCTOR_VISIT           │
│           duration ≥ 7 days → DOCTOR_VISIT          │
         │
         ▼
Step 4 ── Output ────────────────────────────────────
          urgency_level + recommendation +
          layman_explanation + matched_conditions +
          red_flags_detected + home_care_tips
```

### Urgency Levels

| Level | Trigger | Example |
|-------|---------|---------|
| `emergency` | Red flag symptom detected | Chest pain, stroke signs, suicidal ideation |
| `doctor_visit` | Condition match with high urgency OR severity escalation | Malaria, UTI, uncontrolled hypertension |
| `self_care` | Mild matched condition + low severity | Common cold, tension headache, mild anxiety |
| `undetermined` | No symptoms provided OR no match | — |

### Extending the Knowledge Base

To add a new clinical condition, edit `knowledge_base/conditions.json`:

```json
{
  "name": "Dengue Fever",
  "urgency": "doctor_visit",
  "symptoms": ["high fever", "severe headache", "joint pain", "rash", "eye pain"],
  "description": "A mosquito-borne viral infection common in tropical regions.",
  "home_care_tips": [
    "Rest and drink plenty of fluids",
    "Take paracetamol for fever — avoid aspirin or ibuprofen",
    "Monitor for warning signs: bleeding, severe abdominal pain",
    "Seek immediate care if symptoms worsen"
  ]
}
```

No code changes needed — the engine loads JSON files at startup.

---

## 12. Security Architecture

| Layer | Mechanism | Detail |
|-------|-----------|--------|
| **Authentication** | JWT (RS256 claims) | Access token (60 min) + refresh token (7 days) |
| **Token invalidation** | Blacklist on logout | `rest_framework_simplejwt.token_blacklist` |
| **Password policy** | Django validators | Min 10 chars, no common passwords, no all-numeric |
| **Rate limiting** | DRF throttling | Auth: 10/hour · Triage: 30/hour · General: 200/hour |
| **HTTPS enforcement** | Production settings | `SECURE_SSL_REDIRECT`, `HSTS` 1 year with preload |
| **Secure cookies** | Production settings | `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SameSite=Strict` |
| **Clickjacking** | `X-Frame-Options` | Set to `DENY` on all responses |
| **Field encryption** | Fernet (AES-128-CBC) | Sensitive health fields encrypted at rest |
| **Audit logging** | Custom middleware | Every API request logged: user, method, path, status, duration |
| **Object isolation** | Queryset filtering | Patients can only access their own records (IDOR prevention) |
| **Error enveloping** | Custom handler | No stack traces or internal details in error responses |
| **CORS** | `django-cors-headers` | Restricted to configured allowed origins only |
| **Data protection** | Kenya DPA 2019 | Audit log + encryption designed for compliance |

---

## 13. Testing

### Backend Tests

```bash
cd shes_backend

# Activate virtual environment first
.venv\Scripts\Activate.ps1  # Windows
source .venv/bin/activate   # Mac/Linux

# Run all 75+ tests
python manage.py test tests

# Run a specific module
python manage.py test tests.test_inference_engine
python manage.py test tests.test_security

# Run with coverage report
pip install coverage
coverage run -m pytest
coverage report
coverage html   # generates htmlcov/index.html
```

**Test Modules:**

| File | What's Tested |
|------|--------------|
| `test_inference_engine.py` | Red flag detection, condition matching, severity escalation, edge cases |
| `test_authentication.py` | Registration, login, logout, profile, password change |
| `test_triage.py` | API endpoints, session persistence, history, ownership isolation |
| `test_medications.py` | KEML list, patient medications CRUD, interaction checker |
| `test_chronic_mental_lab.py` | Glucose/BP logging, mood entries, lab submissions |
| `test_lab_interpreter.py` | Fallback classifier, plain-language generation |
| `test_models.py` | Computed properties (glucose interpretation, BP classification, mood category) |
| `test_security.py` | Auth enforcement, IDOR prevention, error envelope format, encryption |

### Frontend Tests

```bash
cd shes_frontend

# Run all 90+ tests
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# Coverage report (requires threshold: 70% lines)
npm run test:coverage
```

**Test Modules:**

| File | What's Tested |
|------|--------------|
| `utils.test.ts` | `cn()`, date formatters, `getMoodCategory()`, `extractApiError()`, colour maps |
| `components.test.tsx` | Button, Input, Select, Card, Badge, Modal, Spinner, EmptyState, StatCard |
| `AuthContext.test.tsx` | Login/logout state, token storage, profile fetch, error handling |
| `apiClient.test.ts` | `tokenStorage` get/set/clear operations |
| `auth.test.tsx` | Login form validation, error display, Register form, password mismatch |

---

## 14. Environment Variables

### Backend (`shes_backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DJANGO_SECRET_KEY` | ✅ | — | 50+ char random secret. Generate: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DJANGO_DEBUG` | | `False` | Set `True` for development |
| `DJANGO_ALLOWED_HOSTS` | ✅ | — | Comma-separated: `localhost,127.0.0.1` |
| `DATABASE_URL` | ✅ | — | `postgres://user:pass@host:port/dbname` |
| `FIELD_ENCRYPTION_KEY` | | `""` | Fernet key for sensitive data. Generate: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | | `60` | Access token validity in minutes |
| `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | | `7` | Refresh token validity in days |
| `CORS_ALLOWED_ORIGINS` | ✅ | — | Frontend origin: `http://localhost:3000` |

### Frontend (`shes_frontend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | | `/api/v1` | Backend API base URL. In dev, Vite proxy handles `/api` → `localhost:8000` |

---

## 15. Docker Deployment

The easiest way to run the entire stack is with Docker Compose.

### Prerequisites
- Docker Desktop installed: https://www.docker.com/products/docker-desktop/

### Start the Full Stack

```bash
# From the shes_frontend directory
# (docker-compose.yml references ../shes_backend)

cd shes_frontend

# Build and start all services
docker-compose up --build
```

**Services started:**
- `db` — PostgreSQL 15 on port 5432
- `shes_backend` — Django API on http://localhost:8000
- `shes_frontend` — React (served by Nginx) on http://localhost:3000

**First-time setup inside Docker:**
```bash
# Create superuser (run in a separate terminal while containers are up)
docker-compose exec shes_backend python manage.py createsuperuser
```

### Useful Docker Commands

```bash
# Stop all services
docker-compose down

# Stop and wipe the database (fresh start)
docker-compose down -v

# View live logs for the backend
docker-compose logs -f shes_backend

# Run backend tests inside the container
docker-compose exec shes_backend python manage.py test tests

# Open a Django shell
docker-compose exec shes_backend python manage.py shell

# Re-seed knowledge base
docker-compose exec shes_backend python manage.py seed_knowledge_base

# Check service status
docker-compose ps
```

---

## 16. Database Schema

```
authentication_user (custom User model)
├── id (UUID, PK)
├── email (unique)
├── first_name, last_name
├── role (patient | doctor | admin)
├── date_of_birth, phone_number, county
└── is_active, is_staff, created_at, updated_at

authentication_patientprofile (1-to-1 with User)
├── blood_group, known_allergies
├── chronic_conditions
└── emergency_contact_name, emergency_contact_phone

triage_triagesession
├── id (UUID, PK)
├── patient (FK → User)
├── urgency_level, recommendation, layman_explanation
├── red_flags_detected (JSON), matched_conditions (JSON)
└── completed, created_at, updated_at

triage_symptom
├── id (UUID, PK)
├── session (FK → TriageSession)
├── name, severity (1-10), duration_days
└── body_location, additional_notes

medications_medication
├── id (PK), name (unique), generic_name
├── drug_class, common_uses, standard_dosage
└── contraindications, side_effects, is_keml_listed

medications_druginteraction
├── drug_a (FK), drug_b (FK)
├── severity (minor | moderate | major | contraindicated)
└── description, clinical_action

medications_patientmedication
├── id (UUID, PK)
├── patient (FK → User), medication (FK)
├── dosage, frequency, start_date, end_date
└── prescribing_doctor, notes, is_active

chronic_tracking_glucosereading
├── id (UUID, PK), patient (FK → User)
├── value_mg_dl, context, hba1c
└── notes, recorded_at

chronic_tracking_bloodpressurereading
├── id (UUID, PK), patient (FK → User)
├── systolic, diastolic, pulse
└── notes, recorded_at

mental_health_moodentry
├── id (UUID, PK), patient (FK → User)
├── mood_score (1-10), mood_category (computed)
├── emotions (JSON), journal_note, triggers
└── recorded_at

mental_health_copingstrategy
├── title, strategy_type, description
├── instructions, applicable_moods (JSON)
└── duration_minutes, is_active

lab_results_labtestref
├── test_name (unique), abbreviation, unit
├── normal_min, normal_max
├── low_label, normal_label, high_label
└── layman_description, low_advice, high_advice

lab_results_labresult
├── id (UUID, PK), patient (FK → User)
├── lab_name, test_date
├── raw_results (JSON), interpreted_results (JSON)
└── overall_summary, doctor_notes
```

---

## 17. Knowledge Base

The inference engine reads three JSON files from `knowledge_base/`:

### `red_flags.json`
12 emergency symptom patterns that trigger immediate `EMERGENCY` routing:

| Red Flag | Rationale |
|----------|-----------|
| Chest pain or tightness | Possible MI or pulmonary embolism |
| Difficulty breathing | Respiratory failure, anaphylaxis |
| Loss of consciousness | Syncope / coma |
| Signs of stroke (FAST) | Thrombolysis window is 4.5 hours |
| Severe allergic reaction | Airway obstruction within minutes |
| Uncontrolled bleeding | Haemorrhagic shock |
| Stiff neck with fever | Bacterial meningitis |
| Suspected poisoning/overdose | Toxicology emergency |
| Seizure / convulsion | Status epilepticus |
| Severe abdominal pain | Perforated ulcer, appendicitis, ectopic pregnancy |
| Suicidal ideation | Immediate mental health crisis |
| High fever in infant | Fever >38°C in <3 month infants |

### `conditions.json`
14 clinical conditions with symptom sets, urgency levels, and home-care tips:
Common Cold, Influenza, Malaria, Typhoid, Gastroenteritis, UTI, Hypertension, Type 2 Diabetes, Tension Headache, Anaemia, Skin Infection, Anxiety, Back Pain, Asthma

### `recommendations.json`
Plain-language recommendations per urgency level, including Kenyan emergency numbers (999, Kenya Red Cross 0800 723 253).

---

## 18. Troubleshooting

### Backend Issues

| Problem | Solution |
|---------|----------|
| `DJANGO_SECRET_KEY not set` | Create/check `.env` file in the `shes_backend/` root |
| `psycopg2 install fails` | Use `pip install psycopg2-binary` instead of `psycopg2` |
| `connection to server failed` | PostgreSQL service not running. Start it: `net start postgresql-x64-15` (Windows) |
| `authentication failed for shes_user` | Run the GRANT SQL commands again in psql |
| `relation does not exist` | Migrations not run: `python manage.py migrate` |
| `ModuleNotFoundError` | Virtual environment not activated |
| `seed_knowledge_base not found` | Run from `shes_backend/` directory with venv active |

### Frontend Issues

| Problem | Solution |
|---------|----------|
| `npm install` fails | Delete `node_modules/` and `package-lock.json`, then retry |
| Blank page after login | Open browser DevTools → check for network errors |
| `401 Unauthorized` on all requests | Token expired — log out and log back in |
| `Network Error` / API calls fail | Ensure Django is running on port 8000 |
| CORS errors in browser console | Add `http://localhost:3000` to `CORS_ALLOWED_ORIGINS` in backend `.env` |
| Port 3000 already in use | `npm run dev -- --port 3001` (update Vite proxy target too) |
| Recharts not rendering | Window resize can fix it — or wrap chart in `<div style={{width:'100%'}}>` |

### Database Issues

| Problem | Solution |
|---------|----------|
| `password authentication failed` | Double-check `.env` DATABASE_URL matches the password set in psql |
| `database shes_db does not exist` | Run the `CREATE DATABASE shes_db` SQL command |
| `permission denied for schema public` | Run `GRANT ALL ON SCHEMA public TO shes_user;` after `\c shes_db` |
| Data not showing in admin | Refresh the page; check the correct database is selected in pgAdmin |

---

## 19. Contributing

Contributions, bug fixes, and knowledge base improvements are welcome.

### Development Workflow

```bash
# 1. Fork and clone the repository
git clone https://github.com/your-username/shes.git

# 2. Create a feature branch
git checkout -b feature/add-dengue-condition

# 3. Make changes and write tests

# 4. Run the test suites
python manage.py test tests         # backend
npm test                            # frontend

# 5. Commit with a descriptive message
git commit -m "feat: add Dengue Fever to conditions knowledge base"

# 6. Push and open a Pull Request
git push origin feature/add-dengue-condition
```

### Code Standards

- **Backend:** Follow Django's coding style. All new views must have corresponding tests. New conditions require entries in `conditions.json`, not hardcoded rules.
- **Frontend:** All components must be fully typed (no `any`). New pages must be lazy-loaded in `App.tsx`. Form validation must use Zod schemas.
- **Knowledge base:** Clinical content must cite the Kenya National Clinical Guidelines or a peer-reviewed source in the JSON entry's `source` field.

---

<div align="center">

**SHES — Smart Health Expert System**  
*Bridging Kenya's healthcare gap, one assessment at a time.*

</div>
