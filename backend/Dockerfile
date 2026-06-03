# 1. Base Image: Use a slim, official Python image to minimize the attack surface
FROM python:3.11-slim

# 2. Environment Variables
# PYTHONDONTWRITEBYTECODE: Prevents Python from writing .pyc files to disk
# PYTHONUNBUFFERED: Ensures logs are flushed directly to the terminal (critical for real-time telemetry/monitoring)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# 3. Set working directory
WORKDIR /app

# 4. System Dependencies
# WHY: We might need gcc for compiling certain Python cryptography/networking packages, 
# but we clean up the apt cache immediately after to keep the image small and secure.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 5. Application Dependencies
# We copy the requirements file first to leverage Docker's layer caching. 
# If requirements.txt hasn't changed, Docker skips reinstalling everything.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copy Application Source Code
COPY . .

# 7. Security: Create a non-root user and switch to it
# WHY: Never run production containers as root. 
RUN useradd -m echelon_service && chown -R echelon_service:echelon_service /app
USER echelon_service

# 8. Expose the API port
EXPOSE 8000

# 9. Execution Command
# We use uvicorn to serve the FastAPI app, binding to 0.0.0.0 so it can accept external container traffic
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]