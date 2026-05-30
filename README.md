<div align="center">
  <!-- <img src="static/images/branding/banner.png" alt="URLHound Banner" width="100%"> -->

  # URLHOUND
  ### AI-Powered Phishing URL Detection Engine

  [![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)
  [![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
  [![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38BDF8.svg)](https://tailwindcss.com/)
  [![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
  [![Threat Intel](https://img.shields.io/badge/Threat%20Intel-Live-red.svg)](https://urlhaus.abuse.ch/)

  [**Explore the Docs »**](ARCHITECTURE.md)

  [**View Demo**](https://urlhound.vercel.app) · [**Report Bug**](https://github.com/Devrancis/URLHound/issues) · [**Request Feature**](https://github.com/Devrancis/URLHound/issues)

  **URLHound** is a full-stack, AI-assisted phishing URL detection platform that analyses any URL in real time — sniffing out threats using a multi-layered heuristic engine, live threat intelligence feeds, and plain-English risk explanations powered by an LLM. Built for security engineers, developers, and anyone who needs to verify a link before clicking it.
</div>

---

## 🎯 What Is URLHound?

Phishing attacks remain one of the most effective and prevalent cyberattack vectors. URLHound addresses this by combining **static heuristic analysis**, **real-time threat intelligence lookups**, and **domain metadata inspection** into a single, unified risk verdict — scored from 0 to 100 and explained in plain English.

Unlike blacklist-only tools, URLHound's layered approach catches **newly registered phishing domains** that haven't yet appeared in any feed, flagging them through structural and behavioural signals alone.

---

## 🚀 Features

### 🔍 For Security Analysts & End Users
- **Instant URL Verdict**: Paste any URL and receive a risk score (0–100) with a severity label — `Safe`, `Suspicious`, or `Dangerous` — in under two seconds.
- **Plain-English Explanations**: Every triggered risk signal is translated into a human-readable explanation, so you always know *why* a URL is flagged, not just *that* it was.
- **Multi-Feed Threat Intelligence**: Cross-references submitted URLs against Google Safe Browsing, URLhaus (Abuse.ch), and PhishTank simultaneously for comprehensive coverage.
- **Domain Age Inspection**: Newly registered domains are a hallmark of phishing campaigns. URLHound queries WHOIS data to surface suspiciously young domains automatically.
- **Scan History**: All previous lookups are retained in-session so analysts can track and compare results without re-submitting.

### 🛠️ For Developers & Security Engineers
- **RESTful API**: Every detection feature is exposed via a clean FastAPI REST interface — integrate URLHound into your own pipelines, browser extensions, or SOAR playbooks.
- **Modular Heuristic Engine**: Each heuristic check (typosquatting, homoglyphs, IP-based URLs, etc.) is an isolated, independently testable module — easy to extend with new rules.
- **Feed-Agnostic Architecture**: Threat intelligence sources are pluggable. Drop in any new feed (e.g., Emerging Threats, Feodo Tracker) without touching core detection logic.
- **Risk Score Breakdown**: The API returns a granular breakdown of each signal's contribution to the final score, enabling downstream systems to apply their own thresholds.
- **OpenAPI Docs**: Interactive Swagger UI available at `/docs` for instant API exploration and testing.

### ⚙️ Technical Excellence
- **Layered Detection Pipeline**: Heuristics → WHOIS → Threat Feeds → AI Explainer. Each layer enriches the verdict independently, so partial failures don't break the chain.
- **Async-First Backend**: Built entirely on FastAPI's async stack, ensuring high throughput for concurrent URL submissions without blocking I/O.
- **LLM-Powered Explanations**: Risk signals are passed to an LLM that synthesises them into a coherent, jargon-free paragraph — bridging the gap between technical findings and user understanding.
- **Zero-Cost Infrastructure**: Every threat intelligence source integrated is free and open — no paid subscriptions, no API rate-limit paywalls for core functionality.
- **CORS-Safe & Production-Ready**: Pre-configured CORS policies, environment-based configuration, and structured logging for seamless deployment.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.10+, FastAPI |
| **Frontend** | React 18, Tailwind CSS |
| **Heuristic Engine** | Custom Python modules (regex, tldextract, python-whois) |
| **Threat Feeds** | Google Safe Browsing API, URLhaus (Abuse.ch), PhishTank |
| **AI Explainer** | OpenAI / Gemini API (configurable) |
| **Domain Intel** | python-whois, dnspython |
| **HTTP Client** | httpx (async) |
| **API Docs** | Swagger UI (built into FastAPI) |
| **Deployment** | Vercel (Frontend), Railway / Render (Backend) |

---

## 🏁 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- A Google Safe Browsing API key *(free — [get one here](https://developers.google.com/safe-browsing/v4/get-started))*
- An LLM API key — OpenAI or Google Gemini *(free tiers available)*

### Backend Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Devrancis/URLHound.git
   cd URLHound
   ```

2. **Create and activate a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**

   Create a `.env` file in the `/backend` directory:
   ```env
   # App
   DEBUG=True
   SECRET_KEY=your-secret-key

   # Threat Intelligence APIs
   GOOGLE_SAFE_BROWSING_API_KEY=your-gsb-api-key
   PHISHTANK_API_KEY=your-phishtank-api-key   # optional, increases rate limits

   # LLM (choose one)
   OPENAI_API_KEY=your-openai-key
   GEMINI_API_KEY=your-gemini-key
   LLM_PROVIDER=gemini   # "openai" or "gemini"

   # CORS
   FRONTEND_URL=http://localhost:5173
   ```

5. **Start the backend server**
   ```bash
   cd backend
   uvicorn main:app --reload
   ```
   The API will be available at `http://localhost:8000`.
   Interactive docs at `http://localhost:8000/docs`.

### Frontend Installation

1. **Navigate to the frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the frontend environment**

   Create a `.env` file in the `/frontend` directory:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

---

## 🧠 How It Works — The Detection Pipeline

When a URL is submitted, URLHound runs it through a sequential, multi-layered analysis pipeline:

```
[User Submits URL]
        ↓
[1. Heuristic Engine]
   • URL length & entropy analysis
   • IP-based URL detection
   • Suspicious TLD flagging (.xyz, .tk, .top, etc.)
   • Typosquatting & brand impersonation check
   • Homoglyph character detection (e.g. "paypa1.com")
   • Excessive subdomain detection
   • Special character abuse (multiple @, --, //)
        ↓
[2. Domain Intelligence]
   • WHOIS lookup → domain age
   • DNS resolution check
   • Registrar reputation scoring
        ↓
[3. Threat Feed Cross-Reference]
   • Google Safe Browsing API
   • URLhaus (Abuse.ch) — no key required
   • PhishTank community database
        ↓
[4. Risk Scoring]
   • Each signal carries a weighted score (0–25 pts)
   • Scores are summed → final verdict (0–100)
   • Safe (0–30) / Suspicious (31–65) / Dangerous (66–100)
        ↓
[5. LLM Explainer]
   • Triggered signals are passed to an LLM
   • Returns a plain-English paragraph explaining the verdict
        ↓
[Verdict Returned to UI]
```

---

## 📂 Project Structure

```text
URLHound/
├── backend/
│   ├── main.py                  # FastAPI app entry point & CORS config
│   ├── routers/
│   │   └── analyze.py           # /analyze endpoint
│   ├── engine/
│   │   ├── heuristics.py        # All URL heuristic checks
│   │   ├── whois_lookup.py      # Domain age & registrar intel
│   │   ├── threat_feeds.py      # GSB, URLhaus, PhishTank integrations
│   │   └── scorer.py            # Weighted risk score aggregation
│   ├── explainer/
│   │   └── llm_explainer.py     # LLM integration for plain-English output
│   ├── models/
│   │   └── schemas.py           # Pydantic request/response models
│   ├── utils/
│   │   └── url_parser.py        # URL normalisation & sanitisation helpers
│   ├── tests/
│   │   ├── test_heuristics.py
│   │   ├── test_feeds.py
│   │   └── test_scorer.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── URLInput.jsx      # URL submission form
│   │   │   ├── VerdictCard.jsx   # Risk score display card
│   │   │   ├── SignalBreakdown.jsx # Per-signal detail view
│   │   │   ├── ExplainerBox.jsx  # LLM explanation panel
│   │   │   └── ScanHistory.jsx   # Previous lookups list
│   │   ├── hooks/
│   │   │   └── useAnalyze.js     # API call & state management hook
│   │   ├── pages/
│   │   │   └── Home.jsx          # Main page
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── tailwind.config.js
│   └── package.json
│
├── .env.example
├── .gitignore
├── ARCHITECTURE.md
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

---

## 📡 API Reference

### `POST /analyze`

Submits a URL for full analysis.

**Request Body**
```json
{
  "url": "https://paypa1-secure-login.xyz/verify"
}
```

**Response**
```json
{
  "url": "https://paypa1-secure-login.xyz/verify",
  "score": 87,
  "verdict": "Dangerous",
  "signals": [
    { "name": "Homoglyph Detected", "detail": "'paypa1' mimics 'paypal'", "weight": 20 },
    { "name": "Suspicious TLD", "detail": ".xyz is commonly abused in phishing", "weight": 15 },
    { "name": "Young Domain", "detail": "Domain registered 3 days ago", "weight": 18 },
    { "name": "URLhaus Match", "detail": "URL found in Abuse.ch URLhaus feed", "weight": 25 }
  ],
  "explanation": "This URL shows multiple strong indicators of a phishing attempt. The domain 'paypa1' is a homoglyph impersonation of PayPal, a classic social engineering tactic. Combined with a newly registered .xyz domain and a confirmed match in the URLhaus malicious URL database, this link should not be visited under any circumstances.",
  "scanned_at": "2026-05-30T14:32:01Z"
}
```

### `GET /health`

Returns API health status and feed connectivity.

```json
{
  "status": "ok",
  "feeds": {
    "google_safe_browsing": "connected",
    "urlhaus": "connected",
    "phishtank": "connected"
  }
}
```

---

## 🧪 Running Tests

```bash
cd backend
pytest tests/ -v
```

To run with coverage:
```bash
pytest tests/ --cov=engine --cov-report=term-missing
```

---

## 🤝 Contributing

Contributions are welcome and encouraged! URLHound is intentionally modular — adding a new heuristic check or threat feed is a focused, well-scoped task.

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for our code of conduct and the process for submitting pull requests. Key areas where contributions are most welcome:

- New heuristic detection rules
- Additional threat intelligence feed integrations
- Improved LLM prompt engineering for better explanations
- Frontend UI/UX improvements
- Test coverage expansion

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🚀 Roadmap

URLHound is actively evolving. Planned features for upcoming releases:

- [ ] **Browser Extension**: One-click URL scanning directly from your browser toolbar (Chrome & Firefox).
- [ ] **Bulk URL Analysis**: Submit a list of URLs via CSV for batch processing — ideal for SOC analysts.
- [ ] **Webhook Support**: POST verdict results to a custom endpoint for SOAR/SIEM integration.
- [ ] **Machine Learning Classifier**: Train a model on historical phishing datasets (e.g., PhishTank corpus) to complement heuristic scoring.
- [ ] **MISP Integration**: Export flagged URLs directly as MISP events for threat sharing.
- [ ] **Rate-Limited Public API**: Deploy a public-facing API with key-based access for community use.
- [ ] **Reputation History**: Track whether a domain's risk score changes over time.

---

## 💎 Technical Highlights (Portfolio Focus)

This project was built to demonstrate proficiency in full-stack security tooling development. Key technical challenges addressed include:

- **Async Concurrent Feed Lookups**: All three threat intelligence APIs are queried concurrently using `asyncio.gather()`, keeping total lookup latency under 800ms even when all feeds are hit simultaneously — rather than the 2–3 seconds a sequential approach would require.

- **Weighted Signal Aggregation**: The risk scoring system is designed so that no single signal can produce a false `Dangerous` verdict alone. Scores are capped per signal category, requiring evidence across multiple detection layers before a high-risk verdict is issued — reducing false positives.

- **LLM Prompt Engineering**: The explainer module constructs a structured prompt from the triggered signals, instructing the LLM to reason about the *combination* of signals rather than each in isolation — producing more accurate and contextually coherent explanations.

- **Heuristic Extensibility**: Each heuristic is implemented as a standalone function returning a typed `Signal` object. Adding a new check requires writing a single function and registering it in the engine's signal list — no modifications to core scoring or API logic needed.

- **Homoglyph & Typosquatting Detection**: URLHound ships with a curated map of Unicode homoglyphs and a list of high-value brand domains. Submitted URLs are normalised and compared against both — a non-trivial string similarity problem solved with Levenshtein distance and character-level substitution mapping.

---

## 📬 Contact & Support

If you have questions about this project or want to discuss potential opportunities, feel free to reach out!

- **Name**: Francis Iyiola
- **LinkedIn**: [linkedin.com/in/devrancis](https://www.linkedin.com/in/devrancis/)
- **Portfolio**: [devrancis.vercel.app](https://devrancis.vercel.app/)
- **Email**: francisiyiola.fi@gmail.com

---

<div align="center">
  Built with ❤️ by Francis Iyiola
  <br/>
  <sub>If URLHound helped you, consider giving it a ⭐ on GitHub!</sub>
</div>