# ==============================================================================
# Jarvis Chat - Master Makefile
# ==============================================================================
# This Makefile provides a unified interface for managing both the Django 
# backend and the Expo/React Native frontend.

.PHONY: help venv install install-backend install-app migrate run run-backend run-app shell clean cleanup

# Variables
PYTHON := python3
PIP := pip
BACKEND_DIR := jarvis-backend
APP_DIR := jarvis-app
VENV := $(BACKEND_DIR)/.venv
VENV_PYTHON := $(VENV)/bin/python
VENV_PIP := $(VENV)/bin/pip
MANAGE_PY := $(BACKEND_DIR)/manage.py

help:
	@echo "----------------------------------------------------------------"
	@echo "Jarvis Chat Management Commands"
	@echo "----------------------------------------------------------------"
	@echo "Setup Commands:"
	@echo "  make setup            - Full initial setup (venv, deps, migrate)"
	@echo "  make install          - Install dependencies for both Backend and App"
	@echo "  make venv             - Create Python virtual environment"
	@echo ""
	@echo "Backend Commands:"
	@echo "  make migrate          - Run database migrations"
	@echo "  make static           - Collect static files"
	@echo "  make migrations       - Create new database migrations"
	@echo "  make run-backend      - Start Django development server"
	@echo "  make superuser        - Create a Django admin superuser"
	@echo "  make shell            - Open Django shell"
	@echo "  make cleanup          - Run user cleanup script"
	@echo ""
	@echo "App (Frontend) Commands:"
	@echo "  make run-app          - Start Expo development server (Android/iOS)"
	@echo "  make run-web          - Start Expo web server"
	@echo "  make build-android    - Build Android app (local)"
	@echo ""
	@echo "Combined Commands:"
	@echo "  make run              - Start both Backend and App (Web)"
	@echo "  make clean            - Remove cache and temporary files"
	@echo ""
	@echo "Docker Commands:"
	@echo "  make docker-up        - Start all services with Docker Compose"
	@echo "  make docker-down      - Stop all Docker services"
	@echo "  make docker-build     - Rebuild all Docker images"
	@echo "----------------------------------------------------------------"

# --- Setup & Installation ---

setup: venv install migrate static

venv:
	@echo "Creating virtual environment..."
	$(PYTHON) -m venv $(VENV)
	@echo "Virtual environment created at $(VENV)"

install: install-backend install-app

install-backend: venv
	@echo "Installing backend dependencies..."
	$(VENV_PIP) install --upgrade pip
	$(VENV_PIP) install -r $(BACKEND_DIR)/requirements.txt

install-app:
	@echo "Installing app dependencies..."
	cd $(APP_DIR) && npm install

# --- Backend Operations ---

migrate:
	@echo "Running migrations..."
	$(VENV_PYTHON) $(MANAGE_PY) migrate

static:
	@echo "Collecting static files..."
	mkdir -p $(BACKEND_DIR)/staticfiles
	$(VENV_PYTHON) $(MANAGE_PY) collectstatic --noinput

migrations:
	@echo "Making migrations..."
	$(VENV_PYTHON) $(MANAGE_PY) makemigrations

run-backend:
	@echo "Starting Django server..."
	$(VENV_PYTHON) $(MANAGE_PY) runserver 0.0.0.0:8000

superuser:
	@echo "Creating superuser..."
	$(VENV_PYTHON) $(MANAGE_PY) createsuperuser

shell:
	$(VENV_PYTHON) $(MANAGE_PY) shell

cleanup:
	@echo "Running user cleanup..."
	$(VENV_PYTHON) $(BACKEND_DIR)/cleanup_users.py

# --- App Operations ---

run-app:
	@echo "Starting Expo..."
	cd $(APP_DIR) && npx expo start

run-web:
	@echo "Starting Expo Web..."
	cd $(APP_DIR) && npx expo start --web

build-android:
	@echo "Building Android..."
	cd $(APP_DIR) && npx expo run:android

# --- Combined ---

run:
	@echo "Starting both services (Press Ctrl+C to stop)..."
	make -j2 run-backend run-web

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.py[co]" -delete
	rm -rf $(BACKEND_DIR)/staticfiles
	@echo "Cleaned up Python cache and static files."

# --- Docker ---

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-build:
	docker compose build
