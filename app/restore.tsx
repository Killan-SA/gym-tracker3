import { ScrollView, Text } from 'react-native';
import { BackupActions } from '../components/BackupActions';
import { Panel } from '../components/ui';
import { COLORS } from '../constants/theme';
export default function RestoreScreen() {
  return <ScrollView style={{ flex: 1, backgroundColor: COLORS.background }} contentContainerStyle={{ padding: 24, gap: 24 }}>
    <Text style={{ color: COLORS.textPrimary, fontSize: 30, fontWeight: '800' }}>Retrouve tes données</Text>
    <Text style={{ color: COLORS.textSecondary, fontSize: 14, lineHeight: 23 }}>Choisis une ancienne sauvegarde GymTracker .json dans Fichiers. Tu verras un résumé avant de confirmer la restauration de tes séances, notes, programme et réglages.</Text>
    <Panel><BackupActions restoreOnly onRestored={() => {}} /></Panel>
    <Text style={{ color: COLORS.textMuted, fontSize: 12, lineHeight: 20 }}>La restauration remplace les données présentes dans l’application. Une copie de récupération est créée avant toute modification.</Text>
  </ScrollView>;
}
