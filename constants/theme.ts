export const COLORS = {
  // Vert GymTracker
  primary: '#51E985',
  primaryLight: '#8AF2AC',
  primaryDark: '#143824',
  primaryGlow: 'rgba(81, 233, 133, 0.12)',
  primaryGlowStrong: 'rgba(81, 233, 133, 0.25)',

  // Arrière-plans (mode sombre)
  background: '#080B0D',
  surface: '#101519',
  card: '#171D22',
  cardBorder: '#232B31',
  cardBorderActive: '#51E985',

  // Textes
  textPrimary: '#F7F9FA',
  textSecondary: '#9AA6AE',
  textMuted: '#7F8B93',

  // États
  success: '#51E985',
  successGlow: 'rgba(0, 214, 143, 0.15)',
  warning: '#FFC94A',
  warningGlow: 'rgba(255, 184, 0, 0.15)',
  danger: '#FF6B6B',
  dangerGlow: 'rgba(255, 59, 92, 0.15)',

  // Tab bar
  tabBarBg: '#101519',
  tabBarBorder: '#232B31',
  tabActive: '#51E985',
  tabInactive: '#7F8B93',

  // Séparateurs
  separator: '#232B31',
};

export const FONTS = {
  // Tailles
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  xxxl: 38,

  // Poids
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 22,
  xl: 28,
  full: 999,
};

export const SHADOWS = {
  primary: {
    shadowColor: '#51E985',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
};
