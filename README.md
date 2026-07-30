# Vision — AI Rangeland & Livestock Advisor for Namibian Farmers

Vision turns the **Namibia Rangeland & Pasture Dataset** (UNAM / Farm4Trade / Lacuna Fund)
into clear, practical grazing and livestock guidance. A farmer creates a farm, adds camps
(paddocks), enters current livestock, and runs an **explainable assessment** for each camp.
Behind the scenes a real **OpenAI tool-calling agent** combines the research dataset, live
**Open-Meteo** weather, deterministic calculations and optional camp photos, then returns a
status, a direct answer, a recommendation, the evidence used, a confidence level and clear
limitations — never just a verdict.

> Built for the Deep Learning IndabaX Namibia 2026 Hackathon.

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
  one API, one account, and one design system (`shared/` — colours, fonts, prompts, API client).
- **Optional photos** (one general photo, or four guided N/E/S/W photos) that strengthen —
  but never replace — the assessment, plus historical photo trend descriptions.
- **Graceful fallback**: without an OpenAI key the app still runs full assessments using a
  transparent rule-based engine over the same evidence.

---

## Architecture

```
Vision/
  dataset/                 OPTIONAL local Excel + photos (~4 GB). Mine once, then delete.
  docker-compose.yml       PostgreSQL 16 (local / cloud DB)
  backend/                 FastAPI + SQLAlchemy + Alembic + pandas + OpenAI
    app/
      data/reference_seed.json  Cleaned mined reference data (ships with the app)
      etl/build_reference.py    Excel -> Postgres + seed (needs dataset/ once)
      etl/load_reference.py     Seed -> Postgres (cloud / no dataset folder)
      models/                  Farm, Camp, Assessment, CampPhoto, ChatMessage,
                               ReferencePlot, ReferenceCoverRound, ReferenceSpecies,
                               ReferencePhotoMeta
      services/                dataset, weather (Open-Meteo), calc (LSU/ha, grazing),
                               matching (comparable plots), assessment, photo (vision)
      agent/                   tools.py (tool schemas + dispatch), agent.py (tool-calling
                               loop), prompts.py, fallback.py (rule-based engine)
      api/                     farms, camps, assessments, chat, compare, photos, dataset
      seed.py                  demo farm with four differing camps
  frontend/                Next.js website (App Router) + TypeScript + Tailwind
    src/app/                 dashboard, camps/[id], camps/new, assess, compare, advisor
    src/lib/api.ts           thin wrapper around @vision/shared API client
  mobile/                  Expo React Native app (same API + auth + styles)
    app/                     Home, Camps, Assess, Compare, Ask, Login
    src/lib/api.ts           thin wrapper around @vision/shared API client
  shared/                  @vision/shared — design tokens, types, domain helpers, API client,
                           offline cache helpers (timeouts, GET cache, mutation queue)
```

### Data flow for the core assessment

```
Farmer opens Vision -> picks a camp -> enters livestock -> (skips photos) -> runs assessment
  -> backend loads camp (farmer-provided)
  -> retrieves live Open-Meteo weather for the camp coordinates
  -> searches the dataset for comparable research plots (distance + ecoregion + vegetation)
  -> computes livestock/ha (LSU) and grazing duration
  -> the OpenAI agent combines everything and submits a structured assessment
  -> saved to PostgreSQL and displayed with evidence, confidence and limitations
  -> the farmer can ask a follow-up question in the AI advisor
```

---

## The dataset (mined into the database)

The raw `dataset/` folder (~4 GB of Excel + research photos) is a **one-time source**.
Vision mines and cleans it into Postgres; the running app and cloud deploys **never open
that folder**.

Tables:

- `reference_plots` — one row per research plot (~70), aggregating cover, standing crop,
  biomass, woody proxies, grazing/game notes, rainfall, coords, ecoregion, dominant species
- `reference_cover_rounds` — per-round cover for seasonal trends
- `reference_species` — cleaned dominant species list per plot
- `reference_photo_meta` — catalog of the 888 research photos (filenames only — not the
  multi‑GB JPEG binaries; those stay optional locally)

**Local mine (needs `dataset/` once):**

