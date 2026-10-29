import { useRef, useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { File, Paths, Directory } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import { router } from 'expo-router';
import { createBackup, getBackupSummary, restoreBackup, validateBackup, type GymBackup } from '../lib/backup';
import { getImportFileError, selectImportDocument } from '../lib/importDocumentPicker';
import { getDb } from '../lib/database';
import { useSettingsStore } from '../store/settings';
import { useProfileStore } from '../store/profile';
import { useRestTimerStore } from '../store/restTimerStore';
import { COLORS } from '../constants/theme';
import { SettingsMenuRow } from './SettingsMenuRow';

function writeBackup(backup: GymBackup, recovery = false) {
  const directory = new Directory(Paths.document, 'backups'); directory.create({ intermediates: true, idempotent: true });
  const file = new File(directory, `${recovery ? 'GymTracker-avant-restauration' : 'GymTracker-backup'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  file.write(JSON.stringify(backup)); return file;
}
function latestRecoveryFile(): File | null {
  try {
    const directory = new Directory(Paths.document, 'backups');
    if (!directory.exists) return null;
    return directory.list().filter((entry): entry is File => entry instanceof File && entry.name.startsWith('GymTracker-avant-restauration-')).sort((a, b) => b.name.localeCompare(a.name))[0] ?? null;
  } catch { return null; }
}
export function clearPrivateBackupFiles() {
  const directory = new Directory(Paths.document, 'backups');
  if (directory.exists) directory.delete();
}
async function share(file: File, mimeType: string, uti: string) {
  if (!await Sharing.isAvailableAsync()) throw new Error('Le partage de fichiers n’est pas disponible.');
  await Sharing.shareAsync(file.uri, { mimeType, UTI: uti });
}
export function BackupActions({ onRestored, restoreOnly = false }: { onRestored: () => void; restoreOnly?: boolean }) {
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [candidate, setCandidate] = useState<GymBackup | null>(null);
  const [recovery, setRecovery] = useState<File | null>(latestRecoveryFile);
  const [restored, setRestored] = useState(false);
  const finishAfterDismiss = useRef(false);
  const run = async (action: () => Promise<void>) => {
    if (busyRef.current) return; busyRef.current = true; setBusy(true);
    try { await action(); } catch (error) { Alert.alert('Mes données', error instanceof Error ? error.message : String(error)); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const pick = () => run(async () => {
    let phase: 'picking' | 'reading' = 'picking';
    try {
      const selection = await selectImportDocument(DocumentPicker.getDocumentAsync);
      if (selection.status === 'busy') throw new Error('Une sélection de fichier est déjà en cours. Termine-la avant de réessayer.');
      if (selection.result.canceled) return;
      phase = 'reading'; const asset = selection.result.assets[0];
      if (!asset.name.toLowerCase().endsWith('.json')) throw new Error('Choisis une sauvegarde GymTracker .json.');
      const file = new File(asset.uri);
      if (file.size > 50 * 1024 * 1024) throw new Error('La sauvegarde dépasse 50 Mo.');
      setCandidate(validateBackup(JSON.parse(await file.text()))); setRecovery(null); setRestored(false);
    } catch (error) { throw new Error(phase === 'picking' ? getImportFileError(error, phase) : error instanceof Error ? error.message : String(error)); }
  });
  const apply = () => {
    if (!candidate) return;
    Alert.alert('Remplacer toutes mes données ?', 'La sauvegarde remplacera tes données actuelles. Une copie de récupération sera créée avant toute modification. La fusion n’est pas disponible.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Remplacer', style: 'destructive', onPress: () => run(async () => {
        const recoveryFile = writeBackup(createBackup(), true); // Must succeed before any DELETE.
        setRecovery(recoveryFile);
        restoreBackup(candidate);
        useSettingsStore.getState().loadSettings(); useProfileStore.getState().loadProfile(); useRestTimerStore.getState().hydrate();
        setRestored(true); onRestored();
      }) },
    ]);
  };
  const exportExcel = () => run(async () => {
    const rows = getDb().getAllSync<Record<string, unknown>>(`SELECT s.date AS Date, e.name AS Machine, st.set_number AS 'Série', st.weight AS Poids, st.reps AS Rep, st.rpe AS RPE FROM sessions s JOIN exercises e ON e.session_id=s.id JOIN sets st ON st.exercise_id=e.id ORDER BY s.date, e.order_index, st.set_number`);
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows, { header: ['Date', 'Machine', 'Série', 'Poids', 'Rep', 'RPE'] }), 'Historique');
    const file = new File(Paths.cache, `GymTracker-historique-${new Date().toISOString().slice(0, 10)}.xlsx`);
    file.write(new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx' })));
    await share(file, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'org.openxmlformats.spreadsheetml.sheet');
  });
  const afterDismiss = () => {
    if (!finishAfterDismiss.current) return;
    finishAfterDismiss.current = false;
    useProfileStore.getState().requestSetup(); router.replace('/(tabs)');
  };
  const close = () => {
    finishAfterDismiss.current = restored; setCandidate(null);
    if (Platform.OS !== 'ios') afterDismiss();
  };
  const summary = candidate ? getBackupSummary(candidate) : null;
  return <View>
    {!restoreOnly && <><SettingsMenuRow icon="cloud-upload-outline" disabled={busy} title="Exporter une sauvegarde complète" description="Séances, notes et réglages · fichier GymTracker .json" onPress={() => run(async () => { await share(writeBackup(createBackup()), 'application/json', 'public.json'); })} /><View style={s.divider} /></>}
    <SettingsMenuRow icon="cloud-download-outline" disabled={busy} title="Restaurer une sauvegarde" description={busy ? 'Opération en cours…' : 'Retrouver toutes mes données depuis un fichier .json'} onPress={pick} />
    {!restoreOnly && <><View style={s.divider} /><SettingsMenuRow icon="download-outline" disabled={busy} title="Exporter mon historique Excel" description="Mes séances en .xlsx, avec charges et RPE" onPress={exportExcel} /></>}
    {!restoreOnly && recovery && <><View style={s.divider} /><SettingsMenuRow icon="refresh-outline" disabled={busy} title="Exporter la copie de récupération" description="Mes données avant la dernière restauration" onPress={() => run(async () => { await share(recovery, 'application/json', 'public.json'); })} /></>}
    <Modal visible={candidate !== null} presentationStyle="pageSheet" animationType="slide" onRequestClose={close} onDismiss={afterDismiss}><ScrollView style={s.container} contentContainerStyle={s.content}><Text style={s.title}>{restored ? 'Restauration terminée ✓' : 'Sauvegarde GymTracker trouvée'}</Text><Text style={s.text}>{summary && new Date(summary.createdAt).toLocaleDateString('fr-FR')}</Text><Text style={s.text}>{summary?.sessions} séances · {summary?.exercises} exercices · {summary?.sets} séries</Text><Text style={s.muted}>Programmes, préférences, favoris, notes et pyramides sont inclus dans les données sauvegardées.</Text>
      {!restored && <TouchableOpacity disabled={busy} style={s.button} onPress={apply}><Text style={s.green}>{busy ? 'Restauration…' : 'Restaurer en remplaçant mes données'}</Text></TouchableOpacity>}
      {recovery && <><Text style={s.muted}>La copie de tes données précédentes est conservée sur cet iPhone. Enregistre-la dans Fichiers pour pouvoir la retrouver facilement.</Text><TouchableOpacity disabled={busy} style={s.button} onPress={() => run(async () => { await share(recovery, 'application/json', 'public.json'); })}><Text style={s.green}>Enregistrer la copie de récupération</Text></TouchableOpacity></>}
      <TouchableOpacity disabled={busy} style={s.button} onPress={close}><Text style={s.text}>{restored ? 'Terminer' : 'Annuler'}</Text></TouchableOpacity>
    </ScrollView></Modal>
  </View>;
}
const s = StyleSheet.create({ divider: { height: 1, backgroundColor: COLORS.cardBorder, marginVertical: 6 }, button: { minHeight: 48, paddingVertical: 14, gap: 8 }, green: { color: COLORS.primary, fontSize: 14, fontWeight: '600' }, text: { color: COLORS.textPrimary, fontSize: 15, lineHeight: 22 }, muted: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 20 }, container: { flex: 1, backgroundColor: COLORS.background }, content: { padding: 24, gap: 24, paddingBottom: 60 }, title: { color: COLORS.textPrimary, fontSize: 26, fontWeight: '800' } });
