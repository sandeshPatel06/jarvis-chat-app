# Pradesh App Automation Makefile

.PHONY: lint doctor type-check check prebuild clean install build-preview

# Paths
APP_DIR=jarvis-app

# 🔍 Fast Checks
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
