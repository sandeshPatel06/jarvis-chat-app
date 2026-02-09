# Jarvis Chat

Jarvis is a modern, real-time chat application built with React Native (Expo) and Django. It features a sleek interface, real-time updates via WebSockets, and comprehensive media sharing capabilities.

> [!TIP]
> **New to the codebase?** Check out our [Developer Guide](file:///home/patel/git/jarvis/DEVELOPMENT.md) for a deep dive into the architecture and protocol.

## ✨ Features

- **Real-time Messaging**: Instant message delivery using WebSockets (Django Channels).
- **Media Sharing**: Support for images, videos, and documents.
- **Message Reactions**: Express yourself with emoji reactions.
- **User Profiles**: Customizable user profiles and settings.
- **Dark Mode**: Beautiful, system-synced dark mode support.
- **Responsive Design**: Optimized for both mobile and web environments.

## 🛠 Tech Stack

### Frontend
- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/)
- **Animations**: [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)

### Backend
- **Framework**: [Django](https://www.djangoproject.com/)
- **Real-time**: [Django Channels](https://channels.readthedocs.io/)
- **API**: [Django REST Framework](https://www.django-rest-framework.org/)
- **Database**: [SQLite](https://www.sqlite.org/) (Development)

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or later)
- [Python](https://www.python.org/) (3.10 or later)
- [Expo CLI](https://docs.expo.dev/workflow/expo-cli/)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd jarvis-backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run migrations:
   ```bash
   python manage.py migrate
   ```
5. Start the server:
   ```bash
   python manage.py runserver
   ```

### Frontend Setup
1. Navigate to the app directory:
   ```bash
   cd jarvis-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Expo development server:
   ```bash
   npx expo start
   ```

## 📝 Environment Variables

Ensure you have the necessary `.env` files configured in both `jarvis-app` and `jarvis-backend` directories.

**jarvis-app/.env**:
```env
EXPO_PUBLIC_API_URL=http://your-ip:8000
EXPO_PUBLIC_WS_URL=ws://your-ip:8000
```
