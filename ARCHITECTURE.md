# Architecture

This document describes how URLHound is structured and how a URL moves through the detection pipeline.

---

## Overview

URLHound is a frontend + backend split. The React app (deployed on Vercel) makes a single POST to the FastAPI backend (deployed on Railway), which runs the URL through the detection pipeline and returns a verdict.

```
Browser
  └─ POST /analyze ──▶ FastAPI backend
                            ├─ Heuristic engine     (sync, no I/O)
                            ├─ Metadata engine       (async — WHOIS)
                            ├─ Threat feed engine    (async — URLhaus + GSB, concurrent)
                            ├─ Scorer               (aggregates signals → 0–100)
                            └─ AI explainer          (async — LLM or local fallback)
```

---

## Backend

### Entry point — `app/main.py`

Initialises the FastAPI app, sets CORS to allow requests from the configured frontend origin, and mounts the router.

### Request flow — `app/services/analyzer.py`

The analyzer service orchestrates the pipeline. It calls each engine, collects the returned signals, scores them, and calls the AI service.

### Engines

**`app/engines/heuristics.py`**

Purely structural analysis — no network calls. Fast enough that it runs synchronously without blocking anything.

Current checks:
- Raw IP address instead of a domain name (+40)
- URL length over 75 characters (+15)
- Two or more subdomain levels (+25)
- Suspicious keywords in the URL (`login`, `verify`, `secure`, `update`, `banking`, `wallet`, `auth`, `confirm`) (+10 per keyword, uncapped currently)
- Two or more hyphens in the registered domain (+15)

Score is capped at 100 before returning.

**`app/engines/metadata.py`**

WHOIS lookup for domain age and registrar information. A domain registered in the last 30 days is a meaningful signal — phishing campaigns typically use fresh domains to avoid blacklists.

Uses `python-whois` with a timeout. If the lookup fails (timeout, parse error, registrar rate limit), it returns no signal and logs a warning rather than raising.

**`app/engines/threat_feeds.py`**

Queries URLhaus and Google Safe Browsing concurrently via `asyncio.gather()`. Each feed has its own error handler — one timing out doesn't affect the other.

- **URLhaus**: free, no key required. POST to `https://urlhaus-api.abuse.ch/v1/url/`.
- **Google Safe Browsing**: free, requires a key from Google Cloud Console. POST to `https://safebrowsing.googleapis.com/v4/threatMatches:find`.

A match in either feed adds enough weight to push the verdict to Dangerous on its own.

### Scoring

Each engine returns a list of signals with weights. The analyzer service sums them and clamps the result to 0–100.

Verdict thresholds:
- **Safe**: 0–30
- **Suspicious**: 31–65
- **Dangerous**: 66–100

### AI explainer — `app/services/ai_service.py`

Called after scoring. Takes the triggered signals + verdict and asks `gpt-4o-mini` (or Gemini, configured via `LLM_PROVIDER`) to write a plain-English summary.

Two things worth noting about this:
- The LLM has no role in the verdict itself. The score and verdict are always determined by the scoring engine. The LLM is only for the explanation.
- If the LLM call fails or no API key is configured, a fallback explanation is generated from the signal names using a simple template. The API never returns a 500 because of an LLM outage.

The timeout on the LLM call is 5 seconds. If it exceeds that, the fallback kicks in.

---

## Frontend

Currently a single `App.jsx` file. The plan is to split this into components (`URLInput`, `VerdictCard`, `SignalBreakdown`, `ScanHistory`) once the core functionality is stable.

State management is local React state — no Redux or Zustand. The app is simple enough that a global store isn't justified.

---

## Error handling

The general principle: no single external dependency should be able to cause a 500 response for a valid URL submission.

| Failure | What happens |
|---|---|
| WHOIS timeout | No domain-age signal; pipeline continues |
| URLhaus or GSB timeout | That feed's signal is skipped; the other proceeds |
| LLM timeout or API error | Local fallback explanation is used |
| Malformed URL | Rejected at Pydantic validation with a 422 |

---

## Deployment

- Frontend on Vercel (Vite build)
- Backend on Railway (Dockerfile in `backend/`)
- Local development: `docker-compose up --build` runs both

---

## What's planned

A few things described in external references aren't implemented yet:

- Homoglyph/typosquatting detection in the heuristics engine
- PhishTank as a third threat feed
- A proper scoring model with per-category caps (to prevent heuristics alone from producing a Dangerous verdict)
- Tests
- Frontend componentization