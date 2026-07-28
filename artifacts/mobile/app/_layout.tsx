import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
} from '@expo-google-fonts/tajawal';
import { useColorScheme, Platform } from 'react-native';
import { queryClient } from '@/lib/query-client';
import { AuthProvider } from '@/context/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {});
console.log('[layout] _layout.tsx module loaded');

export default function RootLayout() {
  console.log('[layout] RootLayout rendering');
  const scheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
  });

  // On web: fonts load asynchronously via CSS — never block render.
  // On native: wait for fonts before hiding the splash screen.
  const ready = Platform.OS === 'web' ? true : (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ErrorBoundary>
              <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="new-patient"
                  options={{
                    presentation: 'fullScreenModal',
                    animation: 'slide_from_bottom',
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="patient/[id]"
                  options={{
                    animation: 'slide_from_right',
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="book-appointment"
                  options={{
                    presentation: 'fullScreenModal',
                    animation: 'slide_from_bottom',
                    headerShown: false,
                  }}
                />
              </Stack>
            </ErrorBoundary>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
