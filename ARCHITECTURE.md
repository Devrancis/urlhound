# URLHound — System Architecture

This document describes the internal architecture of URLHound: how components are structured, how data flows through the detection pipeline, and the rationale behind key technical decisions.

---

## Table of Contents

- [High-Level Overview](#high-level-overview)
- [System Components](#system-components)
  - [Frontend (React)](#frontend-react)
  - [Backend API (FastAPI)](#backend-api-fastapi)
  - [Heuristic Engine](#heuristic-engine)
  - [Domain Intelligence Module](#domain-intelligence-module)
  - [Threat Feed Aggregator](#threat-feed-aggregator)
  - [Risk Scorer](#risk-scorer)
  - [LLM Explainer](#llm-explainer)
- [Data Flow](#data-flow)
- [API Design](#api-design)
- [Concurrency Model](#concurrency-model)
- [Risk Scoring Design](#risk-scoring-design)
- [LLM Integration Strategy](#llm-integration-strategy)
- [Error Handling Philosophy](#error-handling-philosophy)
- [Design Decisions & Trade-offs](#design-decisions--trade-offs)

---

## High-Level Overview

URLHound is split into two independently deployable units — a **React frontend** and a **Python/FastAPI backend** — that communicate over a single REST endpoint.

```
┌──────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐   │
│   │               React Frontend (Vite)                  │   │
│   │                                                      │   │
│   │   URLInput → useAnalyze hook → VerdictCard           │   │
│   │                              → SignalBreakdown        │   │
│   │                              → ExplainerBox           │   │
│   └──────────────────────┬───────────────────────────────┘   │
└─────────────────────────-│───────────────────────────────────┘
                           │  POST /analyze  { url }
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                   FastAPI Backend                            │
│                                                              │
│  ┌─────────────┐    ┌──────────────────────────────────┐    │
│  │  /analyze   │───▶│       Detection Pipeline         │    │
│  │  router     │    │                                  │    │
│  └─────────────┘    │  1. Heuristic Engine             │    │
│                     │  2. Domain Intelligence (WHOIS)  │    │
│                     │  3. Threat Feed Aggregator       │───▶│──▶ URLhaus
│                     │  4. Risk Scorer                  │    │──▶ Google Safe Browsing
│                     │  5. LLM Explainer                │    │──▶ PhishTank
│                     └──────────────────────────────────┘    │──▶ LLM API
└──────────────────────────────────────────────────────────────┘
```

---

## System Components

### Frontend (React)

The frontend is a single-page application built with React 18 and Tailwind CSS, scaffolded with Vite for fast development and optimised builds.

**Key components:**

| Component | Responsibility |
|---|---|
| `URLInput.jsx` | Validates and submits the URL. Handles empty input and basic format checks client-side before hitting the API. |
| `useAnalyze.js` | Custom hook that encapsulates the API call, loading state, error state, and response normalisation. Keeps components clean. |
| `VerdictCard.jsx` | Renders the headline risk score (0–100) and severity badge (Safe / Suspicious / Dangerous) with colour-coded styling. |
| `SignalBreakdown.jsx` | Renders a list of all triggered signals with their individual weights, so the user can see what drove the score. |
| `ExplainerBox.jsx` | Displays the LLM-generated plain-English explanation of the overall verdict. |
| `ScanHistory.jsx` | Maintains an in-session list of all previous submissions for quick reference. State is held in the parent component and passed down as props. |

**State management:** No external state library (Redux, Zustand) is used. All state is local to the `Home.jsx` page component and distributed to children via props and the `useAnalyze` hook — keeping the dependency tree lean for a project of this scope.

---

### Backend API (FastAPI)

The backend is built on FastAPI, chosen for its native async support, automatic OpenAPI documentation, and Pydantic-based request validation.

**Entry point:** `main.py` initialises the FastAPI application, registers CORS middleware (allowing requests from the configured frontend origin), and mounts the router.

**Router:** `routers/analyze.py` defines the single `POST /analyze` endpoint. Its only job is to validate the incoming request using a Pydantic schema and delegate to the detection pipeline. No business logic lives in the router.

**Pydantic schemas** (`models/schemas.py`) define the contract for both request and response:

```python
class AnalyzeRequest(BaseModel):
    url: HttpUrl  # FastAPI validates URL format automatically

class Signal(BaseModel):
    name: str
    detail: str
    weight: int

class AnalyzeResponse(BaseModel):
    url: str
    score: int                    # 0–100
    verdict: str                  # "Safe" | "Suspicious" | "Dangerous"
    signals: list[Signal]
    explanation: str
    scanned_at: datetime
```

---

### Heuristic Engine

**Location:** `engine/heuristics.py`

The heuristic engine is the first layer of the pipeline. It analyses the structural and lexical properties of the URL itself — no network calls are made here, so it runs in microseconds.

Each check is implemented as an isolated function that returns either `None` (no signal triggered) or a `Signal` object with a name, detail string, and weight.

**Checks implemented:**

| Check | Logic | Max Weight |
|---|---|---|
| **URL Length** | URLs > 100 characters are statistically more likely to be obfuscated phishing links | 10 |
| **IP-Based URL** | URL uses a raw IPv4/IPv6 address instead of a domain name | 20 |
| **Suspicious TLD** | TLD is in a curated list of commonly abused extensions (.xyz, .tk, .top, .gq, .ml, .cf) | 15 |
| **Typosquatting** | Domain is within Levenshtein distance 2 of a high-value brand (paypal, amazon, google, etc.) | 20 |
| **Homoglyph Detection** | Domain contains Unicode or ASCII characters that visually mimic others (e.g. `rn` → `m`, `1` → `l`) | 20 |
| **Excessive Subdomains** | URL has 4+ subdomain levels, a common obfuscation trick | 12 |
| **Special Character Abuse** | URL contains multiple `@`, `//` after the scheme, or `%20` encoding in the domain | 15 |
| **Keyword Presence** | Domain contains phishing-associated terms: `secure`, `login`, `verify`, `account`, `update`, `bank` | 10 |

**Extending the engine:** To add a new heuristic, write a function with this signature and add it to the `HEURISTIC_CHECKS` list in `heuristics.py`:

```python
def check_my_new_rule(parsed_url: ParsedURL) -> Signal | None:
    ...
```

No other files need to be modified.

---

### Domain Intelligence Module

**Location:** `engine/whois_lookup.py`

Performs a WHOIS lookup on the submitted domain to extract:

- **Domain creation date** — domains registered fewer than 30 days ago receive a significant penalty. Phishing campaigns typically use freshly registered domains.
- **Registrar reputation** — a small set of registrars are frequently abused for bulk phishing domain registration and are flagged accordingly.
- **DNS resolution** — non-resolving domains receive a low-weight informational signal.

WHOIS lookups are performed using `python-whois` with a configurable timeout to prevent slow registrar responses from blocking the pipeline. If a WHOIS lookup fails (timeout, rate limit, or parse error), the module returns no signal and logs a warning — it does not raise an exception.

---

### Threat Feed Aggregator

**Location:** `engine/threat_feeds.py`

Queries three external threat intelligence sources in parallel using `asyncio.gather()`. Each feed is wrapped in its own async function with independent error handling, so a failure in one feed does not affect the others.

**Feeds:**

| Feed | Method | API Key Required |
|---|---|---|
| **URLhaus (Abuse.ch)** | POST to `https://urlhaus-api.abuse.ch/v1/url/` | No |
| **Google Safe Browsing** | POST to `https://safebrowsing.googleapis.com/v4/threatMatches:find` | Yes (free) |
| **PhishTank** | POST to `https://checkurl.phishtank.com/checkurl/` | Optional (increases limits) |

Each feed function returns a `Signal` if the URL is found in that feed's database, or `None` if it is clean or the lookup fails. Feed match signals carry the highest individual weights (20–25) since a confirmed match in a reputable feed is strong evidence.

---

### Risk Scorer

**Location:** `engine/scorer.py`

Aggregates all signals from the heuristic engine, domain intelligence module, and threat feed aggregator into a single integer score between 0 and 100.

**Design principle — capped category weights:**

To prevent a single overloaded category from dominating the score, signals are grouped into three categories with a maximum contribution per category:

| Category | Max Contribution |
|---|---|
| Heuristic Signals | 45 pts |
| Domain Intelligence | 20 pts |
| Threat Feed Matches | 35 pts |

The raw sum within each category is clamped to its ceiling before the three are summed. This means no URL can be scored `Dangerous` based on heuristics alone without corroborating evidence from domain intel or a feed match — reducing false positives on legitimate but structurally unusual URLs.

**Verdict thresholds:**

| Score Range | Verdict |
|---|---|
| 0 – 30 | ✅ Safe |
| 31 – 65 | ⚠️ Suspicious |
| 66 – 100 | 🚨 Dangerous |

---

### LLM Explainer

**Location:** `explainer/llm_explainer.py`

Once scoring is complete, the list of triggered signals and the final score are passed to the LLM explainer. It constructs a structured prompt instructing the model to reason about the *combination* of signals — not each one in isolation — and return a single coherent paragraph in plain English.

**Prompt structure (simplified):**

```
You are a cybersecurity analyst. A URL has been submitted for phishing analysis.

The following risk signals were detected:
- Homoglyph Detected: 'paypa1' mimics 'paypal' (weight: 20)
- Suspicious TLD: .xyz is commonly abused in phishing (weight: 15)
- Young Domain: registered 3 days ago (weight: 18)
- URLhaus Match: found in Abuse.ch feed (weight: 25)

Final risk score: 87/100. Verdict: Dangerous.

Write one paragraph (3–5 sentences) explaining why this URL is dangerous.
Write for a non-technical user. Do not use bullet points. Do not repeat the signal names verbatim.
```

**LLM provider is configurable** via the `LLM_PROVIDER` environment variable. The explainer module uses an adapter pattern — `OpenAIAdapter` and `GeminiAdapter` both implement the same `explain(signals, score) -> str` interface, making it trivial to switch or add providers.

If the LLM call fails, a fallback explanation is generated deterministically from the signal list — the verdict is never blocked by an LLM outage.

---

## Data Flow

```
POST /analyze  { "url": "https://paypa1-secure-login.xyz/verify" }
      │
      ▼
[URL Normalisation & Sanitisation]
  • Strip tracking params
  • Decode percent-encoding
  • Extract: scheme, domain, TLD, path, query
      │
      ├──────────────────────────────────────┐
      ▼                                      ▼
[Heuristic Engine]               [Domain Intelligence]
  (sync, ~1ms)                     (async, ~200–800ms)
  Returns: list[Signal]            Returns: list[Signal]
      │                                      │
      └──────────────┬───────────────────────┘
                     │
                     ▼
          [Threat Feed Aggregator]
          (3 feeds, concurrent async)
          (~300–700ms total via gather)
          Returns: list[Signal]
                     │
                     ▼
             [Risk Scorer]
          Aggregates all signals
          Returns: score (int), verdict (str)
                     │
                     ▼
            [LLM Explainer]
          (~500–1500ms depending on provider)
          Returns: explanation (str)
                     │
                     ▼
          [AnalyzeResponse assembled]
          Returned to frontend as JSON
```

**Typical total latency:** 800ms – 2s depending on WHOIS registrar response times and LLM latency.

---

## API Design

URLHound exposes a minimal API surface by design. There is one primary endpoint:

```
POST /analyze       — Submit a URL for analysis
GET  /health        — Check API and feed connectivity
GET  /docs          — Interactive Swagger UI (FastAPI built-in)
```

**Why not a GET request for `/analyze`?**
URLs submitted for analysis can contain sensitive information and should not appear in server access logs, browser history, or proxy caches. POST requests with a JSON body avoid this exposure.

---

## Concurrency Model

FastAPI runs on an ASGI server (Uvicorn). All I/O-bound operations — WHOIS lookups, threat feed HTTP requests, and LLM API calls — are implemented as `async` functions and awaited properly, meaning the server can handle multiple concurrent submissions without blocking.

The three threat feed lookups are the most time-sensitive operations and are always fired concurrently:

```python
gsb_signal, urlhaus_signal, phishtank_signal = await asyncio.gather(
    check_google_safe_browsing(url),
    check_urlhaus(url),
    check_phishtank(url),
    return_exceptions=True   # one feed failure won't raise
)
```

`return_exceptions=True` ensures that a timeout or HTTP error in any single feed returns an exception object instead of propagating — the scorer simply ignores `None` or exception values from any feed.

---

## Risk Scoring Design

The weighted, capped-category scoring model was chosen deliberately over simpler alternatives:

**Why not a simple sum?**
A simple sum would allow a URL that triggers every heuristic but is clean on all feeds to score `Dangerous` — producing a high false-positive rate for unusual-but-legitimate URLs (e.g. very long redirect chains).

**Why not a binary blacklist check?**
Pure blacklist lookups miss newly registered phishing domains that haven't yet been submitted to any feed. The heuristic layer catches structural signals before any feed has the URL catalogued.

**Why not ML?**
A trained classifier would improve accuracy but introduces a training data dependency, model versioning complexity, and a non-transparent decision process. The weighted signal model is fully explainable — every point in the score can be traced to a specific, human-readable signal. This is essential for the LLM explainer to reason correctly about verdicts.

---

## LLM Integration Strategy

The LLM is used only for **explanation generation**, not for the verdict itself. The risk score and verdict are always determined deterministically by the scoring engine. This is an intentional constraint:

- The verdict is reproducible and auditable — the same URL always produces the same score.
- The explanation can vary slightly between calls without affecting correctness.
- LLM latency and cost do not sit on the critical path of the security decision.

The explainer is called after the verdict is finalised and runs as the last step of the pipeline.

---

## Error Handling Philosophy

URLHound is designed to **degrade gracefully** at every layer:

| Failure Scenario | Behaviour |
|---|---|
| WHOIS lookup timeout | No domain-age signal returned; pipeline continues |
| Threat feed HTTP error | That feed's signal is skipped; others proceed unaffected |
| LLM API unavailable | Fallback explanation generated from signal names; no 500 error |
| Malformed URL submitted | Rejected at the Pydantic validation layer with a 422 response |
| All feeds unreachable | Heuristic + WHOIS signals still produce a valid (partial) verdict |

No single external dependency can cause URLHound to return a 500 error for a valid URL submission.

---

## Design Decisions & Trade-offs

| Decision | Chosen Approach | Alternative Considered | Reason |
|---|---|---|---|
| **Backend framework** | FastAPI | Flask, Django | Native async, auto OpenAPI docs, Pydantic validation |
| **Frontend build tool** | Vite | Create React App | Faster HMR, smaller bundles, actively maintained |
| **State management** | React local state | Redux, Zustand | Scope doesn't justify a global store |
| **WHOIS library** | python-whois | whoisit, manual socket | Broadest registrar support, simple API |
| **Async HTTP client** | httpx | aiohttp, requests | Async-first, drop-in requests API, well maintained |
| **LLM provider** | Configurable (Gemini / OpenAI) | Hardcoded to one | Avoids vendor lock-in; free-tier flexibility |
| **Scoring model** | Weighted + capped categories | ML classifier | Transparent, explainable, no training data required |
| **Deployment** | Vercel (FE) + Railway (BE) | Heroku, Fly.io | Free tiers, zero-config deployments |