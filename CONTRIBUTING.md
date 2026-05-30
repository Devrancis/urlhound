# Contributing to URLHound

First off — thank you for considering contributing to URLHound. Every contribution, whether it's a bug fix, a new heuristic rule, or improved documentation, makes the project better for everyone.

This document explains how to get involved, what the expectations are, and how to get your changes merged smoothly.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Contributing Code](#contributing-code)
- [Development Setup](#development-setup)
- [Project Structure Recap](#project-structure-recap)
- [High-Impact Contribution Areas](#high-impact-contribution-areas)
  - [Adding a New Heuristic Rule](#adding-a-new-heuristic-rule)
  - [Adding a New Threat Feed](#adding-a-new-threat-feed)
  - [Improving the LLM Explainer](#improving-the-llm-explainer)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Commit Message Guidelines](#commit-message-guidelines)

---

## Code of Conduct

URLHound is an open, welcoming project. By participating, you agree to:

- Be respectful and constructive in all interactions.
- Welcome contributors of all experience levels.
- Focus feedback on ideas and code, not on individuals.
- Prioritise the long-term health of the project over short-term convenience.

Harassment, discrimination, or dismissive behaviour of any kind will not be tolerated. If you experience or witness a violation, contact the maintainer directly at **francisiyiola.fi@gmail.com**.

---

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/URLHound.git
   cd URLHound
   ```
3. **Add the upstream remote** so you can pull in future changes:
   ```bash
   git remote add upstream https://github.com/Devrancis/URLHound.git
   ```
4. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
5. Make your changes, write tests, and submit a pull request.

---

## How to Contribute

### Reporting Bugs

If you find a bug, please [open a GitHub issue](https://github.com/Devrancis/URLHound/issues) and include:

- A clear, descriptive title.
- The URL(s) that triggered the bug (if applicable and safe to share).
- Steps to reproduce the behaviour.
- What you expected to happen vs. what actually happened.
- Your Python version, OS, and any relevant environment details.

> ⚠️ **Security vulnerabilities** should **not** be reported as public GitHub issues. Email **francisiyiola.fi@gmail.com** directly with the subject line `[URLHound Security]`.

---

### Suggesting Features

Feature suggestions are welcome via [GitHub issues](https://github.com/Devrancis/URLHound/issues). Before opening one, please:

- Check that a similar issue doesn't already exist.
- Describe the problem you're trying to solve, not just the solution you have in mind.
- If you're proposing a new heuristic rule or threat feed, include any supporting research or references.

---

### Contributing Code

All code contributions go through a pull request. There's no minimum or maximum size — a single bug fix and a full new feature module are both welcome. What matters is that the code is clean, tested, and well-described.

---

## Development Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt  # includes pytest, httpx[test], ruff
```

Copy the example environment file and fill in your keys:
```bash
cp ../.env.example .env
```

Start the development server:
```bash
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env  # set VITE_API_BASE_URL=http://localhost:8000
npm run dev
```

### Running Tests

```bash
cd backend
pytest tests/ -v
```

With coverage:
```bash
pytest tests/ --cov=engine --cov-report=term-missing
```

---

## Project Structure Recap

The areas most relevant to contributors:

```
backend/
├── engine/
│   ├── heuristics.py     ← Add new heuristic checks here
│   ├── threat_feeds.py   ← Add new threat intelligence feeds here
│   ├── whois_lookup.py   ← Domain intelligence logic
│   └── scorer.py         ← Risk score aggregation (edit weights here)
├── explainer/
│   └── llm_explainer.py  ← Prompt engineering & LLM adapter logic
└── tests/
    ├── test_heuristics.py
    ├── test_feeds.py
    └── test_scorer.py
```

---

## High-Impact Contribution Areas

These are the areas where new contributions add the most value and are the easiest to get started with.

### Adding a New Heuristic Rule

Heuristic rules are the most accessible contribution — each one is a standalone function, independently testable, with no side effects.

**Step 1:** Open `backend/engine/heuristics.py`.

**Step 2:** Write a function that accepts a `ParsedURL` and returns either a `Signal` or `None`:

```python
def check_my_new_rule(parsed: ParsedURL) -> Signal | None:
    """
    Detects [describe what you're detecting and why it matters].
    """
    if some_condition(parsed):
        return Signal(
            name="My Rule Name",
            detail="Human-readable explanation of what was found.",
            weight=10  # See scoring guide below
        )
    return None
```

**Step 3:** Register your function in the `HEURISTIC_CHECKS` list at the bottom of the file:

```python
HEURISTIC_CHECKS = [
    check_url_length,
    check_ip_based_url,
    # ... existing checks ...
    check_my_new_rule,   # ← add yours here
]
```

**Step 4:** Write a test in `tests/test_heuristics.py`:

```python
def test_my_new_rule_triggers():
    signal = check_my_new_rule(parse_url("https://example-that-should-trigger.com"))
    assert signal is not None
    assert signal.name == "My Rule Name"

def test_my_new_rule_clean():
    signal = check_my_new_rule(parse_url("https://google.com"))
    assert signal is None
```

**Weight guide:**

| Evidence Strength | Suggested Weight |
|---|---|
| Weak indicator (also present on many legitimate URLs) | 5 – 10 |
| Moderate indicator (uncommon on legitimate URLs) | 11 – 17 |
| Strong indicator (rare on legitimate URLs) | 18 – 25 |

No single heuristic should exceed 25 points. The scoring system is calibrated to require corroborating evidence across multiple layers for a `Dangerous` verdict.

---

### Adding a New Threat Feed

Threat feed integrations live in `backend/engine/threat_feeds.py`. Each feed is an async function that returns a `Signal` or `None`.

**Step 1:** Write an async function for your feed:

```python
async def check_my_new_feed(url: str) -> Signal | None:
    """
    Checks the URL against [Feed Name].
    Docs: https://link-to-feed-api-docs
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                "https://api.myfeed.example/check",
                json={"url": url},
                headers={"API-Key": settings.MY_FEED_API_KEY}
            )
            data = response.json()
            if data.get("found"):
                return Signal(
                    name="My Feed Match",
                    detail=f"URL found in [Feed Name] database.",
                    weight=20
                )
    except Exception:
        logger.warning("My feed lookup failed for %s", url)
    return None
```

**Step 2:** Add it to the `gather()` call in `get_feed_signals()`:

```python
async def get_feed_signals(url: str) -> list[Signal]:
    results = await asyncio.gather(
        check_google_safe_browsing(url),
        check_urlhaus(url),
        check_phishtank(url),
        check_my_new_feed(url),   # ← add yours here
        return_exceptions=True
    )
    return [r for r in results if isinstance(r, Signal)]
```

**Step 3:** If your feed requires an API key, add it to `.env.example` and `settings.py`.

**Important:** All feeds must:
- Be **free to use** (no paid subscriptions).
- Handle their own exceptions without propagating — never `raise` in a feed function.
- Respect the feed's stated rate limits.

---

### Improving the LLM Explainer

The explainer lives in `backend/explainer/llm_explainer.py`. The most impactful improvements here are usually prompt engineering changes that produce clearer, more accurate, or better-calibrated explanations.

When editing the prompt:
- Always test against at least three URL types: a clearly safe URL, a suspicious one, and a confirmed phishing URL.
- The explanation should reason about the *combination* of signals, not list them back individually.
- Target audience is a non-technical user — avoid jargon.
- Length should be 3–5 sentences maximum.

If you're adding a new LLM provider adapter, implement the `LLMAdapter` abstract base class:

```python
class LLMAdapter(ABC):
    @abstractmethod
    async def explain(self, signals: list[Signal], score: int) -> str:
        ...
```

---

## Coding Standards

### Python (Backend)

- **Formatter**: `ruff format` (configured in `pyproject.toml`)
- **Linter**: `ruff check` — all warnings must be resolved before merging
- **Type hints**: Required on all function signatures
- **Docstrings**: Required on all public functions — one-line summary is sufficient for simple functions
- **No bare `except`**: Always catch specific exception types or use `except Exception`

Run the linter before committing:
```bash
ruff check backend/
ruff format backend/
```

### JavaScript (Frontend)

- **Formatter**: Prettier (configured in `.prettierrc`)
- **Linter**: ESLint with the React plugin
- **Components**: Functional components with hooks only — no class components
- **Props**: Destructure props in the function signature, not inside the body

Run before committing:
```bash
npm run lint
npm run format
```

---

## Testing Requirements

All new backend code must include tests. The minimum expectations:

| Contribution Type | Required Tests |
|---|---|
| New heuristic rule | At least one test that triggers the signal, one that doesn't |
| New threat feed | Mock the HTTP response; test both a match and a clean result |
| Scorer changes | Regression test to confirm existing thresholds are unaffected |
| Bug fix | A test that would have caught the bug |

Tests live in `backend/tests/`. Use `pytest` with `httpx`'s `AsyncClient` mock for feed tests.

PRs that reduce overall test coverage will not be merged.

---

## Pull Request Process

1. Ensure your branch is up to date with `upstream/main`:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. Run the full test suite and linter locally — PRs that fail CI will not be reviewed until they pass.

3. Open a pull request against the `main` branch of the upstream repository.

4. Fill in the PR description with:
   - **What** this PR changes.
   - **Why** the change is needed or valuable.
   - **How** to test it manually (if applicable).
   - Any relevant issue numbers (`Closes #42`).

5. A maintainer will review and either approve, request changes, or ask clarifying questions. Please respond to review comments within a reasonable time.

6. Once approved, the maintainer will merge using **squash and merge** to keep the commit history clean.

---

## Commit Message Guidelines

URLHound uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]
[optional footer]
```

**Types:**

| Type | When to use |
|---|---|
| `feat` | A new feature or heuristic rule |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `test` | Adding or fixing tests |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `chore` | Build process, dependency updates, CI changes |

**Examples:**

```
feat(heuristics): add homoglyph detection for Cyrillic characters
fix(feeds): handle URLhaus timeout without raising exception
docs(contributing): clarify weight guide for new heuristic rules
test(scorer): add regression test for capped category scoring
```

---

Thank you for taking the time to read this and for contributing to URLHound. Every improvement — no matter how small — helps make phishing detection more accessible and effective.

**Francis Iyiola** · [linkedin.com/in/devrancis](https://www.linkedin.com/in/devrancis/) · francisiyiola.fi@gmail.com