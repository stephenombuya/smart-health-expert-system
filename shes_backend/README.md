# SHES Backend — Smart Health Expert System

**Final Year Project | The Co-operative University of Kenya**
**Author:** Stephen Ombuya (BSSEC01/1589/2022)
**Supervisor:** Dr. Dismus Nyale
**Stack:** Python 3.11 · Django 4.2 · Django REST Framework · PostgreSQL · JWT Auth

---

## 📋 Project Overview

The Smart Health Expert System (SHES) is an AI-driven clinical decision support tool
designed to bridge Kenya's critical doctor-to-patient gap (currently 1:6,355 vs the
WHO target of 1:1,000). The backend provides a secure REST API consumed by a
Flutter mobile front-end.

---

## 🏗️ Architecture

```
shes_backend/
├── apps/
│   ├── authentication/       # Custom User model, JWT auth, patient profiles
│   ├── triage/               # Rule-based inference engine + session management
│   ├── medications/          # KEML drug list, patient meds, interaction checker
│   ├── chronic_tracking/     # Blood glucose & BP logging with interpretation
│   ├── mental_health/        # Mood logger + evidence-based coping strategies
│   └── lab_results/          # NLP lab result interpreter (plain-language output)
├── knowledge_base/           # JSON rule sets: red flags, conditions, recommendations
├── shes_backend/
│   ├── settings/             # base / development / production
│   ├── encryption.py         # Fernet field-level encryption (Data Protection Act)
│   ├── middleware.py         # Audit log middleware
│   └── exceptions.py         # Consistent error envelope
└── tests/                    # 70+ unit & integration tests
```

---

## 🚀 Quick Start (Local Development)

### Option A — Docker Compose (recommended)
```bash
cp .env.example .env          # fill in DJANGO_SECRET_KEY at minimum
docker-compose up --build
```
The API will be available at `http://localhost:8000/api/v1/`.

### Option B — Manual Setup
```bash
# 1. Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and DJANGO_SECRET_KEY

# 4. Run migrations
python manage.py migrate

# 5. Seed knowledge base (medications, lab refs, coping strategies)
python manage.py seed_knowledge_base

# 6. Create superuser (optional)
python manage.py createsuperuser

# 7. Start development server
python manage.py runserver
```

---

## 🔑 API Reference

All endpoints are prefixed with `/api/v1/`.

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `auth/register/` | Create new account |
| POST | `auth/login/` | Obtain JWT access + refresh tokens |
| POST | `auth/refresh/` | Refresh access token |
| POST | `auth/logout/` | Blacklist refresh token |
| GET/PATCH | `auth/profile/` | View / update own profile |
| GET/PATCH | `auth/patient-profile/` | Medical profile (blood group, allergies) |
| PUT | `auth/change-password/` | Change password |

### Triage (Inference Engine)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `triage/start/` | Submit symptoms → urgency level + recommendation |
| GET | `triage/history/` | List past triage sessions |
| GET | `triage/<id>/` | Retrieve single session |

**Example Request:**
```json
POST /api/v1/triage/start/
{
  "symptoms": [
    { "name": "fever", "severity": 7, "duration_days": 2 },
    { "name": "chills", "severity": 6 },
    { "name": "headache", "severity": 5 }
  ]
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "urgency_level": "doctor_visit",
    "recommendation": "🩺 DOCTOR VISIT RECOMMENDED: ...",
    "layman_explanation": "Your symptoms most closely match 'Malaria'. ...",
    "red_flags_detected": [],
    "matched_conditions": [{ "name": "Malaria", "match_ratio": 0.71 }],
    "symptoms": [...]
  }
}
```

### Medications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `medications/list/` | Browse KEML medication catalogue |
| GET/POST | `medications/my/` | Patient's medication schedule |
| GET/PATCH/DELETE | `medications/my/<id>/` | Manage single medication |
| POST | `medications/interaction-check/` | Check drug interactions |

### Chronic Disease Tracking
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `chronic/glucose/` | Log blood glucose readings |
| GET/PATCH/DELETE | `chronic/glucose/<id>/` | Manage reading |
| GET/POST | `chronic/blood-pressure/` | Log BP readings |
| GET/PATCH/DELETE | `chronic/blood-pressure/<id>/` | Manage reading |
| GET | `chronic/summary/` | 7-day averages for glucose + BP |

### Mental Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `mental-health/mood/` | Log daily mood (returns coping strategies) |
| GET/PATCH/DELETE | `mental-health/mood/<id>/` | Manage entry |
| GET | `mental-health/coping-strategies/` | Browse strategies |
| GET | `mental-health/summary/` | 14-day mood trend |

### Lab Results
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `lab/results/` | Submit lab report for interpretation |
| GET/DELETE | `lab/results/<id>/` | Manage result |
| GET | `lab/references/` | Supported tests and reference ranges |

---

## 🧪 Running Tests

```bash
# All tests with coverage report
coverage run -m pytest
coverage report

# Specific module
pytest tests/test_inference_engine.py -v

# Security tests only
pytest tests/test_security.py -v
```

---

## 🔒 Security Features

| Feature | Implementation |
|---------|----------------|
| Authentication | JWT (access + refresh) with token blacklisting on logout |
| Password Policy | Min 10 chars, complexity validators, PBKDF2-SHA256 hashing |
| Rate Limiting | 10/hour on auth, 30/hour on triage, 200/hour per user |
| HTTPS Enforcement | `SECURE_SSL_REDIRECT`, HSTS (production) |
| Secure Cookies | `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SameSite=Strict` |
| Field Encryption | Fernet symmetric encryption for sensitive health data |
| Audit Logging | Every API request logged with user ID, method, path, status |
| Object Ownership | Queryset-level filtering prevents IDOR across all patient data |
| Error Enveloping | Consistent `{ success, error }` response shape (no stack traces) |
| Data Protection | Compliant with Kenya Data Protection Act (2019) |

---

## 📦 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DJANGO_SECRET_KEY` | ✅ | 50+ character random string |
| `DJANGO_DEBUG` | | `True` / `False` (default: `False`) |
| `DATABASE_URL` | ✅ | PostgreSQL connection URL |
| `FIELD_ENCRYPTION_KEY` | | Fernet key for sensitive data at rest |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | | Default: 60 |
| `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | | Default: 7 |
| `CORS_ALLOWED_ORIGINS` | | Comma-separated frontend origins |

---

## 🧠 Inference Engine Logic

The triage engine (`apps/triage/inference_engine.py`) uses forward-chaining rules:

1. **Red-flag scan** — checks for life-threatening symptoms → immediate `EMERGENCY`
2. **Condition matching** — overlaps symptoms with the knowledge base (≥50% match ratio)
3. **Severity escalation** — average severity >6 or duration >7 days upgrades `self_care` → `doctor_visit`
4. **Default** — unmatched mild symptoms → `self_care`

Knowledge base JSONs in `/knowledge_base/` are the single source of truth and can be
updated independently of application code.

---

## 📁 Project Structure Summary

```
70+ test cases across 6 test modules
6 Django apps (auth, triage, medications, chronic, mental health, lab)
3 JSON knowledge base files (red flags, conditions, recommendations)
Full Docker + docker-compose setup
Production-hardened settings (HSTS, secure cookies, rate limiting)
```
