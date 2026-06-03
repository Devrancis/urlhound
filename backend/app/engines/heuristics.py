import re
import tldextract
from urllib.parse import urlparse
from app.models.schemas import EngineResult

class HeuristicEngine:
    def __init__(self):
        self.suspicious_keywords = [
            'login', 'verify', 'update', 'secure', 'account', 
            'banking', 'wallet', 'auth', 'confirm'
        ]

    def analyze(self, url: str) -> EngineResult:
        findings = []
        risk_score = 0
        
        normalized_url = url if url.startswith(('http://', 'https://')) else f"http://{url}"
        parsed_url = urlparse(normalized_url)
        extracted = tldextract.extract(normalized_url)
        
        domain = parsed_url.netloc.split(':')[0] # Strip port if present

        if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", domain):
            findings.append("URL uses a raw IP address instead of a domain name.")
            risk_score += 40

        if len(url) > 75:
            findings.append(f"URL length is unusually long ({len(url)} characters).")
            risk_score += 15

        subdomains = extracted.subdomain.split('.')
        # Filter out empty strings in case there are no subdomains
        subdomains = [sub for sub in subdomains if sub] 
        
        if len(subdomains) >= 2:
            findings.append(f"Deeply nested subdomains detected ({len(subdomains)} levels).")
            risk_score += 25

        found_keywords = [kw for kw in self.suspicious_keywords if kw in url.lower()]
        if found_keywords:
            findings.append(f"Suspicious social engineering keywords found: {', '.join(found_keywords)}.")
            risk_score += (10 * len(found_keywords))

        if extracted.domain.count('-') >= 2:
            findings.append("Multiple hyphens detected in the registered domain.")
            risk_score += 15

        final_score = min(risk_score, 100)

        return EngineResult(
            risk_score=final_score,
            findings=findings,
            raw_data={
                "parsed_subdomain": extracted.subdomain,
                "parsed_domain": extracted.domain,
                "parsed_suffix": extracted.suffix
            }
        )

if __name__ == "__main__":
    engine = HeuristicEngine()
    test_url = "http://secure-update.paypal.com.hacker-server.xyz/login-verify"
    result = engine.analyze(test_url)
    print(result.model_dump_json(indent=2))