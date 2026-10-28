import { useSettingsStore } from '../store/settings';

// ============================================================
// Définition des thèmes de couleur
// ============================================================

export interface AppTheme {
  id: string;
  label: string;
  /** Couleur d'aperçu (swatch) affichée dans les Réglages */
  swatch: string;

  // Couleurs dynamiques (remplacent COLORS.background, etc. dans les écrans)
  background: string;
  surface: string;
  card: string;
  cardBorder: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryGlow: string;
  primaryGlowStrong: string;
}

export const THEMES: Record<string, AppTheme> = {
  blue: {
    id: 'blue',
    label: 'Bleu',
    swatch: '#0066FF',
    background: '#09090F',
    surface: '#111119',
    card: '#17172A',
    cardBorder: '#22223A',
    primary: '#0066FF',
    primaryLight: '#338DFF',
    primaryDark: '#0047CC',
    primaryGlow: 'rgba(0, 102, 255, 0.18)',
    primaryGlowStrong: 'rgba(0, 102, 255, 0.35)',
  },
  purple: {
    id: 'purple',
    label: 'Violet',
    swatch: '#7C3AED',
    background: '#0A0714',
    surface: '#120D1F',
    card: '#1A1230',
    cardBorder: '#2A1F48',
    primary: '#7C3AED',
    primaryLight: '#9D6AF5',
    primaryDark: '#5B21B6',
    primaryGlow: 'rgba(124, 58, 237, 0.18)',
    primaryGlowStrong: 'rgba(124, 58, 237, 0.35)',
  },
  green: {
    id: 'green',
    label: 'Vert',
    swatch: '#51E985',
    background: '#080B0D',
    surface: '#101519',
    card: '#171D22',
    cardBorder: '#232B31',
    primary: '#51E985',
    primaryLight: '#34D399',
    primaryDark: '#143824',
    primaryGlow: 'rgba(81, 233, 133, 0.12)',
    primaryGlowStrong: 'rgba(81, 233, 133, 0.25)',
  },
  red: {
    id: 'red',
    label: 'Rouge',
    swatch: '#DC2626',
    background: '#110505',
    surface: '#1C0A0A',
    card: '#270F0F',
    cardBorder: '#3D1515',
    primary: '#DC2626',
    primaryLight: '#EF4444',
    primaryDark: '#B91C1C',
    primaryGlow: 'rgba(220, 38, 38, 0.18)',
    primaryGlowStrong: 'rgba(220, 38, 38, 0.35)',
  },
  orange: {
    id: 'orange',
    label: 'Orange',
    swatch: '#D97706',
    background: '#120A00',
    surface: '#1C1200',
    card: '#271A00',
    cardBorder: '#3D2800',
    primary: '#D97706',
    primaryLight: '#F59E0B',
    primaryDark: '#B45309',
    primaryGlow: 'rgba(217, 119, 6, 0.18)',
    primaryGlowStrong: 'rgba(217, 119, 6, 0.35)',
  },
  grey: {
    id: 'grey',
    label: 'Indigo',
    swatch: '#6366F1',
    background: '#0A0A0A',
    surface: '#141420',
    card: '#1C1C30',
    cardBorder: '#2A2A40',
    primary: '#6366F1',
    primaryLight: '#818CF8',
    primaryDark: '#4338CA',
    primaryGlow: 'rgba(99, 102, 241, 0.18)',
    primaryGlowStrong: 'rgba(99, 102, 241, 0.35)',
  },
};

/** Retourne le thème actif à partir du store Zustand */
export function useAppTheme(): AppTheme {
  const themeId = useSettingsStore((s) => s.themeId);
  return THEMES[themeId] ?? THEMES.green;
}

/** Retourne un thème par son id (sans hook React — pour usage hors composant) */
export function getThemeById(id: string): AppTheme {
  return THEMES[id] ?? THEMES.green;
}
