FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

# Expose port (Fly.io uses 8080 by default)
EXPOSE 8080

# Use PORT env var for flexibility (defaults to 8000 for local dev)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
