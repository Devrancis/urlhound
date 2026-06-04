# URLHound

A phishing URL scanner. Paste a link, get a risk score and a plain-English explanation of what triggered it.

**Demo:** [urlhound.vercel.app](https://urlhound.vercel.app)

---

## How it works

URLHound runs a submitted URL through three stages:

1. **Heuristics** — checks the URL's structure for common phishing patterns: raw IP addresses, excessive length, deeply nested subdomains, suspicious keywords (`login`, `verify`, `secure`, etc.), and hyphen abuse in the domain.

2. **Threat feeds** — queries [URLhaus](https://urlhaus.abuse.ch/) and [Google Safe Browsing](https://developers.google.com/safe-browsing) in parallel. A match in either feed immediately pushes the score to `Dangerous`.

3. **AI explanation** — the triggered signals are passed to `gpt-4o-mini`, which writes a short plain-English summary of the verdict. If the OpenAI API is unavailable or unconfigured, a static fallback is generated from the signal list instead.

Scores map to three verdicts: **Safe** (0–30), **Suspicious** (31–65), **Dangerous** (66–100).

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.10+, FastAPI, httpx |
| Frontend | React 18, Tailwind CSS, Vite |
| Threat feeds | URLhaus (Abuse.ch), Google Safe Browsing v4 |
| Domain intel | tldextract, python-whois |
| AI explainer | OpenAI gpt-4o-mini (configurable) |
| Deployment | Vercel (frontend), Railway (backend) |

---

## Getting started

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
GOOGLE_SAFE_BROWSING_KEY=your_gsb_key_here

# Pick one — both are optional. Falls back to static explanation if neither is set.
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
LLM_PROVIDER=openai  # or "gemini"

FRONTEND_URL=http://localhost:5173
```

> Get a free Google Safe Browsing key [here](https://developers.google.com/safe-browsing/v4/get-started).

```bash
cd backend
uvicorn app.main:app --reload
```

API runs at `http://localhost:8000`. Swagger UI at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

```bash
npm run dev
```

### Docker (both services)

```bash
docker-compose up --build
```

---

## API

### `POST /analyze`

```json
// Request
{ "url": "https://paypa1-secure-login.xyz/verify" }

// Response
{
  "url": "https://paypa1-secure-login.xyz/verify",
  "score": 72,
  "verdict": "Dangerous",
  "signals": [
    { "name": "Suspicious keywords", "detail": "Found: login, secure", "weight": 20 },
    { "name": "URLhaus match", "detail": "URL found in Abuse.ch URLhaus feed", "weight": 40 }
  ],
  "explanation": "This URL shows several signs of a phishing attempt...",
  "scanned_at": "2026-05-30T14:32:01Z"
}
```

### `GET /health`

```json
{
  "status": "ok",
  "feeds": {
    "urlhaus": "connected",
    "google_safe_browsing": "connected"
  }
}
```

---

## Project structure

```
urlhound/
├── backend/
│   └── app/
│       ├── core/
│       │   └── config.py
│       ├── engines/
│       │   ├── heuristics.py     — URL structure checks
│       │   ├── metadata.py       — WHOIS / domain age lookup
│       │   └── threat_feeds.py   — URLhaus + Google Safe Browsing
│       ├── models/
│       │   └── schemas.py        — Pydantic request/response models
│       ├── services/
│       │   ├── analyzer.py       — orchestrates the pipeline
│       │   └── ai_service.py     — LLM explanation with fallback
│       └── main.py
├── frontend/
│   └── src/
│       └── App.jsx
├── docker-compose.yml
├── ARCHITECTURE.md
└── CONTRIBUTING.md
```

---

## Current limitations / what's next

The heuristics layer is intentionally simple right now. A few things I want to add:

- Homoglyph and typosquatting detection (e.g. `paypa1` → `paypal` via Levenshtein + Unicode map)
- Suspicious TLD flagging (`.xyz`, `.tk`, `.top`, etc.)
- PhishTank integration
- Split `App.jsx` into proper components
- Tests

---

## Contact

Francis Iyiola — [devrancis.vercel.app](https://devrancis.vercel.app) — [linkedin.com/in/devrancis](https://linkedin.com/in/devrancis) — francisiyiola.fi@gmail.com