# Contributing

Contributions are welcome. This is a personal project and the codebase is small, so getting oriented shouldn't take long.

---

## Setup

See the [README](./README.md) for full setup instructions. The short version:

```bash
# Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp backend/.env.example backend/.env  # fill in your keys
uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

---

## Where things live

```
backend/app/
├── engines/
│   ├── heuristics.py     — URL structure checks (good place to add new signals)
│   ├── metadata.py       — WHOIS / domain age
│   └── threat_feeds.py   — URLhaus + Google Safe Browsing
├── services/
│   ├── analyzer.py       — orchestrates the pipeline
│   └── ai_service.py     — LLM explainer + fallback
└── models/schemas.py     — request/response types
```

---

## Adding a heuristic

Each check in `heuristics.py` is a standalone block inside the `HeuristicEngine.analyze()` method. To add a new one:

1. Add your logic to `analyze()`. Append a string to `findings` and add a weight to `risk_score` if the check fires.
2. Include a `# test case:` comment showing a URL that should trigger it — helps with manual verification while there are no automated tests yet.

Weight guide (rough):
- Weak signal (also appears on many legitimate URLs): 5–10
- Moderate signal: 10–20
- Strong signal (rarely appears on clean URLs): 20–40

A single heuristic signal shouldn't make a URL `Dangerous` on its own. The threat feed matches carry heavier weights for that reason.

---

## Adding a threat feed

New feeds go in `app/engines/threat_feeds.py`. Each feed is an async method on `ThreatFeedEngine` that returns a dict with at least `source` and `malicious` keys.

```python
async def _check_my_feed(self, client: httpx.AsyncClient, url: str) -> dict:
    try:
        response = await client.post("https://api.example.com/check", data={"url": url}, timeout=5.0)
        if response.status_code == 200 and response.json().get("found"):
            return {"source": "MyFeed", "malicious": True, "details": "Found in MyFeed database"}
    except httpx.RequestError:
        pass
    return {"source": "MyFeed", "malicious": False}
```

Add it to the `asyncio.gather()` call in `analyze()`. Don't let exceptions propagate out — the feed should always return a dict.

If it needs an API key, add a variable to `.env.example` and pull it via `os.getenv()`.

---

## Bugs and suggestions

Open a GitHub issue. For anything security-related (e.g. a bypass in the detection logic) feel free to email directly instead: francisiyiola.fi@gmail.com.

---

## Pull requests

- Branch off `main`, open a PR against `main`.
- Describe what the change does and why in the PR description.
- Keep commits reasonably scoped — one thing per commit is easier to review.

There's no CI set up yet, so just make sure the backend starts cleanly and the frontend builds before submitting.