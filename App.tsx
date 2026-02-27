import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { initDatabase } from './src/db/database';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import OfflineBanner from './src/components/OfflineBanner';
import TroutLoader from './src/components/TroutLoader';
import { COLORS } from './src/navigation/theme'; // static Forest — only used here before ThemeProvider mounts

type AppState = 'loading' | 'ready' | 'error';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => setAppState('ready'))
      .catch(err => {
        setError(String(err));
        setAppState('error');
      });
  }, []);

  if (appState === 'loading') {
    return (
      <View style={[styles.splash, { backgroundColor: COLORS.background }]}>
        <TroutLoader progress={0} size={140} animate />
        <Text style={[styles.splashText, { color: COLORS.textSecondary }]}>
          Loading…
        </Text>
        <StatusBar style="dark" />
      </View>
    );
  }

  if (appState === 'error') {
    return (
      <View style={[styles.splash, { backgroundColor: COLORS.background }]}>
        <Text style={[styles.errorText, { color: COLORS.danger }]}>
          Failed to open database
        </Text>
        <Text style={[styles.errorDetail, { color: COLORS.textSecondary }]}>
          {error}
        </Text>
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppShell() {
  const { avatarUri } = useTheme();
  return (
    <View style={styles.shell}>
      <StatusBar style="light" />
      <AppNavigator />
      <OfflineBanner />
      {avatarUri && (
        <View style={styles.avatarBackground} pointerEvents="none">
          <Image
            source={{ uri: avatarUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            blurRadius={8}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  avatarBackground: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.07,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  splashText: {
    marginTop: 24,
    fontSize: 15,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDetail: {
    fontSize: 13,
    textAlign: 'center',
  },
});
