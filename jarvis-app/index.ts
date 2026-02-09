// Register background handler first
import '@/services/firebaseMessaging';
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Must be exported or registered
// expo-router/entry does this:
import 'expo-router/entry';
