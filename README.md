# Vision — AI Rangeland & Livestock Advisor for Namibian Farmers

Vision turns the **Namibia Rangeland & Pasture Dataset** (UNAM / Farm4Trade / Lacuna Fund)
into clear, practical grazing and livestock guidance. A farmer creates a farm, adds camps
(paddocks), enters current livestock, and runs an **explainable assessment** for each camp.
Behind the scenes a real **tool-calling agent** (Google Gemini by default) combines the
research seed data, live **Open-Meteo** weather, deterministic calculations and optional
camp photos, then returns a status, a direct answer, a recommendation, the evidence used,
a confidence level and clear limitations — never just a verdict.

> Built for the Deep Learning IndabaX Namibia 2026 Hackathon.

---

## Setup on a new machine (no `dataset/` folder)

You do **not** need the ~4 GB raw Excel/photos folder. The cleaned research tables ship in
`backend/app/data/reference_seed.json` and load into Postgres in one command. That is enough
for assessments, comparable plots, weather, chat, and the demo farm — the same flow that
works on a fully set-up machine.

### Prerequisites

| Tool | Version | Notes |
|------|---------|--------|
| **Docker Desktop** | recent | Runs PostgreSQL 16 |
| **Python** | 3.12+ | Backend |
| **Node.js** | 18+ | Website + mobile |
| **Gemini API key** | free tier OK | [Google AI Studio](https://aistudio.google.com/apikey) |

Optional: Expo Go on a phone if you want the mobile app.

### 1. Clone and enter the project

```bash
git clone https://github.com/Twawana/Deep-Learning-IndabaX.git
cd Deep-Learning-IndabaX
git checkout vision
```

(Or clone any fork that contains this Vision tree.)

### 2. Database (Supabase recommended)

Vision talks to **Postgres**. For the shared / deploy setup use **Supabase** (session pooler, IPv4):

1. Create a project at [supabase.com](https://supabase.com)
2. In **Project Settings → Database**, copy the **Session pooler** URI (port `5432`)
3. Put it in `backend/.env` as `DATABASE_URL`, using the SQLAlchemy form:

```env
DATABASE_URL=postgresql+psycopg2://postgres.YOUR_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require
```

Encode `@` in the password as `%40`. Do **not** use the publishable/anon API key for this — Vision uses the Postgres URL only.

Optional local Docker Postgres (not required when Supabase is configured):

```bash
docker compose --profile local-db up -d db   # localhost:5433
```

### 3. Backend (API + AI agent)

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt

# Windows
copy .env.example .env
# macOS / Linux
# cp .env.example .env
```

Edit `backend/.env` so it matches a working AI setup (this is what the project uses):

```env
# Google Gemini via the OpenAI-compatible endpoint
OPENAI_API_KEY=paste-your-gemini-api-key-here
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
OPENAI_MODEL=gemini-3.1-flash-lite
OPENAI_VISION_MODEL=gemini-3.1-flash-lite

DATABASE_URL=postgresql+psycopg2://vision:vision@localhost:5433/vision
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8081,http://127.0.0.1:8081
UPLOAD_DIR=uploads
```

Get a key at https://aistudio.google.com/apikey — never commit `.env`.

**Why these model names?** `gemini-3.1-flash-lite` has a generous free-tier quota and supports
tool calling + photo analysis. Heavier Gemini flash models can hit very low daily limits.

**Prefer real OpenAI instead?** Clear `OPENAI_BASE_URL` (leave empty) and set e.g.
`OPENAI_MODEL=gpt-4o-mini` and `OPENAI_VISION_MODEL=gpt-4o-mini` with an OpenAI key.

Then migrate, load the shipped seed (no dataset folder), seed the demo farm, and run:

```bash
python -m alembic upgrade head
python -m app.etl.load_reference    # uses reference_seed.json — no dataset/ needed
python -m app.seed                  # demo farm + four camps

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Checks:

- Health: http://localhost:8000/health — should show `"ai_enabled": true` and `"ai_provider": "gemini"`
- Docs: http://localhost:8000/docs

Without an API key the app still runs assessments via a rule-based fallback, but chat and
photo vision need a key for the full experience.

### 4. Website (Next.js)

In a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000  
(If 3000 is busy, Next.js will use 3001 — that is fine.)

Optional `frontend/.env.local` (defaults already point at the local API):

```env
API_PROXY_URL=http://127.0.0.1:8000
```

### 5. Mobile app (optional)

```bash
cd mobile
npm install
npm start
```

Backend must use `--host 0.0.0.0`. On a physical phone, set `mobile/.env` if needed:

```env
EXPO_PUBLIC_API_URL=http://YOUR_PC_LAN_IP:8000
```

See `mobile/README.md` for emulator URLs.

### 6. Demo login and first flow

| Field | Value |
|-------|--------|
| Email | `demo@vision.na` |
| Password | `vision123` |

1. Open the website → sign in with the demo account  
2. **Assess a camp** → pick **River Camp** (or North Camp)  
3. Confirm livestock → **Run assessment**  
4. Review status, evidence, confidence, limitations  
5. Ask a follow-up in **Advisor**

You should get a real Gemini-backed assessment (e.g. Good / Watch / High concern), not only
the offline rules engine.

### Quick troubleshooting

| Symptom | Fix |
|---------|-----|
| `ai_enabled: false` | Set `OPENAI_API_KEY` in `backend/.env` and restart uvicorn |
| DB connection errors | `docker compose up -d db` and confirm port **5433** |
| Empty camps / no research plots | Re-run `python -m app.etl.load_reference` and `python -m app.seed` |
| Frontend API 502 / failed fetch | Backend must be on port 8000; check `API_PROXY_URL` |
| Phone cannot reach API | Same Wi‑Fi, `--host 0.0.0.0`, correct LAN IP, allow port 8000 in firewall |
| Gemini quota / 429 | Stay on `gemini-3.1-flash-lite`, wait, or switch to an OpenAI key |

---

## What it does

- **Per-camp assessments** with statuses: `Good`, `Watch`, `High concern`, `Insufficient data`.
- **Real tool-calling agent** (the model decides which tools to call):
  farm/camp lookup, dataset search, comparable-plot matching, recent + forecast rainfall,
  temperature/drought context, livestock-per-hectare, grazing duration, previous
  assessments, camp comparison, and optional multimodal photo analysis.
- **Live weather** from Open-Meteo (7/14/30-day rainfall, 7-day forecast, current + forecast
  max temperature). If weather fails, the assessment continues and says so.
- **Honest data handling**: the app clearly separates farmer-provided info, live weather,
  historical research data, visual photo observations, deterministic calculations, and AI
  conclusions. Research plots are always described as *comparable research observations*,
  never as the farmer's own camp.
- **Dashboard, camp pages, an assessment wizard, camp comparison, and an AI advisor chat**
  on the **website** (Next.js) and a companion **Expo React Native mobile app** that share
  one API, one account, and one design system (`shared/`).
- **Optional photos** that strengthen — but never replace — the assessment.
- **Graceful fallback**: without an API key the app still runs full assessments using a
  transparent rule-based engine over the same evidence.

---

## Architecture

```
Vision/
  docker-compose.yml       PostgreSQL 16
  backend/                 FastAPI + SQLAlchemy + Alembic + Gemini/OpenAI-compatible client
    app/
      data/reference_seed.json  Cleaned mined reference data (ships with the app)
      etl/load_reference.py     Seed -> Postgres (use this on every new machine)
      agent/                    tool-calling loop + rule-based fallback
      api/                      farms, camps, assessments, chat, compare, photos, dataset
      seed.py                   demo farm with four differing camps
  frontend/                Next.js website
  mobile/                  Expo React Native app
  shared/                  @vision/shared — tokens, types, API client, offline helpers
```

### Data flow for the core assessment

```
Farmer opens Vision -> picks a camp -> enters livestock -> (skips photos) -> runs assessment
  -> backend loads camp (farmer-provided)
  -> retrieves live Open-Meteo weather for the camp coordinates
  -> searches the seed data for comparable research plots
  -> computes livestock/ha (LSU) and grazing duration
  -> the Gemini agent combines everything and submits a structured assessment
  -> saved to PostgreSQL and displayed with evidence, confidence and limitations
  -> the farmer can ask a follow-up question in the AI advisor
```

---

## Research data (no raw dataset required)

The raw `dataset/` folder (~4 GB) is a **one-time mining source** used only when rebuilding
the seed. It is **not** in git and **not** needed to run the app.

On a new machine:

```bash
python -m alembic upgrade head
python -m app.etl.load_reference     # from backend/app/data/reference_seed.json
```

That loads ~70 research plots, cover rounds, species, and photo metadata filenames.
Research JPEG binaries (optional media) are separate and not required for assessments.

---

## Models & tools used

- **LLM (default)**: Google Gemini `gemini-3.1-flash-lite` via the OpenAI-compatible API
  (`OPENAI_BASE_URL` + `OPENAI_API_KEY`). Same model for tool calling and optional photo analysis.
- **LLM (optional)**: Any OpenAI-compatible API (e.g. OpenAI `gpt-4o-mini`) by changing `.env`.
- **Weather**: Open-Meteo (no key).
- **Backend**: FastAPI, SQLAlchemy 2, Alembic, pandas, Pillow.
- **Database**: PostgreSQL 16 (Docker).
- **Website**: Next.js 15, TypeScript, Tailwind, Recharts; PWA + offline shell.
- **Mobile**: Expo Router, Secure Store auth, speech; AsyncStorage offline cache.

---

## Transparency & safety

Vision uses cautious wording ("based on the available evidence", "may indicate", "this is an
estimate"), never claims exact biomass / carrying capacity / grass percentage / grazing days
from a photo, always lists limitations, and recommends a physical inspection or a rangeland
extension officer for important or low-confidence decisions.

## Submission note

For the hackathon, add **`naftalindeapo`** as a contributor to the GitHub repository.
