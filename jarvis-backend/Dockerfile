# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV VIRTUAL_ENV=/app/.venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Set work directory
WORKDIR /app

# Install system dependencies (needed for some python packages like Pillow or cffi)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt /app/
RUN pip install uv && uv venv && uv pip install --upgrade pip && uv pip install -r requirements.txt

# Copy project
COPY . /app/

# Expose port 8000
EXPOSE 8000

# Run daphne
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "chat_backend.asgi:application"]
