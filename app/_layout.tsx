import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { getDb } from '../lib/database';
import { useSettingsStore } from '../lib/settingsStore';
import { COLORS } from '../constants/theme';
import { Onboarding } from '../components/Onboarding';
import { beginOnboarding, needsOnboarding, getInitialDataImportRoute, type InitialDataSource } from '../lib/onboarding';
import { useProfileStore } from '../store/profile';
import { Tutorial } from '../components/Tutorial';
import { finishTutorial, needsTutorial } from '../lib/tutorial';
import { useRestTimerStore } from '../store/restTimerStore';
import { startWidgetSync } from '../lib/widgetSync';
import { RestTimerObserver } from '../components/RestTimerObserver';
import { startLocalNotifications } from '../lib/localNotifications';
import { startRestActivitySync } from '../lib/restActivitySync';

// Empêche le splash screen de se fermer automatiquement
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const pendingImport = useRef<InitialDataSource>('none');
  const setupRevision = useProfileStore(state => state.setupRevision);
  useEffect(() => startWidgetSync(), []);
  useEffect(() => startLocalNotifications(), []);
  useEffect(() => startRestActivitySync(), []);
  useEffect(() => {
    // Initialise la base de données au démarrage
    try {
      getDb();
      // Charge les préférences persistées (unité kg/lbs, thème, programme, etc.)
      useSettingsStore.getState().loadSettings();
      useProfileStore.getState().loadProfile();
      useRestTimerStore.getState().hydrate();
      if (needsOnboarding()) { setShowTutorial(false); beginOnboarding(); setShowWelcome(true); }
      else if (needsTutorial()) setShowTutorial(true);
    } catch (error) {
      console.error('Erreur d\'initialisation de la BDD :', error);
    } finally {
      // Cache le splash screen
      SplashScreen.hideAsync();
    }
  }, [setupRevision]);

  const openPendingImport = () => {
    const route = getInitialDataImportRoute(pendingImport.current);
    pendingImport.current = 'none';
    if (route) router.push(route);
  };
  const afterWelcome = () => { if (needsTutorial()) setShowTutorial(true); else openPendingImport(); };

  return (
    <>
      <StatusBar style="light" />
      <RestTimerObserver />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="rest" options={{ presentation: 'fullScreenModal', headerShown: false }} />
        <Stack.Screen name="restore" options={{ presentation: 'card', headerShown: true, headerTitle: 'Restaurer une sauvegarde', headerStyle: { backgroundColor: COLORS.background }, headerTintColor: COLORS.textPrimary, headerBackTitle: ' ' }} />
        <Stack.Screen name="exercises/new" options={{ headerShown: true, title: 'Ajouter un exercice', headerStyle: { backgroundColor: COLORS.background }, headerTintColor: COLORS.textPrimary, headerBackTitle: ' ' }} />
        <Stack.Screen name="report" options={{ headerShown: true, title: "Bilan détaillé", headerStyle: { backgroundColor: COLORS.surface }, headerTintColor: COLORS.textPrimary }} />
        <Stack.Screen
          name="session/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: COLORS.surface },
            headerTintColor: COLORS.textPrimary,
            headerTitle: 'Séance en cours',
            headerBackTitle: ' ',
            presentation: 'card',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="history/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: COLORS.surface },
            headerTintColor: COLORS.textPrimary,
            headerTitle: 'Détail de la séance',
            headerBackTitle: ' ',
          }}
        />
        <Stack.Screen
          name="exercises/[name]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: COLORS.surface },
            headerTintColor: COLORS.textPrimary,
            headerTitle: 'Progression',
            headerBackTitle: ' ',
          }}
        />
        <Stack.Screen
          name="import"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: COLORS.surface },
            headerTintColor: COLORS.textPrimary,
            headerTitle: 'Importer un historique',
            headerBackTitle: ' ',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="programs"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: COLORS.surface },
            headerTintColor: COLORS.textPrimary,
            headerTitle: 'Programme d\'entraînement',
            headerBackTitle: ' ',
          }}
        />
      </Stack>
      <Onboarding key={setupRevision} visible={showWelcome} onComplete={(source) => {
        pendingImport.current = source;
        setShowWelcome(false);
        if (Platform.OS !== 'ios') afterWelcome();
      }} onDismiss={() => {
        // On iOS, wait for the welcome modal to close before presenting the import modal.
        afterWelcome();
      }} />
      <Tutorial visible={showTutorial} onComplete={(skipped) => {
        finishTutorial(skipped); setShowTutorial(false);
        if (Platform.OS !== 'ios') openPendingImport();
      }} onDismiss={openPendingImport} />
    </>
  );
}
