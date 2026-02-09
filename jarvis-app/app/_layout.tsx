import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, ThemeProvider, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SystemUI from 'expo-system-ui';
import { AppState, BackHandler, useColorScheme } from 'react-native';

import Colors from '@/constants/Colors';
import { useStore } from '@/store';
import { logger } from '@/services/logger';

logger.init();
import { requestFirebasePermission, setupForegroundHandler, setupNotificationOpenedHandler, setupTokenRefreshListener, syncTokenWithBackend } from '@/services/firebaseMessaging';
import CustomToast from '@/components/CustomToast';
import CustomAlert from '@/components/CustomAlert';
import IncomingCallModal from '@/components/IncomingCallModal';
import { CallMiniWindow } from '@/components/chat/CallMiniWindow';

import { LockScreen } from '@/components/LockScreen';


import { KeyboardProvider } from 'react-native-keyboard-controller';

// Initialize Firebase listeners at module level if needed
setupNotificationOpenedHandler();





export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const token = useStore(state => state.token);
  const initApp = useStore(state => state.initApp);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    initApp();
  }, []); // Run only once on mount


  useEffect(() => {
    if (token) {
      requestFirebasePermission().then(async (granted) => {
        if (granted) {
          await syncTokenWithBackend();
        }
      });
    }

    // Setup Firebase listeners
    const unsubscribeForeground = setupForegroundHandler();
    const unsubscribeRefresh = setupTokenRefreshListener();

    return () => {
      unsubscribeForeground();
      unsubscribeRefresh();
    };
  }, [token]);

  useEffect(() => {
    // Handle AppState changes (minimize call when app goes to background)
    const subscription = AppState.addEventListener('change', nextAppState => {
      const { callState, setIsMinimized } = useStore.getState();
      if (nextAppState === 'background' && callState.isCalling && !callState.isMinimized && !callState.isRequestingPermissions) {
        console.log('[AppState] App going to background, minimizing active call');
        setIsMinimized(true);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Handle hardware back button for Android
    const backAction = () => {
      // If we are in a call screen (can check segments or state)
      // This is a bit tricky with Expo Router in a global layout
      // Better to handle inside CallScreen, but user asked for "back our minimize app"
      // Let's implement it here as a fallback or directly in CallScreen.
      // actually CallScreen is better for back button.
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

// ...

function RootLayoutNav() {
  const [isLocked, setIsLocked] = useState(true);
  const [appLockEnabled, setAppLockEnabled] = useState(false);

  // Check if app lock is enabled from AsyncStorage
  useEffect(() => {
    import('@react-native-async-storage/async-storage').then(async (AsyncStorage) => {
      const lockEnabled = await AsyncStorage.default.getItem('appLockEnabled');
      setAppLockEnabled(lockEnabled === 'true');
      if (lockEnabled !== 'true') {
        setIsLocked(false);
      }
    });
  }, []);

  const token = useStore(state => state.token);
  const hasHydrated = useStore(state => state.hasHydrated);
  const userTheme = useStore(state => state.theme);

  const systemScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();

  // Determine effective theme
  const isDark = userTheme === 'system'
    ? systemScheme === 'dark'
    : userTheme === 'dark';

  const theme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: isDark ? Colors.dark.background : Colors.light.background,
      primary: isDark ? Colors.dark.primary : Colors.light.primary,
      card: isDark ? Colors.dark.background : Colors.light.background,
      text: isDark ? Colors.dark.text : Colors.light.text,
      border: 'transparent',
    },
  };

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(isDark ? Colors.dark.background : Colors.light.background);
  }, [isDark]);

  useEffect(() => {
    if (!hasHydrated) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!token && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (token && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [token, segments, hasHydrated, router]);

  if (appLockEnabled && isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <ThemeProvider value={theme}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <Stack
              screenOptions={{
                headerStyle: {
                  backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
                },
                headerTintColor: isDark ? Colors.dark.text : Colors.light.text,
                contentStyle: {
                  backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
                }
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="settings" options={{ headerShown: false }} />
              <Stack.Screen
                name="chat/[id]"
                options={{
                  presentation: 'card',
                  headerShown: false,
                }}
              />
              <Stack.Screen name="contact/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
              <Stack.Screen name="auth/login" options={{ headerShown: false }} />
              <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
            </Stack>
            <CustomToast />
            <CustomAlert />
            <IncomingCallModal />
            <CallMiniWindow />
          </ThemeProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

