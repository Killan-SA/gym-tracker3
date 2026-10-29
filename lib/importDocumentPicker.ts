import type { DocumentPickerOptions, DocumentPickerResult } from 'expo-document-picker';

export const IMPORT_DOCUMENT_OPTIONS: DocumentPickerOptions = {
  type: '*/*',
  copyToCacheDirectory: true,
  multiple: false,
  base64: false,
};

type PickDocument = (options: DocumentPickerOptions) => Promise<DocumentPickerResult>;
type Selection = { status: 'busy' } | { status: 'result'; result: DocumentPickerResult };

// The native iOS picker is a singleton. Keep the lock across screen unmounts;
// releasing it on navigation would allow another screen to launch a second picker.
export function createImportPickerGate() {
  let pending = false;
  return async (pick: PickDocument): Promise<Selection> => {
    if (pending) return { status: 'busy' };
    pending = true;
    try { return { status: 'result', result: await pick({ ...IMPORT_DOCUMENT_OPTIONS }) }; }
    finally { pending = false; }
  };
}
export const selectImportDocument = createImportPickerGate();

export function isPickerAlreadyOpen(error: unknown): boolean {
  const value = error as { code?: unknown; message?: unknown } | null;
  const text = `${value?.code ?? ''} ${value?.message ?? ''} ${String(error)}`;
  return /different document picking in progress|picking[\s_]+in[\s_]+progress|document[\s_]+picking[\s_]+in[\s_]+progress/i.test(text);
}

export function getImportFileError(error: unknown, phase: 'picking' | 'reading'): string {
  if (isPickerAlreadyOpen(error)) return 'Une sélection de fichier est déjà en cours dans iOS. Termine-la ou annule-la si elle est visible. Si Fichiers ne s’ouvre pas, ferme complètement GymTracker depuis le sélecteur d’apps de l’iPhone, puis rouvre-la. Ne désinstalle pas l’app : tes séances doivent rester conservées.';
  const detail = error instanceof Error ? error.message : String(error);
  return phase === 'picking'
    ? `Impossible d’ouvrir Fichiers. Réessaie une fois l’écran complètement ouvert. Détail : ${detail}`
    : `Le fichier a été sélectionné, mais sa lecture a échoué. Vérifie qu’il est téléchargé dans Fichiers et qu’il s’agit d’un Excel .xlsx ou .xls. Détail : ${detail}`;
}
