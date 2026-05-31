import asyncio
from typing import List
from app.models.schemas import AnalyzeResponse, EngineResult
from app.engines.heuristics import HeuristicEngine
from app.engines.threat_feeds import ThreatFeedEngine
from app.engines.metadata import MetadataEngine

class EchelonAnalyzerService:
    def __init__(self):
        # Initialize our detection modules
        self.heuristics = HeuristicEngine()
        self.threat_feeds = ThreatFeedEngine()
        self.metadata = MetadataEngine()

    def _calculate_severity(self, score: int) -> str:
        """Categorize the numerical score into an actionable severity level."""
        if score < 40:
            return "Safe"
        elif score < 75:
            return "Suspicious"
        else:
            return "Dangerous"

    def _generate_ai_explanation(self, url: str, severity: str, all_findings: List[str]) -> str:
        """
        AI Explanation Layer. 
        In production, this would format a prompt and call the OpenAI API.
        For now, we return a locally generated string based on the findings to avoid blocking development.
        """
        if not all_findings:
            return f"The URL '{url}' appears safe. No suspicious signals were detected across our heuristic, metadata, or threat intelligence checks."
        
        # Creating a dynamic summary based on engine outputs
        bullet_points = "\n- ".join(all_findings)
        explanation = (
            f"This URL has been classified as {severity.upper()}. "
            f"Our engines detected the following risk factors:\n- {bullet_points}\n\n"
            "Recommendation: "
        )
        
        if severity == "Dangerous":
            explanation += "Do not interact with this link. It exhibits strong indicators of malicious activity."
        elif severity == "Suspicious":
            explanation += "Proceed with extreme caution. Verify the sender and do not submit any credentials."
        else:
            explanation += "While some minor anomalies were found, the URL does not currently pose a significant known threat."
            
        return explanation

    async def analyze_url(self, url: str) -> AnalyzeResponse:
        # 1. Execute engines
        # Heuristics and Metadata are synchronous (CPU-bound / fast I/O), Threat Feeds are async (Network-bound).
        # In a massive scale C2 setup, we'd offload the sync tasks to a ThreadPoolExecutor, 
        # but standard execution is fine for this architecture.
        
        heuristics_res = self.heuristics.analyze(url)
        metadata_res = self.metadata.analyze(url)
        threat_res = await self.threat_feeds.analyze(url)

        # 2. Compile findings
        all_findings = heuristics_res.findings + metadata_res.findings + threat_res.findings

        # 3. Calculate Final Weighted Score
        # Weights: Threat Feeds (50%), Heuristics (30%), Metadata (20%)
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

        # 4. Determine Severity and Generate Explanation
        severity = self._calculate_severity(final_score)
        ai_text = self._generate_ai_explanation(url, severity, all_findings)

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