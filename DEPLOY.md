# Deploy Vision (Supabase + Render + Vercel)

## Already done

- **Supabase Postgres** seeded (plots, demo farm, assets)
- App verified against Supabase with local Docker Postgres **stopped**

## 1. Push this repo to GitHub

Use a branch Render/Vercel can see, e.g. `vision` or `main` on:

- https://github.com/DavidnPhillipus/vision
- and/or https://github.com/Twawana/Deep-Learning-IndabaX (`vision` branch)

## 2. Render — API

1. https://dashboard.render.com → **New** → **Blueprint** (uses `render.yaml`)  
   **or** **Web Service** connected to the GitHub repo
2. If manual Web Service:
   - **Root Directory:** `backend`
   - **Build:** `pip install -r requirements.txt`
   - **Start:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. **Environment** (copy `DATABASE_URL` from your local `backend/.env` — the Supabase **pooler** URL):

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Supabase session pooler URL (`postgresql+psycopg2://postgres.REF:...@aws-0-eu-north-1.pooler.supabase.com:5432/postgres?sslmode=require`) |
| `OPENAI_API_KEY` | Gemini API key |
| `OPENAI_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta/openai/` |
| `OPENAI_MODEL` | `gemini-3.1-flash-lite` |
| `OPENAI_VISION_MODEL` | `gemini-3.1-flash-lite` |
| `JWT_SECRET` | long random string |
| `UPLOAD_DIR` | `uploads` |
| `CORS_ORIGINS` | your Vercel URL (add after step 3), e.g. `https://xxx.vercel.app` |

4. Deploy → open `https://YOUR-SERVICE.onrender.com/health`  
   Expect `"ai_enabled": true`. Free tier cold-starts ~30–60s.

## 3. Vercel — website

1. https://vercel.com → **Add New Project** → import the same GitHub repo  
2. **Root Directory:** `frontend` (Important: repo must still contain sibling `shared/`)  
3. Environment variable:

| Key | Value |
|-----|--------|
| `API_PROXY_URL` | `https://YOUR-SERVICE.onrender.com` (no trailing slash) |

4. Deploy → open the `.vercel.app` URL  
5. Update Render `CORS_ORIGINS` to that URL and **Manual Deploy** the API once more  
6. Sign in: `demo@vision.na` / `vision123`

## 4. Mobile (optional)

```env
EXPO_PUBLIC_API_URL=https://YOUR-SERVICE.onrender.com
```

Restart Expo.

## Checklist

- [ ] Code pushed to GitHub  
- [ ] Render `/health` OK  
- [ ] Vercel site loads  
- [ ] `CORS_ORIGINS` includes Vercel URL  
- [ ] Demo login + assess a camp works on the live site  
