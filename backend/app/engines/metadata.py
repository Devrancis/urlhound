import whois
import tldextract
from datetime import datetime
from app.models.schemas import EngineResult

class MetadataEngine:
    """
    Echelon architecture: Domain metadata and registrar telemetry probe.
    Responsible for extracting domain age and WHOIS anomalies.
    """
    def __init__(self):
        # Time thresholds (in days) for risk scoring
        self.critical_age_threshold = 30
        self.suspicious_age_threshold = 90

    def analyze(self, url: str) -> EngineResult:
        findings = []
        risk_score = 0
        raw_metadata = {}

        # 1. Isolate the root domain
        # WHY: WHOIS lookups fail if you pass subdomains or paths (e.g., secure.paypal.com/login).
        # We must query the base domain (e.g., paypal.com).
        extracted = tldextract.extract(url)
        root_domain = f"{extracted.domain}.{extracted.suffix}"

        # If it's a raw IP address or invalid domain, WHOIS isn't applicable here.
        # (Our heuristic engine already flags raw IPs).
        if not extracted.domain or not extracted.suffix:
            return EngineResult(risk_score=0, findings=["Skipped WHOIS: Invalid or raw IP domain"])

        try:
            # Execute WHOIS query
            domain_info = whois.whois(root_domain)
            raw_metadata = dict(domain_info)
            
            creation_date = domain_info.creation_date
            
            # WHOIS servers are notoriously inconsistent. creation_date can be a single datetime, 
            # a list of datetimes, a string, or completely missing.
            if isinstance(creation_date, list):
                creation_date = creation_date[0]
                
            if isinstance(creation_date, datetime):
                # Calculate domain age in days
                domain_age = (datetime.now() - creation_date).days
                
                if domain_age <= self.critical_age_threshold:
                    findings.append(f"Domain is extremely new (Registered {domain_age} days ago).")
                    risk_score += 60
                elif domain_age <= self.suspicious_age_threshold:
                    findings.append(f"Domain is relatively new (Registered {domain_age} days ago).")
                    risk_score += 30
                else:
                    findings.append(f"Domain is established (Age: {domain_age} days).")
            else:
                findings.append("WHOIS creation date is missing or malformed (often a sign of a hidden/suspicious registrar).")
                risk_score += 15

            # Registrar check (Optional enhancement: flag known bulk/cheap registrars)
            registrar = domain_info.registrar
            if registrar and any(cheap_reg in str(registrar).lower() for cheap_reg in ['namecheap', 'godaddy', 'hostinger']):
                # We don't score this highly because legitimate sites use them too, 
                # but it adds context for the AI explanation layer.
                findings.append(f"Domain registered via budget/bulk registrar: {registrar}")
                
        except Exception as e:
            # WHOIS lookups can fail due to rate limiting, network issues, or blocked TLDs.
            # We fail open so the overall system doesn't crash.
            findings.append(f"WHOIS lookup failed or timed out: {str(e)}")
            return EngineResult(risk_score=0, findings=findings, raw_data={"error": str(e)})

        return EngineResult(
            risk_score=min(risk_score, 100),
            findings=findings,
            raw_data=raw_metadata
        )

# Simple execution block for local testing
if __name__ == "__main__":
    engine = MetadataEngine()
    # Test with a known old domain to see the "established" finding
    test_url = "https://www.github.com" 
    result = engine.analyze(test_url)
    print(result.model_dump_json(indent=2))