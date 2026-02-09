# Developer Guide - Jarvis

Welcome to the Jarvis development guide! This document provides deep technical insights into the project's architecture, state management, and real-time communication protocol.

## 🏗 System Architecture

Jarvis follows a client-server architecture with a heavy emphasis on real-time synchronization.

```mermaid
graph TD
    subgraph Frontend "React Native (Expo)"
        UI[UI Components]
        Store[Zustand Store]
        DB[(SQLite Local DB)]
        WS_Client[WebSocket Client]
    end

    subgraph Backend "Django"
        ASGI[Daphne/Channels ASGI]
        Views[REST API Views]
        Consumers[WS Consumers]
        PG[(SQLite/Postgres)]
    end

    UI --> Store
    Store <--> DB
    Store <--> WS_Client
    WS_Client <--> Consumers
    UI <--> Views
    Views <--> PG
    Consumers <--> PG
```

## 📱 Frontend Technical Details

### State Management (`jarvis-app/store.ts`)
The application uses **Zustand** with the `persist` middleware for state management.
- **Hydration**: State is persisted to `AsyncStorage`. The `hasHydrated` flag ensures the UI doesn't render until the store is ready.
- **WebSocket Integration**: The store manages the `WebSocket` lifecycle, including automatic message synchronization after reconnection.
- **Optimistic Updates**: Many actions (sending, editing, deleting) update the UI immediately before the server confirms the change.

### Local Database (`jarvis-app/services/database.ts`)
We use `expo-sqlite` to provide offline support and fast initial loads.
- **Sync Logic**: Messages received via WebSockets are automatically mirrored to the local DB.
- **Offline Messaging**: Messages sent while offline are stored in an `unsent_messages` table and synchronized when the connection is restored.

## ⚙️ Backend Technical Details

### Real-time Core (`jarvis-backend/chat/consumers.py`)
Real-time features are powered by **Django Channels**.
- **Room Groups**: Each user joins a unique group `user_{user_id}`.
- **Message Routing**: When a message is sent to a conversation, the backend determines the recipient and broadcasts the event to their specific group.

### WebSocket Protocol

| Event Type | Direction | Payload Example | Description |
| :--- | :--- | :--- | :--- |
| `chat_message` | Both | `{"message": "Hello"}` | Standard message exchange. |
| `typing` | Client -> Server | `{"conversation_id": "1"}` | Tells the server the user is typing. |
| `user_typing` | Server -> Client | `{"sender_username": "bob"}` | Notifies recipient that bob is typing. |
| `mark_read` | Client -> Server | `{"message_id": "123"}` | Marks a specific message as read. |
| `message_read` | Server -> Client | `{"message_id": "123"}` | Notifies sender that message was read. |
| `edit_message` | Client -> Server | `{"new_text": "Updated"}` | Requests a message edit. |
| `react_message` | Client -> Server | `{"reaction": "👍"}` | Toggles an emoji reaction. |

## 📁 Media Handling

- **Resolution**: The frontend uses `getMediaUrl` in `utils/media.ts` to prepend the backend's base URL to relative paths.
- **Caching**: Files are downloaded using `expo-file-system` and stored locally. The message object prefers the local file URI if available to save bandwidth.

## 🛠 Adding New Features

1.  **New API**: Add to `jarvis-app/services/api.ts` and define serializers in the backend.
2.  **New Real-time Event**:
    - Add the logic to `ChatConsumer.receive` in `consumers.py`.
    - Handle the event in the `ws.onmessage` handler in `jarvis-app/store.ts`.
    - Update the `AppState` interface to include any new actions.
