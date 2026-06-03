from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.models.schemas import AnalyzeRequest, AnalyzeResponse
from app.services.analyzer import EchelonAnalyzerService
from app.core.config import settings

app = FastAPI(
    title="Echelon Phishing URL Detection Gateway",
    version="1.0.0",
    description="Asynchronous telemetry and heuristic analysis gateway for inspecting malicious URLs."
)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer_service = EchelonAnalyzerService()

@app.get("/health")
def health_check():
    """Simple up/down sanity check for deployment and monitoring tools."""
    return {"status": "operational"}

@app.post("/api/v1/analyze", response_model=AnalyzeResponse)
async def analyze_target_url(payload: AnalyzeRequest):
    """
    Inbound analysis gateway. Takes a URL payload, processes it concurrently 
    through static heuristics, metadata engines, and threat feeds, then returns a verdict.
    """
    if not payload.url.strip():
        raise HTTPException(status_code=400, detail="URL field cannot be empty.")
        
    try:
        response = await analyzer_service.analyze_url(payload.url)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Internal exception occurred during inspection: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)