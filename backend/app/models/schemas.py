from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


# INPUT SCHEMA

class AnalyzeRequest(BaseModel):
    # We use a raw string instead of Pydantic's strict `HttpUrl` type here.
    # WHY: Users often paste defanged or incomplete URLs (e.g., "example[.]com" or "google.com" without "https://").
    # If we strictly enforce HttpUrl at the API gateway, the request will fail before we can analyze it.
    # We will handle sanitization and scheme normalization inside our engines.
    url: str = Field(..., description="The raw URL string submitted for analysis")


# COMPONENT SCHEMAS

class EngineResult(BaseModel):
    """
    A standardized output format for every individual detection engine.
    WHY: By forcing every engine (Heuristics, Metadata, Threat Feeds) to return
    data in this exact shape, our final Analyzer can aggregate the scores mathematically
    without writing custom parsing logic for each engine.
    """
    risk_score: int = Field(..., ge=0, le=100, description="Engine's isolated risk score (0-100)")
    findings: List[str] = Field(default_factory=list, description="Specific triggers found (e.g., 'Suspicious TLD')")
    raw_data: Optional[Dict[str, Any]] = Field(default=None, description="Raw JSON from third-party APIs for debugging")

# OUTPUT SCHEMA

class AnalyzeResponse(BaseModel):
    url: str
    overall_risk_score: int = Field(..., ge=0, le=100)
    severity: str = Field(..., description="Calculated severity: 'Safe', 'Suspicious', or 'Dangerous'")
    
    # Engine specific breakdowns
    heuristics: EngineResult
    threat_feeds: EngineResult
    domain_metadata: EngineResult
    
    # AI Layer
    ai_explanation: Optional[str] = Field(None, description="Plain-English explanation of the verdict")