# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV VIRTUAL_ENV=/opt/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast package management
RUN pip install uv

# Install python dependencies
COPY requirements.txt /app/
RUN uv venv $VIRTUAL_ENV && \
    uv pip install --upgrade pip && \
    uv pip install -r requirements.txt

# Copy project
COPY . /app/

# Expose port 8000
EXPOSE 8000

# Default command (Web Server)
# Note: In production, it's better to run migrations as a separate step
CMD ["sh", "-c", "python manage.py migrate --noinput && \
                   python manage.py collectstatic --noinput && \
                   daphne -b 0.0.0.0 -p 8000 chat_backend.asgi:application"]
