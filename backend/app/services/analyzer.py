import asyncio
from typing import List
from app.models.schemas import AnalyzeResponse, EngineResult
from app.engines.heuristics import HeuristicEngine
from app.engines.threat_feeds import ThreatFeedEngine
from app.engines.metadata import MetadataEngine
from app.services.ai_service import AIService  # [!] NEW: Import the AI Service

class EchelonAnalyzerService:
    def __init__(self):
        # Initialize our detection modules
        self.heuristics = HeuristicEngine()
        self.threat_feeds = ThreatFeedEngine()
        self.metadata = MetadataEngine()
        self.ai = AIService()  # [!] NEW: Instantiate the AI Service

    def _calculate_severity(self, score: int) -> str:
        """Categorize the numerical score into an actionable severity level."""
        if score < 40:
            return "Safe"
        elif score < 75:
            return "Suspicious"
        else:
            return "Dangerous"

    async def analyze_url(self, url: str) -> AnalyzeResponse:
        # 1. Execute engines
        heuristics_res = self.heuristics.analyze(url)
        metadata_res = self.metadata.analyze(url)
        threat_res = await self.threat_feeds.analyze(url)

        # 2. Compile findings
        all_findings = heuristics_res.findings + metadata_res.findings + threat_res.findings

        # 3. Calculate Final Weighted Score
        weighted_score = (
            (threat_res.risk_score * 0.50) + 
            (heuristics_res.risk_score * 0.30) + 
            (metadata_res.risk_score * 0.20)
        )
        
        final_score = int(weighted_score)

        # CRITICAL OVERRIDE: If threat intel directly flags it, it's immediately a 100.
        if threat_res.risk_score == 100:
            final_score = 100

        # Cap at 100 just in case
        final_score = min(final_score, 100)
        severity = self._calculate_severity(final_score)

        # 4. Generate AI Explanation
        # [!] NEW: We now await the actual LLM call instead of a local static function
        ai_text = await self.ai.generate_explanation(
            url=url, 
            severity=severity, 
            score=final_score, 
            findings=all_findings
        )

        # 5. Return the strictly validated Pydantic model
        return AnalyzeResponse(
            url=url,
            overall_risk_score=final_score,
            severity=severity,
            heuristics=heuristics_res,
            threat_feeds=threat_res,
            domain_metadata=metadata_res,
            ai_explanation=ai_text
        )

# Simple execution block for local testing
if __name__ == "__main__":
    async def run_test():
        analyzer = EchelonAnalyzerService()
        test_url = "http://secure-update.paypal.com.hacker-server.xyz/login-verify"
        print(f"Analyzing: {test_url}\n" + "-"*50)
        
        result = await analyzer.analyze_url(test_url)
        print(result.model_dump_json(indent=2))

    asyncio.run(run_test())