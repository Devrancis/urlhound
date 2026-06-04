import os
from openai import AsyncOpenAI
from typing import List

class AIService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        
        # Only initialize the client if a key exists
        self.client = AsyncOpenAI(api_key=self.api_key) if self.api_key else None
        
    async def generate_explanation(self, url: str, severity: str, score: int, findings: List[str]) -> str:
        """
        Attempts to call the LLM for a dynamic summary. 
        Falls back to a static generation if the API fails or is unconfigured.
        """
        # Fallback mechanism if no key is configured
        if not self.client:
            return self._generate_local_fallback(url, severity, findings)

        system_prompt = (
            "You are a senior cybersecurity analyst. Your job is to explain to a user why a specific URL "
            "was flagged by automated threat detection engines. Keep your explanation under 3 sentences. "
            "Be direct, professional, and do not use overly technical jargon. If the site is safe, reassure the user."
        )

        bullet_points = "\n- ".join(findings) if findings else "None"
        user_prompt = (
            f"Target URL: {url}\n"
            f"Severity Verdict: {severity} (Score: {score}/100)\n"
            f"Engine Findings:\n- {bullet_points}\n\n"
            "Provide a brief, plain-English summary of the risk."
        )

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini", # Fast, cheap, and highly capable for summarization
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=150,
                temperature=0.3,
                timeout=5.0 
            )
            return response.choices[0].message.content.strip()

        except Exception as e:
            print(f"[!] AI Generation Failed: {str(e)}")
            return self._generate_local_fallback(url, severity, findings)

    def _generate_local_fallback(self, url: str, severity: str, findings: List[str]) -> str:
        """Static generation from Phase 5, used as a safety net."""
        if not findings:
            return f"The URL '{url}' appears safe. No suspicious signals were detected across our engines."
        
        bullet_points = "\n- ".join(findings)
        explanation = f"This URL is classified as {severity.upper()}. We detected:\n- {bullet_points}\n\n"
        
        if severity == "Dangerous":
            return explanation + "Recommendation: Do not interact with this link."
        elif severity == "Suspicious":
            return explanation + "Recommendation: Proceed with extreme caution."
        return explanation + "Recommendation: No significant threats found, but always verify the sender."

if __name__ == "__main__":
    import asyncio
    async def run_test():
        ai = AIService()
        test_findings = ["Domain age is 2 days", "Suspicious keyword 'login' found in path"]
        result = await ai.generate_explanation("http://secure-login.xyz", "Dangerous", 85, test_findings)
        print("Generated AI Explanation:\n")
        print(result)
        
    asyncio.run(run_test())