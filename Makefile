# Pradesh App Automation Makefile

.DEFAULT_GOAL := help

.PHONY: help start start-frontend start-backend docker-start lint doctor type-check check prebuild clean install build-preview

# Paths
APP_DIR=app
BACKEND_DIR=backend

# 📚 Help
help:
	@echo "Available targets:"
	@echo "  make start-frontend  Start the Expo app locally"
	@echo "  make start-backend   Start the Django backend locally"
	@echo "  make start           Start both backend and frontend locally"
	@echo "  make docker-start    Start backend and frontend using Docker"
	@echo "  make lint            Run Expo lint"
	@echo "  make doctor          Run Expo Doctor"
	@echo "  make type-check      Run TypeScript check"
	@echo "  make check           Run lint, doctor, and type-check"
	@echo "  make prebuild        Run Expo prebuild"
	@echo "  make build-preview   Trigger an EAS preview build"
	@echo "  make clean           Remove android and ios folders"

# 🚀 Running services
start-frontend:
	@echo "🚀 Starting Jarvis Chat Expo app..."
	cd $(APP_DIR) && npm run start

start-backend:
	@echo "🐍 Starting Jarvis Chat Django backend..."
	cd $(BACKEND_DIR) && if [ -d ".venv" ]; then .venv/bin/python manage.py runserver; else python manage.py runserver; fi

start:
	@echo "🚀 Starting both backend and frontend..."
	(cd $(BACKEND_DIR) && if [ -d ".venv" ]; then .venv/bin/python manage.py runserver; else python manage.py runserver; fi) & \
	(cd $(APP_DIR) && npm run start)

docker-start:
	@echo "🐳 Starting Jarvis Chat stack in Docker..."
	docker compose up --build

lint:
	@echo "🔍 Running Linting..."
	cd $(APP_DIR) && npm run lint

doctor:
	@echo "🩺 Running Expo Doctor..."
	cd $(APP_DIR) && npx expo-doctor

# 🏗️ Hard Tasks
type-check:
	@echo "🏗️ Running TypeScript Logic Check..."
	cd $(APP_DIR) && npx tsc --noEmit

# 🚀 Combined Commands
check: lint doctor type-check
	@echo "✅ All local quality checks passed!"

prebuild:
	@echo "🛠️ Running Expo Prebuild (local native sync)..."
	cd $(APP_DIR) && npx expo prebuild

# 📦 EAS Commands
build-preview:
	@echo "📦 Triggering EAS Preview Build (Android)..."
	cd $(APP_DIR) && eas build --profile preview --platform android

# 🧹 Cleanup
clean:
	@echo "🧹 Cleaning up native directories..."
	rm -rf $(APP_DIR)/android $(APP_DIR)/ios