```bash
python -m alembic upgrade head
python -m app.etl.build_reference    # loads Postgres + writes app/data/reference_seed.json
```

**Cloud / fresh machine (no `dataset/` folder):**

```bash
python -m alembic upgrade head
python -m app.etl.load_reference     # loads from committed reference_seed.json
```

After a successful mine you can delete `dataset/` locally; keep `reference_seed.json` in git
for structured tables. **Photo/PDF/map bytes live in Postgres** — migrate them with a database
dump (`pg_dump`), not the JSON seed.

**Load images + manuals into Postgres (required once before deleting `dataset/`):**

```bash
python -m app.etl.load_reference_media
```

This stores all 888 research JPEGs (lightly compressed) plus the end-user manual and site maps
as BYTEA in `reference_photo_meta` / `reference_assets`. Serve via:

- `GET /api/dataset/photos/{id}/file`
- `GET /api/dataset/assets/{id}/file`

Note: `coordinates.xlsx` has swapped lat/long headers; the ETL corrects this and also
back-fills coords from grazing forms and ecoregions from sibling plots at the same site.
Live assessment rainfall still comes from Open-Meteo (not the fieldform rainfall column).

---

## Running locally

Prerequisites: **Python 3.12**, **Node.js 18+**, and **Docker** (for PostgreSQL).

### 1. Start PostgreSQL

```bash
docker compose up -d db      # exposes PostgreSQL on localhost:5433
```

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows;  source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt

# configure environment
copy .env.example .env         # cp on macOS/Linux
# edit .env and set OPENAI_API_KEY=sk-...   (required for the AI agent + chat + photo analysis)

# apply the database schema
python -m alembic upgrade head

# load cleaned research data into Postgres
# Prefer the seed (no 4 GB folder). If seed is missing and dataset/ exists, mine Excel first.
python -m app.etl.load_reference
# Or, with the raw Excel folder present, re-mine and refresh the seed:
# python -m app.etl.build_reference

# seed a demo farm with four differing camps (optional but recommended for the demo)
python -m app.seed

# run the API (0.0.0.0 so the mobile app on a phone can reach it)
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API is now at `http://localhost:8000` (docs at `/docs`, health at `/health`).

### 3. Website (Next.js)

```bash
cd frontend
npm install
npm run dev                    # http://localhost:3000
```

The frontend proxies `/api/*` to the backend (see `next.config.mjs`, `API_PROXY_URL`).

### 4. Mobile app (Expo / React Native)

```bash
cd mobile
npm install
npm start                      # Expo Go / emulator — see mobile/README.md
```

Same backend and demo login (`demo@vision.na` / `vision123`). Use `--host 0.0.0.0` on
uvicorn and set `EXPO_PUBLIC_API_URL` to your PC’s LAN IP if the phone cannot auto-detect it.

### First flow to try

Open `http://localhost:3000` (or the Expo app) → **Assess a camp** → pick **River Camp** →
confirm livestock → **Run assessment** → review evidence → **Ask a follow-up** in the advisor.

---

## Models & tools used

- **LLM**: OpenAI (`gpt-4o-mini` by default; configurable via `OPENAI_MODEL`) with function
  calling for the agent, and the same multimodal model for optional photo analysis.
- **Weather**: Open-Meteo forecast + archive APIs (no key required).
- **Backend**: FastAPI, SQLAlchemy 2, Alembic, pandas + openpyxl, Pillow (image compression).
- **Database**: PostgreSQL 16.
- **Website**: Next.js 15, TypeScript, Tailwind CSS, Recharts, lucide-react; installable PWA
  with offline shell + saved camp data.
- **Mobile**: Expo (React Native) + Expo Router, Secure Store auth, expo-speech TTS;
  AsyncStorage cache for camps/assessments when the network is weak or offline.

## Transparency & safety

Vision uses cautious wording ("based on the available evidence", "may indicate", "this is an
estimate"), never claims exact biomass / carrying capacity / grass percentage / grazing days
from a photo, always lists limitations, and recommends a physical inspection or a rangeland
extension officer for important or low-confidence decisions.

## Submission note

For the hackathon, add **`naftalindeapo`** as a contributor to the GitHub repository.
