from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class AnalyzeRequest(BaseModel):
    url: str = Field(..., description="The raw URL string submitted for analysis")


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

class AnalyzeResponse(BaseModel):
    url: str
    overall_risk_score: int = Field(..., ge=0, le=100)
    severity: str = Field(..., description="Calculated severity: 'Safe', 'Suspicious', or 'Dangerous'")
    
    # Engine specific breakdowns
    heuristics: EngineResult
    threat_feeds: EngineResult
    domain_metadata: EngineResult
    
    ai_explanation: Optional[str] = Field(None, description="Plain-English explanation of the verdict")