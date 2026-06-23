import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme, ActivityIndicator, StyleSheet, LogBox } from 'react-native';

LogBox.ignoreLogs([
  'InteractionManager has been deprecated',
]);
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemedView } from '@/components/ui/themed-view';

const queryClient = new QueryClient();

function AppContent() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Watch auth state and segments to redirect the user dynamically
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect unauthenticated users to the login screen
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect authenticated users to the dashboard tabs
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

import { ThemeProvider as CustomThemeProvider, useThemeContext } from '@/context/ThemeContext';

function ExpoThemeProvider({ children }: { children: React.ReactNode }) {
  const { activeTheme } = useThemeContext();
  return (
    <ThemeProvider value={activeTheme === 'dark' ? DarkTheme : DefaultTheme}>
      {children}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CustomThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ExpoThemeProvider>
              <AppContent />
            </ExpoThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </CustomThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
