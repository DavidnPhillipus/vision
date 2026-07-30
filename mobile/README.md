# Vision Mobile (React Native / Expo)

Native companion to the Vision website. Same FastAPI backend, same accounts.

## Screens

- **Home** — AI-first prompts + camps needing attention  
- **Camps** — farm paddock list + camp detail  
- **Assess** — herd + question → explainable assessment  
- **Compare** — multi-camp comparison + read aloud  
- **Ask** — advisor chat with TTS listen button  
- **Login / Register** — JWT auth (Secure Store)

## Prerequisites

1. Backend running and reachable from the phone/emulator:
   ```bash
   cd backend
   .venv\Scripts\activate
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   `--host 0.0.0.0` is required so a physical device can hit your PC.

2. Node 18+ and Expo Go on your phone (optional).

## Run

```bash
cd mobile
npm install
npm start
```

Then press `a` for Android emulator, `i` for iOS simulator, or scan the QR code with Expo Go.

### API URL

By default the app uses your Expo LAN IP on port **8000** (so a real phone can reach the backend).

Override in `mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000
```

- Android emulator: `http://10.0.2.2:8000`
- iOS simulator: `http://127.0.0.1:8000`
- Physical phone: `http://YOUR_PC_LAN_IP:8000` (PC and phone on same Wi‑Fi; Windows Firewall may need to allow port 8000)

Demo login: `demo@vision.na` / `vision123`

## Website + mobile

| Surface | Folder | Command |
|--------|--------|---------|
| Website | `frontend/` | `npm run dev` → http://localhost:3000 |
| Mobile | `mobile/` | `npm start` → Expo |
| API | `backend/` | `uvicorn ... --host 0.0.0.0 --port 8000` |
