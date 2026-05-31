from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.models.schemas import AnalyzeRequest, AnalyzeResponse
from app.services.analyzer import EchelonAnalyzerService

# Initialize the FastAPI application
app = FastAPI(
    title="Echelon Phishing URL Detection Gateway",
    version="1.0.0",
    description="Asynchronous telemetry and heuristic analysis gateway for inspecting malicious URLs."
)

# Configure CORS Middleware
# WHY: To allow our decoupled React frontend to query this API without triggering browser security blocks.
ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Common React port
    "http://localhost:5173",  # Vite default port
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],  # Permits all standard verbs (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],  # Permits all headers
)

# Instantiate the analyzer service globally to avoid reloading overhead per request
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
        # Await the async analysis orchestration pipeline
        response = await analyzer_service.analyze_url(payload.url)
        return response
    except Exception as e:
        # Log error in production; return safe 500 error payload here
        raise HTTPException(
            status_code=500, 
            detail=f"Internal exception occurred during inspection: {str(e)}"
        )

# Local testing block
if __name__ == "__main__":
    import uvicorn
    # To run manually via script
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)