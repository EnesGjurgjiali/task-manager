import React, { useState, useEffect } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { login, loginWithGoogle } = useAuth();
  const theme = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Google OAuth configuration
  const isExpoGo = Constants.appOwnership === 'expo';
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '8f5b207-dev-dummy-id',
    androidClientId: isExpoGo ? process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID : process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    redirectUri: isExpoGo ? AuthSession.makeRedirectUri() : undefined,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken || response.params?.id_token;
      if (idToken) {
        handleGoogleLogin(idToken);
      }
    } else if (response?.type === 'error') {
      setError('Google Sign-In was cancelled or failed.');
      setGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleLogin = async (idToken: string) => {
    setGoogleLoading(true);
    setError(null);
    try {
      await loginWithGoogle(idToken);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sign in with Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLoginSubmit = async () => {
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const triggerGoogleSignIn = () => {
    setError(null);
    setGoogleLoading(true);

    if (request) {
      promptAsync();
    } else {
      setError('Google Auth request not initialized. Check your Client IDs.');
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.keyboardContainer, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle" style={styles.title}>
            Sign In
          </ThemedText>
          <ThemedText type="small" style={styles.subtitleText} themeColor="textSecondary">
            Enter details to access tasks
          </ThemedText>

          {error && (
            <ThemedView style={[styles.errorContainer, { borderColor: '#ef4444' }]}>
              <ThemedText style={{ color: '#ef4444' }} type="small">
                {error}
              </ThemedText>
            </ThemedView>
          )}

          <ThemedView style={styles.inputContainer}>
            <ThemedText type="smallBold" style={styles.label}>
              Email Address
            </ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              placeholder="Email"
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </ThemedView>

          <ThemedView style={styles.inputContainer}>
            <ThemedText type="smallBold" style={styles.label}>
              Password
            </ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              placeholder="Password"
              placeholderTextColor={theme.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </ThemedView>

          <TouchableOpacity
            onPress={handleLoginSubmit}
            disabled={loading || googleLoading}
            activeOpacity={0.8}
            className={`w-full bg-primary-600 rounded-2xl py-4 items-center justify-center mt-8 ${
              loading || googleLoading ? "opacity-70" : ""
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-bold text-base">Sign In</Text>
            )}
          </TouchableOpacity>

          <ThemedView style={styles.dividerContainer}>
            <ThemedView style={[styles.dividerLine, { backgroundColor: theme.backgroundSelected }]} />
            <ThemedText type="small" style={styles.dividerText} themeColor="textSecondary">
              or
            </ThemedText>
            <ThemedView style={[styles.dividerLine, { backgroundColor: theme.backgroundSelected }]} />
          </ThemedView>

          <Pressable
            onPress={triggerGoogleSignIn}
            disabled={loading || googleLoading}
            style={({ pressed }) => [
              styles.googleButton,
              { borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement },
              pressed && { opacity: 0.8 },
            ]}
          >
            {googleLoading ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <ThemedText type="smallBold">Sign In with Google</ThemedText>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.replace('/(auth)/register')}
            style={styles.toggleLink}
          >
            <ThemedText type="linkPrimary">
              Don't have an account? Sign Up
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    maxWidth: 450,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  subtitleText: {
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  errorContainer: {
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.two,
    marginBottom: Spacing.four,
  },
  inputContainer: {
    marginBottom: Spacing.three,
  },
  label: {
    marginBottom: Spacing.one,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.four,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: Spacing.three,
  },
  googleButton: {
    height: 48,
    borderWidth: 1,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleLink: {
    marginTop: Spacing.four,
    alignItems: 'center',
  },
});
