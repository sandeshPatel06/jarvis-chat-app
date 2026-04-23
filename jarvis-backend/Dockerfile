# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV VIRTUAL_ENV=/opt/venv
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
RUN pip install uv && uv venv $VIRTUAL_ENV && uv pip install --upgrade pip && uv pip install -r requirements.txt

# Copy project
COPY . /app/

# Expose port 8000
EXPOSE 8000

# Run migrations and start daphne
CMD ["sh", "-c", "python manage.py makemigrations && \
                   python manage.py migrate && \
                   python manage.py collectstatic --noinput && \
                   python manage.py shell -c \"import os; from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username=os.environ.get('DJANGO_SUPERUSER_USERNAME')).exists() or User.objects.create_superuser(username=os.environ.get('DJANGO_SUPERUSER_USERNAME'), email=os.environ.get('DJANGO_SUPERUSER_EMAIL'), password=os.environ.get('DJANGO_SUPERUSER_PASSWORD'))\" && \
                   daphne -b 0.0.0.0 -p 8000 chat_backend.asgi:application"]
