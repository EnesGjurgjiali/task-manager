import axios from 'axios';
import { Platform } from 'react-native';
import { storage } from './storage';
import Constants from 'expo-constants';

const TOKEN_KEY = 'auth_token';

// Detect environment to support Web, iOS Simulators, Android Emulators, and Physical Devices
const getBaseURL = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }

  // Extract the bundler's IP address when running in Expo Go or a dev client
  // This allows physical devices on the same Wi-Fi network to reach the backend
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000/api`;
  }

  // Default fallbacks for local development
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  
  return 'http://localhost:5000/api';
};

export const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject authentication token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getSecureItem(TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to retrieve token from storage:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle common responses (like unauthorized redirects)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token on unauthorized access
      await storage.deleteSecureItem(TOKEN_KEY);
    }
    return Promise.reject(error);
  }
);
