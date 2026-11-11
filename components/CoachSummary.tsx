import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Action, Panel } from './ui';
import { getCoachReport } from '../lib/coach';
import { getCoachPreferences } from '../lib/coachStorage';
import { useAppTheme } from '../lib/themes';
export function CoachSummary() {
  const theme = useAppTheme();
  const [state, setState] = useState<{ enabled: boolean; count: number } | null>(null);
  useFocusEffect(useCallback(() => { const enabled = getCoachPreferences().enabled; setState({ enabled, count: enabled ? getCoachReport().count : 0 }); }, []));
  if (!state?.enabled) return null;
  return <Panel><Text style={{ color: theme.primary, fontSize: 17, fontWeight: '800' }}>Coach GymTracker</Text><Text style={{ color: '#A5B3AA', lineHeight: 20 }}>{state.count ? `${state.count} points à examiner à partir de ton historique.` : 'Ton analyse locale et ton bilan de progression sur quatre semaines.'}</Text><Action title="Voir l’analyse du coach" secondary onPress={() => router.push('/coach')} /></Panel>;
}
