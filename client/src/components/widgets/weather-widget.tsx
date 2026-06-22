import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { WeatherData, getWeatherCondition } from '@/services/weather';

interface WeatherWidgetProps {
  weather: WeatherData | null;
  loading: boolean;
}

export function WeatherWidget({ weather, loading }: WeatherWidgetProps) {
  // Determine gradient colors and icon based on weather code
  const getTheme = (code?: number) => {
    if (code === undefined) return { colors: ['#4b5563', '#1f2937'], icon: 'help-circle-outline' as const };
    
    if (code === 0) {
      return { colors: ['#4DA0B0', '#D39D38'], icon: 'sunny' as const }; // Clear sky
    }
    if (code >= 1 && code <= 3) {
      return { colors: ['#8e9eab', '#eef2f3'], icon: 'partly-sunny' as const }; // Cloudy
    }
    if (code === 45 || code === 48) {
      return { colors: ['#757F9A', '#D7DDE8'], icon: 'cloud' as const }; // Foggy
    }
    if ((code >= 51 && code <= 55) || (code >= 80 && code <= 82)) {
      return { colors: ['#4B79A1', '#283E51'], icon: 'rainy' as const }; // Drizzle / Showers
    }
    if (code >= 61 && code <= 65) {
      return { colors: ['#2980B9', '#2C3E50'], icon: 'water' as const }; // Rainy
    }
    if (code >= 71 && code <= 75) {
      return { colors: ['#E0EAFC', '#CFDEF3'], icon: 'snow' as const }; // Snowy
    }
    if (code >= 95 && code <= 99) {
      return { colors: ['#141E30', '#243B55'], icon: 'thunderstorm' as const }; // Thunderstorm
    }
    
    return { colors: ['#4b5563', '#1f2937'], icon: 'cloud' as const };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (!weather) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedText type="small" themeColor="textSecondary">Weather forecast unavailable</ThemedText>
      </View>
    );
  }

  const theme = getTheme(weather.weathercode);
  
  // Adjust text color based on gradient brightness for better contrast
  const isLightGradient = (weather.weathercode >= 1 && weather.weathercode <= 3) || (weather.weathercode >= 71 && weather.weathercode <= 75) || (weather.weathercode === 45 || weather.weathercode === 48);
  const textColor = isLightGradient ? '#1f2937' : '#ffffff';

  return (
    <LinearGradient
      colors={theme.colors as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.leftSide}>
          <Ionicons name={theme.icon} size={40} color={textColor} />
          <View style={styles.textContainer}>
            <ThemedText type="smallBold" style={{ color: textColor, opacity: 0.9, marginBottom: 2 }}>
              Prishtina
            </ThemedText>
            <ThemedText type="subtitle" style={{ color: textColor }}>
              {getWeatherCondition(weather.weathercode)}
            </ThemedText>
            <ThemedText type="small" style={{ color: textColor, opacity: 0.8 }}>
              Wind: {weather.windspeed} km/h
            </ThemedText>
          </View>
        </View>
        <ThemedText style={[styles.temp, { color: textColor }]}>
          {Math.round(weather.temperature)}°
        </ThemedText>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.four,
    overflow: 'hidden',
    padding: Spacing.five,
    marginBottom: Spacing.three,
  },
  loadingContainer: {
    borderRadius: Spacing.four,
    padding: Spacing.five,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSide: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: Spacing.four,
    flex: 1,
  },
  temp: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: 'bold',
  },
});
