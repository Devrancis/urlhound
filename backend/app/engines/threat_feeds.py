import httpx
import asyncio
import os
from app.models.schemas import EngineResult

class ThreatFeedEngine:
    def __init__(self):
        self.safebrowsing_key = os.getenv("GOOGLE_SAFE_BROWSING_KEY")
        self.urlhaus_api = "https://urlhaus-api.abuse.ch/v1/url/"

    async def _check_urlhaus(self, client: httpx.AsyncClient, url: str) -> dict:
        """
        URLhaus by Abuse.ch. Completely free, no API key required.
        Excellent for catching malware distribution URLs.
        """
        try:
            # We set a strict 5-second timeout. We never want a dead third-party API 
            # to cause our own API to hang indefinitely.
            response = await client.post(self.urlhaus_api, data={"url": url}, timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                if data.get("query_status") == "ok":
                    return {"source": "URLhaus", "malicious": True, "details": data.get("threat", "Malware URL")}
        except httpx.RequestError:
            # If the network request fails, we silently pass and assume safe (fail open).
            pass 
        return {"source": "URLhaus", "malicious": False}

    async def _check_safebrowsing(self, client: httpx.AsyncClient, url: str) -> dict:
        """
        Google Safe Browsing v4. Requires a free API key from Google Cloud Console.
        """
        if not self.safebrowsing_key:
            return {"source": "SafeBrowsing", "malicious": False, "details": "Skipped: No API key"}

        payload = {
            "client": {"clientId": "phish-detector", "clientVersion": "1.0"},
            "threatInfo": {
                "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
                "platformTypes": ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [{"url": url}]
            }
        }
        api_url = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={self.safebrowsing_key}"

        try:
            response = await client.post(api_url, json=payload, timeout=5.0)
            if response.status_code == 200 and response.json():
                # If Google returns an empty JSON {}, it's safe. If it returns data, it found a match.
                return {"source": "SafeBrowsing", "malicious": True, "details": "Flagged by Google Safe Browsing"}
        except httpx.RequestError:
            pass
        return {"source": "SafeBrowsing", "malicious": False}

    async def analyze(self, url: str) -> EngineResult:
        findings = []
        risk_score = 0
        raw_responses = {}

        # Open a single connection pool for all outgoing requests
        async with httpx.AsyncClient() as client:
            # Execute all threat feed checks concurrently
            results = await asyncio.gather(
                self._check_urlhaus(client, url),
                self._check_safebrowsing(client, url)
            )

        # Parse the aggregated results
        for res in results:
            raw_responses[res["source"]] = res
            if res.get("malicious"):
                findings.append(f"Flagged by {res['source']}: {res.get('details')}")
                # A direct hit on a threat intelligence feed is highly deterministic.
                # We automatically spike the score to 100 for this specific engine.
                risk_score = 100 

        return EngineResult(
            risk_score=risk_score,
            findings=findings,
            raw_data=raw_responses
        )

# Simple execution block for local testing
if __name__ == "__main__":
    async def run_test():
        engine = ThreatFeedEngine()
        # You can test a known bad URL or a safe one
        test_url = "http://example.com" 
        result = await engine.analyze(test_url)
        print(result.model_dump_json(indent=2))
    
    asyncio.run(run_test())